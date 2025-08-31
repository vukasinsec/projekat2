import PusherServer from "pusher";
import PusherClient from "pusher-js";

declare global {
	var pusherServer: PusherServer | undefined;
	var pusherClient: PusherClient | undefined;
}

export const pusherServer =
	globalThis.pusherServer ||
	new PusherServer({
		appId: process.env.PUSHER_APP_ID!,
		key: process.env.PUSHER_APP_KEY!,
		secret: process.env.PUSHER_APP_SECRET!,
		cluster: "eu",
		useTLS: true,
	});

    globalThis.pusherServer = pusherServer;

export const pusherClient =
	globalThis.pusherClient || new PusherClient(process.env.NEXT_PUBLIC_PUSHER_APP_KEY!, { cluster: "eu" });
    globalThis.pusherClient = pusherClient;