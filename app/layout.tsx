import type { Metadata } from "next";
import "./globals.css";
import { ReactNode } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { StorageBoundary } from "@/components/StorageBoundary";
import { ClockProvider } from "@/context/ClockContext";
import { ChessGameProvider } from "@/components/screens/chess/GameContext";
import { PrivateStoreBoundary } from "@/components/PrivateStoreBoundary";

export const metadata: Metadata = {
  title: "Moobi",
  description:
    "Experience a fully interactive mobile phone inside your browser. Browse, call, text, and launch apps — all in one virtual interface.",
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
    icon: "/images/logo.webp",
  },
  openGraph: {
    title: "Moobi",
    description:
      "Experience a fully interactive mobile phone inside your browser. Browse, call, text, and launch apps — all in one virtual interface.",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="bg-black antialiased">
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
