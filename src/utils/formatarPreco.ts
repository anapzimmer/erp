export function formatarPreco(valor: number | null): string {
  if (valor === null || isNaN(valor)) return "-";
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
