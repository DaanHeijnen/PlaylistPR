import type { Metadata } from "next";
import "@/styles/globals.css";
import { AppShell } from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "Playlist PR",
  description: "Spotify playlist request approvals for shared playlists"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en">
    <head>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0" />
    </head>
    <body><AppShell>{children}</AppShell></body>
  </html>;
}
