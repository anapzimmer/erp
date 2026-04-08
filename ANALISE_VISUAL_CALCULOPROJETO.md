# 📊 ANÁLISE VISUAL - Página Calcular Projeto

**Data:** 8 de abril de 2026  
**Arquivo:** `src/app/calculoprojeto/page.tsx`  

---

## 1️⃣ MAPA ESTRUTURAL COMPLETO

```
┌─────────────────────────────────────────────────────────────┐
│🎯 HEADER/INTRO - Gradiente com ícone principal             │
│   Título: "Calcular Projeto"                               │
│   Descrição: Como usar a página                            │
└─────────────────────────────────────────────────────────────┘
                          ⬇
┌─────────────────────────────────────────────────────────────┐
│ GRID: 1 col (mobile) / 3 cols (desktop)                    │
├─────────────────────┬─────────────────────────────────────┤
│ COLUNA ESQUERDA     │ COLUNA DIREITA                      │
│ (1/3 - 33%)         │ (2/3 - 66%)                         │
│                     │                                     │
│ ✅ INPUTS/CONFIG    │ 📊 VISUALIZAÇÃO/ RESULTADOS        │
│                     │                                     │
│ • Cliente Select    │ [VAZIO SE SEM CÁLCULO]              │
│ • Obra/Ref          │                                     │
│ • N Projetos        │ OU SE COM CÁLCULO:                  │
│                     │                                     │
│ • [CARTA PROJETO]   │ 🟢 Totais Consolidados              │
│   Loop: N vezes     │    (Grand Total + 5 cards)          │
│                     │                                     │
│ • Calc Button       │ 📋 Relatório da Obra                │
│ • Preview Button    │    (Seção por Projeto)              │
│ • Save Button       │                                     │
│                     │ ⚙️ Otimização Perfis                │
│                     │    (Se houver perfis)               │
│                     │                                     │
│                     │ 📊 Resultado por Projeto            │
│                     │    Loop: N vezes                    │
│                     │    (Cada com 5 sub-seções)          │
└─────────────────────┴─────────────────────────────────────┘
```

---

## 2️⃣ SEÇÕES VISUAIS IDENTIFICADAS

### 🟢 RESUMO TOTAIS CONSOLIDADOS (Lado Direito, Topo)
**Localização:** Primeira seção do resultado  
**Conteúdo:**
- Meta principal: Grand total em GRANDE fonte
- Gradiente colorido (tema da aplicação)
- 5 cards em grid: Vidros | Kits | Perfis | Ferragens | Total
- Texto: Cliente + Qt projetos
- Info: Economia total (se houver)

**Problema Visual:** Muito denso, cores vibrantes demais

---

### 📋 RELATÓRIO DA OBRA  
**Localização:** Segundo no painel direito  
**Estrutura:**
```
Cabeçalho: "Relatório da Obra - Tamanhos dos vidros, materiais e perfis"

📦 Loop PROJETO-POR-PROJETO:
   ├─ Header com Badges:
   │  └─ Vão | Qtd | Vidro | Material
   │
   └─ 2 Colunas (grid):
      ├─ ESQUERDA - Tamanhos dos Vidros (bg-blue)
      │   Loop FOLHAS:
      │   └─ Card: Titulo | Medida Original | Medida Calc | M² | Preço
      │
      └─ DIREITA - Materiais (bg-green)
          └─ Pills com cores de material
```

**Informação:** Tamanhos de vidro, lista de cores/materiais  
**Design:** Bem organizado com cores temáticas por tipo  

---

### ⚙️ OTIMIZAÇÃO DE PERFIS (Condicional)
**Localização:** Depois de "Relatório", antes dos detalhes por projeto  
**Aparece:** Somente se `otimizacaoGlobalPerfis.grupos.length > 0`  
**Estrutura:**

```
Cabeçalho + Economia Total em GRANDE
│
4 Cards de Resumo:
├─ Barras Individuais
├─ Barras Consolidadas  
├─ Valor Individual
└─ Valor Consolidado

Loop GRUPO DE PERFIS:
└─ Card expandido com:
   ├─ Perfil + Projeto
   ├─ Barra info (mm, cor, qtd)
   ├─ Badges: Aproveitamento | Desperdício | Economia
   └─ Detalhe: Cortes + Barras agrupadas
```

**Informação:** Otimização de compra de barras  
**Redundância:** Mostra dados DUAS VEZES - resumo genérico + detalhe por grupo  

---

### 📊 RESULTADO POR PROJETO (Loop)
**Localização:** Terceiro/Quarto+ no painel direito  
**Repete para cada item em `resultados[]`  
**Estrutura por card:**

```
Header: Projeto {N} | Nome Projeto
Subtitulo: Cliente | Vidro | Perfil Cor | Modo (Kit/Barra)

4 Cards Subtotais:
├─ Vidros
├─ Perfis/Kits
├─ Ferragens
└─ Total

─────────────────────────────────

Seção A: CORTE DE VIDRO (se houver folhas)
│  Info: Preço M² aplicado (cliente vs default)
│  Loop FOLHAS:
│  └─ Badge F1/F2 | Medida Original | Medida Calc/M² | Preço

─────────────────────────────────

Seção B: KIT OU PERFIS (mutuamente exclusivo)
│  
│  SE KIT:
│  └─ Card com nome kit + cor + preço/un
│  
│  SE BARRA:
│  └─ Loop CORTES:
│     └─ Perfil Name | Barra info | Qtd | Preço/total

─────────────────────────────────

Seção C: FERRAGENS (se houver)
│  Loop FERRAGENS:
│  └─ Badge ×N | Nome | Preço/un | Total
```

**Problema:** Cada projeto é um card INTEIRO separado, repetindo o layout  

---

## 3️⃣ REDUNDÂNCIAS E CONFUSÕES IDENTIFICADAS

### 🔴 CRÍTICA: Informação de VIDRO aparece 3 VEZES

1. **No Relatório da Obra** → "Tamanhos dos Vidros"
   - Seção com CADA folha individual
   - Mostra: Medida original, calculada, M², preço

2. **No Resultado por Projeto** → "Corte de Vidro"
   - EXATAMENTE as mesmas folhas
   - Mesmo layout praticamente idêntico

3. **Na Seção de Totais** → "Vidros" como card de valor
   - Apenas o total consolidado

**Impacto:** Usuário vê os mesmos dados 2x em abas/seções diferentes  
**Solução sugerida:** Consolidar em UMA seção ou fazer abas

---

### 🔴 CRÍTICA: SUBTOTAIS aparecem 2 VEZES

**Primeira vez:** No resumo "Totais Consolidados" (topo direita)
```
┌─────────────────────────────────┐
│ Vidros  │ Kits │ Perfis │ ...   │  ← Todos os 5 cards
│ $5000   │ $0   │ $2000  │ ...   │     com valores
└─────────────────────────────────┘
```

**Segunda vez:** Em cada "Resultado por Projeto" (cards repetidos)
```
┌─────────────────────────────────┐
│ Vidros  │ Perfis │ Ferragens │ Total   │  ← Todos os 4 cards
│ $1200   │ $500   │ $100      │ $1800   │     POR projeto
└─────────────────────────────────┘
```

**Problema:** Usuário precisa somar mentalmente múltiplos cards para entender o total  
**Design ruim:** Muitos números na tela, sem hierarquia clara  

---

### 🟡 MODERADO: Seção de PERFIS é muito pesada

**Linha 1 (Otimização Global Perfis):**
- Header
- 4 cards resumo
- Loop com cards expandidos (cada um com ~5 sub-informações)

**Depois:** Cada projeto AINDA repete seus perfis

**Impacto:** Scroll muito longo, informação densa, cores múltiplas  

---

### 🟡 MODERADO: Muitas CORES TEMÁTICAS diferentes

**Cores usadas por seção:**
- Totais Consolidados: Gradiente customizado (roxo/azul)
- Vidros: Azul
- Materiais: Verde
- Perfis: Cinza
- Ferragens: Violeta

**Problema:** Sem padrão visual claro, usuário pode se perder  
**Nota do usuário:** Preferência por telas CLEAN com menos cores fortes  

---

### 🟡 MODERADO: Cards muito grandes e espaçados

**Cada Projeto é um card gigante com:**
- 1 header
- 4 subtotais cards
- 3+ seções internas

**Mobile:** Empilha tudo em coluna, fica MUITO longo (scroll infinito)  
**Design:** Muito espaçamento (padding 24px), boxes com muitas bordas  

---

## 4️⃣ PONTOS DE CLAREZA CONFUSA

### Problema 1: "Resultado por Projeto" vs "Relatório da Obra"
- **Relatório da Obra** = Vidros + Materiais
- **Resultado por Projeto** = Tudo: Vidros + Kits/Perfis + Ferragens

**Pergunta do usuário:** O que é cada um? Qual ver primeiro?

---

### Problema 2: Modo KIT vs Modo BARRA não é visualmente claro
- Cada projeto pode ser um ou outro
- Se for KIT: mostra card com info do kit
- Se for BARRA: mostra lista de perfis

**Confusão:** Não há separação visual clara entre os dois modos  
**Melhor seria:** Abas ou toggling mais visual

---

### Problema 3: PREÇO APLICADO aparece 2 locais
- Na seção "Corte de Vidro" de cada projeto
- Diz "Via tabela do cliente" ou "Via cadastro padrão"

**Repetição:** Já aparecia na entrada de "Vidro do Cadastro" no painel esquerdo  

---

## 5️⃣ FLUXO VISUAL ATUAL vs IDEAL

### ❌ FLUXO ATUAL (confuso)
```
1. Preencher inputs (esquerda)
   ↓
2. Clicar "Calcular"
   ↓
3. Ver TOTAIS (resumo em cima)
   ↓
4. Ver RELATÓRIO (vidros + materiais)
   ↓
5. Ver OTIMIZAÇÃO (se houver)
   ↓
6. Ver CADA PROJETO (repetindo dados)
   ↓
Muito scroll, informação em 3 lugares diferentes
```

### ✅ FLUXO IDEAL (sugerido)
```
1. Preencher inputs (esquerda)
   ↓
2. Clicar "Calcular"
   ↓
3. Ver TOTAIS (grande, claro, com abas)
   ├─ Aba 1: Resumo Simplificado (Vidro | Kits | Perfis | Ferragens)
   ├─ Aba 2: Detalhes por projeto (abas internas)
   └─ Aba 3: Otimização (se houver)
   ↓
Menos scroll, informação organizada em abas
```

---

## 6️⃣ SUGESTÕES DE MELHORIA

### 🎯 QUICK WINS (Fácil implementação)

1. **Agrupar em ABAS** (Tabs)
   - Aba 1: "Totais"
   - Aba 2: "Detalhes por Projeto"
   - Aba 3: "Otimização de Perfis"
   - → Remove scroll gigante, clarifica fluxo

2. **Remover cores vibrantes**
   - Usar escala de cinza com destaques em azul/verde suave
   - Reduzir gradientes
   - → Menos visual poluído (alinha a preferência do usuário)

3. **Consolidar "Vidros" em UM lugar**
   - Manter apenas em "Detalhes por Projeto"
   - Remover de "Relatório da Obra"
   - → Menos redundância

4. **Cards subtotais menores**
   - Atualmente: 4+ cards + texto embaixo
   - Sugerido: 4 cards em linha única, mais compactos
   - → Menos espaço, mais clareza

---

### 🔧 MELHORIAS MÉDIAS (Refatoração)

5. **Simplificar "Relatório da Obra"**
   - Atualmente: Vidros + Materiais em 2 colunas
   - Sugerido: Apenas Materiais/Info geral
   - → Vidro fica só em "Detalhes"

6. **Modo KIT vs BARRA em ABAS**
   - Atualmente: Ambos aparecem em card confuso
   - Sugerido: Abas dentro de "Detalhes do Projeto"
   - → Mais claro que são ALTERNATIVOS

7. **Remover "Preço M² Aplicado"** em duplicidade
   - Já aparece na seleção de vidro (esquerda)
   - Remover de "Corte de Vidro" (direita)
   - → Menos informação redundante

---

### 🏗️ MELHORIAS MAIORES (Redesign)

8. **Modo PREVIEW vs DETALHES**
   - Atualmente: Tudo misturado em uma página longa
   - Sugerido: Modal/Panel para detalhes expandidos
   - → Tela principal fica clean com resumo

9. **Tabela vs Cartões**
   - Atualmente: Cartões grandes demais
   - Sugerido: Modo TABELA para Vidros/Ferragens
   - → Mais dados visíveis, menos scroll

10. **Painel de Otimização Separado**
    - Atualmente: Seção inline grande
    - Sugerido: Collapse/Aba separada por padrão
    - → Foco no resultado, otimização é bonus

---

## 7️⃣ DENSIDADE VISUAL - ANTES vs DEPOIS

### 📊 Antes (Atual)
```
┌────────────────────────────────────────┐
│ 🟢 TOTAIS (5 cards) ← DENSO            │ 100 pixels
│                                        │
│ 📋 RELATÓRIO (Vidros + Materiais) ← 2 seções
│    ├─ Muitas folhas repetidas         │ 200+ px
│
│ ⚙️ OTIMIZAÇÃO (resumo + N cards) ← SUPER DENSO
│    ├─ 4 cards resumo                   │ 400+ px
│    ├─ N cards expandidos               │
│
│ 📊 PROJETO 1 (vidro+kit/perfil+ferragem) ← 4 seções
│    ├─ 4 subtotais cards                │ 500+ px
│    ├─ Folhas repetidas                 │
│    ├─ Kit/Perfis                       │
│    └─ Ferragens                        │
│
│ 📊 PROJETO 2 (repetição)                │ 500+ px
│ ... PROJETO N (repetição)               │
│                                        │
│ TOTAL SCROLL: 2000+ pixels em desktop  │
└────────────────────────────────────────┘
```

### 📊 Depois (Sugerido)
```
┌────────────────────────────────────────┐
│ 🟢 TOTAIS               [▶ Expandir]   │ 80 pixels
│    Simples: $XXX                       │ (contraído)
│                                        │
│ [TAB: Totais] [TAB: Detalhes] [TAB: Otim]
│                                        │
│ 📋 PROJETO 1                            │ 200 px
│    └─ Vidro/Kit/Ferragem em abas       │
│                                        │
│ 📋 PROJETO 2                            │ 200 px
│                                        │
│ 📋 PROJETO N                            │ 200 px
│                                        │
│ TOTAL SCROLL: 800-1000 pixels desktop  │ 50% menor!
└────────────────────────────────────────┘
```

---

## 8️⃣ RESUMO EXECUTIVO

### ❌ Problemas Principais
1. **Informação duplicada** (vidros/subtotais 2-3x)
2. **Muito scroll** (2000+ px em desktop)
3. **Organização confusa** (múltiplas seções sem hierarquia clara)
4. **Cores demais** (vibrantes, sem padrão, contra preferência de user)
5. **Cards gigantes** (muito padding, espaçamento excessivo)

### ✅ Ganhos com Melhorias
- 50% redução de scroll
- Informação centralizada (um lugar por tipo de dado)
- Abas clara de contexto
- Visual mais clean e leve
- Melhor mobile experience

### 🎯 Prioridade de Implementação
1. **ALTA:** Tabs (totais/detalhes/otim)
2. **ALTA:** Remover cores vibrantes → cinza + azul suave
3. **MÉDIA:** Consolidar vidros em um lugar
4. **MÉDIA:** Remover preço M² duplicado
5. **BAIXA:** Tabelas para dados estruturados

---

## 📸 Esboço Visual do Layout Ideal

```
┌─────────────────────────────────────────────────────────────┐
│ HEADER SIMPLIFICADO (sem gradiente grande)                  │
│ Calcular Projeto - Breve descrição                          │
└─────────────────────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────────────────────┐
│ GRID: ESQUERDA (1/3) | DIREITA (2/3)                       │
├──────────────────────┬──────────────────────────────────────┤
│ INPUTS               │ RESULTADO (tabs abaixo)              │
│ • Cliente            │                                      │
│ • Obra/Ref           │ [▼ TOTAIS] [Detalhes] [Otimização]  │
│ • Add Projeto        │                                      │
│ • Projeto Cards      │ ┌──────────────────────────────────┐│
│ • Calc/Preview/Save  │ │ Total: $XXXX                      ││
│ • Buttons            │ │ ┌─────┬─────┬─────┬─────┐         ││
│                      │ │ │ $V  │ $K  │ $P  │ $F  │         ││
│                      │ │ └─────┴─────┴─────┴─────┘         ││
│                      │ │ Cliente | N Projetos | Economia   ││
│                      │ └──────────────────────────────────┘│
│                      │                                      │
│                      │ [Detalhes ▼] [Otimização ▼]         │
│                      │ (Expandem conforme click)            │
└──────────────────────┴──────────────────────────────────────┘
```

