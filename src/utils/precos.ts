export const normalizarPrecoCatalogo = (valor: unknown): number => {
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : 0;
  if (valor === null || valor === undefined) return 0;

  const texto = String(valor)
    .trim()
    .replace(/\s/g, "")
    .replace(/[^\d,.-]/g, "");

  if (!texto) return 0;

  const temVirgula = texto.includes(",");
  const temPonto = texto.includes(".");

  if (temVirgula && temPonto) {
    const normalizado = texto.replace(/\./g, "").replace(",", ".");
    const numero = Number(normalizado);
    return Number.isFinite(numero) ? numero : 0;
  }

  if (temVirgula) {
    const normalizado = texto.replace(",", ".");
    const numero = Number(normalizado);
    return Number.isFinite(numero) ? numero : 0;
  }

  const numero = Number(texto);
  return Number.isFinite(numero) ? numero : 0;
};
