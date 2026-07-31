import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Moodboard — Campaña Otoño 2026",
  description:
    "Espacio visual colaborativo para producciones editoriales, fotografía y video.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://images.unsplash.com" />
      </head>
      <body>{children}</body>
    </html>
  );
}
