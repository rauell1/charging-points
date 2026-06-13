import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Montserrat, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/providers";

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://charging-points-iota.vercel.app";

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${BASE_URL}/#organization`,
      name: "Roam Electric",
      url: "https://www.roam-electric.com",
      description:
        "Roam Electric builds and operates electric vehicle charging infrastructure across Kenya.",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Nairobi",
        addressCountry: "KE",
      },
      areaServed: {
        "@type": "Country",
        name: "Kenya",
      },
      knowsAbout: [
        "EV Charging",
        "Electric Vehicles",
        "Sustainable Transport",
        "Kenya",
      ],
    },
    {
      "@type": "WebSite",
      "@id": `${BASE_URL}/#website`,
      url: BASE_URL,
      name: "Roam Electric Charging Infrastructure Tracker",
      description:
        "Live dashboard tracking Roam Electric charging infrastructure deployments — Roam Hubs and Roam Points across Kenya.",
      publisher: { "@id": `${BASE_URL}/#organization` },
    },
    {
      "@type": "Dataset",
      "@id": `${BASE_URL}/#dataset`,
      name: "Roam Electric Charging Stations Kenya",
      description:
        "Real-time data on Roam Electric EV charging station deployments across Kenya, including Roam Hubs and Roam Points.",
      url: BASE_URL,
      creator: { "@id": `${BASE_URL}/#organization` },
      spatialCoverage: {
        "@type": "Place",
        name: "Kenya",
      },
      temporalCoverage: "2024/..",
      keywords: [
        "EV charging",
        "electric vehicles",
        "Kenya",
        "Roam Electric",
        "charging stations",
      ],
    },
  ],
};

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
  metadataBase: new URL(BASE_URL),
  title: "Roam Electric - Charging Infrastructure Tracker",
  description:
    "Track the progress of Roam Electric charging infrastructure across Kenya. Monitor Roam Hubs, Roam Points, milestones, and real-time analytics.",
  keywords: [
    "Roam Electric",
    "EV Charging",
    "Kenya",
    "Roam Hub",
    "Roam Point",
    "Electric Mobility",
    "Africa",
    "EV charging stations Kenya",
    "electric vehicles Kenya",
  ],
  authors: [{ name: "Roam Electric Infrastructure Tracker" }],
  alternates: {
    canonical: BASE_URL,
  },
  icons: {
    icon: "/roam-logo-mark-transparent.png",
  },
  openGraph: {
    title: "Roam Electric - Charging Infrastructure Tracker",
    description:
      "Monitor Roam Hubs, Roam Points, and EV charging progress across Kenya.",
    type: "website",
    url: BASE_URL,
    siteName: "Roam Electric Charging Tracker",
    locale: "en_KE",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
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
