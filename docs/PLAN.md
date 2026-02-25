# PLAN.md - Novo Relatório Admin Automático

## 1. Objetivo
Criar um novo relatório baseado no `relatorio.html` existente, mas exclusivo para usuários administradores. Este relatório conterá dados adicionais de telemetria do dispositivo, sem alterar o sistema atual que já funciona.

## 2. Dados Adicionais Requeridos
Além dos dados já existentes no relatório do cliente (Máx, Mín, Atual e Hora das temperaturas), o novo relatório precisará incluir:
- **Tensão da Bateria** (Min, Máx e Momento/Hora solicitada)
- **Umidade Externa** (Valor e momento)
- **Temperatura Externa** (Valor e momento)
- **Hora da solicitação** de cada medição/alteração de max/min (Temperatura interna, tensão, etc).

## 3. Arquitetura Proposta (Orchestration)
- **Frontend / Visual (`frontend-specialist`)**:
  - Criar um arquivo chamado `relatorio_admin.html`, usando a mesma base de layout/CSS de `relatorio.html`.
  - Adicionar as novas colunas à tabela principal para acomodar as variáveis de Tensão, Umidade Externa e Temperatura Externa.
  - Exibir as horas exatas de solicitação/medição para cada variável.
- **Backend / Controle de Acesso (`backend-specialist` & `security-auditor`)**:
  - Garantir que o `relatorio_admin.html` seja de uso e acesso exclusivo para administradores, de forma segura, adicionando a lógica de validação/acesso ao endpoint/fluxo que entrega este HTML.
  - Atualizar os mocks JSON ou origens de dados (ex: `esp32.json` / `dashboard_feed.json`) para contemplar os novos dados caso necessário.

## 4. Próximos Passos
1. **Fase 1 (Atual)**: Aprovação deste planejamento.
2. **Fase 2**: Executar agentes em paralelo:
   - `frontend-specialist` cria `relatorio_admin.html`.
   - `backend-specialist`/`test-engineer` checam injeção de dados (JSONs de teste/n8n payload) e proteções para acesso apenas de admin.
3. **Fase 3**: Validar a geração e formato do relatório com scripts pertinentes (`ux_audit.py`, `lint_runner.py`).
