import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AtomQuest Goals Portal",
  description: "Hackathon MVP for goal setting, approvals, and quarterly check-ins.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
