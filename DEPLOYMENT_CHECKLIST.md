# Deployment Checklist

## Pre-Deployment

- [ ] WSL2 with Ubuntu 22.04 LTS installed
- [ ] Docker Desktop running with WSL2 backend
- [ ] NVIDIA GPU drivers installed (`nvidia-smi` works)
- [ ] Python 3.11+ installed
- [ ] Git repository cloned
- [ ] 50GB+ free disk space
- [ ] 8GB+ RAM available

## Environment Setup

- [ ] Create Python virtual environment: `python -m venv venv`
- [ ] Activate venv: `source venv/bin/activate`
- [ ] Install dependencies: `pip install -r requirements.txt`
- [ ] Install supervisord: `pip install supervisor`
- [ ] Create required directories: `mkdir -p sql/init logs data/{postgres,redis,rabbitmq,qdrant}`
- [ ] Create `.env.local` with database credentials

## Infrastructure Deployment

### Docker Services

- [ ] Make infrastructure script executable: `chmod +x scripts/start_infrastructure.sh`
- [ ] Start infrastructure: `./scripts/start_infrastructure.sh start`
- [ ] Verify Postgres: `psql -h localhost -U legal_admin -d legal_ai_db -c "SELECT 1;"`
- [ ] Verify Redis: `redis-cli ping`
- [ ] Verify RabbitMQ: `curl -u guest:guest http://localhost:15672/api/overview`
- [ ] Verify Qdrant: `curl http://localhost:6333/collections`
- [ ] Check all containers: `docker ps` (should show 4 containers)

### Python Workers

- [ ] Make worker script executable: `chmod +x scripts/start_workers.sh`
- [ ] Start workers: `./scripts/start_workers.sh start`
- [ ] Check worker status: `supervisorctl -c backend/supervisord.conf status`
- [ ] Verify all 5 workers running:
  - [ ] embedding-worker_00
  - [ ] embedding-worker_01
  - [ ] mirror-worker_00
  - [ ] rerank-worker_00
  - [ ] citation-worker_00

## Verification Tests

### Database Tests

```bash
# Postgres
psql -h localhost -U legal_admin -d legal_ai_db -c "SELECT * FROM pg_extension WHERE extname='vector';"
# Expected: vector extension listed

# Redis
redis-cli PING
# Expected: PONG

# RabbitMQ
curl -u guest:guest http://localhost:15672/api/vhosts
# Expected: /legalai vhost listed

# Qdrant
curl http://localhost:6333/collections
# Expected: {"result":{"collections":[]},"status":"ok"}
```

### Worker Tests

```bash
# Check supervisord
supervisorctl -c backend/supervisord.conf status
# Expected: All workers RUNNING

# Check logs
tail -f /tmp/embedding-worker.out.log
# Expected: No errors, ready to process tasks

# Publish test task
python test_pipeline.py
# Expected: Task published successfully
```

### Integration Tests

- [ ] Upload test document via frontend
- [ ] Monitor embedding worker: `tail -f /tmp/embedding-worker.out.log`
- [ ] Check Postgres for stored embeddings
- [ ] Check Redis for cached embeddings
- [ ] Check Qdrant for vector storage
- [ ] Search for document via frontend
- [ ] Verify reranking: `tail -f /tmp/rerank-worker.out.log`
- [ ] Chat with Gemma about document

## Frontend Deployment

- [ ] Navigate to frontend: `cd sveltekit-frontend`
- [ ] Install dependencies: `npm install`
- [ ] Start dev server: `npm run dev`
- [ ] Access frontend: http://localhost:5173
- [ ] Verify API connection: Check browser console for errors
- [ ] Test upload: Upload a test document
- [ ] Test search: Search for a statute
- [ ] Test chat: Ask a legal question

## Performance Verification

- [ ] Embedding latency: < 50ms per batch of 32
- [ ] Reranking latency: < 50ms per query
- [ ] Search latency: < 100ms
- [ ] GPU memory usage: < 2GB
- [ ] CPU usage: < 80%
- [ ] Memory usage: < 4GB

## Monitoring Setup

- [ ] RabbitMQ UI accessible: http://localhost:15672
- [ ] Redis CLI working: `redis-cli`
- [ ] Docker stats working: `docker stats`
- [ ] Worker logs accessible: `tail -f /tmp/*.log`
- [ ] Postgres logs accessible: `docker logs postgres-pgvector`

## Documentation Review

- [ ] Read `QUICK_START.md`
- [ ] Read `INFRASTRUCTURE_SETUP.md`
- [ ] Read `.kiro/INFRASTRUCTURE_PATCHES_SUMMARY.md`
- [ ] Understand architecture diagram
- [ ] Know how to troubleshoot common issues

## Backup & Recovery

- [ ] Backup Postgres data: `docker exec postgres-pgvector pg_dump -U legal_admin legal_ai_db > backup.sql`
- [ ] Backup Redis data: `docker exec legal-ai-redis redis-cli BGSAVE`
- [ ] Document recovery procedures
- [ ] Test recovery process

## Production Readiness

- [ ] All services auto-restart on failure
- [ ] Logs are being collected
- [ ] Monitoring is in place
- [ ] Backup strategy defined
- [ ] Disaster recovery plan documented
- [ ] Performance baselines established
- [ ] Security credentials secured
- [ ] Environment variables configured

## Go/No-Go Decision

### Go Criteria (All must be true)
- [ ] All Docker services running
- [ ] All Python workers running
- [ ] Database connectivity verified
- [ ] Message queue working
- [ ] Vector database operational
- [ ] Frontend accessible
- [ ] End-to-end pipeline tested
- [ ] Performance acceptable
- [ ] No critical errors in logs

### No-Go Criteria (Any of these means stop)
- [ ] Docker services failing to start
- [ ] Workers not processing tasks
- [ ] Database connection errors
- [ ] GPU not available
- [ ] Memory/CPU exhausted
- [ ] Frontend not loading
- [ ] Critical errors in logs

## Sign-Off

- [ ] All checklist items completed
- [ ] All tests passing
- [ ] Documentation reviewed
- [ ] Team notified
- [ ] Ready for production

---

## Rollback Plan

If deployment fails:

1. **Stop everything**
   ```bash
   ./scripts/start_workers.sh stop
   ./scripts/start_infrastructure.sh stop
   ```

2. **Check logs**
   ```bash
   docker logs postgres-pgvector
   docker logs legal-ai-redis
   docker logs rabbitmq-legal
   tail -f /tmp/*.log
   ```

3. **Identify issue**
   - Database connection? Check Postgres
   - Queue issue? Check RabbitMQ
   - Worker issue? Check supervisord logs
   - GPU issue? Check nvidia-smi

4. **Fix issue**
   - Restart service: `docker restart <container>`
   - Restart workers: `./scripts/start_workers.sh restart`
   - Check configuration: Review `.env.local`

5. **Retry deployment**
   - Start infrastructure: `./scripts/start_infrastructure.sh start`
   - Start workers: `./scripts/start_workers.sh start`
   - Verify: Run verification tests

---

## Support Contacts

- **Infrastructure Issues**: Check `INFRASTRUCTURE_SETUP.md` troubleshooting
- **Worker Issues**: Check `QUICK_START.md` troubleshooting
- **Database Issues**: Check Postgres logs: `docker logs postgres-pgvector`
- **Queue Issues**: Check RabbitMQ UI: http://localhost:15672
- **GPU Issues**: Run `nvidia-smi` and check CUDA availability

---

## Post-Deployment

- [ ] Monitor system for 24 hours
- [ ] Check for any errors in logs
- [ ] Verify performance metrics
- [ ] Document any issues encountered
- [ ] Update runbooks with lessons learned
- [ ] Schedule regular backups
- [ ] Set up monitoring alerts
- [ ] Plan capacity expansion if needed

---

## Success Criteria

✅ All services running
✅ All workers processing tasks
✅ End-to-end pipeline working
✅ Performance within acceptable limits
✅ No critical errors in logs
✅ Team trained and ready
✅ Documentation complete
✅ Backup strategy in place

---

**Deployment Date**: _______________
**Deployed By**: _______________
**Approved By**: _______________
**Notes**: _______________________________________________
