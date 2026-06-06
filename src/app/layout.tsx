import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Montserrat, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/providers";

const sans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const display = Montserrat({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Roam Electric — Charging Infrastructure Tracker",
  description: "Track the progress of Roam Electric charging infrastructure across Kenya. Monitor Roam Hubs, Roam Points, milestones, and real-time analytics.",
  keywords: ["Roam Electric", "EV Charging", "Kenya", "Roam Hub", "Roam Point", "Electric Mobility", "Africa"],
  authors: [{ name: "Roam Electric Infrastructure Tracker" }],
  icons: {
    icon: "/roam-logo-mark-transparent.png",
  },
  openGraph: {
    title: "Roam Electric — Charging Infrastructure Tracker",
    description: "Monitor Roam Hubs, Roam Points, and EV charging progress across Kenya.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${sans.variable} ${display.variable} ${geistMono.variable} antialiased bg-background text-foreground font-sans`}
      >
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
