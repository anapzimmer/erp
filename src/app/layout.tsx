// src/app/layout.tsx
import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider } from "@/context/AuthContext";

import ThemeLoader from "@/components/ThemeLoader";
import SecurityProvider from "@/components/SecurityProvider";
import PlatformAccessGate from "@/components/PlatformAccessGate";
import AppShell from "@/components/AppShell";

const inter = localFont({
  src: "../../public/fonts/Inter.ttf",
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.glasscode.com.br"),

  title: {
    default: "Glass Code | Software para Indústrias de Vidro Temperado",
    template: "%s | Glass Code",
  },

  description:
    "Software para indústrias de vidro temperado. Crie orçamentos, calcule vidros e materiais, gerencie clientes, tabelas de preços e projetos em um só sistema.",

  keywords: [
    "software para indústria de vidro",
    "software para indústria de vidro temperado",
    "sistema para temperadora",
    "sistema para indústria de vidros",
    "software para vidraçaria",
    "sistema para orçamento de vidros",
    "programa para orçamento de vidros",
    "ERP para indústria de vidro",
    "Glass Code",
  ],

  alternates: {
    canonical: "/",
  },

  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "https://www.glasscode.com.br",
    siteName: "Glass Code",
    title: "Glass Code | Software para Indústrias de Vidro Temperado",
    description:
      "Orçamentos, cálculos de vidros e materiais, clientes, tabelas de preços e projetos em um só sistema.",
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="pt-BR"
      className={inter.variable}
      suppressHydrationWarning
    >
      <body
        suppressHydrationWarning
        className="antialiased"
      >
        <ThemeProvider>
          <ThemeLoader>
            <SecurityProvider>
              <AuthProvider>
                <PlatformAccessGate>
                  <AppShell>{children}</AppShell>
                </PlatformAccessGate>
              </AuthProvider>
            </SecurityProvider>
          </ThemeLoader>
        </ThemeProvider>
      </body>
    </html>
  );
}