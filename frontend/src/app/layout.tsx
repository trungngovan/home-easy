import type { Metadata, Viewport } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { AntdRegistry } from "@ant-design/nextjs-registry";

const inter = Inter({ 
  subsets: ["latin", "vietnamese"], 
  variable: "--font-inter",
  display: "swap",
});

const poppins = Poppins({ 
  weight: ["400", "500", "600", "700"],
  subsets: ["latin", "latin-ext"], 
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Home Easy - Quản lý nhà cho thuê thông minh",
  description: "Giải pháp quản lý tài sản, hóa đơn và bảo trì hiệu quả dành cho chủ nhà trọ",
  keywords: ["quản lý nhà trọ", "hóa đơn", "bảo trì", "property management"],
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.ico", type: "image/x-icon" },
      { url: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#F0F9FF",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

  return (
    <html lang="vi" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${poppins.variable} font-sans antialiased bg-[#F0F9FF] text-[#0F172A] min-h-screen selection:bg-primary/20 selection:text-white`}
      >
        <AntdRegistry>
          {googleClientId ? (
            <GoogleOAuthProvider clientId={googleClientId}>
              {children}
            </GoogleOAuthProvider>
          ) : (
            children
          )}
        </AntdRegistry>
      </body>
    </html>
  );
}
