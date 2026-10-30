-- Enable extensions on default database
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

-- Create keycloak database if needed
SELECT 'CREATE DATABASE samay_keycloak'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'samay_keycloak')\gexec
