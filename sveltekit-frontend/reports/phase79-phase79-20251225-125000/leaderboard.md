# Phase 79: Error Leaderboard

**Run ID:** phase79-20251225-125000
**Generated:** 2025-12-25 12:51:23
**Total Errors:** 0
**Affected Files:** 0
**Top N:** 100

---

## 📊 By Architecture Component



---

## 🎯 Top 0 Files by Impact Score

| Rank | File | Errors | Category | Weight | Impact | Priority |
|------|------|--------|----------|--------|--------|----------|


---

## 🔧 Fix Recommendations

### P0 (Critical - Impact > 100)



### P1 (High - Impact 50-100)



---

## 💡 Next Steps

1. Apply deterministic auto-fixes: `node scripts/phase79-pattern-fixer.mjs --apply`
2. Index to Qdrant: `node scripts/error-index-qdrant.mjs --run phase79-20251225-125000`
3. Semantic search: `node scripts/error-search.mjs --query "high impact errors"`
4. ACE contextual prompting: `node scripts/phase76-ace-prompt-engineer.mjs --task "Fix P0 files"`
