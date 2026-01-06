import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "Agentic SOC UI",
  description: "Agentic SOC UI",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

