/** Padroniza nomes descritivos; não aplicar a códigos, documentos ou e-mails. */
export const formatarNomePadrao = (texto?: string | null): string => {
  const limpo = String(texto ?? "").trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR");
  return limpo.replace(/\p{L}/u, (letra) => letra.toLocaleUpperCase("pt-BR"));
};
