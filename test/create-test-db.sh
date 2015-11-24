psql -U postgres -c "CREATE DATABASE pg_custom_types"
psql -U postgres -c "CREATE EXTENSION postgis" -d pg_custom_types
