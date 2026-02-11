-- Database Schema for IoT Temperature Monitoring

CREATE TABLE IF NOT EXISTS devices (
    id SERIAL PRIMARY KEY,
    device_key VARCHAR(50) UNIQUE NOT NULL, -- MAC Address or Unique ID
    name VARCHAR(100) NOT NULL,
    location VARCHAR(100),
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS readings (
    id SERIAL PRIMARY KEY,
    device_id INTEGER REFERENCES devices(id) ON DELETE CASCADE,
    temperature DECIMAL(5,2) NOT NULL,
    relay_status VARCHAR(20), -- 'LIGADO', 'DESLIGADO'
    is_alarm BOOLEAN DEFAULT FALSE,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tables for AI Memory
CREATE TABLE IF NOT EXISTS chat_memory (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL,
    message JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster memory retrieval
CREATE INDEX idx_chat_memory_session ON chat_memory(session_id);

-- Index for faster time-series queries
CREATE INDEX idx_readings_device_timestamp ON readings(device_id, timestamp DESC);

-- View for latest status
CREATE OR REPLACE VIEW v_latest_status AS
SELECT DISTINCT ON (device_id) 
    d.name, 
    d.location, 
    r.* 
FROM devices d
JOIN readings r ON d.id = r.device_id
ORDER BY device_id, timestamp DESC;
