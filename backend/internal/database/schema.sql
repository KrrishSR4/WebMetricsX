-- WebMetricsX PostgreSQL Database Schema (Neon Compatible)

CREATE TABLE IF NOT EXISTS targets (
    id VARCHAR(64) PRIMARY KEY,
    url TEXT NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    interval_sec INT NOT NULL DEFAULT 30,
    last_checked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS check_results (
    id VARCHAR(64) PRIMARY KEY,
    target_id VARCHAR(64) REFERENCES targets(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    available BOOLEAN NOT NULL,
    status_code INT NOT NULL,
    dns_latency_ms BIGINT NOT NULL DEFAULT 0,
    tcp_latency_ms BIGINT NOT NULL DEFAULT 0,
    tls_latency_ms BIGINT NOT NULL DEFAULT 0,
    ttfb_ms BIGINT NOT NULL DEFAULT 0,
    response_time_ms BIGINT NOT NULL DEFAULT 0,
    ssl_valid BOOLEAN NOT NULL DEFAULT FALSE,
    ssl_expiry_date TIMESTAMP WITH TIME ZONE,
    ssl_issuer TEXT,
    error_message TEXT,
    checked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_check_results_target_id ON check_results(target_id);
CREATE INDEX IF NOT EXISTS idx_check_results_checked_at ON check_results(checked_at DESC);
