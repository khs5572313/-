#!/usr/bin/env bash
# 판독 웹앱 실행: http://127.0.0.1:8000
cd "$(dirname "$0")"
[ -f .env ] && set -a && . ./.env && set +a
exec python3 -m uvicorn webapp.server:app --host 127.0.0.1 --port 8000
