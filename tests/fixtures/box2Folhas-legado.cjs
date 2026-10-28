// Oráculo congelado: useMemo de develop c57663f, antes da extração.
const arredondar5cm = (valor) => Math.ceil(Number(valor || 0) / 50) * 50;
module.exports = function calcularLegado(dados) {
    const quantidadeVaos = Number(dados.quantidade || 0);
    const alturaAteTeto = dados.trilho === "Até o teto";
    const larguraFixaMedida = Number(dados.largura || 0) / 2;
    const larguraMovelMedida = larguraFixaMedida + 50;
    const alturaFixaMedida = Math.max(0, Number(dados.altura || 0) - (alturaAteTeto ? 55 : 35));
    const alturaMovelMedida = Math.max(0, Number(dados.altura || 0) - (alturaAteTeto ? 20 : 0));
    const larguraFixa = arredondar5cm(larguraFixaMedida);
    const larguraMovel = arredondar5cm(larguraMovelMedida);
    const alturaFixa = arredondar5cm(alturaFixaMedida);
    const alturaMovel = arredondar5cm(alturaMovelMedida);
    const areaFixa = (larguraFixa * alturaFixa * quantidadeVaos) / 1_000_000;
    const areaMovel = (larguraMovel * alturaMovel * quantidadeVaos) / 1_000_000;
    const areaTotalCobrada = areaFixa + areaMovel;

    return {
      larguraCalculo: larguraMovel,
      alturaCalculo: alturaMovel,
      larguraFixa,
      alturaFixa,
      larguraMovel,
      alturaMovel,
      larguraFixaMedida,
      alturaFixaMedida,
      larguraMovelMedida,
      alturaMovelMedida,
      areaFixa: Number(areaFixa.toFixed(3)),
      areaMovel: Number(areaMovel.toFixed(3)),
      areaTotalCobrada: Number(areaTotalCobrada.toFixed(3)),
    };
};
