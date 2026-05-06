# PLAN.md — Fase 5: Testes Críticos

## Checkout de Riscos
As funcionalidades de alarme e rollout via OTA dependem fortemente de:
- Normalização correta de payloads MQTT malformados.
- Persistência confiável no Supabase.
- Estado do React sincronizado com mensagens em tempo real.

## Tarefas de Implementação

### 1. Infraestrutura de Mocks
- [ ] Criar `dashboard/src/tests/mocks/mqtt-service.mock.ts` para simular o broker.
- [ ] Criar `dashboard/src/tests/mocks/supabase-client.mock.ts` para simular banco de dados.

### 2. Testes de Use Cases (Nível 1)
- [ ] Implementar `ProcessMqttUpdateUseCase.test.ts`:
  - Validar merge de objetos parciais (ex: apenas temperatura chega).
  - Validar normalização de chaves (case-insensitive e aliases de firmware).
  - Testar payloads inválidos/vazios.

### 3. Testes de Services (Nível 2)
- [ ] Implementar `EmqxMqttService.test.ts`:
  - Testar loop de subscrição de handlers.
  - Testar estados de `onConnected` e `onConnectionLost`.

### 4. Testes de Hooks e Integração (Nível 3)
- [ ] Implementar `useMqttData.test.tsx`:
  - Simular recebimento de mensagem MQTT disparada pelo mock e verificar se o estado `devices` do React é atualizado.
- [ ] Implementar `useSupabaseData.test.tsx`:
  - Garantir tratamento de erro gracioso quando a API falha.

## Verificação
- [ ] Executar `npm test` e verificar 100% de aprovação.
- [ ] Verificar cobertura dos arquivos modificados via report do Vitest.
