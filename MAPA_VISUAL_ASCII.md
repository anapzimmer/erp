# 🗺️ MAPA VISUAL PRÁTICO - Calcular Projeto

## SEÇÕES ATUAIS (Lado Direito - Painel de Resultados)

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 1️⃣  TOTAIS CONSOLIDADOS (Grand Summary)              ┃
┃─────────────────────────────────────────────────────┃
┃ 💰 GRANDE: $XXXXX                                   ┃
┃ ┌─────────┬─────────┬─────────┬─────────┬─────────┐ ┃
┃ │ Vidros  │  Kits   │ Perfis  │ Ferragen│  Total  │ ┃
┃ │ $5000   │  $0     │ $2000   │ $500    │ $7500   │ ┃
┃ └─────────┴─────────┴─────────┴─────────┴─────────┘ ┃
┃ Cliente: Acme | 2 projetos | Economia: $100        ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
                        ⬇  (REDUNDÂNCIA #1)
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 2️⃣  RELATÓRIO DA OBRA (Detalhes por Projeto)       ┃
┃─────────────────────────────────────────────────────┃
┃ 📦 OBRA 1 - Janela Basculante                       ┃
┃ ┌─────────────────┬─────────────────────────────────┐│
┃ │ VIDROS (bg-azul)│ MATERIAIS (bg-verde)           ││
┃ │ ─────────────── │ ───────────────────────────────  ││
┃ │ F1: Temp        │ • Branco 4mm                    ││
┃ │ 1200×1500 calc  │ • Inox 316                      ││
┃ │ 1.8m² | $2100   │ • Silicone Cinza               ││
┃ │                 │                                 ││
┃ │ F2: Menor       │                                 ││
┃ │ 600×1500 calc   │                                 ││
┃ │ 0.9m² | $1050   │                                 ││
┃ └─────────────────┴─────────────────────────────────┘│
┃ 📦 OBRA 2 - ...                                      ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
                        ⬇  (REDUNDÂNCIA #2)
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 3️⃣  OTIMIZAÇÃO DE PERFIS (Se houver)                ┃
┃─────────────────────────────────────────────────────┃
┃ 💡 Economia: $250                                   ┃
┃ ┌─────────────────────────────────────────────────┐ ┃
┃ │ Barras Ind. │ Barras Otim. │ Preço Ind. │ Otim │ ┃
┃ │ 10          │ 8            │ $2000      │ $1750│ ┃
┃ └─────────────────────────────────────────────────┘ ┃
┃                                                     ┃
┃ 📊 PROJETO 1 - Perfil Alumínio 60mm                ┃
┃ ┌────────────────────────────────────────────────┐ ┃
┃ │ Barra: 6000mm | Cor: Branco | 2 barras        │ ┃
┃ │ Cortes: 1200mm · 1500mm · 600mm               │ ┃
┃ │ Aproveit: 85% | Desperdício: 900mm | $250     │ ┃
┃ │                                                │ ┃
┃ │ Barra #1: [1200mm | 1500mm | 600mm | retalho]│ ┃
┃ │ Barra #2: [1200mm | 1500mm | 600mm | retalho]│ ┃
┃ └────────────────────────────────────────────────┘ ┃
┃ 📊 PROJETO 2 - Perfil Alumínio 60mm                ┃
┃ └────────────────────────────────────────────────┘ ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
                        ⬇  (REDUNDÂNCIA #3)
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 4️⃣  RESULTADO DO PROJETO 1 (Card GRANDE)             ┃
┃─────────────────────────────────────────────────────┃
┃ Projeto: Janela Basculante                           ┃
┃ Cliente: Acme | Vidro: Temp 4mm | Perfil: Branco    ┃
┃                                                     ┃
┃ ┌─────────────────────────────────────────────────┐ ┃
┃ │ Vidros │ Perfis │ Ferragens │ Total             │ ┃
┃ │ $3150  │ $1500  │ $250      │ $4900             │ ┃
┃ └─────────────────────────────────────────────────┘ ┃
┃                                                     ┃
┃ ═══════════════════════════════════ ⟵ MESMOS DADOS ┃
┃ 🔷 CORTE DE VIDRO (REPETIDO)                        ┃
┃ ─────────────────────────────────                  ┃
┃ Preço: $100/m² (via tabela cliente)                 ┃
┃ • F1 Temp: 1200×1500 → 1.8m² = $2100               ┃
┃ • F2 Menor: 600×1500 → 0.9m² = $1050               ┃
┃                                                     ┃
┃ 🟢 KIT OU PERFIS (alternativa)                      ┃
┃ ─────────────────────────────────                  ┃
┃ [Se modo BARRA: Lista de perfis]                   ┃
┃ [Se modo KIT: Info do kit escolhido]               ┃
┃                                                     ┃
┃ 🔧 FERRAGENS                                        ┃
┃ ─────────────────────────────────                  ┃
┃ • ×4 Dobradiça Aço Inox = $60                       ┃
┃ • ×2 Puxador Preto = $40                            ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
                        ⬇
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 5️⃣  RESULTADO DO PROJETO 2 (Repetição)              ┃
┃ [Com mesma estrutura acima...]                     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
[... E repetindo para PROJETO 3, 4, 5...]

═══════════════════════════════════════════════════════════════
⚠️  TOTAL DE SCROLL: 2000+ pixels em desktop
═══════════════════════════════════════════════════════════════
```

---

## FLUXO DE INFORMAÇÃO (Com Redundâncias)

```
┌─ Dados: VIDROS ─────────────────────────────┐
│                                             │
│ Entrada (esquerda):              │          │
│ → Select vidro + preço M²        │          │
│                                  │          │
│                                  ↓ REPETIÇÃO
│ Seção 1 (direita - Totais):     │          │
│ → Card: "Vidros $3150"           │          │
│                                  ↓ REPETIÇÃO
│ Seção 2 (direita - Relatório):  │          │
│ → "Tamanhos dos Vidros" completo│          │
│   (F1, F2, cada um com medidas)  │          │
│                                  ↓ REPETIÇÃO
│ Seção 4 (direita - Por Projeto): │          │
│ → "Corte de Vidro" IDÊNTICO      │          │
│   (F1, F2, cada um com dados)    │          │
│                                             │
└─────────────────────────────────────────────┘

❌ PROBLEMA: Mesmos dados 3 VEZES em 2 formatos diferentes!


┌─ Dados: SUBTOTAIS ──────────────────────────┐
│                                             │
│ Seção 1 (Totais):                          │
│ → 5 cards: Vidro|Kit|Perfil|Ferragem|Total │ ← Resumo/Agregado
│                                  ↓          │
│ Seção 4 (Resultado por Projeto): │          │
│ → 4 cards: Vidro|Perfil|Ferr|Total │ ← Detalhe/Individual
│   (Repetindo para cada projeto)   │          │
│                                             │
│ ❌ Usuário vê dados em 2 formatos           │
│ ❌ Não está claro qual usar/interpretar     │
│                                             │
└─────────────────────────────────────────────┘
```

---

## CORES ATUAIS (Sem Padrão Claro)

```
┌────────────────────────────────────────────────┐
│ Totais Consolidados:                           │
│ • BG: Gradiente Roxo/Azul (theme customizado) │  ❌ Forte demais
│ • FG: Branco                                   │
│                                                │
│ Vidros (Relatório):                            │
│ • BG: Azul (#dbeafe 50%)                       │  🟦 Azul claro
│ • FG: Azul (#1d4ed8)                           │
│                                                │
│ Materiais (Relatório):                         │
│ • BG: Verde (#d1fae5 60%)                      │  🟩 Verde claro
│ • FG: Verde (#047857)                          │
│                                                │
│ Perfis (Otimização):                           │
│ • BG: Cinza (#f3f4f6)                          │  ⬜ Cinza
│ • FG: Cinza (#374151)                          │
│                                                │
│ Ferragens (Resultado):                         │
│ • BG: Violeta (#faf5ff 50%)                    │  🟪 Violeta claro
│ • FG: Violeta (#7c3aed)                        │
│                                                │
│ IMPACTO: Muitas cores, sem hierarquia visual   │  ❌ Confuso
│          Contra preferência do user (CLEAN)    │
│                                                │
└────────────────────────────────────────────────┘
```

---

## TAMANHO DOS ELEMENTOS

```
┌─────────────────────────────────────────────────┐
│ Card: TOTAIS Consolidados                      │
│ • Padding: 24px                                │  �перых Large
│ • Height: ~200px com header+grid               │
│ • 5 sub-cards em grid                          │
│                                                │
│ Card: PROJETO (cada um)                        │
│ • Padding: 24px                                │  🔴 MUITO Grande
│ • Height: 500-800px (com sub-seções)           │
│ • Contém: Header + 4 subtotais + 3+ seções     │
│ • Multiplicado por N projetos                  │
│                                                │
│ Cards internos (vidros/ferragens):             │
│ • Padding: 12px + border + background          │  ⬜ Pequeno ok
│ • Altura: ~50-80px cada                        │
│                                                │
│ IMPACTO: Muito padding/espaço residual          │  ❌ Inchado
│          Amplificado com N projetos            │
│                                                │
└─────────────────────────────────────────────────┘
```

---

## LAYOUT EM DIFERENTES RESOLUÇÕES

```
🖥️  DESKTOP (1920px)
├─ Esquerda 33% (640px): Inputs + Botões
└─ Direita 67% (1280px): Resultado em coluna

    Resultado:
    ┌──────────────────────────────────┐
    │ 1. Totais (200px)                │
    │ 2. Relatório Obra (300px)        │
    │ 3. Otimização (500px) ← DENSO   │
    │ 4. Projeto 1 (600px) ← GIGANTE  │
    │ 5. Projeto 2 (600px) ← GIGANTE  │
    │ 6. Projeto 3 (600px) ← GIGANTE  │
    │                                  │
    │ SCROLL: ~2500px total            │ ❌ Muito
    └──────────────────────────────────┘

📱 MOBILE (375px)
├─ Stack vertical (full width)
├─ Esquerda fica acima (375px)
└─ Direita fica abaixo (375px)

    Resultado em mobile:
    ┌─────────────────────┐
    │ 1. Totais           │
    │ (4 cards em 1 col)  │
    │ MUITO vertical      │
    │ 2. Relatório        │
    │ (Cards empilhados)  │
    │ 3. Otimização       │
    │ (Muitos cards)      │
    │ 4-10. Projetos      │
    │ (Cards gigantes)    │
    │                     │
    │ SCROLL: 4000px+ !! │ ❌❌ Péssimo
    └─────────────────────┘
```

---

## CHECKLIST DE PROBLEMAS

```
[❌] Informação de Vidros em 3 lugares diferentes
[❌] Subtotais em 2 formatos (agregado + individual)
[❌] Seção "Relatório" + "Resultado por Projeto" redundantes
[❌] Muitas cores temáticas sem padrão claro
[❌] Cards muito grandes com padding excessivo
[❌] Scroll 2000+ px em desktop / 4000+ px em mobile
[❌] Preço M² aparece 2x (entrada + resultado)
[❌] Modo Kit vs Barra não é diferenciado visualmente
[❌] Não há hierarquia clara entre seções
[❌] Abas ou collapse para organizar informação
```

---

## SUGESTÕES TOP 3 (Impacto Alto)

```
1️⃣  IMPLEMENTAR TABS
   ┌─ TAB: "Totais" (resumo principal)
   ├─ TAB: "Detalhes por Projeto" (detalhe expandível)
   └─ TAB: "Otimização" (condicional)
   
   → Remove 60% do scroll
   → Clarifica fluxo de informação
   → Permite expandir/colapsar


2️⃣  REMOVER CORES VIBRANTES
   Antes: Gradiente roxo + azul + verde + violeta
   Depois: Escala cinza + destaque azul/verde suave
   
   → Atende preferência CLEAN do user
   → Menos visual poluído
   → Melhor contraste/legibilidade


3️⃣  CONSOLIDAR VIDROS EM UM LUGAR
   Antes: "Relatório" + "Resultado por Projeto"
   Depois: Desloca "Vidros" apenas para "Detalhes"
   
   → Remove redundância
   → Menos scroll
   → Uma fonte de verdade
```

---

## MATRIZ DE IMPACTO vs ESFORÇO

```
          IMPACTO
             ▲
             │
        ALTO │  [🎯 TABS]       [Redesign]
             │               Completo
             │
      MÉDIO  │  [Remover dup]  [Cores]
             │    vidros       Novas
             │
        BAIXO│  [Remove         [Compact
             │   preço dup]     Cards]
             │
             └─────────────────────────► ESFORÇO
                    BAIXO  MÉDIO  ALTO

🟢 RÁPIDO & ALTO IMPACTO (fazer primeiro)
   • Remover cores vibrantes → 2h
   • Implementar Tabs → 4h
   • Consolidar Vidros → 2h

🟡 MÉDIO (depois)
   • Compact Cards → 3h
   • Redesign Seções → 5h

🔴 COMPLEXO (considerar depois)
   • Modo Preview/Modal → 6h
   • Tabelas estruturadas → 8h
```

