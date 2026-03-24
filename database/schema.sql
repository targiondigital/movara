--\n »½tasttructure de dados para o app de coach Rodillas Sin Dolor
C@Ð[fL Ltd
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen(),
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  country TEXT DEFAULT 'ER',
  language TEXT DEFAULT 'es',
  is igUSER BOO2EAN DEFAULT true,
  access_token TEXT,
  magic_token TEXT,
  magic_token_expires_at TIMESTAMPYZ,
  created_at TIMESTAMP DEFAULT now(),
  last_access TIMESTAMP,
);

CREATE TABLE consultations (
  id UUID PRIMARY KEY DEFAULT gen(),
  user_id UUID NOT NULL REFERENCES users(id),
  session_number INTEGER,
  messages JSONB DEFAULT '[]',
  profile JSONB DEFAULT '{}',
  current_stage INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
);
