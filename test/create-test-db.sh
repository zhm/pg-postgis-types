psql -U postgres -c "CREATE DATABASE pg_custom_types"
psql -U postgres -c "CREATE EXTENSION postgis" -d pg_custom_types
psql -U postgres -c "DROP TABLE IF EXISTS test;" -d pg_custom_types
psql -U postgres -c "CREATE TABLE test (name text, geom geometry(Point, 4326));" -d pg_custom_types
psql -U postgres -c "INSERT INTO test (name, geom) SELECT 'FL', ST_GeomFromText('POINT (-82 27)', 4326);" -d pg_custom_types
