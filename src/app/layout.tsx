import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SocialHub Pro — Social Media Management Platform",
  description:
    "Manage, schedule and publish to Facebook, Instagram, X, LinkedIn, TikTok and YouTube for all your companies from one dashboard. Multi-tenant and white-label ready.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
