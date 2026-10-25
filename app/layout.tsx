import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ReactNode } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { StorageBoundary } from "@/components/StorageBoundary";
import { ClockProvider } from "@/context/ClockContext";
import { ChessGameProvider } from "@/components/screens/chess/GameContext";
import { PrivateStoreBoundary } from "@/components/PrivateStoreBoundary";
import { PwaRegistration } from "@/components/PwaRegistration";

export const metadata: Metadata = {
  title: "Moobi",
  description: "Explore mini apps inside a polished virtual phone playground.",
  keywords: [
    "Moobi",
    "virtual phone",
    "web phone emulator",
    "simulated smartphone",
    "virtual mobile OS",
    "web apps",
    "browser-based phone",
    "UI simulation",
    "digital phone interface",
  ],
  icons: {
    icon: [
      { url: "/icons/moobi-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/moobi-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "Moobi",
    statusBarStyle: "black-translucent",
  },
  openGraph: {
    title: "Moobi",
    description:
      "Explore mini apps inside a polished virtual phone playground.",
    url: "https://epiphanusonyeso.vercel.app",
    siteName: "Moobi",
    images: [
      {
        url: "https://moobi.vercel.app/images/logo.webp",
        width: 650,
        height: 300,
        alt: "Moobi",
      },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="bg-black antialiased">
        <PwaRegistration />
        <StorageBoundary>
          <PrivateStoreBoundary />
          <ThemeProvider>
            <ClockProvider>
              <ChessGameProvider>
                {/*<Analytics />*/}
                {/*<SpeedInsights />*/}
                {children}
              </ChessGameProvider>
            </ClockProvider>
          </ThemeProvider>
        </StorageBoundary>
      </body>
    </html>
  );
}
