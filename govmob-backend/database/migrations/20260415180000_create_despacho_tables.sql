-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- ==========================================
-- CORRIDA STATUS ENUM
-- ==========================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'corrida_status') THEN
    CREATE TYPE corrida_status AS ENUM (
      'solicitada', 'aguardando_aceite', 'aceita', 'em_rota',
      'concluida', 'cancelada', 'expirada'
    );
  END IF;
END$$;

-- ==========================================
-- CORRIDAS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS corridas (
  id UUID PRIMARY KEY,
  passageiro_id UUID NOT NULL,
  motorista_id UUID,
  veiculo_id UUID,
  status VARCHAR(30) NOT NULL DEFAULT 'solicitada',
  origem_lat DOUBLE PRECISION NOT NULL,
  origem_lng DOUBLE PRECISION NOT NULL,
  destino_lat DOUBLE PRECISION NOT NULL,
  destino_lng DOUBLE PRECISION NOT NULL,
  motivo_servico VARCHAR(200) NOT NULL,
  prioridade_nivel INTEGER NOT NULL DEFAULT 1,
  tentativas_despacho INTEGER NOT NULL DEFAULT 0,
  distancia_metros DOUBLE PRECISION,
  duracao_segundos INTEGER,
  score_prioridade DOUBLE PRECISION,
  cancelado_por VARCHAR(100),
  motivo_cancelamento TEXT,
  timestamps JSONB NOT NULL DEFAULT '{}',
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for corridas
CREATE INDEX IF NOT EXISTS idx_corridas_status ON corridas(status);
CREATE INDEX IF NOT EXISTS idx_corridas_passageiro ON corridas(passageiro_id);
CREATE INDEX IF NOT EXISTS idx_corridas_motorista ON corridas(motorista_id);

-- ==========================================
-- CORRIDA TRAJETORIA TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS corrida_trajetoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corrida_id UUID NOT NULL REFERENCES corridas(id),
  caminho GEOMETRY(LineString, 4326)
);

-- ==========================================
-- AUDITORIA EVENTOS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS auditoria_eventos (
  id UUID PRIMARY KEY,
  event_name VARCHAR(100) NOT NULL,
  aggregate_id UUID NOT NULL,
  aggregate_type VARCHAR(50) NOT NULL,
  payload JSONB NOT NULL,
  occurred_at TIMESTAMP NOT NULL,
  servidor_id UUID,
  ip_address VARCHAR(45),
  is_critico BOOLEAN NOT NULL DEFAULT FALSE,
  hash VARCHAR(64) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auditoria_aggregate ON auditoria_eventos(aggregate_id, event_name);
CREATE INDEX IF NOT EXISTS idx_auditoria_occurred ON auditoria_eventos(occurred_at);
CREATE INDEX IF NOT EXISTS idx_auditoria_servidor ON auditoria_eventos(servidor_id);

-- ==========================================
-- MUNICIPIO BOUNDARIES TABLE (for PostGIS geofence)
-- ==========================================
CREATE TABLE IF NOT EXISTS municipio_boundaries (
  municipio_id VARCHAR(50) PRIMARY KEY,
  geometria GEOMETRY(Polygon, 4326) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ==========================================
-- ALTER VEICULOS — add new columns
-- ==========================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'veiculos' AND column_name = 'tipo') THEN
    ALTER TABLE veiculos ADD COLUMN tipo VARCHAR(50) DEFAULT 'sedan';
    ALTER TABLE veiculos ADD COLUMN status VARCHAR(30) DEFAULT 'disponivel';
    ALTER TABLE veiculos ADD COLUMN motorista_ativo_id UUID;
    ALTER TABLE veiculos ADD COLUMN quilometragem DOUBLE PRECISION DEFAULT 0;
    ALTER TABLE veiculos ADD COLUMN ultima_manutencao TIMESTAMP;
    ALTER TABLE veiculos ADD COLUMN documentos JSONB DEFAULT '{}';
  END IF;
END$$;
