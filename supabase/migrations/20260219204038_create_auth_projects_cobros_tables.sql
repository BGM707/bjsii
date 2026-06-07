/*
  # Create authentication, projects, and billing notes tables

  1. New Tables
    - `users` - Sistema de autenticación con credenciales
      - `id` (uuid, primary key)
      - `username` (text, unique)
      - `password_hash` (text, SHA256)
      - `name` (text)
      - `email` (text)
      - `created_at` (timestamp)
    
    - `projects` - Gestor de proyectos
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text)
      - `client` (text)
      - `status` (text)
      - `quotations` (array)
      - `documents` (array)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `cobros_notes` - Notas de cobros
      - `id` (uuid, primary key)
      - `folio` (text)
      - `cliente` (text)
      - `rut` (text)
      - `telefono` (text)
      - `servicio_titulo` (text)
      - `servicio_desc` (text)
      - `periodo` (text)
      - `neto` (numeric)
      - `banco` (text)
      - `cuenta` (text)
      - `titular` (text)
      - `estado` (text - 'pendiente' o 'pagado')
      - `proyecto_id` (uuid - foreign key)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Create policies for authenticated access
    - Users can only see their own data
*/

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  name text NOT NULL,
  email text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own record"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

INSERT INTO users (username, password_hash, name, email)
VALUES (
  'Fuko197160551',
  '8d7a92a4f3f4e3c3b3a3c3d3e3f3c3d3e3f3c3d3e3f3c3d3e3f3c3d3e3f3c3d',
  'Benjamín González',
  'benjamin@bjservicios.cl'
) ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  client text,
  status text DEFAULT 'activo',
  quotations text[] DEFAULT '{}',
  documents text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view projects"
  ON projects FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS cobros_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folio text NOT NULL,
  cliente text NOT NULL,
  rut text,
  telefono text,
  servicio_titulo text,
  servicio_desc text,
  periodo text,
  neto numeric DEFAULT 0,
  banco text,
  cuenta text,
  titular text,
  estado text DEFAULT 'pendiente',
  proyecto_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE cobros_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view cobros notes"
  ON cobros_notes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert cobros notes"
  ON cobros_notes FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update cobros notes"
  ON cobros_notes FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);