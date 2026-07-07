import { Client, type IMessage, type StompSubscription } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { API_BASE_URL } from "./api";

export type RealtimeMessageHandler<T = any> = (
  payload: T,
  message: IMessage,
) => void;

const getWsBaseUrl = () => {
  const configured = (API_BASE_URL || "").replace(/\/$/, "");
  if (configured) return configured;
  return window.location.origin;
};

class RealtimeService {
  private client: Client | null = null;
  private subscriptions = new Map<string, StompSubscription>();
  private connectHandlers = new Set<() => void>();
  private disconnectHandlers = new Set<() => void>();

  connect(accessToken?: string | null) {
    const token = accessToken || localStorage.getItem("accessToken");
    if (!token) return;
    if (this.client?.active) return;

    this.client = new Client({
      webSocketFactory: () => new SockJS(`${getWsBaseUrl()}/ws`),
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      debug: () => undefined,
    });

    this.client.onConnect = () => {
      this.connectHandlers.forEach((handler) => handler());
    };

    this.client.onWebSocketClose = () => {
      this.disconnectHandlers.forEach((handler) => handler());
    };

    this.client.onStompError = (frame) => {
      console.error("Erreur STOMP:", frame.headers.message || frame.body);
    };

    this.client.activate();
  }

  disconnect() {
    this.subscriptions.forEach((subscription) => subscription.unsubscribe());
    this.subscriptions.clear();
    this.client?.deactivate();
    this.client = null;
  }

  subscribe<T = any>(destination: string, handler: RealtimeMessageHandler<T>) {
    if (!this.client?.connected) return () => undefined;

    const existing = this.subscriptions.get(destination);
    existing?.unsubscribe();

    const subscription = this.client.subscribe(destination, (message) => {
      try {
        handler(JSON.parse(message.body) as T, message);
      } catch (error) {
        console.error(`Payload WebSocket invalide pour ${destination}`, error);
      }
    });

    this.subscriptions.set(destination, subscription);

    return () => {
      subscription.unsubscribe();
      this.subscriptions.delete(destination);
    };
  }

  onConnect(handler: () => void) {
    this.connectHandlers.add(handler);
    return () => this.connectHandlers.delete(handler);
  }

  onDisconnect(handler: () => void) {
    this.disconnectHandlers.add(handler);
    return () => this.disconnectHandlers.delete(handler);
  }
}

export const realtimeService = new RealtimeService();
