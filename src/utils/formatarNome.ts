// Lista explícita: palavras curtas como ANA, BOX e COR não são siglas.
const SIGLAS = new Set([
  "LTDA", "ME", "MEI", "EPP", "EIRELI", "SA", "S/A", "S.A.",
  "PVC", "UPVC", "ACM", "MDF", "MDP", "PVB", "EVA", "LED", "UV",
  "EPDM", "ABS", "PET", "PU", "PS", "HPL", "CNC", "ABNT", "NBR",
  "ERP", "CNPJ", "CPF", "IE", "IM", "V/V", "V/A",
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO",
]);

/** Padroniza nomes descritivos; não aplicar a códigos, documentos ou e-mails. */
export const formatarNomePadrao = (texto?: string | null): string => {
  const limpo = String(texto ?? "").trim().replace(/\s+/g, " ");
  return limpo.replace(/[\p{L}\p{N}]+(?:[./-][\p{L}\p{N}]+)*\.?/gu, (termo) => {
    const maiusculo = termo.toLocaleUpperCase("pt-BR");
    if (SIGLAS.has(maiusculo)) return maiusculo;
    // Medidas e unidades continuam legíveis; códigos como 1101A-PT e VT66
    // mantêm suas letras em maiúsculas mesmo quando fazem parte do nome.
    if (/^(?:\d+(?:[.,]\d+)?)?(?:mm|cm|m|m2|m²|kg|g|ml|l)$/i.test(termo)) {
      return termo.toLocaleLowerCase("pt-BR");
    }
    if (/\d/u.test(termo)) return maiusculo;
    return termo.toLocaleLowerCase("pt-BR").replace(/(^|[./-])\p{L}/gu,
      (inicio) => inicio.toLocaleUpperCase("pt-BR"));
  });
};
