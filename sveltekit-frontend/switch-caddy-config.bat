@echo off REM Caddy Configuration Switcher for Legal AI Platform (Windows) REM Usage: switch-caddy-config.bat [dev|prod]
set CONFIG_TYPE=%1 if "%CONFIG_TYPE%"=="" set CONFIG_TYPE=dev if "%CONFIG_TYPE%"=="dev" goto :dev if
"%CONFIG_TYPE%"=="development" goto :dev if "%CONFIG_TYPE%"=="prod" goto :prod if "%CONFIG_TYPE%"=="production" goto
:prod goto :usage :dev echo 🔄 Switching to DEVELOPMENT Caddy configuration... copy /y Caddyfile.development Caddyfile
>nul echo ✅ Development config activated echo 🌐 Frontend: http://localhost:5178 (QUIC enabled) echo 📁 MinIO:
http://localhost:9001 echo ❤️ Health: http://localhost:8082/health echo ℹ️ Dev Info: http://localhost:8082/dev-info goto
:restart_info :prod echo 🔄 Switching to PRODUCTION Caddy configuration... copy /y Caddyfile.production Caddyfile >nul
echo ✅ Production config activated echo 🌐 Domain: legal-ai.yourdomain.com (update as needed) echo 🔒 Security headers
enabled echo ⚡ Rate limiting active echo 📊 Logging to /var/log/caddy/legal-ai-access.log echo. echo ⚠️ Remember to:
echo - Update domain names in Caddyfile echo - Configure SSL certificates echo - Set up proper DNS records goto
:restart_info :usage echo ❌ Invalid option. Usage: echo switch-caddy-config.bat dev # Development config echo
switch-caddy-config.bat prod # Production config exit /b 1 :restart_info echo. echo 🚀 Restart Caddy to apply changes:
echo caddy reload echo # or echo caddy run --config Caddyfile
