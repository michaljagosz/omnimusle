import type { Metadata } from "next";
import "./globals.css";
import BottomNav from "./components/BottomNav"; // Importujemy nasz pasek

export const metadata: Metadata = {
  title: "Omnimusle - Ultimate Daily Music Quiz",
  description: "Guess the song, artist and more!",
  manifest: "/manifest.json", // To przyda się później do PWA
  themeColor: "#09090b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-zinc-950 text-white antialiased">
        
        {/* Główna treść strony */}
        {/* Dodajemy pb-24 (padding bottom), żeby nawigacja nie zasłaniała przycisków na dole */}
        <div className="pb-24">
          {children}
        </div>

        {/* Nasz nowy pasek nawigacji */}
        <BottomNav />
        
      </body>
    </html>
  );
}