export interface Ferragem {
  id: string
  codigo: string
  nome: string
  cor?: string
  categoria?: string
  preco?: number
}

export interface Branding {
  nome_empresa: string
  logo_url?: string
  cor_primaria?: string
}
