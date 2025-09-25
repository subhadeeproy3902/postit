import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppSidebar } from "@/components/ChatsSidebar"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "POSTIT",
  description: "The Best AI LinkedIn Content Agent. Just share your idea, thats it nothing else, AI will post it for you.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
        >
          <SessionProvider>
            <AuthProvider>
              <SidebarProvider
                defaultOpen={false}
              >
                <AppSidebar variant="floating" />
                <SidebarInset>
                  {children}
                </SidebarInset>
              </SidebarProvider>
              <Toaster />
            </AuthProvider>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
