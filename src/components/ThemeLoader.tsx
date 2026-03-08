//src/components/ThemeLoader.tsx
"use client";

import { useTheme } from "@/context/ThemeContext";
import { ReactNode } from "react";

export default function ThemeLoader({ children }: { children: ReactNode }) {
  const { isLoading } = useTheme();

  if (isLoading) {
    return (
      <div style={{ 
        backgroundColor: '#FFFFFF',
        height: '100vh', 
        width: '100vw',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        color: '#1C415B',
        gap: '30px'
      }}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="100" height="100">
          <circle fill="#2A5C7E" stroke="#2A5C7E" strokeWidth="15" r="15" cx="40" cy="65">
            <animate attributeName="cy" calcMode="spline" dur="2s" values="65;135;65" keySplines=".5 0 .5 1;.5 0 .5 1" repeatCount="indefinite" begin="-.4s"></animate>
          </circle>
          <circle fill="#2A5C7E" stroke="#2A5C7E" strokeWidth="15" r="15" cx="100" cy="65">
            <animate attributeName="cy" calcMode="spline" dur="2s" values="65;135;65" keySplines=".5 0 .5 1;.5 0 .5 1" repeatCount="indefinite" begin="-.2s"></animate>
          </circle>
          <circle fill="#2A5C7E" stroke="#2A5C7E" strokeWidth="15" r="15" cx="160" cy="65">
            <animate attributeName="cy" calcMode="spline" dur="2s" values="65;135;65" keySplines=".5 0 .5 1;.5 0 .5 1" repeatCount="indefinite" begin="0s"></animate>
          </circle>
        </svg>
        
        <span style={{ fontSize: '14px', fontWeight: '500', letterSpacing: '0.05em' }}>
          Carregando sistema...
        </span>
      </div>
    );
  }

  return <>{children}</>;
}