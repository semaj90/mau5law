# Phase 8: POI Feature - Testing & Deployment Guide

**Date**: December 14, 2025
**Status**: Ready for Testing & Deployment

---

## Testing Strategy

### Phase 1: Unit Testing (1 day)

#### 1.1 Backend Unit Tests
```bash
# Run unit tests
pytest backend/tests/test_poi_unit.py -v

# Run with coverage
pytest backend/tests/test_poi_unit.py --cov=backend/services --cov-report=html
```

**Test Coverage**:
- POI CRUD operations
- Associate management
- Profile text building
- Error handling

#### 1.2 Frontend Unit Tests
```bash
# Run Svelte component tests
npm run test:unit

# Test specific component
npm run test:unit -- POIForm.svelte
```

**Test Coverage**:
- Form validation
- Component rendering
- Event handling
- State management

### Phase 2: Property-Based Testing (1 day)

#### 2.1 Run Property Tests
```bash
# Run all property tests
pytest backend/tests/test_poi_properties.py -v

# Run specific property test
pytest backend/tests/test_poi_properties.py::TestPOICreationPersistence -v

# Run with 1000 examples
pytest backend/tests/test_poi_properties.py -v --hypothesis-seed=0
```

**Properties Tested**:
1. POI Creation Persistence
2. Vector Embedding Consistency
3. Known Associates Integrity
4. Vector Search Relevance
5. Form Validation Round-Trip
6. Qdrant Index Synchronization
7. Status Consistency

#### 2.2 Property Test Results
Expected: All 7 properties pass with 100+ examples each

### Phase 3: Integration Testing (1 day)

#### 3.1 Backend Integration Tests
```bash
# Start test database
docker-compose -f docker-compose.test.yml up -d

# Run integration tests
pytest backend/tests/test_poi_integration.py -v

# Stop test database
docker-compose -f docker-compose.test.yml down
```

**Test Scenarios**:
- Full CRUD workflow
- Vector search workflow
- Associate management workflow
- Command Center integration

#### 3.2 Frontend Integration Tests
```bash
# Start dev server
npm run dev &

# Run integration tests
npm run test:integration

# Stop dev server
kill %1
```

**Test Scenarios**:
- Create POI flow
- List and filter POIs
- View POI details
- Add/remove associates
- Search similar POIs

### Phase 4: End-to-End Testing (1 day)

#### 4.1 Manual Testing Checklist

**POI Management**:
- [ ] Create new POI
- [ ] View POI list
- [ ] View POI details
- [ ] Update POI
- [ ] Delete POI

**Known Associates**:
- [ ] Add associate
- [ ] View associates
- [ ] Remove associate

**Vector Search**:
- [ ] Search similar POIs
- [ ] Filter by status
- [ ] Filter by priority

**Command Center**:
- [ ] View POI statistics
- [ ] Click quick actions
- [ ] Navigate to POI management

#### 4.2 Performance Testing
```bash
# Load test with 1000 POIs
npm run test:load

# Expected results:
# - List page load: <2s
# - Search: <100ms
# - Create: <500ms
```

#### 4.3 Browser Compatibility
- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile browsers

---

## Deployment Strategy

### Pre-Deployment Checklist

- [ ] All tests passing
- [ ] Code review completed
- [ ] Documentation updated
- [ ] Environment variables configured
- [ ] Database backups created
- [ ] Rollback plan documented

### Deployment Steps

#### Step 1: Database Migration (5 minutes)
```bash
# Backup current database
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Run migration
psql $DATABASE_URL < backend/migrations/001_create_poi_schema.sql

# Verify migration
psql $DATABASE_URL -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'poi%';"
```

#### Step 2: Qdrant Setup (5 minutes)
```bash
# Create collection
curl -X PUT http://localhost:6333/collections/persons_of_interest \
  -H "Content-Type: application/json" \
  -d @backend/config/qdrant_poi_collection.json

# Verify collection
curl http://localhost:6333/collections/persons_of_interest
```

#### Step 3: Backend Deployment (10 minutes)
```bash
# Update requirements.txt
pip install -r backend/requirements.txt

# Update main.py to register POI routes
# See: PHASE_8_POI_BACKEND_INTEGRATION_GUIDE.md

# Restart backend service
systemctl restart legal-ai-backend

# Verify backend
curl http://localhost:8000/api/persons-of-interest?case_id=test
```

#### Step 4: Frontend Deployment (10 minutes)
```bash
# Build frontend
cd sveltekit-frontend
npm run build

# Deploy build
cp -r build/* /var/www/legal-ai/

# Verify frontend
curl http://localhost:5173/persons-of-interest
```

#### Step 5: Smoke Tests (5 minutes)
```bash
# Test POI creation
curl -X POST http://localhost:8000/api/persons-of-interest \
  -H "Content-Type: application/json" \
  -d '{
    "case_id": "test-case",
    "name": "Test POI",
    "status": "suspect",
    "priority": "high",
    "threat_level": "medium"
  }'

# Test POI list
curl "http://localhost:8000/api/persons-of-interest?case_id=test-case"

# Test frontend
curl http://localhost:5173/persons-of-interest
```

### Rollback Plan

If deployment fails:

```bash
# Restore database
psql $DATABASE_URL < backup_YYYYMMDD_HHMMSS.sql

# Restore backend
git checkout HEAD~1 backend/

# Restore frontend
git checkout HEAD~1 sveltekit-frontend/

# Restart services
systemctl restart legal-ai-backend
systemctl restart legal-ai-frontend
```

---

## Monitoring & Maintenance

### Post-Deployment Monitoring (1 week)

#### Daily Checks
- [ ] Error logs reviewed
- [ ] Performance metrics normal
- [ ] No database issues
- [ ] Vector search working

#### Weekly Checks
- [ ] User feedback collected
- [ ] Performance trends analyzed
- [ ] Database optimization reviewed
- [ ] Backup verification

### Performance Metrics

**Target Metrics**:
- API response time: <500ms
- Vector search: <100ms
- Page load: <2s
- Error rate: <0.1%

**Monitoring Tools**:
- Application Performance Monitoring (APM)
- Database query logs
- Frontend error tracking
- User analytics

### Maintenance Tasks

**Weekly**:
- Review error logs
- Check database size
- Verify backups

**Monthly**:
- Optimize database indexes
- Review performance metrics
- Update dependencies

**Quarterly**:
- Full system audit
- Security review
- Performance optimization

---

## Testing Commands Reference

### Run All Tests
```bash
# Backend tests
pytest backend/tests/ -v

# Frontend tests
npm run test

# All tests
npm run test:all
```

### Run Specific Test Suites
```bash
# Unit tests only
pytest backend/tests/test_poi_unit.py -v

# Property tests only
pytest backend/tests/test_poi_properties.py -v

# Integration tests only
pytest backend/tests/test_poi_integration.py -v
```

### Generate Test Reports
```bash
# Coverage report
pytest backend/tests/ --cov=backend/services --cov-report=html

# Test report
pytest backend/tests/ --html=report.html --self-contained-html

# Performance report
pytest backend/tests/ --benchmark-only
```

---

## Deployment Timeline

| Phase | Duration | Tasks |
|-------|----------|-------|
| Testing | 1 day | Unit, Property, Integration, E2E tests |
| Staging | 1 day | Deploy to staging, smoke tests |
| Production | 1 day | Deploy to production, monitoring |
| **Total** | **3 days** | **Complete deployment** |

---

## Success Criteria

✅ **Testing**:
- All unit tests passing
- All property tests passing (100+ examples)
- All integration tests passing
- E2E tests passing
- Performance targets met

✅ **Deployment**:
- Database migration successful
- Qdrant collection created
- Backend API responding
- Frontend loading
- Smoke tests passing

✅ **Monitoring**:
- Error rate <0.1%
- Response time <500ms
- Vector search <100ms
- No critical issues

---

## Troubleshooting

### Test Failures

**Unit Test Failure**:
```bash
# Run with verbose output
pytest backend/tests/test_poi_unit.py -vv

# Run specific test
pytest backend/tests/test_poi_unit.py::TestPOIServiceCRUD::test_create_poi_success -vv
```

**Property Test Failure**:
```bash
# Reproduce with same seed
pytest backend/tests/test_poi_properties.py --hypothesis-seed=<seed>

# Reduce example count
pytest backend/tests/test_poi_properties.py --hypothesis-max-examples=10
```

### Deployment Issues

**Database Migration Fails**:
```bash
# Check migration status
psql $DATABASE_URL -c "SELECT * FROM schema_migrations;"

# Rollback migration
psql $DATABASE_URL < rollback_migration.sql
```

**Qdrant Connection Fails**:
```bash
# Check Qdrant health
curl http://localhost:6333/health

# Restart Qdrant
docker restart qdrant
```

**Backend API Not Responding**:
```bash
# Check backend logs
tail -f /var/log/legal-ai-backend.log

# Restart backend
systemctl restart legal-ai-backend
```

---

## Documentation

- **Testing Guide**: This document
- **Backend Integration**: `PHASE_8_POI_BACKEND_INTEGRATION_GUIDE.md`
- **Frontend Integration**: `PHASE_8_POI_FRONTEND_INTEGRATION_GUIDE.md`
- **Quick Reference**: `PHASE_8_POI_QUICK_REFERENCE.md`

---

## Contact & Support

For issues during testing or deployment:
1. Check troubleshooting section
2. Review relevant integration guide
3. Check application logs
4. Contact development team

---

**Status**: ✅ READY FOR TESTING & DEPLOYMENT
**Date**: December 14, 2025
**Estimated Duration**: 3 days
