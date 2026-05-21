#ifndef WIFI_MANAGER_H
#define WIFI_MANAGER_H

#include <DNSServer.h>
#include <WebServer.h>
#include <WiFi.h>
#include <ArduinoJson.h>
#include <functional>

enum WifiState {
  WIFI_STATE_IDLE,
  WIFI_STATE_CONNECTING,
  WIFI_STATE_CONNECTED,
  WIFI_STATE_PORTAL,
  WIFI_STATE_RECONNECTING,
  WIFI_STATE_NO_CREDENTIALS
};

class WifiManager {
public:
  WifiManager();

  void begin();
  void update();
  void resetCredentials();

  bool isConnected() const;
  bool isPortalActive() const;
  WifiState getState() const;
  const char *getStateName() const;
  String getConnectedSSID() const;
  String getLocalIP() const;
  int getRSSI() const;

  void onConnect(std::function<void()> cb);
  void onDisconnect(std::function<void()> cb);

private:
  WifiState _state;
  unsigned long _stateStart;
  bool _portalActive;
  bool _connectCbFired;
  String _connectedSSID;

  DNSServer _dnsServer;
  WebServer _webServer;

  std::function<void()> _onConnectCb;
  std::function<void()> _onDisconnectCb;

  void _tryConnectSaved();
  void _checkConnection();
  void _startPortal();
  void _stopPortal();
  void _handleRoot();
  void _handleScan();
  void _handleConnect();
  void _handleStatus();
  void _handleNotFound();
  String _buildPortalPage();
  String _buildScanPage();
  String _htmlEscape(const String &s) const;
};

#endif
