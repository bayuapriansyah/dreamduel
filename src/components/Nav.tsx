"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sword, Wallet, Warning } from "@phosphor-icons/react";
import { shortAddr, useWallet } from "@/client/wallet";

const LINKS = [
  { href: "/", label: "Arena" },
  { href: "/new", label: "New duel" },
  { href: "/ladder", label: "Ladder" },
  { href: "/setup", label: "Setup" },
];

export function Nav() {
  const path = usePathname();
  const w = useWallet();
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-[1280px] items-center gap-6 px-4 md:px-8">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <Sword size={22} weight="fill" className="text-accent" />
          DreamDuel
        </Link>
        <nav className="hidden items-center gap-1 text-sm md:flex">
          {LINKS.map((l) => {
            const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-full px-3 py-1.5 transition-colors ${active ? "bg-surface-2 text-text" : "text-muted hover:text-text"}`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {w.address && !w.onRightChain ? (
            <button
              onClick={() => w.switchChain()}
              className="flex items-center gap-1.5 rounded-full border border-down/40 px-3 py-1.5 text-sm text-down active:scale-[0.98]"
            >
              <Warning size={16} /> Switch to Tokyo
            </button>
          ) : null}
          <button
            onClick={() => (w.address ? undefined : w.connect().catch((e) => alert(e.message)))}
            className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition active:scale-[0.98] ${
              w.address ? "border border-line bg-surface text-text" : "bg-accent text-accent-ink hover:brightness-110"
            }`}
          >
            <Wallet size={16} weight={w.address ? "regular" : "bold"} />
            {w.address ? <span className="num">{shortAddr(w.address)}</span> : w.connecting ? "Connecting" : "Connect"}
          </button>
        </div>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-4 pb-2 text-sm md:hidden">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className={`shrink-0 rounded-full px-3 py-1 ${path === l.href ? "bg-surface-2" : "text-muted"}`}>
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
