import { syncedStore, getYjsValue } from "@syncedstore/core";
import { WebrtcProvider } from "y-webrtc";
import { svelteSyncedStore } from "@syncedstore/svelte";

// Create your SyncedStore store
export const store = syncedStore({ transport: {}, fragment: "xml" });
export const svelteStore = svelteSyncedStore(store);

// Create a document that syncs automatically using Y-WebRTC
export const doc = getYjsValue(store);
// doc.destroy()
export const webrtcProvider = new WebrtcProvider("ping-pong", doc);

export const awareness = webrtcProvider.awareness

export const disconnect = () => webrtcProvider.disconnect();
export const connect = () => webrtcProvider.connect();
