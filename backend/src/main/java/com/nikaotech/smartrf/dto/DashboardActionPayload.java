package com.nikaotech.smartrf.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class DashboardActionPayload {

    @JsonProperty("intencao")
    private String intencao;

    @JsonProperty("id")
    private String id;

    @JsonProperty("dispositivo_id")
    private String dispositivoId;

    @JsonProperty("is_admin")
    private Boolean isAdmin;

    @JsonProperty("source")
    private String source;

    @JsonProperty("user")
    private User user;

    // Campos adicionais de configuração de limites
    @JsonProperty("temp_max")
    private Float tempMax;

    @JsonProperty("temp_min")
    private Float tempMin;

    @JsonProperty("volt_max")
    private Float voltMax;

    @JsonProperty("volt_min")
    private Float voltMin;

    @JsonProperty("bat_min")
    private Float batMin;

    @JsonProperty("tempo_porta")
    private Integer tempoPorta;

    @JsonProperty("volt_return_delay")
    private Integer voltReturnDelay;

    // Campos adicionais de calibração
    @JsonProperty("nova_tensao")
    private Float novaTensao;

    @JsonProperty("nova_temperatura")
    private Float novaTemperatura;

    @JsonProperty("sensor_tipo")
    private String sensorTipo;

    // Campos adicionais de relé
    @JsonProperty("rele_index")
    private Integer releIndex;

    @JsonProperty("porta")
    private Integer porta;

    @Data
    public static class User {
        @JsonProperty("name")
        private String name;

        @JsonProperty("email")
        private String email;
    }
}
