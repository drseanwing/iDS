-- Create separate schema for Keycloak to avoid table collisions
CREATE SCHEMA IF NOT EXISTS keycloak;

-- Enable required PostgreSQL extensions for OpenGRADE
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
