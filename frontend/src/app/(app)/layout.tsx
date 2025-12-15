"use client";

import type { ReactNode } from "react";
import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { QueryClientProvider } from "@tanstack/react-query";
import { ConfigProvider, App } from "antd";
import viVN from "antd/locale/vi_VN";
import Sidebar from "@/components/Sidebar";
import { getAuthToken, getUser } from "@/lib/api";
import { antdTheme } from "@/lib/antd-theme";
import { queryClient } from "@/lib/react-query";
import { UnreadNotificationsProvider } from "@/contexts/UnreadNotificationsContext";

type AuthState = "loading" | "authenticated" | "unauthenticated";

// Landlord-only routes
const LANDLORD_ONLY_ROUTES = [
  "/properties",
  "/rooms",
  "/tenants",
  "/invites",
  "/payments",
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authState, setAuthState] = useState<AuthState>("loading");

  const checkAuth = useCallback(() => {
    // Must run on client
    if (typeof window === "undefined") {
      return "loading" as AuthState;
    }

    // Check for token
    const token = getAuthToken();
    console.log("[Auth] Token exists:", !!token);
    
    if (!token) {
      console.log("[Auth] No token found, redirecting to login");
      return "unauthenticated" as AuthState;
    }

    // Check for user data
    const user = getUser();
    console.log("[Auth] User data:", user);
    
    if (!user) {
      console.log("[Auth] No user data found, redirecting to login");
      return "unauthenticated" as AuthState;
    }

    // Both landlords and tenants can access the web portal
    console.log("[Auth] User authenticated:", user.full_name, "Role:", user.role);
    return "authenticated" as AuthState;
  }, []);

  useEffect(() => {
    const state = checkAuth();
    setAuthState(state);

    if (state === "unauthenticated") {
      router.replace("/login");
      return;
    }

    // Route protection: redirect tenants from landlord-only routes
    if (state === "authenticated") {
      const user = getUser();
      if (user?.role === "tenant") {
        const isLandlordOnlyRoute = LANDLORD_ONLY_ROUTES.some(route => 
          pathname === route || pathname.startsWith(`${route}/`)
        );
        if (isLandlordOnlyRoute) {
          router.replace("/dashboard");
        }
      }
    }
  }, [checkAuth, router, pathname]);

  // Show loading while checking auth
  if (authState === "loading") {
    return (
      <div className="min-h-screen bg-[#F0F9FF] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Redirect if not authenticated (this also prevents flash of content)
  if (authState === "unauthenticated") {
    return (
      <div className="min-h-screen bg-[#F0F9FF] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={antdTheme} locale={viVN}>
        <App>
          <UnreadNotificationsProvider>
            <div className="min-h-screen bg-[#F0F9FF]">
              {/* Sidebar */}
              <Sidebar />
              
              {/* Main Content - Responsive margin */}
              <main className="ml-0 lg:ml-64 min-h-screen pt-16 lg:pt-0">
                {children}
              </main>
            </div>
          </UnreadNotificationsProvider>
        </App>
      </ConfigProvider>
    </QueryClientProvider>
  );
}

