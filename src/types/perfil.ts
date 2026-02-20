export interface Perfil {
  id?: string;
  codigo: string;
  nome: string;
  cores: string;
  preco: number | null;
  categoria: string;
  empresa_id?: string;
  criado_em?: string;
}