-- Create extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Roles table
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    metadata JSONB,
    CONSTRAINT roles_name_key UNIQUE (name)
);

-- Role versions table
CREATE TABLE IF NOT EXISTS role_versions (
    id SERIAL PRIMARY KEY,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    version VARCHAR(50) NOT NULL,
    template TEXT NOT NULL,
    variables JSONB DEFAULT '{}'::jsonb,
    inherits VARCHAR(100) REFERENCES roles(name) ON DELETE SET NULL,
    constraints JSONB DEFAULT '{}'::jsonb,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(100),
    metadata JSONB,
    CONSTRAINT role_versions_role_id_version_key UNIQUE (role_id, version)
);

-- Role dependencies
CREATE TABLE IF NOT EXISTS role_dependencies (
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    depends_on_role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    is_required BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT role_dependencies_pkey PRIMARY KEY (role_id, depends_on_role_id)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);
CREATE INDEX IF NOT EXISTS idx_role_versions_role_id ON role_versions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_versions_version ON role_versions(version);
CREATE INDEX IF NOT EXISTS idx_role_dependencies_role_id ON role_dependencies(role_id);
CREATE INDEX IF NOT EXISTS idx_role_dependencies_depends_on_role_id ON role_dependencies(depends_on_role_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for roles table
DROP TRIGGER IF EXISTS update_roles_modtime ON roles;
CREATE TRIGGER update_roles_modtime
BEFORE UPDATE ON roles
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Insert default roles
INSERT INTO roles (name, description, created_by, metadata)
VALUES 
    ('system', 'System role for internal use', 'system', '{"system": true}'),
    ('user', 'Default user role', 'system', '{"system": true}'),
    ('assistant', 'Default assistant role', 'system', '{"system": true}')
ON CONFLICT (name) DO NOTHING;

-- Insert default role versions
INSERT INTO role_versions (role_id, version, template, variables, is_default, created_by)
SELECT 
    r.id, 
    '1.0.0', 
    CASE 
        WHEN r.name = 'system' THEN 'You are a {{role}} assistant. {{content}}'
        WHEN r.name = 'user' THEN '{{content}}'
        WHEN r.name = 'assistant' THEN '{{content}}'
    END,
    CASE 
        WHEN r.name = 'system' THEN '{"role": "helpful"}'
        ELSE '{}'::jsonb 
    END,
    true,
    'system'
FROM roles r
ON CONFLICT (role_id, version) DO NOTHING;
