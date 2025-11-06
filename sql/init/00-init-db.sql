-- Create the user role if it doesn't exist
DO
$do$
BEGIN
   IF NOT EXISTS (
      SELECT FROM pg_catalog.pg_roles
      WHERE  rolname = 'legal_admin') THEN

      CREATE ROLE legal_admin LOGIN PASSWORD '123456';
   END IF;
END
$do$;

-- Grant necessary privileges
ALTER ROLE legal_admin CREATEDB;

-- Create the database if it doesn't exist and set the owner
-- Note: This part needs to be run by a superuser (like the default 'postgres' user)
-- It's best handled by environment variables in docker-compose, but we can ensure ownership here.
\c postgres;
CREATE DATABASE legal_ai_db OWNER legal_admin;
GRANT ALL PRIVILEGES ON DATABASE legal_ai_db TO legal_admin;
