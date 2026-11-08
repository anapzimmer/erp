// src/app/layout.tsx
import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider } from "@/context/AuthContext";

import ThemeLoader from "@/components/ThemeLoader";
import SecurityProvider from "@/components/SecurityProvider";
import PlatformAccessGate from "@/components/PlatformAccessGate";
import { RegraMedidaVidroProvider } from "@/context/RegraMedidaVidroContext";
import AppShell from "@/components/AppShell";

const inter = localFont({
  src: "../../public/fonts/Inter.ttf",
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.glasscode.com.br"),

  title: {
    default: "Glass Code | Software para Vidraçarias",
    template: "%s | Glass Code",
  },

  description:
    "Sistema simples para pequenas vidraçarias: agilize cálculos de vidros e espelhos e orçamentos em PDF, com atendimento personalizado para ajudar no dia a dia.",

  keywords: ["software para vidraçaria", "sistema para pequenas vidraçarias", "orçamento de vidros", "cálculo de vidros e espelhos", "Glass Code"],

  alternates: {
    canonical: "/",
  },

  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "https://www.glasscode.com.br",
    siteName: "Glass Code",
    title: "Glass Code | Software para Vidraçarias",
    description:
      "Orçamentos e cálculos para pequenas vidraçarias, com organização e atendimento próximo para ajudar sua empresa.",
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
                  <RegraMedidaVidroProvider><AppShell>{children}</AppShell></RegraMedidaVidroProvider>
                </PlatformAccessGate>
              </AuthProvider>
            </SecurityProvider>
          </ThemeLoader>
        </ThemeProvider>
      </body>
    </html>
  );
}