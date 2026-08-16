import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  applicationName: "BluePrint",
  title: "BluePrint",
  description:
    "Turn a software idea into architecture, a technology stack, a diagram, and a four-week development roadmap.",
  openGraph: {
    title: "BluePrint",
    description:
      "Turn a software idea into architecture, a technology stack, a diagram, and a four-week development roadmap.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "BluePrint",
    description:
      "Turn a software idea into architecture, a technology stack, a diagram, and a four-week development roadmap.",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
