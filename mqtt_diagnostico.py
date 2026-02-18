#!/usr/bin/env python3
"""
Script de Diagnóstico MQTT - Testa conectividade com o broker
Uso: python3 mqtt_diagnostico.py
"""
import socket
import sys
import time
import json

MQTT_HOST = "173.249.10.19"
MQTT_PORT = 1883
MQTT_USER = "n8nuser"
MQTT_PASS = "123456"
TOPIC_DATA = "esp32c3/data"
TOPIC_CMD = "esp32c3/status/action"

def header(msg):
    print(f"\n{'='*50}")
    print(f"  {msg}")
    print(f"{'='*50}")

def test_tcp():
    """Teste 1: Conexão TCP pura ao broker"""
    header("TESTE 1: Conexão TCP ao broker MQTT")
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(5)
        result = sock.connect_ex((MQTT_HOST, MQTT_PORT))
        sock.close()
        if result == 0:
            print(f"  ✅ Porta {MQTT_PORT} ABERTA em {MQTT_HOST}")
            return True
        else:
            print(f"  ❌ Porta {MQTT_PORT} FECHADA em {MQTT_HOST} (código: {result})")
            return False
    except socket.timeout:
        print(f"  ❌ TIMEOUT - Servidor não respondeu em 5s")
        return False
    except Exception as e:
        print(f"  ❌ Erro: {e}")
        return False

def test_dns():
    """Teste 2: Resolução DNS (se for hostname)"""
    header("TESTE 2: Resolução de endereço")
    try:
        ip = socket.gethostbyname(MQTT_HOST)
        print(f"  ✅ {MQTT_HOST} → {ip}")
        return True
    except socket.gaierror:
        print(f"  ❌ Falha DNS para {MQTT_HOST}")
        return False

def test_mqtt_connect():
    """Teste 3: Conexão MQTT real com autenticação"""
    header("TESTE 3: Conexão MQTT com autenticação")
    try:
        import paho.mqtt.client as mqtt
    except ImportError:
        print("  ⚠️  paho-mqtt não instalado. Instale com:")
        print("     pip3 install paho-mqtt")
        print("  Pulando teste de conexão MQTT real...")
        return None

    connected = [False]
    error_msg = [None]
    
    def on_connect(client, userdata, flags, rc):
        codes = {
            0: "✅ Conexão bem-sucedida!",
            1: "❌ Versão de protocolo incorreta",
            2: "❌ Identificador de cliente inválido",
            3: "❌ Servidor indisponível",
            4: "❌ Usuário/senha incorretos",
            5: "❌ Não autorizado"
        }
        msg = codes.get(rc, f"❌ Código desconhecido: {rc}")
        print(f"  {msg}")
        connected[0] = (rc == 0)
        if rc != 0:
            error_msg[0] = msg

    client = mqtt.Client(client_id="diag_test_" + str(int(time.time())))
    client.username_pw_set(MQTT_USER, MQTT_PASS)
    client.on_connect = on_connect

    try:
        client.connect(MQTT_HOST, MQTT_PORT, 10)
        client.loop_start()
        time.sleep(3)
        client.loop_stop()
        client.disconnect()
        return connected[0]
    except Exception as e:
        print(f"  ❌ Erro na conexão: {e}")
        return False

def test_mqtt_subscribe():
    """Teste 4: Subscribe no tópico e escuta por 10s"""
    header("TESTE 4: Escutando tópico esp32c3/data por 10s...")
    try:
        import paho.mqtt.client as mqtt
    except ImportError:
        print("  ⚠️  paho-mqtt necessário. Pulando...")
        return None

    received = []
    
    def on_connect(client, userdata, flags, rc):
        if rc == 0:
            client.subscribe(TOPIC_DATA)
            print(f"  📡 Subscrito em '{TOPIC_DATA}', aguardando mensagens...")
        
    def on_message(client, userdata, msg):
        try:
            payload = json.loads(msg.payload.decode())
            print(f"\n  ✅ MENSAGEM RECEBIDA!")
            print(f"     Tópico: {msg.topic}")
            print(f"     TIPO: {payload.get('TIPO', 'N/A')}")
            print(f"     DISPOSITIVO: {payload.get('DISPOSITIVO', 'N/A')}")
            print(f"     TEMP: {payload.get('TEMP_ATUAL', 'N/A')}°C")
            print(f"     VOLTAGEM: {payload.get('VOLTAGEM', 'N/A')}V")
            received.append(payload)
        except:
            print(f"  ✅ Mensagem recebida (raw): {msg.payload[:100]}")
            received.append(msg.payload)

    client = mqtt.Client(client_id="diag_listen_" + str(int(time.time())))
    client.username_pw_set(MQTT_USER, MQTT_PASS)
    client.on_connect = on_connect
    client.on_message = on_message

    try:
        client.connect(MQTT_HOST, MQTT_PORT, 10)
        client.loop_start()
        
        for i in range(10):
            time.sleep(1)
            remaining = 10 - i - 1
            if not received:
                print(f"  ⏳ Aguardando... {remaining}s restantes", end='\r')
            else:
                break
        
        print()
        client.loop_stop()
        client.disconnect()
        
        if received:
            print(f"  ✅ {len(received)} mensagem(ns) recebida(s)!")
            return True
        else:
            print(f"  ⚠️  Nenhuma mensagem em 10s.")
            print(f"     Possíveis causas:")
            print(f"     - ESP32 desligado ou sem WiFi")
            print(f"     - ESP32 não está publicando neste momento")
            print(f"     - Intervalo de publicação > 10s (periódico = 5min)")
            return False
    except Exception as e:
        print(f"  ❌ Erro: {e}")
        return False

def test_mqtt_publish():
    """Teste 5: Publica comando de teste e verifica se ESP32 responde"""
    header("TESTE 5: Enviando comando 'obter_status_atual' ao ESP32")
    try:
        import paho.mqtt.client as mqtt
    except ImportError:
        print("  ⚠️  paho-mqtt necessário. Pulando...")
        return None

    response_received = [False]
    
    def on_connect(client, userdata, flags, rc):
        if rc == 0:
            client.subscribe(TOPIC_DATA)
            # Envia comando para obter status
            cmd = json.dumps({"intencao": "obter_status_atual"})
            client.publish(TOPIC_CMD, cmd)
            print(f"  📤 Comando enviado para '{TOPIC_CMD}'")
            print(f"  📡 Aguardando resposta em '{TOPIC_DATA}'...")
    
    def on_message(client, userdata, msg):
        try:
            payload = json.loads(msg.payload.decode())
            if payload.get('TIPO') == 'STATUS_SOLICITADO':
                print(f"\n  ✅ ESP32 RESPONDEU com STATUS_SOLICITADO!")
                print(f"     TEMP: {payload.get('TEMP_ATUAL')}°C")
                print(f"     VOLTAGEM: {payload.get('VOLTAGEM')}V")
                print(f"     BATERIA: {payload.get('BATERIA')}V")
                response_received[0] = True
            else:
                print(f"\n  📨 Mensagem recebida (TIPO={payload.get('TIPO')})")
        except:
            pass

    client = mqtt.Client(client_id="diag_cmd_" + str(int(time.time())))
    client.username_pw_set(MQTT_USER, MQTT_PASS)
    client.on_connect = on_connect
    client.on_message = on_message

    try:
        client.connect(MQTT_HOST, MQTT_PORT, 10)
        client.loop_start()
        
        for i in range(15):
            time.sleep(1)
            remaining = 15 - i - 1
            if not response_received[0]:
                print(f"  ⏳ Aguardando resposta... {remaining}s", end='\r')
            else:
                break
        
        print()
        client.loop_stop()
        client.disconnect()
        
        if response_received[0]:
            print("  ✅ Comunicação bidirecional OK!")
            return True
        else:
            print("  ❌ ESP32 não respondeu ao comando.")
            print("     Possíveis causas:")
            print("     - ESP32 desligado")
            print("     - ESP32 não está conectado ao MQTT")
            print("     - ESP32 não está subscrito em 'esp32c3/status/action'")
            return False
    except Exception as e:
        print(f"  ❌ Erro: {e}")
        return False

if __name__ == "__main__":
    header("DIAGNÓSTICO MQTT - Sistema de Sensores")
    print(f"  Broker: {MQTT_HOST}:{MQTT_PORT}")
    print(f"  User:   {MQTT_USER}")
    print(f"  Tópicos: {TOPIC_DATA} / {TOPIC_CMD}")
    
    # Teste 1 & 2: Rede
    dns_ok = test_dns()
    tcp_ok = test_tcp()
    
    if not tcp_ok:
        print("\n❌ DIAGNÓSTICO ENCERRADO: Broker MQTT inacessível.")
        print("   Verifique se o servidor está online e a porta 1883 está aberta.")
        sys.exit(1)
    
    # Teste 3: Autenticação
    mqtt_ok = test_mqtt_connect()
    
    if mqtt_ok is False:
        print("\n❌ DIAGNÓSTICO ENCERRADO: Falha na autenticação MQTT.")
        print("   Verifique usuário/senha no broker.")
        sys.exit(1)
    
    if mqtt_ok is None:
        print("\n⚠️  Instale paho-mqtt para testes completos:")
        print("   pip3 install paho-mqtt")
        sys.exit(0)
    
    # Teste 4: Escuta passiva
    listen_ok = test_mqtt_subscribe()
    
    # Teste 5: Comando ativo
    cmd_ok = test_mqtt_publish()
    
    # Resumo
    header("RESUMO DO DIAGNÓSTICO")
    print(f"  DNS/IP:          {'✅' if dns_ok else '❌'}")
    print(f"  TCP (porta 1883): {'✅' if tcp_ok else '❌'}")
    print(f"  Auth MQTT:        {'✅' if mqtt_ok else '❌'}")
    print(f"  Escuta passiva:   {'✅' if listen_ok else '⚠️  Sem dados em 10s'}")
    print(f"  Comando → ESP32:  {'✅' if cmd_ok else '❌ ESP32 não respondeu'}")
    
    if tcp_ok and mqtt_ok and not listen_ok and not cmd_ok:
        print("\n📋 CONCLUSÃO: Broker MQTT funciona, mas ESP32 não está conectado.")
        print("   → Verifique o ESP32 (Serial Monitor, WiFi, conexão MQTT)")
    elif tcp_ok and mqtt_ok and listen_ok:
        print("\n📋 CONCLUSÃO: Tudo OK! O problema está no n8n.")
        print("   → Verifique se o workflow 'esp32' está ATIVO no n8n")
        print("   → Verifique o Client ID da credencial MQTT no n8n")
