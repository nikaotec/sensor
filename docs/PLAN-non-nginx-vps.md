## 🧠 Brainstorm: Non-Nginx VPS Architecture

### Context
Você informou que **não está mais usando o Nginx** e o site está rodando direto na VPS. 
Se o Nginx não está mais na jogada, o Node.js (`server.js`) passa a ser o único responsável por servir a página web e a API.

Como o n8n precisa bater no seu painel para enviar a telemetria, precisamos decidir como configurar as portas de forma viável no seu servidor.

---

### Opção A: Rodar o Node.js na Porta 80 (Padrão Web)
Nesta opção, o nosso `server.js` assume o controle total da porta 80 (a porta HTTP padrão da internet). 

✅ **Prós:**
- O site fica acessível limpamente via `http://www.nikaotech.com` (sem precisar digitar `:4000` ou `:3000`).
- O n8n enviará os dados para `http://www.nikaotech.com/api/sensors` perfeitamente.

❌ **Contras:**
- Requer permissão de `root` (`sudo`) para que o Node/PM2 consiga abrir a porta 80.
- Se você tiver outros sites no mesmo VPS no futuro, eles precisarão de portas diferentes.

📊 **Esforço:** Baixo (apenas mudar o `process.env.PORT` para 80 e iniciar com `sudo pm2`).

---

### Opção B: Rodar o Node.js em uma porta específica (ex: 4000)
Deixamos o painel rodando na porta 4000 e abrimos essa porta no firewall da VPS. O site e a API ficarão expostos nessa porta.

✅ **Prós:**
- Não precisa de permissão root/sudo.
- Fica isolado de conflitos com qualquer serviço (como aquele Gotenberg na 3000).

❌ **Contras:**
- Você e o n8n precisarão SEMPRE usar a porta na URL.
- O site será acessado em: `http://www.nikaotech.com:4000`
- O n8n enviará para: `http://www.nikaotech.com:4000/api/sensors`

📊 **Esforço:** Muito Baixo (Apenas usar a URL com `:4000`).

---

## 💡 Recomendação

A **Opção A** (porta 80) é a mais profissional caso este seja o seu site principal na VPS, pois URLs limpas transmitem mais credibilidade e são mais simples de configurar no n8n.

Se você escolher a **Opção A**, nós revertemos a configuração do `server.js` para usar a **porta 80**, as URLs do n8n voltam ao normal (`http://www.nikaotech.com/api/sensors`), e documentamos o comando PM2 com `sudo`.

Como você quer prosseguir?
