import type { Metadata } from "next";
import "./globals.css";
import AppHeader from "@/app/ui/AppHeader";
import { InfraProvider } from "@/app/providers";

export const metadata: Metadata = {
  title: "Roam Infrastructure Tracker",
  description: "Track progress for Roam Hub and Roam Point charging infrastructure.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <InfraProvider>
          <AppHeader />
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
            {children}
          </main>
        </InfraProvider>
      </body>
    </html>
  );
}
