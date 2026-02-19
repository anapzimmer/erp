// src/types/ferragem.ts
export type Ferragem = {
  id: string;
  codigo: string;
  nome: string;
  cores: string;
  preco: number | null;
  categoria: string;
  empresa_id: string;
};