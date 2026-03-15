# Integração Firebase + n8n + Web Dashboard

## 1. Ativando Recursos no seu projeto SmartRF (Painel do Google)
Eu já criei o projeto Firebase chamado **tech-smartrf** e injetei as senhas localmente, mas alguns serviços gratuitos **só podem ser iniciados por um humano clicando no console**.

1. Acesse o [Firebase Console](https://console.firebase.google.com/) e entre no projeto recém criado (`smartrf-iot-dashboard`).
2. Vá no menu lateral na aba **Authentication** -> **Get Started** -> Habilite a opção **Email/Password**.
3. Vá no menu lateral na aba **Firestore Database** -> **Create Database** -> Aceite "Test Mode" ou "Production Mode" e escolha a localização (ex: `us-central1`).
4. Após criar o banco, vá na aba **Rules** do Firestore e cole o código abaixo (e clique *Publish*):
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

> **Aviso:** As senhas do app (apiKey, appID) já estão no seu arquivo `src/firebase/config.ts`. Você só precisa dar o "Get Started" nesses dois componentes (Auth e Firestore) no console para eles ligarem as máquinas deles.

## 2. Configurando o n8n para ouvir o MQTT e Gravar no Banco

O n8n fará a ponte entre o MQTT (onde o ESP32 joga as mensagens) e a nuvem Database (Firestore).

1. Abra seu n8n.
2. Crie um novo workflow ou clique nos "..." e vá em **Import from File**.
3. Importe o arquivo **`n8n_mqtt_to_firestore.json`** que deixei na mesma pasta deste documento (`.../n8n/workflows/sensor`).
4. **Configurar Credenciais do MQTT** no Nó `MQTT Trigger`: Escolha as credenciais do seu broker local/nuvem. Verifique o campo `Topics` ("sensor/data" ou o tópico de dados específico configurado no `esp32.ino`, ver trecho `MSG_TOPIC_DATA`).
5. **Configurar Credenciais do Firestore** nos 2 nós do Google Firestore (`Upsert Firestore...` e `Insert Telemetry Log`):
   - Você precisará de uma **Service Account**. No painel do Google Cloud (ou via Firebase Project Settings -> **Service Accounts** -> **Generate New Private Key**), baixe o JSON da conta de serviço. No n8n crie uma credencial **Google Firestore API / OAuth2** (usar Private Key) com as informações deste JSON JSON.
   - Importante: mude o campo `projectId` em ambos os nós "Google Cloud Firestore" pela ID original do projeto, ex: `meu-projeto-iot-1234`.

Agora quando o ESP32 jogar uma mensagem MQTT (`"TIPO": "REALTIME"`, `"TEMP_ATUAL": "25.0"`), o n8n puxa e grava os campos normalizados no Banco, que ativará imediatamente as Recharts/Cards no Dashboard Web `onSnapshot` sem nem precisar dar F5! 

> **Aviso Adicional de Segurança do Firebase Firestore (Rules)**: 
> No painel Web do firebase Firestore -> *Rules*, use estas regras provisórias para dev:
> ```
> rules_version = '2';
> service cloud.firestore {
>   match /databases/{database}/documents {
>     match /{document=**} {
>       allow read, write: if request.auth != null; // Permitir somenete usuario da web logado
>     }
>   }
> }
> ```
> Depois aperte `Publish`. (Como o n8n usa Service Account Admin, ele bypassa essas regras independente disso).
