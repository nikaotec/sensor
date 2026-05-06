# CONTEXT.md — Fase 5: Testes Críticos

## Objetivo
Garantir que a lógica de alarme e o fluxo de dados MQTT no Dashboard não sofram regressões. O foco é em testes unitários e de integração de componentes críticos.

## Decisões de Arquitetura
1. **Ferramenta**: Vitest + React Testing Library (já configurados no projeto).
2. **Abordagem**:
   - **Use Cases**: Testes unitários puros (mockando infraestrutura).
   - **Services**: Testes unitários com mock de bibliotecas externas (mqtt.js).
   - **Hooks**: Testes de integração usando `renderHook`.
3. **Mocks Específicos**:
   - Criar um mock robusto para o `EmqxMqttService` (Singleton).
   - Criar mock para o @supabase/supabase-js.

## Gray Areas Decididas
- **Cobertura**: Focar em branches e edge cases (payloads malformados, desconexões).
- **Integração Real**: Não faremos testes de integração com o broker EMQX real nesta fase para manter a velocidade dos testes locais.

## Prioridades
1. `ProcessMqttUpdateUseCase` (Lógica de merge de dados).
2. `EmqxMqttService` (Gerenciamento de conexão).
3. Hook `useMqttData`.
