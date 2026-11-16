import type { Metadata } from "next";
import Link from "next/link";
import { DeveloperMode } from "@/components/developer-mode";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fridge Rescue — vakarienė iš to, ką turi",
  description: "Rask receptą, išsisaugok jį ir pritaikyk pagal savo poreikius.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="lt" data-scroll-behavior="smooth">
      <body>
        <header className="site-header">
          <Link href="/" className="brand" aria-label="Fridge Rescue — pradžia">
            <span className="brand-mark">FR</span>
            <span>fridge<span className="brand-accent">rescue</span></span>
          </Link>
          <nav className="header-nav" aria-label="Pagrindinė navigacija">
            <Link href="/">Receptai</Link>
            <Link href="/account" className="account-link">Paskyra <span aria-hidden="true">↗</span></Link>
          </nav>
        </header>
        <DeveloperMode />
        <main>{children}</main>
        <footer className="site-footer">Mažiau maisto švaistymo, daugiau skanių idėjų. <span>Receptų duomenys iš TheMealDB</span></footer>
      </body>
    </html>
  );
}
