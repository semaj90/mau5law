@echo off
REM LiteLLM with GPU + Redis Cache startup

REM Set Redis connection
set REDIS_HOST=localhost
set REDIS_PORT=6379
set REDIS_PASSWORD=redis

REM GPU optimization
set CUDA_VISIBLE_DEVICES=0

REM Start LiteLLM with config
echo Starting LiteLLM with GPU acceleration and Redis caching...
echo Config: litellm_config.yaml
echo Port: 4000
echo Redis: localhost:6379
echo.

C:\Users\james\AppData\Roaming\Python\Python313\Scripts\litellm.exe --config litellm_config.yaml --port 4000
