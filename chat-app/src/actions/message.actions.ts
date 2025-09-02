"use server";

import { Message } from "@/db/dummy";
import { redis } from "@/lib/db";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { pusherServer } from "@/lib/pusher";

type SendMessageActionArgs = {
	content: string;
	receiverId: string;
	messageType: "text" | "image";
};

export async function sendMessageAction({ content, messageType, receiverId }: SendMessageActionArgs) {
	const { getUser } = getKindeServerSession();
	const user = await getUser();

	if (!user) return { success: false, message: "User not authenticated" };

	const senderId = user.id;

	const conversationId = `conversation:${[senderId, receiverId].sort().join(":")}`;

	// moramo da sortiramo ajdijeve kako bi id konverzacije uvek bio isti 
	// pera, zika
	// 123,  456

	// pera salje poruku ziki
	// senderId: 123, receiverId: 456
	// `conversation:123:456`

	// zika salje poruku peri
	// senderId: 456, receiverId: 123
	// conversation:456:123

	const conversationExists = await redis.exists(conversationId);

	if (!conversationExists) {
		await redis.hset(conversationId, {
			participant1: senderId,
			participant2: receiverId,
		});

		await redis.sadd(`user:${senderId}:conversations`, conversationId);
		await redis.sadd(`user:${receiverId}:conversations`, conversationId);
	}

	// Generisanje message ajdija
	const messageId = `message:${Date.now()}:${Math.random().toString(36).substring(2, 9)}`;
	const timestamp = Date.now();

	// kreiranje message hesa
	await redis.hset(messageId, {
		senderId,
		content,
		timestamp,
		messageType,
	});

	await redis.zadd(`${conversationId}:messages`, { score: timestamp, member: JSON.stringify(messageId) });

	const channelName = `${senderId}__${receiverId}`.split("__").sort().join("__");

	await pusherServer?.trigger(channelName, "newMessage", {
		message: { senderId, content, timestamp, messageType },
	});

	return { success: true, conversationId, messageId };
}

export async function getMessages(selectedUserId: string, currentUserId: string) {
	// conversation:kp_87f4a115d5f34587940cdee58885a58b:kp_a6bc2324e26548fcb5c19798f6459814:messages

	const conversationId = `conversation:${[selectedUserId, currentUserId].sort().join(":")}`;
	const messageIds = await redis.zrange(`${conversationId}:messages`, 0, -1);

	if (messageIds.length === 0) return [];

    //pajplajn sluzi da grupise komande u 1 zahtev ka bazi, vid optimizacije
	const pipeline = redis.pipeline();
	messageIds.forEach((messageId) => pipeline.hgetall(messageId as string));
	const results = await pipeline.exec();

	const messages = results.map((res, i) => ({
  		...(res as any),         // podaci iz hgeta
  		id: messageIds[i],       // ubacimo ID poruke (Redis key)
	}));
	//const messages = (await pipeline.exec()) as Message[];

	return messages;
}

/**
 * Brisanje poruke – korisnik može obrisati SAMO svoju poruku.
 */
export async function deleteMessageAction(messageId: string, receiverId: string) {
	const { getUser } = getKindeServerSession();
	const user = await getUser();

	if (!user) return { success: false, message: "User not authenticated" };

	const senderId = user.id;

	// Dohvati poruku iz hash-a
	const message = await redis.hgetall(messageId);
	if (!message || !message.senderId) {
		return { success: false, message: "Message not found" };
	}

	// Provera vlasništva
	if (message.senderId !== senderId) {
		return { success: false, message: "You can only delete your own messages" };
	}

	// Odredi konverzaciju
	const conversationId = `conversation:${[senderId, receiverId].sort().join(":")}`;

	// 1. Obriši ID iz sorted seta
	await redis.zrem(`${conversationId}:messages`, messageId);

	// 2. Obriši hash sa podacima o poruci
	await redis.del(messageId);

	// 3. Pošalji obaveštenje kroz Pusher
	const channelName = `${senderId}__${receiverId}`.split("__").sort().join("__");

	await pusherServer?.trigger(channelName, "messageDeleted", { messageId });

	return { success: true, message: "Message deleted" };
}

export async function editMessageAction(messageId: string, receiverId: string, newContent: string) {
  const { getUser } = getKindeServerSession();
  const user = await getUser();

  if (!user) return { success: false, message: "User not authenticated" };

  const senderId = user.id;

  // Dohvati poruku
  const message = await redis.hgetall(messageId);
  if (!message || !message.senderId) {
    return { success: false, message: "Message not found" };
  }

  // Provera vlasništva
  if (message.senderId !== senderId) {
    return { success: false, message: "You can only edit your own messages" };
  }

  // Update samo content
  await redis.hset(messageId, {
    content: newContent,
  });

  // Trigger Pusher event da klijenti osveže poruku
  const channelName = [senderId, receiverId].sort().join("__");
  await pusherServer?.trigger(channelName, "messageEdited", {
    messageId,
    content: newContent,
  });

  return { success: true, message: "Message updated" };
}
