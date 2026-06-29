import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Zyphra — AI API Billing & Key Management for Teams",
  description:
    "Manage Anthropic and OpenAI API keys for your development team with per-developer budgets, usage tracking, smart routing, and prompt caching. Cut AI costs by 50-90%.",
  keywords: [
    "AI API management",
    "Anthropic API keys",
    "OpenAI API keys",
    "API billing",
    "developer budgets",
    "cost optimization",
    "API proxy",
  ],
  openGraph: {
    title: "Zyphra — AI API Billing & Key Management for Teams",
    description:
      "Manage Anthropic and OpenAI API keys for your development team with per-developer budgets, usage tracking, smart routing, and prompt caching.",
    url: "https://zyphra.vercel.app",
    siteName: "Zyphra",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Zyphra — AI API Billing for Teams",
    description:
      "Cut your team's AI bills by 50-90% with smart routing, per-developer budgets, and prompt caching.",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Zyphra",
  applicationCategory: "DeveloperApplication",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="bg-bg-base text-ink-primary antialiased">
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
