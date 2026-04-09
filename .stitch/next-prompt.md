---
page: reports-tab
---
A professional dashboard reports tab screen for a temperature monitoring system used in healthcare (vaccine refrigerators). The screen must support two distinct report types with clear visual separation.

**DESIGN SYSTEM (REQUIRED):**
- Platform: Web, Desktop-first with responsive mobile
- Theme: Dark mode with green neon accents (#19e66f)
- Background: Deep Forest (#112118) for main content
- Surface: Elevated Dark (#1A1D17) for cards
- Border: Subtle (#2A2E24) for dividers
- Primary Accent: Neon Green (#19e66f) for CTAs and highlights
- Text: White (#ffffff) primary, Slate-400 (#94a3b8) secondary
- Font: Space Grotesk for headings, Sans-serif for body

**Page Structure:**

1. **Header Section:**
   - Title "Relatórios e Insights" left-aligned
   - Subtitle showing current tenant/company name
   - Right side: Date range selector dropdown + "Exportar PDF" primary button

2. **Stats Cards Row (4 cards):**
   - Disponibilidade (percentage with icon)
   - Temp. Média (average temperature)
   - Dispositivos (online/total count)
   - Alertas 24h (alert count with warning color if high)
   - Each card: icon on left, label above, large value, subtle border glow

3. **Two-Column Main Content:**

   **Left Column - Gestor Overview (60% width):**
   - Card title: "Visão Geral do Sistema"
   - Bar chart: "Alertas Recentes por Sensor" (horizontal bars, top 10 devices)
   - Below: Summary stats grid (min temp, max temp, devices offline count)
   - Insight AI box at bottom with glowing effect

   **Right Column - Report Generation (40% width):**
   - Card title: "Gerar Relatório PDF"
   - Two tabs or sections:
     
     **Section A - Relatório Mensal Automático:**
     - Toggle switch to enable/disable
     - Day of month picker (1-31)
     - Time picker
     - "Receber via:" checkboxes (WhatsApp, E-mail)
     - Recipient inputs (phones, emails)
     - Status indicator (Ativo/Pausado)
     
     **Section B - Gerar Agora (On-Demand):**
     - Date range picker (From/To)
     - "Gerar PDF" primary button
     - Optional: Device selector dropdown

4. **Bottom Section - Scheduled Reports Table:**
   - Table with columns: Nome, Tipo, Frequência, Canais, Status, Ações
   - Actions: Play (generate now), Edit, Delete
   - "Novo Agendamento" button at top right of table

**Visual Details:**
- Cards: rounded-2xl (16px), border-1 border-[#2A2E24], bg-[#1A1D17], shadow-lg
- Buttons: rounded-xl, bg-primary (#19e66f) with dark text, hover scale effect
- Inputs: rounded-xl, bg-[#0F110D], border-[#2A2E24], focus:border-primary
- Charts: Use primary green for bars, dark grid lines
- Table: dark headers with uppercase text, hover rows with white/5
- Spacing: gap-6 between major sections, p-6 inside cards
- Animations: subtle hover transitions, pulse on critical alerts

**Refinements:**
- Use lucide-react or similar icons
- Professional medical/tech aesthetic
- Clear visual hierarchy between the two report types
- Make the "Gerar PDF" section prominent and intuitive
- Add subtle glow effects to primary actions
