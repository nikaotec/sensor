import paho.mqtt.client as mqtt
import json
import time

# EMQX Configuration
EMQX_HOST = "109.123.240.215"
EMQX_PORT = 1883
# Authentication is currently DISABLED as per recent changes
USERNAME = None
PASSWORD = None

# Test Payload
# Using UPPERCASE keys to match the Rule SQL observed in the dashboard screenshot
payload = {
    "TEMP_C": 25.5,
    "UMID": 60,
    "VOLTAGEM": 3.7,
    "BATERIA": 95,
    "RSSI": -65,
    "FW_VERSION": "v1.0.1-test",
    "EMPRESA": "Nikaotec-Lab"
}

TOPIC = "telemetria/test_rule"
CLIENT_ID = "test_device_python"

def on_connect(client, userdata, flags, rc, properties=None):
    if rc == 0:
        print("Connected to EMQX successfully")
    else:
        print(f"Failed to connect, return code {rc}")

def run():
    # Use VERSION2 which is compatible with recent paho-mqtt
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id=CLIENT_ID)
    client.on_connect = on_connect
    
    if USERNAME and PASSWORD:
        client.username_pw_set(USERNAME, PASSWORD)
    
    try:
        client.connect(EMQX_HOST, EMQX_PORT, 60)
        client.loop_start()
        time.sleep(1)
        
        print(f"Publishing to {TOPIC}: {json.dumps(payload)}")
        result = client.publish(TOPIC, json.dumps(payload), qos=1)
        status = result[0]
        if status == 0:
            print(f"Message sent to topic {TOPIC}")
        else:
            print(f"Failed to send message to topic {TOPIC}")
            
        time.sleep(2)
        client.loop_stop()
        client.disconnect()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    run()
