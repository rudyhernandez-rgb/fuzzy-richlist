import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "FuzzyRichlist — $FUZZY Rich List on XRPL",
    template: "%s | FuzzyRichlist",
  },
  description:
    "Live on-chain analytics for $FUZZY on the XRP Ledger. Track top holders, whales, supply distribution, live price, and recent transactions.",
  keywords: [
    "FUZZY",
    "XRPL",
    "XRP Ledger",
    "rich list",
    "crypto analytics",
    "memecoin",
    "holders",
    "whale tracker",
    "Fuzzybear",
    "XRP token",
    "FUZZY token",
    "on-chain analytics",
  ],
  metadataBase: new URL("https://fuzzyrichlist.com"),
  alternates: {
    canonical: "https://fuzzyrichlist.com",
  },
  openGraph: {
    title: "FuzzyRichlist — $FUZZY Rich List on XRPL",
    description:
      "Live on-chain analytics for $FUZZY on the XRP Ledger. Track top holders, whales, supply distribution, live price, and recent transactions.",
    url: "https://fuzzyrichlist.com",
    siteName: "FuzzyRichlist",
    images: [
      {
        url: "/logo.png",
        width: 512,
        height: 512,
        alt: "FuzzyRichlist — $FUZZY Analytics",
      },
    ],
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary",
    title: "FuzzyRichlist — $FUZZY Rich List on XRPL",
    description:
      "Live on-chain analytics for $FUZZY on the XRP Ledger. Track top holders, whales, supply distribution, live price, and recent transactions.",
    images: ["/logo.png"],
    site: "@Rune_XRPL",
    creator: "@Rune_XRPL",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}