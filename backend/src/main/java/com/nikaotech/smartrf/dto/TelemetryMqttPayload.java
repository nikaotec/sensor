package com.nikaotech.smartrf.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import java.util.Map;

@Data
public class TelemetryMqttPayload {
    @JsonProperty("TIPO")
    private String tipo;

    @JsonProperty("DISPOSITIVO")
    private String dispositivo;

    @JsonProperty("ID_DISPOSITIVO")
    private String idDispositivo;

    @JsonProperty("EMPRESA")
    private String empresa;

    @JsonProperty("TEMP_C")
    private Float tempC;

    @JsonProperty("TEMP_MAX")
    private Float tempMax;

    @JsonProperty("TEMP_MIN")
    private Float tempMin;

    @JsonProperty("UMIDADE")
    private Float umidade;

    @JsonProperty("BATERIA")
    private Float bateria;

    @JsonProperty("VOLTAGEM")
    private Float voltagem;

    @JsonProperty("RSSI")
    private Integer rssi;

    @JsonProperty("PORTA")
    private String porta; // FECHADA, ABERTA

    @JsonProperty("CHK_VOLT")
    private Boolean chkVolt;

    @JsonProperty("CHK_BAT")
    private Boolean chkBat;

    @JsonProperty("CHK_TEMP")
    private Boolean chkTemp;

    @JsonProperty("CHK_DOOR")
    private Boolean chkDoor;

    @JsonProperty("RELES")
    private Map<String, String> reles;

    @JsonProperty("IS_REPEAT")
    private Boolean isRepeat;
}
