// src/lib/pusherClient.ts
// Pusher solo existe en el browser — se crea de forma lazy la primera vez que se pide
let _client: import("pusher-js").default | null = null;

export async function getPusherClient(): Promise<import("pusher-js").default> {
  if (typeof window === "undefined") {
    throw new Error("getPusherClient solo puede llamarse en el browser");
  }
  if (!_client) {
    const PusherJs = (await import("pusher-js/with-encryption")).default;
    _client = new PusherJs(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      forceTLS: true,
    });
  }
  return _client;
}