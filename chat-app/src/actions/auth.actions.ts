"use server";
import { redis } from "@/lib/db";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";

export async function checkAuthStatus() {
	const { getUser } = getKindeServerSession();
	const user = await getUser();

	if (!user) return { success: false };

	// nejmspejs je user:, zatim ide id samog usera 123 npr.
	const userId = `user:${user.id}`;

	const existingUser = await redis.hgetall(userId);

	// registracija jer juzer posecuje prvi put platformu
	if (!existingUser || Object.keys(existingUser).length === 0) {
		const imgIsNull = user.picture?.includes("gravatar");
		const image = imgIsNull ? "" : user.picture;

		await redis.hset(userId, {
			id: user.id,
			email: user.email,
			name: `${user.given_name} ${user.family_name}`,
			image: image,
		});
	}

	return { success: true };
}