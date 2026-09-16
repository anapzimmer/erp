const capitalizarParte = (texto: string) => {
  const caracteres = Array.from(texto);
  if (!caracteres.length) return "";

  const [primeiro, ...restante] = caracteres;
  return `${primeiro.toLocaleUpperCase("pt-BR")}${restante.join("").toLocaleLowerCase("pt-BR")}`;
};

export const formatarNomePadrao = (texto?: string | null) => {
  const limpo = String(texto || "")
    .trim()
    .replace(/\s+/g, " ");

  if (!limpo) return "";

  return limpo
    .split(" ")
    .map((palavra) => palavra
      .split(/([-'’])/)
      .map((parte) => (parte === "-" || parte === "'" || parte === "’" ? parte : capitalizarParte(parte)))
      .join(""))
    .join(" ");
};