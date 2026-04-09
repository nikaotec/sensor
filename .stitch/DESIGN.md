# Design System: Sensor Monitor Dashboard
**Project ID:** dashboard-sensor-monitoring

## 1. Visual Theme & Atmosphere

O projeto possui uma estética **moderno-futurista com toque orgânico**. O modo escuro domina a interface com tons de verde neon (cor primária) contrastando com fundos escuros quase pretos. A sensação é de **alta tecnologia aplicada à saúde** - profissional mas não clínico, tecnológico mas acessível.

- **Densidade:** Média-alta, informação rica mas organizada
- **Vibe:** Clean, minimal, profissional-médico-tech
- **Contraste:** Alto - texto claro sobre fundos escuros

## 2. Color Palette & Roles

| Nome Descritivo | Hex Code | Função |
|-----------------|----------|--------|
| Primary Neon Green | `#19e66f` | Ações principais, CTAs, destaque, gráficos |
| Dark Forest Background | `#112118` | Fundo principal (modo escuro) |
| Elevated Dark | `#1A1D17` | Cards, containers, superfícies elevadas |
| Light Surface | `#f6f8f7` | Fundo modo claro |
| Accent Purple | `#8A2BE2` | Destaques secundários |
| Lavender | `#D0A9F5` | Acentos suaves |
| Text Primary Dark | `#0F110D` | Texto em fundo claro |
| Text Primary Light | `#ffffff` | Texto em fundo escuro |
| Slate 400 | `#94a3b8` | Texto secundário |
| Border Dark | `#2A2E24` | Bordas em modo escuro |
| Error Red | `#E63946` | Alertas críticos |
| Warning Amber | `#f59e0b` | Alertas moderados |
| Success Emerald | `#10b981` | Status online/ok |

## 3. Typography Rules

- **Font Principal:** Space Grotesk (display/headings) - tech mas legível
- **Font Body:** Sistema (sans-serif default)
- **Ícones:** Material Symbols Outlined
- **Tamanhos:**
  - H1/H2: 20-24px, font-bold, tracking-tight
  - H3: 18px, font-bold
  - Body: 14px
  - Small: 12px
  - XSmall: 10px (labels, timestamps)

## 4. Component Stylings

### Buttons
- **Primário:** Fundo `#19e66f`, texto `#112118`, borda arredondada-xl (12px), hover com opacity
- **Secundário:** Fundo transparente, borda `#2A2E24`, texto branco
- **Tamanhos:** py-2.5 px-4 (default), py-3 px-6 (large)

### Cards/Containers
- **Fundo:** `#1A1D17` (dark) / `#ffffff` (light)
- **Borda:** 1px solid `#2A2E24` (dark)
- **Border-radius:** rounded-2xl (16px)
- **Shadow:** shadow-lg com cor primaria/20 (glow sutil)

### Inputs/Forms
- **Fundo:** `#0F110D`
- **Borda:** 1px solid `#2A2E24`
- **Focus:** border-primary `#19e66f`
- **Border-radius:** rounded-xl (12px)

### Tabelas
- **Header:** bg `#0F110D`/30, texto uppercase, text-xs, font-bold
- **Rows:** hover com bg white/5
- **Dividers:** divide `#2A2E24`

## 5. Layout Principles

- **Sidebar:** Fixa à esquerda, width ~280px, fundo mais escuro que main
- **Header:** sticky top, h-20, backdrop-blur, border-bottom
- **Container:** max-w não fixo, usa grid responsivo
- **Grid:** sm:grid-cols-2 lg:grid-cols-4 para cards de estatísticas
- **Gap:** gap-6 (24px) entre secciones
- **Padding:** px-4 md:px-8 lg:px-10 py-6
- **Scroll:** custom-scrollbar com thumb da cor primary

## 6. Design System Notes for Stitch Generation

Ao gerar novas telas com Stitch, use:
- **Theme:** Dark mode primeiro
- **Font:** Space Grotesk para headings, Sans-serif para body
- **Colors:** Primary `#19e66f`, Background `#112118`, Surface `#1A1D17`, Border `#2A2E24`
- **Border-radius:** rounded-2xl (16px) para cards, rounded-xl (12px) para inputs
- **Buttons:** Fundo primary, texto dark, hover com scale e shadow
- **Shadows:** glow sutil com cor primary (shadow-primary/20)
- **Icons:** Lucide React ou Material Symbols
