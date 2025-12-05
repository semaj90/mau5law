# Quick Reference: XState Syntax Fix Patterns

## 🚀 Quick Start

```bash
# 1. Interactive repair (guided)
node scripts/interactive-repair.mjs

# 2. Batch fixer with approvals
node scripts/batch-fixer-approval.mjs

# 3. Validate after fixes
npm run check:svelte
```

---

## 📋 Common Issues & Instant Fixes

### Issue 1: Missing Closing Brace After Invoke

**Pattern:**
```typescript
invoke: {
  id: 'service',
  src: 'handler'
  // ❌ Missing closing brace
}
```

**Fix:**
```typescript
invoke: {
  id: 'service',
  src: 'handler'
} // ✅ Added
```

---

### Issue 2: Missing Comma Between State Properties

**Pattern:**
```typescript
idle: { on: { START: 'running' } }
running: {
  // ❌ Missing comma above
```

**Fix:**
```typescript
idle: { on: { START: 'running' } },  // ✅ Added comma
running: {
```

---

### Issue 3: Incomplete assign() Action

**Pattern:**
```typescript
actions: assign({
  count: ({ context }) => context.count + 1
  // ❌ Missing closing
```

**Fix:**
```typescript
actions: assign({
  count: ({ context }) => context.count + 1
}) // ✅ Added closing paren and brace
```

---

### Issue 4: Unclosed onDone Block

**Pattern:**
```typescript
invoke: {
  id: 'fetch',
  src: 'fetchData',
  onDone: {
    target: 'complete'
    // ❌ Missing closing brace
  onError: { target: 'error' }
```

**Fix:**
```typescript
invoke: {
  id: 'fetch',
  src: 'fetchData',
  onDone: {
    target: 'complete'
  }, // ✅ Added closing and comma
  onError: { target: 'error' }
}
```

---

### Issue 5: Orphaned Closing Braces at EOF

**Pattern:**
```typescript
export const machine = createMachine({
  // ... config
});
}}} // ❌ Extra braces
```

**Fix:**
```typescript
export const machine = createMachine({
  // ... config
}); // ✅ Only one closing
```

---

### Issue 6: Type Union with Orphaned Pipe

**Pattern:**
```typescript
type State = 'idle' | 'running' | 'complete' |
// ❌ Orphaned pipe at end
```

**Fix:**
```typescript
type State = 'idle' | 'running' | 'complete'; // ✅ Removed pipe
```

---

### Issue 7: Nested Arrow Function Imbalance

**Pattern:**
```typescript
actions: assign({
  callback: ({ event }) => ({
    result: event.value
  // ❌ Missing closing paren for arrow function
})
```

**Fix:**
```typescript
actions: assign({
  callback: ({ event }) => ({
    result: event.value
  }) // ✅ Close arrow function
})  // ✅ Close assign
```

---

## 🔧 VS Code Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+Shift+\` | Jump to matching bracket |
| `Cmd+K Cmd+0` | Fold all regions |
| `Cmd+K Cmd+J` | Unfold all regions |
| `Cmd+Shift+P` | Open command palette |
| `Shift+Alt+F` | Format document |

---

## ✅ Validation Checklist (Per File)

- [ ] Open file in VS Code
- [ ] No red squiggles in editor
- [ ] `{` count = `}` count
- [ ] `(` count = `)` count
- [ ] `[` count = `]` count
- [ ] Run: `npx tsc --noEmit --skipLibCheck <file>`
- [ ] Check passes with no new errors
- [ ] Git commit: `fix: complete XState syntax in <filename>`

---

## 🎯 Batch Process (Tier Priority)

### TIER 1 (Start Here - 1-2 hrs)
```
1. utf8-fp32-converter.ts
2. embedding-worker.ts
3. phase13StateMachine.ts
```

**For each:**
1. Open in VS Code
2. Go to EOF
3. Count unclosed braces
4. Add closing symbols from innermost out
5. Validate with TypeScript

---

### TIER 2A (2-3 hrs)
```
4. legalFormMachine.ts
5. legalDocumentProcessingMachine.ts
6. evidenceProcessingMachine.ts
7-10. [Other form/document machines]
```

---

### TIER 2B+ (Parallelize if possible)
```
Remaining 80+ files
Can be fixed faster once pattern is clear
```

---

## 🚨 Troubleshooting

### Error: "Expected '}', found 'EOF'"
**Cause:** Missing closing brace(s)
**Fix:** Count braces on last line, add missing `}`

### Error: "Unexpected token 'if'"
**Cause:** Missing closing brace in previous statement
**Fix:** Look at line before `if`, add `}`

### Error: "Expected ')'"
**Cause:** Missing closing paren (usually in function call)
**Fix:** Count `(` and `)`, ensure balanced

### TypeScript: "'object' could be instantiated with a different subtype"
**Cause:** Type inference issue from truncated structure
**Fix:** Ensure all object literals are complete

---

## 📊 Progress Tracking

```bash
# Before starting
git branch refactor/xstate-fixes
git checkout refactor/xstate-fixes

# Track fixes
grep -c "fix: complete XState syntax" <(git log --oneline)

# After finishing
npm run check:svelte | grep "found"
# Should show: svelte-check found 71050 errors (or lower)
```

---

## 💡 Pro Tips

1. **Use bracket pair colorizer**: Helps visualize nesting levels
2. **Fix from innermost out**: Close deepest unclosed brackets first
3. **One change per file**: Don't refactor while fixing syntax
4. **Commit frequently**: After every file fixed
5. **Run TypeScript check**: After every 3-5 files to catch cascading issues

---

## 🎬 Example: Complete Repair Session

```typescript
// ❌ ORIGINAL: Incomplete
export const processingMachine = createMachine({
  id: 'processor',
  initial: 'idle',
  states: {
    idle: {
      on: { START: 'processing' }
    },
    processing: {
      invoke: {
        id: 'processor',
        src: 'processData',
        onDone: {
          target: 'complete'
        onError: { target: 'error' }
      }
    }
  // ❌ 2 missing closing braces here
```

**Repair Steps:**
1. Count braces: 5 open, 3 close → need 2 more
2. Identify structure: inside `processing` state, after `invoke`
3. Add: `}` to close invoke, `}` to close states
4. Add final: `});` to close createMachine

```typescript
// ✅ FIXED: Complete
export const processingMachine = createMachine({
  id: 'processor',
  initial: 'idle',
  states: {
    idle: {
      on: { START: 'processing' }
    },
    processing: {
      invoke: {
        id: 'processor',
        src: 'processData',
        onDone: {
          target: 'complete'
        },                          // ✅ Added comma
        onError: { target: 'error' }
      }                             // ✅ Closed invoke
    }                               // ✅ Closed processing state
  }                                 // ✅ Closed states
});                                 // ✅ Closed createMachine
```

---

## 📞 Need Help?

1. **Check REFACTORING_GUIDE.md** for detailed patterns
2. **Run interactive-repair.mjs** for step-by-step guidance
3. **Use batch-fixer-approval.mjs** for semi-automated fixes
4. **Validate with:** `npx tsc --noEmit --skipLibCheck <file>`

---

## Expected Results After Completion

**Before:** 71,401 errors
**After:** ~71,050 errors (351 fixed, 0.49% improvement)
**Total Campaign:** 0.68% reduction from 71,536 baseline

**Build Status:** ✅ No cascading failures
**Type Safety:** ✅ Improved (fewer phantom errors masking real issues)
