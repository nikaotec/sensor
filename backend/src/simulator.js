const mqtt = require('mqtt');
require('dotenv').config();

const client = mqtt.connect(process.env.MQTT_SERVER, {
    username: process.env.MQTT_USER,
    password: process.env.MQTT_PASS,
});

const DEVICES = ['DE1234', 'AF5678', 'BC9012'];

client.on('connect', () => {
    console.log('Simulator connected to MQTT');

    setInterval(() => {
        DEVICES.forEach(id => {
            const payload = {
                DISPOSITIVO: `ESP32-${id}`,
                TEMP_ATUAL: (3 + Math.random() * 2).toFixed(2),
                RELE: Math.random() > 0.5 ? 'LIGADO' : 'DESLIGADO',
                TIPO: 'periodico',
                DATA: new Date().toLocaleDateString(),
                HORA: new Date().toLocaleTimeString()
            };

            const topic = `esp32/${id}/data`;
            client.publish(topic, JSON.stringify(payload));
            console.log(`Published to ${topic}: ${payload.TEMP_ATUAL}°C`);
        });
    }, 10000);
});
