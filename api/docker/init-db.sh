#!/usr/bin/env bash
# Runs once, on first container start (docker-entrypoint-initdb.d convention).
# POSTGRES_DB (pm4) already exists by then; this adds the e2e test database.
set -euo pipefail

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  CREATE DATABASE pm4_test;
EOSQL
