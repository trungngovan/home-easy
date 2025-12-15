"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { apiFetch, endpoints } from "@/lib/api";

interface UnreadNotificationsContextType {
  unreadCount: number;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

const UnreadNotificationsContext = createContext<UnreadNotificationsContextType | undefined>(undefined);

export function UnreadNotificationsProvider({ children }: { children: ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await apiFetch<{ unread_count: number }>(
        `${endpoints.notifications}unread_count/`
      );
      setUnreadCount(data.unread_count);
    } catch (err) {
      console.error("Failed to fetch unread count:", err);
      setUnreadCount(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
    // Refetch every 30 seconds to keep count updated
    const interval = setInterval(refetch, 30000);
    return () => clearInterval(interval);
  }, [refetch]);

  return (
    <UnreadNotificationsContext.Provider value={{ unreadCount, isLoading, refetch }}>
      {children}
    </UnreadNotificationsContext.Provider>
  );
}

export function useUnreadNotifications() {
  const context = useContext(UnreadNotificationsContext);
  if (context === undefined) {
    throw new Error("useUnreadNotifications must be used within UnreadNotificationsProvider");
  }
  return context;
}
