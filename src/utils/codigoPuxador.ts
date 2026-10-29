/** Reconhece o código-base e seu acabamento, sem confundir 30 com 300. */
export function codigoPuxadorCompativel(valor: unknown, base: string): boolean {
  const normalizar = (v: unknown) => String(v ?? "").trim().toUpperCase().replace(/[\s._-]/g, "");
  const codigo = normalizar(valor);
  const esperado = normalizar(base);
  if (!/^PUXBC(?:30|60|80)$/.test(esperado)) return false;
  return codigo === esperado || (codigo.startsWith(esperado) && /^[A-Z]{1,8}$/.test(codigo.slice(esperado.length)));
}
