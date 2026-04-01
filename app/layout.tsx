import type { Metadata } from "next";
import { Rajdhani, JetBrains_Mono } from "next/font/google";
import "./globals.css";
// Ensure BigInt JSON serialization is safe before anything else runs
import "./utils/bigintJson";
import { Providers } from "./providers";
import { Toaster } from "react-hot-toast";

const rajdhani = Rajdhani({
  variable: "--font-rajdhani",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Void Tactics",
  description: "Don't play to earn, play to win",
  // Talent App domain / project verification (public token, non-executable).
  other: {
    "talentapp:project_verification":
      "ccd99a570185c2fec7a44930dc3b30732f617a6bd4390ebcff5c3f16e020448312fd63176d45ad22493038ef29dd21349e6c9169bc365e484ded9857e07b5a98",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${rajdhani.variable} ${jetbrainsMono.variable}`}
      >
        <Providers>{children}</Providers>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: "#1a2430",
              color: "#e2e8f0",
              border: "2px solid #223041",
              borderRadius: "0",
              fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            },
          }}
        />
      </body>
    </html>
  );
}
