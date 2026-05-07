import mqtt from 'mqtt';

const MQTT_BROKER_URL = 'wss://mqtt.nikaotech.com/mqtt';
const clientId = 'test_runner_' + Math.random().toString(16).substr(2, 4);

console.log(`Tentando conectar ao broker: ${MQTT_BROKER_URL} com clientId: ${clientId}`);

const client = mqtt.connect(MQTT_BROKER_URL, {
    clientId,
    clean: true,
    connectTimeout: 4000,
});

client.on('connect', () => {
    console.log('✅ Conectado com sucesso via WebSockets!');
    client.subscribe('#', (err) => {
        if (err) console.error('❌ Erro na inscrição:', err);
        else console.log('📡 Inscrito em #');
    });
});

client.on('message', (topic, message) => {
    console.log(`📩 Mensagem recebida em [${topic}]:`, message.toString());
});

client.on('error', (err) => {
    console.error('❌ Erro de Conexão:', err.message);
});

setTimeout(() => {
    console.log('Finalizando teste após 20 segundos...');
    client.end();
    process.exit(0);
}, 20000);
