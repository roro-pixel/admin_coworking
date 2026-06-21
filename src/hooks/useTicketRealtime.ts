import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { realtimeService } from "../services/realtime.service";

export interface TicketRealtimeMessage {
  id: number;
  senderType: "CLIENT" | "AGENT" | "SYSTEM" | string;
  senderId: string;
  senderName: string;
  content: string;
  internal: boolean;
  createdAt: string;
}

export const useTicketRealtime = (
  ticketNumber: string | undefined,
  options?: {
    enabled?: boolean;
    onMessage?: (message: TicketRealtimeMessage) => void;
  },
) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!ticketNumber || options?.enabled === false) return;

    realtimeService.connect(localStorage.getItem("accessToken"));

    const subscribe = () =>
      realtimeService.subscribe<TicketRealtimeMessage>(
        `/topic/support/tickets/${ticketNumber}`,
        (message) => {
          options?.onMessage?.(message);
          queryClient.invalidateQueries({
            queryKey: ["support-ticket", ticketNumber],
          });
          queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
        },
      );

    let unsubscribe = subscribe();
    const offReconnect = realtimeService.onConnect(() => {
      unsubscribe?.();
      unsubscribe = subscribe();
    });

    return () => {
      unsubscribe?.();
      offReconnect();
    };
  }, [ticketNumber, options?.enabled, options?.onMessage, queryClient]);
};
