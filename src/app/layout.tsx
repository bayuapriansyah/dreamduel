import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { WalletProvider } from "@/client/wallet";
import { Nav } from "@/components/Nav";
import "./globals.css";

const sans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: "DreamDuel: perps duels on dreamDEX",
  description: "Challenge a trader to a timed perps duel on dreamDEX. Same market, same cap, scored on-chain on Somnia.",
  metadataBase: new URL(process.env.PUBLIC_URL ?? "http://localhost:3000"),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body className="min-h-[100dvh] bg-bg text-text">
        <WalletProvider>
          <Nav />
          <main className="mx-auto w-full max-w-[1280px] px-4 pb-24 md:px-8">{children}</main>
          <footer className="mx-auto flex w-full max-w-[1280px] flex-col gap-2 border-t border-line px-4 py-8 text-sm text-muted md:flex-row md:justify-between md:px-8">
            <p>Built on dreamDEX perps, Somnia Tokyo testnet. Paper money, real orders.</p>
            <p>
              <a className="underline-offset-4 hover:underline" href="https://x.com/DreamDEXSomnia" target="_blank" rel="noreferrer">
                @DreamDEXSomnia
              </a>
            </p>
          </footer>
        </WalletProvider>
      </body>
    </html>
  );
}
