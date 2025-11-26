# Docker GPU Startup Scripts - Summary

## ✅ What Was Created

### 1. Bash Startup Script (WSL/Linux)
**File**: `docker/start-gpu-wsl.sh`

**Features**:
- ✅ Build Docker image from Dockerfile.cuda
- ✅ Run container with GPU support
- ✅ Stop container gracefully
- ✅ View logs in real-time
- ✅ Open interactive shell
- ✅ Show system status
- ✅ Clean up (remove container, image, volume)
- ✅ Prerequisite checking
- ✅ Colored output for readability
- ✅ Error handling and recovery

**Usage**:
```bash
chmod +x docker/start-gpu-wsl.sh
./docker/start-gpu-wsl.sh [action]
```

**Actions**:
- `build` - Build Docker image
- `run` - Run container
- `stop` - Stop container
- `logs` - View logs
- `shell` - Open shell
- `status` - Show status
- `clean` - Clean up
- `help` - Show help

---

### 2. PowerShell Startup Script (Windows)
**File**: `docker/start-gpu-wsl.ps1`

**Features**:
- ✅ Same functionality as bash script
- ✅ Windows PowerShell compatible
- ✅ Colored output
- ✅ Error handling
- ✅ Path handling for Windows

**Usage**:
```powershell
.\docker\start-gpu-wsl.ps1 [action]
```

**Actions**: Same as bash script

---

### 3. Comprehensive Documentation
**File**: `docker/GPU_STARTUP_README.md`

**Covers**:
- ✅ Quick start guide
- ✅ All available commands
- ✅ Prerequisites and installation
- ✅ Typical workflow
- ✅ Troubleshooting guide
- ✅ Environment variables
- ✅ Service endpoints
- ✅ Verification procedures

---

## 🎯 Key Features

### Build in WSL Linux
- Builds Docker image in WSL Linux environment
- Uses Dockerfile.cuda with NVIDIA CUDA 12.0
- Automatic prerequisite checking
- BuildKit inline cache for faster rebuilds

### Run with GPU Support
- Automatic GPU detection and mapping
- All required ports exposed (8000, 5432, 6379, 6333, 9000, 5672, 7687)
- Volume mounting for code changes
- CUDA environment variables configured
- Container health checking

### No Modifications to Existing Files
- ✅ Doesn't touch docker-compose.yml
- ✅ Doesn't modify existing build files
- ✅ Doesn't delete any existing configurations
- ✅ Completely separate from compose setup

### Easy Management
- Single command to build
- Single command to run
- Single command to stop
- Single command to view logs
- Single command to clean up

---

## 📊 Workflow

### First Time
```bash
# 1. Make executable
chmod +x docker/start-gpu-wsl.sh

# 2. Build image
./docker/start-gpu-wsl.sh build

# 3. Run container
./docker/start-gpu-wsl.sh run

# 4. Check logs
./docker/start-gpu-wsl.sh logs
```

### Daily Use
```bash
# Start
./docker/start-gpu-wsl.sh run

# Make code changes (auto-reflected in container)

# Stop
./docker/start-gpu-wsl.sh stop
```

### Rebuild After Changes
```bash
# Stop
./docker/start-gpu-wsl.sh stop

# Rebuild
./docker/start-gpu-wsl.sh build

# Run
./docker/start-gpu-wsl.sh run
```

---

## 🔧 Configuration

### Ports Exposed
| Service | Port |
|---------|------|
| FastAPI | 8000 |
| PostgreSQL | 5432 |
| Redis | 6379 |
| Qdrant | 6333 |
| MinIO | 9000 |
| RabbitMQ | 5672 |
| Neo4j | 7687 |

### Volumes
| Host | Container |
|------|-----------|
| ./backend | /app/backend |
| ./sveltekit-frontend | /app/frontend |
| legal-ai-cuda-cache | /app/.cuda_cache |

### Environment
```bash
CUDA_VISIBLE_DEVICES=0
PYTHONUNBUFFERED=1
LOG_LEVEL=INFO
```

---

## ✅ Verification

### Check Image
```bash
docker images | grep legal-ai-gpu
```

### Check Container
```bash
docker ps | grep legal-ai-gpu-container
```

### Check GPU
```bash
./docker/start-gpu-wsl.sh shell
# Inside container:
nvidia-smi
```

### Check API
```bash
curl http://localhost:8000/api/health
```

---

## 🚀 Quick Commands

### Bash (Linux/WSL)
```bash
# Build
./docker/start-gpu-wsl.sh build

# Run
./docker/start-gpu-wsl.sh run

# Logs
./docker/start-gpu-wsl.sh logs

# Shell
./docker/start-gpu-wsl.sh shell

# Stop
./docker/start-gpu-wsl.sh stop

# Status
./docker/start-gpu-wsl.sh status

# Clean
./docker/start-gpu-wsl.sh clean
```

### PowerShell (Windows)
```powershell
# Build
.\docker\start-gpu-wsl.ps1 build

# Run
.\docker\start-gpu-wsl.ps1 run

# Logs
.\docker\start-gpu-wsl.ps1 logs

# Shell
.\docker\start-gpu-wsl.ps1 shell

# Stop
.\docker\start-gpu-wsl.ps1 stop

# Status
.\docker\start-gpu-wsl.ps1 status

# Clean
.\docker\start-gpu-wsl.ps1 clean
```

---

## 📁 Files Created

```
docker/
├── start-gpu-wsl.sh              ✅ Bash startup script
├── start-gpu-wsl.ps1             ✅ PowerShell startup script
├── GPU_STARTUP_README.md         ✅ Comprehensive documentation
├── Dockerfile.cuda               ✅ (existing)
├── docker-compose.gpu.yml        ✅ (existing, not modified)
└── ... (other existing files)
```

---

## 🎯 Benefits

### For Development
- Quick build and run
- Easy log viewing
- Interactive shell access
- Automatic code mounting
- GPU support out of the box

### For CI/CD
- Simple build command
- Reproducible builds
- Easy cleanup
- Status checking
- Error handling

### For Deployment
- Single command startup
- Graceful shutdown
- Health checking
- Volume persistence
- GPU optimization

---

## 🔗 Integration

### With Existing Setup
- ✅ Works alongside docker-compose.yml
- ✅ Doesn't interfere with existing builds
- ✅ Can be used independently
- ✅ Complements existing infrastructure

### With Phase 72
- ✅ Builds Phase 72 services
- ✅ Runs Phase 72 orchestrator
- ✅ Supports Neo4j, Ollama, Qdrant
- ✅ Enables GPU acceleration

### With CUDA
- ✅ Builds CUDA components
- ✅ Enables GPU support
- ✅ Configures Tensor Cores
- ✅ Supports RTX 3060 Ti

---

## 📊 Status

| Component | Status |
|-----------|--------|
| Bash script | ✅ Complete |
| PowerShell script | ✅ Complete |
| Documentation | ✅ Complete |
| GPU support | ✅ Configured |
| Port mapping | ✅ Configured |
| Volume mounting | ✅ Configured |
| Error handling | ✅ Implemented |
| Prerequisite checking | ✅ Implemented |

---

## 🚀 Next Steps

### Immediate
1. [ ] Review `docker/GPU_STARTUP_README.md`
2. [ ] Make script executable: `chmod +x docker/start-gpu-wsl.sh`
3. [ ] Build image: `./docker/start-gpu-wsl.sh build`
4. [ ] Run container: `./docker/start-gpu-wsl.sh run`

### Verification
1. [ ] Check logs: `./docker/start-gpu-wsl.sh logs`
2. [ ] Open shell: `./docker/start-gpu-wsl.sh shell`
3. [ ] Verify GPU: `nvidia-smi` (in shell)
4. [ ] Check API: `curl http://localhost:8000/api/health`

### Development
1. [ ] Make code changes in `./backend` or `./sveltekit-frontend`
2. [ ] Changes auto-reflect in container
3. [ ] View logs for debugging
4. [ ] Stop when done: `./docker/start-gpu-wsl.sh stop`

---

## 📞 Support

### For Issues
1. Check logs: `./docker/start-gpu-wsl.sh logs`
2. Check status: `./docker/start-gpu-wsl.sh status`
3. Review documentation: `docker/GPU_STARTUP_README.md`
4. Check prerequisites: Docker, NVIDIA drivers, CUDA toolkit

### Common Issues
- **Docker not found**: Install Docker Desktop
- **GPU not available**: Install NVIDIA Container Toolkit
- **Port in use**: Kill process or use different port
- **Build fails**: Check requirements.txt and Dockerfile

---

## 📚 Related Documentation

- `docker/GPU_STARTUP_README.md` - Comprehensive guide
- `docker/Dockerfile.cuda` - Docker image definition
- `CUDA_QUICKSTART.md` - CUDA setup
- `CUDA_ACCELERATION_ROADMAP.md` - CUDA roadmap
- `.kiro/STARTUP_GUIDE.md` - Kiro startup guide

---

**Status**: ✅ **READY TO USE**

**Start**: `./docker/start-gpu-wsl.sh build`

**Next**: `./docker/start-gpu-wsl.sh run`
