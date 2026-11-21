import type { Metadata, Viewport } from "next";
import { RegisterSW } from "./register-sw";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hospisafe | Hospital Hygiene Management",
  description: "A smarter way to manage hospital sanitation, cleaning tasks, and room readiness.",
  applicationName: "Hospisafe",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Hospisafe"
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/icon.svg"
  }
};

export const viewport: Viewport = {
  themeColor: "#123b43",
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <RegisterSW />
        {children}
      </body>
    </html>
  );
}
