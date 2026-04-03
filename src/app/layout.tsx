import type { Metadata, Viewport } from "next";
import { Inter, Syne } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Vibe Loop — Discover Events Near You",
  description:
    "Find music, art, tech and food events in your city. Connect with people who share your vibes.",
  keywords: ["events", "music", "art", "tech", "milan", "rome", "italy"],
  authors: [{ name: "Vibe Loop" }],
  openGraph: {
    title: "Vibe Loop",
    description: "Discover events near you",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it" className="dark">
      <body
        className={`${inter.variable} ${syne.variable} antialiased bg-[#0a0a0f] text-white min-h-screen`}
      >
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: "#13131a",
              color: "#f1f0ff",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "12px",
            },
          }}
        />
      </body>
    </html>
  );
}
