-- YoRHa Detective Interface Schema Migration
-- Creates tables for cases, evidence, connections, and chat

-- Cases table
CREATE TABLE IF NOT EXISTS yorha_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number VARCHAR(100) NOT NULL UNIQUE,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  priority VARCHAR(20) NOT NULL DEFAULT 'medium',
  case_type VARCHAR(100),
  jurisdiction VARCHAR(200),
  filed_date TIMESTAMP WITH TIME ZONE,
  closed_date TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL,
  assigned_to UUID,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX yorha_cases_case_number_idx ON yorha_cases(case_number);
CREATE INDEX yorha_cases_created_by_idx ON yorha_cases(created_by);
CREATE INDEX yorha_cases_status_idx ON yorha_cases(status);

-- Evidence nodes table
CREATE TABLE IF NOT EXISTS yorha_evidence_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES yorha_cases(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  evidence_type VARCHAR(100) NOT NULL,
  position_x INTEGER DEFAULT 0,
  position_y INTEGER DEFAULT 0,
  color VARCHAR(20) DEFAULT 'blue',
  icon VARCHAR(100),
  source VARCHAR(500),
  date_collected TIMESTAMP WITH TIME ZONE,
  relevance_score INTEGER DEFAULT 0,
  file_path VARCHAR(1000),
  file_type VARCHAR(100),
  file_size INTEGER,
  ai_summary TEXT,
  ai_tags JSONB,
  key_entities JSONB,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX yorha_evidence_nodes_case_id_idx ON yorha_evidence_nodes(case_id);
CREATE INDEX yorha_evidence_nodes_type_idx ON yorha_evidence_nodes(evidence_type);
CREATE INDEX yorha_evidence_nodes_created_by_idx ON yorha_evidence_nodes(created_by);

-- Evidence connections table
CREATE TABLE IF NOT EXISTS yorha_evidence_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES yorha_cases(id) ON DELETE CASCADE,
  source_node_id UUID NOT NULL REFERENCES yorha_evidence_nodes(id) ON DELETE CASCADE,
  target_node_id UUID NOT NULL REFERENCES yorha_evidence_nodes(id) ON DELETE CASCADE,
  connection_type VARCHAR(100) NOT NULL,
  strength INTEGER DEFAULT 50,
  description TEXT,
  ai_reasoning TEXT,
  confidence_score INTEGER DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX yorha_evidence_connections_case_id_idx ON yorha_evidence_connections(case_id);
CREATE INDEX yorha_evidence_connections_source_idx ON yorha_evidence_connections(source_node_id);
CREATE INDEX yorha_evidence_connections_target_idx ON yorha_evidence_connections(target_node_id);
CREATE INDEX yorha_evidence_connections_type_idx ON yorha_evidence_connections(connection_type);

-- Chat sessions table
CREATE TABLE IF NOT EXISTS yorha_chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES yorha_cases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title VARCHAR(500),
  context_type VARCHAR(100),
  context_id UUID,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  message_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX yorha_chat_sessions_case_id_idx ON yorha_chat_sessions(case_id);
CREATE INDEX yorha_chat_sessions_user_id_idx ON yorha_chat_sessions(user_id);
CREATE INDEX yorha_chat_sessions_status_idx ON yorha_chat_sessions(status);

-- Chat messages table
CREATE TABLE IF NOT EXISTS yorha_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES yorha_chat_sessions(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  message_type VARCHAR(50) DEFAULT 'text',
  referenced_evidence JSONB,
  model_used VARCHAR(100),
  tokens_used INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX yorha_chat_messages_session_id_idx ON yorha_chat_messages(session_id);
CREATE INDEX yorha_chat_messages_role_idx ON yorha_chat_messages(role);
CREATE INDEX yorha_chat_messages_created_at_idx ON yorha_chat_messages(created_at);

-- System metrics table
CREATE TABLE IF NOT EXISTS yorha_system_metrics (
  id SERIAL PRIMARY KEY,
  cpu_usage INTEGER,
  cpu_cores INTEGER,
  memory_usage INTEGER,
  memory_total_gb INTEGER,
  memory_used_gb INTEGER,
  gpu_usage INTEGER,
  gpu_memory_usage INTEGER,
  gpu_temperature INTEGER,
  disk_usage INTEGER,
  disk_total_gb INTEGER,
  disk_used_gb INTEGER,
  network_latency_ms INTEGER,
  network_bandwidth_mbps INTEGER,
  system_health VARCHAR(50) DEFAULT 'healthy',
  active_cases INTEGER DEFAULT 0,
  active_sessions INTEGER DEFAULT 0,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX yorha_system_metrics_recorded_at_idx ON yorha_system_metrics(recorded_at);
