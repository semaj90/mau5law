# Troubleshooting Guide - Phase 4-5

**Last Updated**: December 9, 2025
**Status**: All issues documented and solutions provided

---

## Common Issues & Solutions

### 1. Database Connection Error

**Error**: `database "legal_ai_db" does not exist`

**Cause**: DATABASE_URL pointing to wrong database

**Solution**:
```bash
# Check .env file
cat .env | grep DATABASE_URL

# Should be:
DATABASE_URL=postgresql://legal_admin:123456@localhost:5432/legal_ai_db

# NOT:
DATABASE_URL=postgresql://legal_admin:123456@localhost:5432/legal_ai_dev
```

**Verify**:
```powershell
$env:PGPASSWORD = "123456"
psql -U postgres -h localhost -d legal_ai_db -c "SELECT 1;"
```

---

### 2. Ollama Timeout Error

**Error**: `DOMException [TimeoutError]: The operation was aborted due to timeout`

**Cause**: Ollama API call timing out

**Solution**:
1. Verify Ollama is running:
   ```powershell
   curl http://localhost:11434/api/tags
   ```

2. Check model is loaded:
   ```powershell
   ollama list
   ```

3. If timeout persists, increase timeout in `ollama-service.ts`:
   ```typescript
   timeout: 60000, // 60 seconds for gemma3-legal
   ```

**Note**: Keyword extraction has fallback, so timeouts are not blocking.

---

### 3. Qdrant Vector Dimension Mismatch

**Error**: `Vector dimension error: expected dim: 384, got 768`

**Cause**: Embedding model mismatch

**Solution**:
1. Verify EMBEDDING_MODEL in `.env`:
   ```bash
   EMBEDDING_MODEL=embeddinggemma:latest
   EMBEDDING_DIMENSION=384
   ```

2. If collection exists with wrong dimensions, delete and recreate:
   ```bash
   # Delete old collection
   curl -X DELETE http://localhost:6333/collections/phase72_evidence_embeddings

   # New collection will be created automatically on next insert
   ```

3. Verify Qdrant is running:
   ```powershell
   curl http://localhost:6333/health
   ```

---

### 4. Dev Server Won't Start

**Error**: `EADDRINUSE: address already in use :::5173`

**Cause**: Port 5173 already in use

**Solution**:
```powershell
# Find process using port 5173
netstat -ano | findstr :5173

# Kill process (replace PID with actual process ID)
taskkill /PID <PID> /F

# Or use different port
npm run dev -- --port 5174
```

---

### 5. API Returns 500 Error

**Error**: `{"error": "Context chat failed"}`

**Cause**: Various backend issues

**Solution**:
1. Check dev server terminal for error messages
2. Verify all services are running:
   ```powershell
   # Check Ollama
   curl http://localhost:11434/api/tags

   # Check Qdrant
   curl http://localhost:6333/health

   # Check PostgreSQL
   $env:PGPASSWORD = "123456"
   psql -U postgres -h localhost -d legal_ai_db -c "SELECT 1;"
   ```

3. Check database connection module:
   ```powershell
   # Look for connection errors in dev server output
   npm run dev
   ```

---

### 6. Docling Backend Attribute Error

**Error**: `'PdfPipelineOptions' object has no attribute 'backend'`

**Cause**: Using old Docling API

**Solution**: Already fixed in `python/docling_analyze.py`

The script uses simplified docling-parse API without backend option:
```python
parser = DoclingPdfParser(loglevel='error')  # No backend option
doc = parser.load(input_path)
```

If error persists:
1. Verify docling-parse is installed:
   ```bash
   pip list | grep docling
   ```

2. Update if needed:
   ```bash
   pip install --upgrade docling-parse
   ```

---

### 7. Keyword Extraction Returns Empty

**Error**: Keywords array is empty

**Cause**: Ollama timeout or extraction failure

**Solution**:
1. Check Ollama is running and model is loaded
2. Keyword extraction has fallback, so should still work
3. Check dev server logs for warnings

**Note**: Fallback extraction uses simple heuristics and still works even if Ollama fails.

---

### 8. Chat Turn Not Saved to Database

**Error**: Chat turn ID not returned

**Cause**: Database insertion failed

**Solution**:
1. Verify database connection:
   ```powershell
   $env:PGPASSWORD = "123456"
   psql -U postgres -h localhost -d legal_ai_db -c "SELECT * FROM chat_turns LIMIT 1;"
   ```

2. Check table exists:
   ```powershell
   $env:PGPASSWORD = "123456"
   psql -U postgres -h localhost -d legal_ai_db -c "\dt chat_turns"
   ```

3. Check for FK constraint errors:
   ```powershell
   $env:PGPASSWORD = "123456"
   psql -U postgres -h localhost -d legal_ai_db -c "\d chat_turns"
   ```

---

### 9. TypeScript Compilation Errors

**Error**: `Type 'X' is not assignable to type 'Y'`

**Cause**: Type mismatch in code

**Solution**:
1. Run diagnostics:
   ```powershell
   npm run check
   ```

2. Fix errors shown in output

3. Verify all files compile:
   ```powershell
   npx tsc --noEmit
   ```

---

### 10. CORS Error

**Error**: `Access to XMLHttpRequest blocked by CORS policy`

**Cause**: Cross-origin request blocked

**Solution**:
1. Verify CORS_ORIGIN in `.env`:
   ```bash
   CORS_ORIGIN=http://localhost:5173
   ```

2. Check API endpoint has CORS headers:
   ```typescript
   return json(response, {
     headers: {
       'Access-Control-Allow-Origin': '*',
     },
   });
   ```

---

## Verification Checklist

### Services Running
- [ ] PostgreSQL: `psql -U postgres -h localhost -d legal_ai_db -c "SELECT 1;"`
- [ ] Ollama: `curl http://localhost:11434/api/tags`
- [ ] Qdrant: `curl http://localhost:6333/health`
- [ ] SvelteKit: `npm run dev` (should start on 5173)

### Configuration
- [ ] DATABASE_URL correct in `.env`
- [ ] EMBEDDING_MODEL=embeddinggemma:latest
- [ ] EMBEDDING_DIMENSION=384
- [ ] OLLAMA_URL=http://localhost:11434
- [ ] QDRANT_URL=http://localhost:6333

### Code
- [ ] No TypeScript errors: `npx tsc --noEmit`
- [ ] No compilation warnings
- [ ] All imports resolve
- [ ] Database connection module exists

### Database
- [ ] chat_turns table exists
- [ ] chat_turn_evidence table exists
- [ ] evidence table exists
- [ ] legal_documents.created_by column exists
- [ ] FK constraints in place

---

## Debug Mode

### Enable Verbose Logging

**In `.env`**:
```bash
LOG_LEVEL=debug
NODE_ENV=development
```

**In code**:
```typescript
console.log('🔍 Debug:', variable);
console.warn('⚠️ Warning:', issue);
console.error('❌ Error:', error);
```

### Check Dev Server Output

The dev server terminal shows:
- Connection status
- Request logs
- Error messages
- Performance metrics

**Keep it open** while testing!

---

## Performance Issues

### Slow Keyword Extraction

**Cause**: Ollama processing time

**Solution**:
1. Verify Ollama has enough resources
2. Check system CPU/memory usage
3. Increase timeout if needed
4. Fallback extraction is faster but less accurate

### Slow API Response

**Cause**: LLM processing time

**Solution**:
1. Expected: 30-60 seconds for Gemma-3-Legal
2. Check system resources
3. Verify Ollama is not overloaded
4. Consider using smaller model for testing

### Database Slow Queries

**Cause**: Missing indices or large result sets

**Solution**:
1. Check indices are created:
   ```sql
   SELECT * FROM pg_indexes WHERE tablename = 'chat_turns';
   ```

2. Verify GIN index on keywords:
   ```sql
   SELECT * FROM pg_indexes WHERE indexname LIKE '%keyword%';
   ```

---

## Getting Help

### Check Logs
1. Dev server terminal output
2. Browser console (F12)
3. Network tab (F12 → Network)
4. Database logs

### Common Patterns
- **Connection errors**: Check service is running
- **Timeout errors**: Check service is responsive
- **Type errors**: Check TypeScript compilation
- **Database errors**: Check schema and constraints

### Restart Services
```powershell
# Stop dev server
# Ctrl+C in terminal

# Restart Ollama
ollama serve

# Restart Qdrant
qdrant

# Restart PostgreSQL
# (depends on your setup)

# Restart dev server
npm run dev
```

---

## Quick Fixes

| Issue | Quick Fix |
|-------|-----------|
| Port in use | `netstat -ano \| findstr :5173` then `taskkill /PID <PID> /F` |
| Database error | `psql -U postgres -h localhost -d legal_ai_db -c "SELECT 1;"` |
| Ollama timeout | `curl http://localhost:11434/api/tags` |
| Qdrant error | `curl http://localhost:6333/health` |
| TypeScript error | `npx tsc --noEmit` |
| Dev server error | Check terminal output, restart with `npm run dev` |

---

## When All Else Fails

1. **Restart everything**:
   ```powershell
   # Stop dev server (Ctrl+C)
   # Restart Ollama
   # Restart Qdrant
   # Restart PostgreSQL
   # Run: npm run dev
   ```

2. **Check configuration**:
   ```bash
   cat .env | grep -E "DATABASE_URL|EMBEDDING_MODEL|OLLAMA_URL|QDRANT_URL"
   ```

3. **Verify database**:
   ```powershell
   $env:PGPASSWORD = "123456"
   psql -U postgres -h localhost -d legal_ai_db -c "\dt"
   ```

4. **Check code**:
   ```powershell
   npx tsc --noEmit
   npm run check
   ```

5. **Review logs**:
   - Dev server terminal
   - Browser console
   - Database logs

---

## Support

For issues not covered here:
1. Check the documentation files
2. Review error messages carefully
3. Check service logs
4. Verify configuration
5. Restart services

---

**Last Updated**: December 9, 2025
**Status**: All common issues documented

