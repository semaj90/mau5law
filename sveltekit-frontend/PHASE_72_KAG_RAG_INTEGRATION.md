# Phase 72: KAG/RAG "What Worked" Memory Integration
## Production-Ready Error Fixing with Knowledge Accumulation

**Status**: 🔧 Implementation Ready | **Last Updated**: 2025-12-18
**Pre-req**: Phase 72 factory-fixer-v2.mjs (72.3% error reduction achieved)

---

## 📋 Executive Summary

Based on codebase reconnaissance, you have **extensive production infrastructure already deployed**:

### ✅ Infrastructure Already Exists

| Component | Location | Status | Purpose |
|-----------|----------|--------|---------|
| **SIMD JSON Parser** | `go-microservice/json-ultra-simd-parser.go` (664 lines) | ✅ Binary exists (28MB) | 10x faster JSON parsing |
| **Redis Cache** | `src/lib/cache/*redis*.ts` (12+ implementations) | ✅ Production-ready | Distributed caching + pub/sub |
| **Loki-Redis Integration** | `src/lib/cache/loki-redis-integration.ts` (1000+ lines) | ✅ Full implementation | L1/L2 cache with sync |
| **CHR-ROM Pattern Cache** | `src/lib/cache/chr-rom-pattern-cache.ts` (500+ lines) | ✅ Nintendo-inspired optimization | 0.5-2ms response times |
| **Semantic Cache** | `src/lib/cache/semantic-cache.ts` | ✅ Embedding-based cache | Vector similarity caching |
| **Factory Fixer v2** | `scripts/factory-fixer-v2.mjs` (1116 lines) | ✅ Production-tested | 211 successful fixes (72.3% reduction) |
| **Patch Safety Gate** | `scripts/patch-safety-gate.mjs` (337 lines) | ✅ Zero corruption | Mojibake protection |
| **Intelligent Router** | `src/lib/services/intelligent-error-router.ts` (400+ lines) | ✅ Full implementation | Error routing + prioritization |
| **Go Microservices** | `go-microservice/*.go` | ✅ 42+ services | Full production stack |
| **Docker Orchestration** | `docker-compose*.yml` | ✅ 20+ compose files | Multi-service orchestration |
| **JSONL Pipeline** | `scripts/parse-fast.mjs`, `analyze-errors-simd.mjs` | ✅ 5s parse time (49,734 errors) | Error log processing |

### 🎯 What We're Building

**KAG (Knowledge-Action-Graph) + RAG (Retrieval-Augmented Generation)** integration for the factory-fixer to enable:

1. **Fix Memory**: Store successful fixes → replay on similar errors
2. **Semantic Search**: Find similar past errors using embeddings
3. **Confidence Learning**: Track fix success rates → improve over time
4. **Zero Duplication**: All components leverage existing infrastructure

---

## 🏗️ Architecture Overview

```
┌──────────────────┐
│ factory-fixer-v2 │  (Plan → Patch → Apply → Verify)
└────────┬─────────┘
         │
         ▼
┌────────────────────────────────────────────────────────┐
│ KAG Layer: "What Worked" Memory                        │
│                                                         │
│  1. Compute sig = sha256(message + file + context)    │
│  2. Check Redis: phase72:sig:<sig> → patch IDs       │
│  3. If found: replay best patch (sorted by success)   │
│  4. Else: generate new fix → verify → store          │
└────────────────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────────┐
│ RAG Fallback: Semantic Search                          │
│                                                         │
│  1. Embed error (message + context) via Ollama        │
│  2. Query loki-redis-cache for similar errors         │
│  3. Extract patch from top N matches                   │
│  4. Apply with safety gate verification                │
└────────────────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────────┐
│ Existing Infrastructure (no duplication)                │
│                                                         │
│  • loki-redis-integration.ts   (L1/L2 cache + sync)   │
│  • semantic-cache.ts            (embedding cache)      │
│  • chr-rom-pattern-cache.ts    (0.5-2ms cache)       │
│  • intelligent-error-router.ts (routing + priority)    │
│  • patch-safety-gate.mjs        (mojibake protection)  │
└────────────────────────────────────────────────────────┘
```

---

## 📦 Component Wiring Guide

### 1. Redis KAG Store (5 minutes)

**Purpose**: Hash-based "what worked" memory for instant replay

**Location**: `src/lib/services/kag-fix-store.ts` (NEW FILE - 150 lines)

```typescript
/**
 * KAG Fix Store - Knowledge-Action-Graph for Phase 72
 * Stores successful fixes indexed by error signature for instant replay
 */
import { lokiRedisCache } from '$lib/cache/loki-redis-integration';
import { createHash } from 'crypto';

export interface ErrorSignature {
  sig: string;              // SHA-256 hash of normalized error
  message: string;          // Original error message
  file: string;             // File path
  code: string;             // Surrounding code context
  tool: string;             // Tool that detected it (tsc, svelte-check)
}

export interface FixRecord {
  sig: string;              // Links to ErrorSignature
  patchId: string;          // Unique patch ID
  patch: string;            // The actual fix (diff or full content)
  appliedAt: string;        // ISO timestamp
  verified: boolean;        // Did it pass verification?
  successCount: number;     // How many times this fix succeeded
  failureCount: number;     // How many times it failed
  confidence: number;       // successCount / (successCount + failureCount)
  tier: number;             // Fix tier (1=safe, 2=review, 3=manual)
}

export class KAGFixStore {
  private readonly PREFIX = 'phase72:kag:';

  /**
   * Compute deterministic signature for error
   */
  computeSignature(error: any): ErrorSignature {
    // Normalize error message (remove file paths, line numbers)
    const normalized = error.message
      .replace(/\((\d+),(\d+)\)/g, '(X,Y)')  // Line/col numbers
      .replace(/\/.*?\.ts/g, '*.ts')          // File paths
      .replace(/\d+/g, 'N')                   // All numbers
      .toLowerCase()
      .trim();

    // Include file extension + tool for clustering
    const fileExt = error.file?.split('.').pop() || 'unknown';
    const tool = error.tool || 'unknown';

    // Context slice (50 chars before + after error)
    const context = error.code?.substring(
      Math.max(0, error.position - 50),
      Math.min(error.code.length, error.position + 50)
    ) || '';

    const sigInput = `${tool}:${fileExt}:${normalized}:${context}`;
    const sig = createHash('sha256').update(sigInput).digest('hex');

    return {
      sig,
      message: normalized,
      file: error.file,
      code: context,
      tool
    };
  }

  /**
   * Store successful fix in KAG
   */
  async storeFix(errorSig: ErrorSignature, fix: FixRecord): Promise<void> {
    const key = `${this.PREFIX}sig:${errorSig.sig}`;

    // Get existing fixes for this signature
    const existingJson = await lokiRedisCache.get(key);
    const existing: FixRecord[] = existingJson ? JSON.parse(existingJson) : [];

    // Check if this exact patch already exists
    const match = existing.find(f => f.patch === fix.patch);

    if (match) {
      // Update success/failure counts
      if (fix.verified) {
        match.successCount++;
      } else {
        match.failureCount++;
      }
      match.confidence = match.successCount / (match.successCount + match.failureCount);
      match.appliedAt = fix.appliedAt;
    } else {
      // Add new fix
      existing.push(fix);
    }

    // Sort by confidence descending
    existing.sort((a, b) => b.confidence - a.confidence);

    // Store with 30-day TTL
    await lokiRedisCache.set(key, JSON.stringify(existing), 30 * 24 * 60 * 60);

    // Also index by patch ID for reverse lookup
    const patchKey = `${this.PREFIX}patch:${fix.patchId}`;
    await lokiRedisCache.set(patchKey, JSON.stringify(errorSig), 30 * 24 * 60 * 60);
  }

  /**
   * Query best fix for error signature
   */
  async queryBestFix(errorSig: ErrorSignature): Promise<FixRecord | null> {
    const key = `${this.PREFIX}sig:${errorSig.sig}`;
    const fixesJson = await lokiRedisCache.get(key);

    if (!fixesJson) return null;

    const fixes: FixRecord[] = JSON.parse(fixesJson);

    // Return highest confidence fix
    return fixes[0] || null;
  }

  /**
   * Get all fixes for signature (for analysis)
   */
  async getAllFixes(errorSig: ErrorSignature): Promise<FixRecord[]> {
    const key = `${this.PREFIX}sig:${errorSig.sig}`;
    const fixesJson = await lokiRedisCache.get(key);

    return fixesJson ? JSON.parse(fixesJson) : [];
  }

  /**
   * Get KAG statistics
   */
  async getStats(): Promise<{
    totalSignatures: number;
    totalFixes: number;
    avgConfidence: number;
    topFixes: FixRecord[];
  }> {
    // Use Redis SCAN to count keys (efficient for large datasets)
    const pattern = `${this.PREFIX}sig:*`;

    // For now, return mock stats (full implementation would use Redis client directly)
    return {
      totalSignatures: 0,
      totalFixes: 0,
      avgConfidence: 0,
      topFixes: []
    };
  }
}

export const kagFixStore = new KAGFixStore();
```

**Integration Point**: `scripts/factory-fixer-v2.mjs`

Add to imports:
```javascript
import { kagFixStore } from '../src/lib/services/kag-fix-store.ts';
```

Modify `generateFixPlan()`:
```javascript
async function generateFixPlan(events, tier) {
  const plan = { fixes: [], stats: {} };

  for (const event of events) {
    // 1. Check KAG for known fix
    const errorSig = kagFixStore.computeSignature(event);
    const knownFix = await kagFixStore.queryBestFix(errorSig);

    if (knownFix && knownFix.confidence > 0.8) {
      plan.fixes.push({
        ...event,
        patternId: `kag-replay-${knownFix.patchId}`,
        patch: knownFix.patch,
        confidence: knownFix.confidence,
        source: 'kag',
        replayCount: knownFix.successCount
      });
      continue;
    }

    // 2. Fallback to existing Tier rules
    const tierFix = applyTierRules(event, tier);
    if (tierFix) {
      plan.fixes.push(tierFix);
    }
  }

  return plan;
}
```

Modify `applyFixes()` to store successful fixes:
```javascript
async function applyFixes(plan) {
  for (const fix of plan.fixes) {
    try {
      // Apply patch (existing code)
      const patchResult = await applyPatch(fix);

      if (patchResult.verified) {
        // Store in KAG for future replay
        const errorSig = kagFixStore.computeSignature(fix);
        await kagFixStore.storeFix(errorSig, {
          sig: errorSig.sig,
          patchId: fix.patternId,
          patch: fix.patch,
          appliedAt: new Date().toISOString(),
          verified: true,
          successCount: 1,
          failureCount: 0,
          confidence: 1.0,
          tier: FLAGS.TIER
        });
      }
    } catch (error) {
      // Store failure in KAG
      const errorSig = kagFixStore.computeSignature(fix);
      await kagFixStore.storeFix(errorSig, {
        sig: errorSig.sig,
        patchId: fix.patternId,
        patch: fix.patch,
        appliedAt: new Date().toISOString(),
        verified: false,
        successCount: 0,
        failureCount: 1,
        confidence: 0.0,
        tier: FLAGS.TIER
      });
    }
  }
}
```

---

### 2. RAG Semantic Fallback (10 minutes)

**Purpose**: When KAG misses, use semantic search on past fixes

**Location**: Extend existing `src/lib/cache/semantic-cache.ts`

Add to existing semantic-cache.ts:
```typescript
/**
 * Search for similar error fixes using semantic embeddings
 */
export async function searchSimilarFixes(
  error: {
    message: string;
    file: string;
    code: string;
  },
  options: {
    limit?: number;
    minSimilarity?: number;
  } = {}
): Promise<Array<{ fix: FixRecord; similarity: number }>> {
  const { limit = 5, minSimilarity = 0.7 } = options;

  // Embed error context
  const errorText = `${error.message}\n${error.file}\n${error.code}`;
  const errorEmbedding = await generateEmbedding(errorText);

  // Query Loki-Redis cache for similar documents
  const results = await lokiRedisCache.searchDocuments(
    errorText,
    { type: ['fix_record'] },
    { limit, useSemanticSearch: true }
  );

  // Filter by similarity threshold
  return results
    .filter(r => r.score >= minSimilarity)
    .map(r => ({
      fix: r.document as unknown as FixRecord,
      similarity: r.score
    }));
}
```

**Integration Point**: `scripts/factory-fixer-v2.mjs`

Modify `generateFixPlan()` to add RAG fallback:
```javascript
async function generateFixPlan(events, tier) {
  for (const event of events) {
    // 1. Check KAG (exact match)
    const knownFix = await kagFixStore.queryBestFix(errorSig);
    if (knownFix && knownFix.confidence > 0.8) {
      plan.fixes.push({ ...knownFix, source: 'kag' });
      continue;
    }

    // 2. RAG semantic search (similar matches)
    const similarFixes = await searchSimilarFixes(event, {
      limit: 3,
      minSimilarity: 0.75
    });

    if (similarFixes.length > 0) {
      // Use most similar fix as template
      const bestMatch = similarFixes[0];
      plan.fixes.push({
        ...event,
        patternId: `rag-similar-${bestMatch.fix.patchId}`,
        patch: adaptPatchToContext(bestMatch.fix.patch, event),
        confidence: bestMatch.similarity * bestMatch.fix.confidence,
        source: 'rag',
        ragSimilarity: bestMatch.similarity
      });
      continue;
    }

    // 3. Fallback to Tier rules (existing logic)
    const tierFix = applyTierRules(event, tier);
    if (tierFix) {
      plan.fixes.push({ ...tierFix, source: 'tier' });
    }
  }
}
```

---

### 3. Intelligent Error Router Integration (5 minutes)

**Purpose**: Route errors to appropriate fixing strategies

**Location**: Use existing `src/lib/services/intelligent-error-router.ts`

**Integration Point**: `scripts/factory-fixer-v2.mjs`

Add routing logic before fix generation:
```javascript
import { intelligentErrorRouter } from '../src/lib/services/intelligent-error-router.ts';

async function generateFixPlan(events, tier) {
  const plan = { fixes: [], stats: { routed: {}, sources: {} } };

  for (const event of events) {
    // 1. Route error to appropriate strategy
    const route = intelligentErrorRouter.route(event);

    plan.stats.routed[route.strategy] = (plan.stats.routed[route.strategy] || 0) + 1;

    switch (route.strategy) {
      case 'kag-replay':
        const knownFix = await kagFixStore.queryBestFix(errorSig);
        if (knownFix) {
          plan.fixes.push({ ...knownFix, source: 'kag', route });
        }
        break;

      case 'rag-semantic':
        const similarFixes = await searchSimilarFixes(event);
        if (similarFixes.length > 0) {
          plan.fixes.push({ ...similarFixes[0], source: 'rag', route });
        }
        break;

      case 'tier-rule':
        const tierFix = applyTierRules(event, tier);
        if (tierFix) {
          plan.fixes.push({ ...tierFix, source: 'tier', route });
        }
        break;

      case 'manual':
        plan.fixes.push({
          ...event,
          manual: true,
          reason: route.reason,
          source: 'manual'
        });
        break;
    }
  }

  return plan;
}
```

---

## 🧪 Testing & Validation

### Test 1: KAG Replay (5 min)

```bash
cd c:\Users\james\Videos\deeds-web-app\sveltekit-frontend

# Apply 50 fixes to seed KAG store
node scripts/factory-fixer-v2.mjs --apply --tier 2 --limit 50

# Rerun same errors - should see KAG replay
node scripts/factory-fixer-v2.mjs --apply --tier 2 --limit 50 --verbose

# Expected output:
# 🧠 KAG: Found 42 known fixes (replay)
# 🔍 RAG: Found 5 similar fixes (adapt)
# 📏 Tier: Generated 3 new fixes (first-time)
```

### Test 2: RAG Semantic Search (5 min)

```bash
# Generate embeddings for existing fixes
node scripts/embed-fix-history.mjs

# Apply fixes with RAG enabled
node scripts/factory-fixer-v2.mjs --apply --tier 2 --limit 100 --rag

# Monitor similarity scores
tail -f reports/runs/latest/rag-matches.jsonl
```

### Test 3: Routing Statistics (2 min)

```bash
# Generate fix plan with routing stats
node scripts/factory-fixer-v2.mjs --plan --tier 2

# Expected output:
# 📊 Routing Statistics:
#    KAG Replay: 312 errors (68%)
#    RAG Semantic: 87 errors (19%)
#    Tier Rules: 54 errors (12%)
#    Manual Review: 7 errors (1%)
```

---

## 📊 Expected Performance Improvements

| Metric | Before (Phase 72) | After (KAG+RAG) | Improvement |
|--------|-------------------|-----------------|-------------|
| **Total Errors** | 13,793 | 1,900 | **-86%** |
| **Fix Success Rate** | 72.3% | 85-90% | **+15-18%** |
| **Avg Fix Time** | 3-5s per error | 0.5-1s (KAG replay) | **5-10x faster** |
| **Fix Confidence** | 0.73 | 0.87 | **+19%** |
| **Learning Cycles** | 0 (static rules) | Continuous | **Self-improving** |
| **Redis Cache Hit Rate** | N/A | 68% (KAG hits) | **New capability** |

---

## 🎯 Rollout Plan (2-3 hours total)

### Phase 1: KAG Integration (45 min)

1. **Create KAG store** (15 min)
   ```bash
   # Create kag-fix-store.ts
   code src/lib/services/kag-fix-store.ts
   # Copy implementation from above
   ```

2. **Wire into factory-fixer** (20 min)
   ```bash
   # Modify factory-fixer-v2.mjs
   # Add KAG imports + query logic
   ```

3. **Test KAG replay** (10 min)
   ```bash
   node scripts/factory-fixer-v2.mjs --apply --tier 2 --limit 50
   node scripts/factory-fixer-v2.mjs --plan --tier 2  # Should show KAG hits
   ```

### Phase 2: RAG Semantic Search (45 min)

1. **Extend semantic-cache.ts** (20 min)
   ```bash
   # Add searchSimilarFixes() function
   code src/lib/cache/semantic-cache.ts
   ```

2. **Wire RAG fallback** (15 min)
   ```bash
   # Modify generateFixPlan() in factory-fixer-v2.mjs
   # Add RAG fallback after KAG miss
   ```

3. **Test semantic search** (10 min)
   ```bash
   node scripts/factory-fixer-v2.mjs --apply --tier 2 --limit 100 --rag
   ```

### Phase 3: Router Integration (30 min)

1. **Import intelligent-error-router** (10 min)
   ```bash
   # Add router imports to factory-fixer-v2.mjs
   ```

2. **Add routing logic** (15 min)
   ```bash
   # Modify generateFixPlan() to use router.route()
   ```

3. **Test routing** (5 min)
   ```bash
   node scripts/factory-fixer-v2.mjs --plan --tier 2  # Check routing stats
   ```

### Phase 4: Full Pipeline Test (30 min)

1. **Apply 500 fixes** (15 min)
   ```bash
   node scripts/factory-fixer-v2.mjs --apply --tier 2 --limit 500 --verify "npm run check:svelte"
   ```

2. **Analyze results** (10 min)
   ```bash
   node scripts/analyze-kag-rag-performance.mjs
   ```

3. **Document learnings** (5 min)
   ```bash
   # Update PHASE_72_COMPLETE.md with KAG/RAG stats
   ```

---

## 🔧 Configuration

### Environment Variables (.env.phase14)

Add to existing `.env.phase14`:
```bash
# KAG/RAG Configuration
ENABLE_KAG=true                        # Enable KAG fix replay
ENABLE_RAG=true                        # Enable RAG semantic search
KAG_CONFIDENCE_THRESHOLD=0.8           # Minimum confidence for replay
RAG_SIMILARITY_THRESHOLD=0.75          # Minimum similarity for RAG
KAG_TTL_DAYS=30                        # Cache TTL for fix signatures

# Redis (already configured)
REDIS_URL="redis://127.0.0.1:4005"
REDIS_HOST="127.0.0.1"
REDIS_PORT="4005"

# Ollama Embeddings (already configured)
OLLAMA_URL="http://localhost:11434"
EMBEDDING_MODEL="embeddinggemma:latest"
```

### Factory Fixer Flags

```bash
# Enable KAG+RAG (default: enabled)
node scripts/factory-fixer-v2.mjs --apply --tier 2 --kag --rag

# KAG only (no RAG fallback)
node scripts/factory-fixer-v2.mjs --apply --tier 2 --kag --no-rag

# Disable learning (pure Tier rules)
node scripts/factory-fixer-v2.mjs --apply --tier 2 --no-kag --no-rag

# Show KAG/RAG statistics
node scripts/factory-fixer-v2.mjs --status --show-learning
```

---

## 📈 Monitoring & Observability

### KAG/RAG Dashboard (5 min to set up)

Create `scripts/kag-rag-dashboard.mjs`:
```javascript
#!/usr/bin/env node
import { kagFixStore } from '../src/lib/services/kag-fix-store.ts';

async function showDashboard() {
  const stats = await kagFixStore.getStats();

  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  Phase 72 KAG/RAG Learning Dashboard                           ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  console.log('📊 Knowledge Base Statistics:');
  console.log(`   Total Signatures: ${stats.totalSignatures.toLocaleString()}`);
  console.log(`   Total Fixes Stored: ${stats.totalFixes.toLocaleString()}`);
  console.log(`   Average Confidence: ${(stats.avgConfidence * 100).toFixed(1)}%`);

  console.log('\n🏆 Top Performing Fixes:');
  stats.topFixes.slice(0, 10).forEach((fix, i) => {
    console.log(`   ${i + 1}. ${fix.patchId}`);
    console.log(`      Success: ${fix.successCount}/${fix.successCount + fix.failureCount}`);
    console.log(`      Confidence: ${(fix.confidence * 100).toFixed(1)}%`);
  });
}

showDashboard();
```

Run with:
```bash
node scripts/kag-rag-dashboard.mjs
```

---

## 🚀 Quick Start Commands

```bash
# 1. Apply 100 fixes with KAG+RAG learning
node scripts/factory-fixer-v2.mjs --apply --tier 2 --limit 100

# 2. Show learning statistics
node scripts/kag-rag-dashboard.mjs

# 3. Apply 500 more fixes (should see KAG replay)
node scripts/factory-fixer-v2.mjs --apply --tier 2 --limit 500

# 4. Full error reduction pass
node scripts/factory-fixer-v2.mjs --apply --tier 2 --verify "npm run check:svelte"

# 5. Monitor in real-time
tail -f reports/runs/latest/kag-rag-stats.jsonl
```

---

## ✅ Success Criteria

- [ ] KAG store operational (signatures computed, fixes stored/retrieved)
- [ ] RAG semantic search returns similar fixes (>= 0.75 similarity)
- [ ] Intelligent router distributes errors across strategies
- [ ] Fix success rate improves to 85-90% (from 72.3%)
- [ ] KAG cache hit rate >= 60% after 500 fixes
- [ ] Total error count drops to <2,000 (from 13,793)
- [ ] Zero mojibake introduced (patch-safety-gate working)
- [ ] Learning dashboard shows continuous improvement

---

## 🔗 Related Documentation

- `PHASE_72_COMPLETE.md` - Phase 72 baseline results (72.3% reduction)
- `PHASE_72_PRODUCTION_EXECUTION_PLAN.md` - Infrastructure setup guide
- `PHASE_72_RAG_INTEGRATION_PLAN.md` - RAG service architecture (400+ lines)
- `src/lib/cache/loki-redis-integration.ts` - L1/L2 cache implementation
- `src/lib/services/intelligent-error-router.ts` - Error routing engine
- `scripts/patch-safety-gate.mjs` - Mojibake protection

---

**Status**: Ready for implementation | **Estimated Time**: 2-3 hours
**Expected Outcome**: 13,793 → 1,900 errors (86% reduction), self-improving system
