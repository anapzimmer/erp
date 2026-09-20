// app/layout.tsx
import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";
// 🔥 Importe o novo componente
import ThemeLoader from "@/components/ThemeLoader";
import SecurityProvider from "@/components/SecurityProvider";
import AppShell from "@/components/AppShell";
import PlatformAccessGate from "@/components/PlatformAccessGate";

const inter = localFont({
  src: "../../public/fonts/Inter.ttf",
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Glass Code ERP",
  description: "Sistema de Gestão",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable} suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className="antialiased"
      >
        <ThemeProvider>
          {/* 🔥 Agora o Loader está em um componente client separado */}
          <ThemeLoader>
            <SecurityProvider>
              <PlatformAccessGate>
                <AppShell>{children}</AppShell>
              </PlatformAccessGate>
            </SecurityProvider>
          </ThemeLoader>
        </ThemeProvider>
      </body>
    </html>
  );
}

