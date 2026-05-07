# REQUIREMENTS.md — Milestone 2: Telemetria e Relatórios

## Escopo do Milestone

Este milestone foca em resolver a regressão/falha de visibilidade de dados no dashboard e preparar o terreno para melhorias no sistema de relatórios, seguindo rigorosamente os princípios de modularização, SOLID e TDD.

## Requisitos Ativos

### Telemetria e Conectividade (TELE)

- [ ] **REQ-TELE-01**: O status "Online/Offline" do dispositivo deve refletir fielmente o estado do MQTT (LWT ou mensagens recentes).
- [ ] **REQ-TELE-02**: Os cards de telemetria devem exibir os dados em tempo real (temperatura, tensão, bateria, porta) assim que as mensagens MQTT forem recebidas.
- [ ] **REQ-TELE-03**: O dashboard deve lidar graciosamente com reconexões MQTT sem perder o estado atual dos cards.

### Arquitetura e Qualidade (ARCH/TEST)

- [ ] **REQ-ARCH-01**: Refaturar `EmqxMqttService` e hooks relacionados para garantir desacoplamento entre a camada de transporte e a camada de apresentação.
- [ ] **REQ-TEST-01**: Implementar suíte de testes unitários para a lógica de processamento de mensagens MQTT (TDD).
- [ ] **REQ-TEST-02**: Implementar testes de integração para verificar o fluxo de dados do `EmqxMqttService` até o componente de UI.

### Relatórios (REP)

- [ ] **REQ-REP-01**: Corrigir inconsistências na geração de relatórios PDF (dados ausentes ou formatados incorretamente).
- [ ] **REQ-REP-02**: Melhorar a pré-visualização de relatórios no dashboard antes do download.

## Traceabilidade (Roadmap)

| ID | Título | Fase | Status |
|----|--------|------|--------|
| REQ-TELE-01 | Status Online/Offline | 12 | ⏳ |
| REQ-TELE-02 | Dados em tempo real nos cards | 13 | ⏳ |
| REQ-ARCH-01 | Refatoração Modular | 14 | ⏳ |
| REQ-TEST-01 | Testes Unitários MQTT | 12/13 | ⏳ |
| REQ-REP-01 | Correção de Relatórios | 15 | ⏳ |

## Out of Scope

- Atualização de firmware (concluída no Milestone 1).
- Novas funcionalidades de autenticação.
- Alteração visual drástica do layout (foco é funcional e estrutural).
