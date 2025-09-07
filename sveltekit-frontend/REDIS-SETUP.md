Windows Redis quick setup

Project expects Redis on port 4005 by default. You have two options:

1) Local Windows Redis binary
- Download a Windows-compatible Redis distribution and place the `redis-server.exe` and `redis-cli.exe` under `../redis-latest/` relative to the repo root.
- Start with PowerShell: `Start-Process -NoNewWindow -FilePath './redis-latest/redis-server.exe' -ArgumentList '--port', '4005'`

2) Remote Redis / custom URL
- Set the environment variable `REDIS_URL` to point to your Redis instance, e.g.:

```powershell
$env:REDIS_URL = 'redis://localhost:4005'
```

3) Environment variables supported by code
- `REDIS_URL` (preferred) e.g. `redis://user:pass@host:4005`
- `REDIS_HOST` and `REDIS_PORT` are still accepted for compatibility

Notes
- The project consolidates to using `ioredis` across the frontend worker and cache modules. If you plan to run Redis locally for development use port 4005 to align with scripts and the dev orchestrator.
