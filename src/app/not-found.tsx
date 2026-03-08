// src/app/not-found.tsx
import ErrorState from "@/components/ErrorState";

export default function NotFound() {
  return (
    <ErrorState 
      title="Página não encontrada" 
      message="Ops! Parece que o caminho que você tentou acessar não existe ou foi movido." 
    />
  );
}