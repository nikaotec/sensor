#include "WifiManager.h"
#include "../config/Config.h"

WifiManager::WifiManager()
    : _state(WIFI_STATE_IDLE),
      _stateStart(0),
      _portalActive(false),
      _connectCbFired(false) {}

void WifiManager::begin() {
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);

  Serial.println("[WIFI] Iniciando...");
  _tryConnectSaved();
}

void WifiManager::update() {
  if (_portalActive) {
    _dnsServer.processNextRequest();
    _webServer.handleClient();
    return;
  }

  if (_state == WIFI_STATE_CONNECTING || _state == WIFI_STATE_RECONNECTING) {
    _checkConnection();
    return;
  }

  if (_state == WIFI_STATE_CONNECTED && WiFi.status() != WL_CONNECTED) {
    _state = WIFI_STATE_RECONNECTING;
    _stateStart = millis();
    Serial.println("[WIFI] Reconectando...");
    if (_onDisconnectCb) _onDisconnectCb();
    WiFi.reconnect();
  }
}

void WifiManager::resetCredentials() {
  Serial.println("[WIFI] Limpando credenciais...");
  _stopPortal();
  WiFi.disconnect(true, true);
  _state = WIFI_STATE_NO_CREDENTIALS;
  _stateStart = millis();
  _connectCbFired = false;

  WiFi.mode(WIFI_STA);
  _startPortal();
}

bool WifiManager::isConnected() const {
  return _state == WIFI_STATE_CONNECTED && WiFi.status() == WL_CONNECTED;
}

bool WifiManager::isPortalActive() const { return _portalActive; }

WifiState WifiManager::getState() const { return _state; }

const char *WifiManager::getStateName() const {
  switch (_state) {
  case WIFI_STATE_IDLE: return "IDLE";
  case WIFI_STATE_CONNECTING: return "CONNECTING";
  case WIFI_STATE_CONNECTED: return "CONNECTED";
  case WIFI_STATE_PORTAL: return "PORTAL";
  case WIFI_STATE_RECONNECTING: return "RECONNECTING";
  case WIFI_STATE_NO_CREDENTIALS: return "NO_CREDENTIALS";
  default: return "UNKNOWN";
  }
}

String WifiManager::getConnectedSSID() const {
  return _state == WIFI_STATE_CONNECTED ? WiFi.SSID() : "";
}

String WifiManager::getLocalIP() const {
  return _state == WIFI_STATE_CONNECTED ? WiFi.localIP().toString() : "";
}

int WifiManager::getRSSI() const {
  return _state == WIFI_STATE_CONNECTED ? WiFi.RSSI() : 0;
}

void WifiManager::onConnect(std::function<void()> cb) { _onConnectCb = cb; }
void WifiManager::onDisconnect(std::function<void()> cb) { _onDisconnectCb = cb; }

void WifiManager::_tryConnectSaved() {
  String ssid = WiFi.SSID();
  Serial.println("[WIFI] SSID salvo: '" + ssid + "' (len=" + String(ssid.length()) + ")");

  if (ssid.length() > 0) {
    Serial.println("[WIFI] Conectando a: " + ssid);
    WiFi.begin();
    _state = WIFI_STATE_CONNECTING;
    _stateStart = millis();
    _connectCbFired = false;
  } else {
    Serial.println("[WIFI] Sem credenciais salvas. Ativando portal...");
    _state = WIFI_STATE_NO_CREDENTIALS;
    _stateStart = millis();
    _startPortal();
  }
}

void WifiManager::_checkConnection() {
  if (_portalActive) return;

  unsigned long now = millis();
  unsigned long elapsed = now - _stateStart;

  wl_status_t status = WiFi.status();

  if (status == WL_CONNECTED) {
    _state = WIFI_STATE_CONNECTED;
    _connectedSSID = WiFi.SSID();
    Serial.println("[WIFI] Conectado - IP: " + WiFi.localIP().toString() +
                   " RSSI: " + String(WiFi.RSSI()) + "dBm SSID: " + WiFi.SSID());
    if (_onConnectCb && !_connectCbFired) {
      _connectCbFired = true;
      _onConnectCb();
    }
    return;
  }

  if (elapsed > 2000 && elapsed % 5000 < 2000) {
    Serial.printf("[WIFI] Tentando conectar... status=%d elapsed=%lus\n",
                  status, elapsed / 1000);
  }

  unsigned long timeout = (_state == WIFI_STATE_RECONNECTING) ? 15000 : 20000;

  if (elapsed > timeout) {
    Serial.println("[WIFI] Timeout. Ativando portal...");
    _startPortal();
  }
}

void WifiManager::_startPortal() {
  if (_portalActive) return;

  _stopPortal();

  String apName = "Sensor-" + String((uint16_t)(ESP.getEfuseMac() >> 32), HEX);
  apName.toUpperCase();
  if (apName.length() > 32) apName = apName.substring(0, 32);

  Serial.println("[WIFI] AP: " + apName + " em 192.168.4.1");

  WiFi.mode(WIFI_AP_STA);
  WiFi.softAPConfig(IPAddress(192, 168, 4, 1), IPAddress(192, 168, 4, 1),
                    IPAddress(255, 255, 255, 0));
  WiFi.softAP(apName.c_str(), PORTAL_PASSWORD);

  _dnsServer.start(53, "*", IPAddress(192, 168, 4, 1));

  _webServer.on("/", HTTP_GET, [this]() { _handleRoot(); });
  _webServer.on("/scan", HTTP_GET, [this]() { _handleScan(); });
  _webServer.on("/connect", HTTP_POST, [this]() { _handleConnect(); });
  _webServer.on("/status", HTTP_GET, [this]() { _handleStatus(); });
  _webServer.onNotFound([this]() { _handleNotFound(); });

  _webServer.begin();
  _portalActive = true;
  _state = WIFI_STATE_PORTAL;
  _stateStart = millis();
  Serial.println("[WIFI] Portal ativo.");
}

void WifiManager::_stopPortal() {
  if (_portalActive) {
    _webServer.stop();
    _dnsServer.stop();
    WiFi.softAPdisconnect(true);
    _portalActive = false;
    Serial.println("[WIFI] Portal parado.");
  }
}

void WifiManager::_handleRoot() {
  String html = _buildPortalPage();
  _webServer.send(200, "text/html", html);
}

void WifiManager::_handleScan() {
  String html = _buildScanPage();
  _webServer.send(200, "text/html", html);
}

void WifiManager::_handleConnect() {
  String ssid = _webServer.arg("ssid");
  String password = _webServer.arg("password");

  if (ssid.length() == 0) {
    _webServer.send(400, "text/plain", "SSID required");
    return;
  }

  Serial.println("[WIFI] Conectando a: '" + ssid + "' via portal...");

  _webServer.stop();
  _dnsServer.stop();
  WiFi.softAPdisconnect(true);
  _portalActive = false;
  _connectCbFired = false;

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid.c_str(), password.c_str());

  _state = WIFI_STATE_CONNECTING;
  _stateStart = millis();

  String html = "<!DOCTYPE html><html><head><meta charset='UTF-8'>"
                "<meta http-equiv='refresh' content='2'>"
                "<style>body{font-family:sans-serif;text-align:center;"
                "padding:40px;background:#1a1a2e;color:#eee;}"
                ".ok{color:#4ecca3;font-size:24px;}"
                ".err{color:#ff6b6b;font-size:18px;}</style></head><body>"
                "<h2>Conectando a: " + _htmlEscape(ssid) + "</h2>"
                "<p id='status'>Aguarde...</p>"
                "<script>"
                "function check(){"
                "fetch('/status').then(r=>r.json()).then(d=>{"
                "document.getElementById('status').innerHTML="
                "d.connected?'<span class=ok>Conectado! IP: '+d.ip+'</span>':"
                "'Conectando... ('+d.state+')';"
                "if(d.connected)setTimeout(()=>location.href='/',3000);"
                "});"
                "}"
                "setInterval(check,2000);check();"
                "</script></body></html>";
  _webServer.begin();
  _webServer.send(200, "text/html", html);
}

void WifiManager::_handleStatus() {
  JsonDocument doc;
  doc["state"] = getStateName();
  doc["connected"] = isConnected();
  doc["ssid"] = getConnectedSSID();
  doc["ip"] = getLocalIP();
  doc["rssi"] = getRSSI();

  String output;
  serializeJson(doc, output);
  _webServer.send(200, "application/json", output);
}

void WifiManager::_handleNotFound() {
  if (_portalActive) {
    _handleRoot();
  } else {
    _webServer.send(404, "text/plain", "Not found");
  }
}

String WifiManager::_htmlEscape(const String &s) const {
  String out;
  out.reserve(s.length());
  for (size_t i = 0; i < s.length(); i++) {
    char c = s.charAt(i);
    if (c == '&') out += "&amp;";
    else if (c == '<') out += "&lt;";
    else if (c == '>') out += "&gt;";
    else if (c == '"') out += "&quot;";
    else out += c;
  }
  return out;
}

String WifiManager::_buildPortalPage() {
  String ssid = getConnectedSSID();
  String ip = getLocalIP();

  String html = "<!DOCTYPE html><html lang='pt-BR'><head>"
                "<meta charset='UTF-8'>"
                "<meta name='viewport' content='width=device-width, "
                "initial-scale=1.0'>"
                "<title>Config WiFi - Sensor</title>"
                "<style>"
                "body{font-family:-apple-system,BlinkMacSystemFont,"
                "'Segoe UI',Roboto,sans-serif;margin:0;padding:20px;"
                "background:#0f0f23;color:#e0e0e0;}"
                ".container{max-width:400px;margin:0 auto;}"
                "h1{color:#4ecca3;text-align:center;font-size:22px;}"
                ".card{background:#1a1a2e;border-radius:12px;padding:20px;"
                "margin:16px 0;border:1px solid #333;}"
                ".status{padding:10px;border-radius:8px;margin-bottom:16px;"
                "text-align:center;font-size:14px;}"
                ".connected{background:#1b4332;color:#4ecca3;}"
                ".disconnected{background:#3d1f1f;color:#ff6b6b;}"
                "label{display:block;margin:12px 0 4px;color:#aaa;"
                "font-size:13px;}"
                "input[type='text'],input[type='password']{width:100%;"
                "padding:12px;border:1px solid #333;border-radius:8px;"
                "background:#0f0f23;color:#fff;font-size:16px;"
                "box-sizing:border-box;}"
                "input:focus{outline:none;border-color:#4ecca3;}"
                "button{width:100%;padding:14px;background:#4ecca3;"
                "color:#0f0f23;border:none;border-radius:8px;font-size:"
                "16px;font-weight:bold;cursor:pointer;margin-top:16px;}"
                "button:hover{background:#3ba88a;}"
                ".scan-btn{background:transparent;color:#4ecca3;"
                "border:1px solid #4ecca3;margin-top:8px;}"
                ".scan-btn:hover{background:#1b4332;}"
                ".info{font-size:12px;color:#666;text-align:center;"
                "margin-top:20px;}"
                "</style></head><body>"
                "<div class='container'>"
                "<h1>Sensor IoT</h1>";

  if (isConnected()) {
    html += "<div class='status connected'>Conectado: " + _htmlEscape(ssid) +
            "<br>IP: " + ip + " | RSSI: " + String(getRSSI()) + "dBm</div>";
  } else {
    html += "<div class='status disconnected'>Nao conectado ao WiFi<br>"
            "Conecte o sensor a sua rede WiFi</div>";
  }

  html += "<div class='card'>"
          "<form action='/connect' method='POST'>"
          "<label>Rede WiFi (SSID)</label>"
          "<input type='text' name='ssid' id='ssid' placeholder='Nome da rede' required>"
          "<label>Senha</label>"
          "<input type='password' name='password' id='password' placeholder='Senha da rede'>"
          "<button type='submit'>Conectar</button>"
          "</form>"
          "<button class='scan-btn' onclick=\"location.href='/scan'\">"
          "Escanear redes disponiveis</button>"
          "</div>"
          "<p class='info'>ESP32 Sensor v" FIRMWARE_VERSION "</p>"
          "</div></body></html>";

  return html;
}

String WifiManager::_buildScanPage() {
  String html = "<!DOCTYPE html><html lang='pt-BR'><head>"
                "<meta charset='UTF-8'>"
                "<meta name='viewport' content='width=device-width, "
                "initial-scale=1.0'>"
                "<title>Redes WiFi</title>"
                "<style>"
                "body{font-family:-apple-system,BlinkMacSystemFont,"
                "'Segoe UI',Roboto,sans-serif;margin:0;padding:20px;"
                "background:#0f0f23;color:#e0e0e0;}"
                ".container{max-width:400px;margin:0 auto;}"
                "h1{color:#4ecca3;text-align:center;font-size:22px;}"
                ".net{background:#1a1a2e;border:1px solid #333;"
                "border-radius:8px;padding:14px;margin:8px 0;"
                "cursor:pointer;transition:border-color 0.2s;}"
                ".net:hover{border-color:#4ecca3;}"
                ".net .name{font-weight:bold;font-size:15px;}"
                ".net .sig{color:#888;font-size:12px;}"
                ".back{display:block;text-align:center;margin-top:16px;"
                "color:#4ecca3;text-decoration:none;}"
                ".loading{text-align:center;padding:40px;color:#888;}"
                "</style></head><body>"
                "<div class='container'>"
                "<h1>Redes Disponiveis</h1>";

  int n = WiFi.scanNetworks();

  if (n == 0) {
    html += "<p class='loading'>Nenhuma rede encontrada.</p>";
  } else {
    for (int i = 0; i < n; i++) {
      String ssid = WiFi.SSID(i);
      if (ssid.length() == 0) continue;

      int rssi = WiFi.RSSI(i);
      String sig;
      if (rssi > -60) sig = "Excelente";
      else if (rssi > -70) sig = "Bom";
      else if (rssi > -80) sig = "Moderado";
      else sig = "Fraco";

      String enc = WiFi.encryptionType(i) == WIFI_AUTH_OPEN ? "Aberta" : "Protegida";

      html += "<div class='net' onclick=\"selectNet('" + _htmlEscape(ssid) + "')\">"
              "<div class='name'>" + _htmlEscape(ssid) + "</div>"
              "<div class='sig'>" + enc + " | " + sig + " (" + String(rssi) + "dBm)</div>"
              "</div>";
    }
  }

  html += "<a class='back' href='/'>Voltar</a>"
          "</div>"
          "<script>"
          "function selectNet(ssid){"
          "window.location.href='/?ssid='+encodeURIComponent(ssid);"
          "}"
          "if(window.location.search){"
          "var p=new URLSearchParams(window.location.search);"
          "var s=p.get('ssid');"
          "if(s)document.getElementById('ssid').value=s;"
          "}"
          "</script>"
          "</body></html>";

  WiFi.scanDelete();
  return html;
}
