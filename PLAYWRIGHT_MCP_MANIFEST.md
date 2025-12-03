# Playwright MCP Tools for Phase 72 Route Health

**Purpose:** Enable LLM agents (Gemini, Claude) to inspect and verify routes via Playwright
**Integration:** Works with /all-routes dashboard + Phase 72 error brain

---

## MCP Tool Definitions

### 1. `list_routes` Tool

**Description:** Scrape /all-routes dashboard and return route health status

**Input:** None

**Output:**
```json
{
  "routes": [
    {
      "path": "/command-center",
      "status": "green",
      "errorCount": 0,
      "lastError": null,
      "lastErrorTime": null
    },
    {
      "path": "/analysis-center",
      "status": "red",
      "errorCount": 5,
      "lastError": "TS2304",
      "lastErrorTime": "2025-12-02T10:30:00Z"
    }
  ]
}
```

**Implementation (pseudo-code):**
```javascript
async function listRoutes() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:5173/all-routes');

  const rows = await page.$$eval(
    'table[data-phase72-routes] tbody tr',
    (trs) =>
      trs.map((tr) => ({
        path: tr.getAttribute('data-route'),
        status: tr.getAttribute('data-status'),
        errorCount: Number(tr.getAttribute('data-error-count') ?? '0'),
        lastError: tr.querySelector('.route-last-error')?.textContent?.trim() || null,
        lastErrorTime: tr.querySelector('.route-last-time')?.textContent?.trim() || null
      }))
  );

  await browser.close();
  return { routes: rows };
}
```

---

### 2. `open_route` Tool

**Description:** Navigate to a specific route and check for errors

**Input:**
```json
{
  "route": "/analysis-center"
}
```

**Output:**
```json
{
  "route": "/analysis-center",
  "url": "http://127.0.0.1:5173/analysis-center",
  "status": "error",
  "consoleErrors": [
    "Cannot import $lib/server/ollama/client.ts into code that runs in the browser"
  ],
  "networkErrors": [],
  "screenshot": "base64-encoded-png-or-null"
}
```

**Implementation (pseudo-code):**
```javascript
async function openRoute(route) {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const consoleErrors = [];
  const networkErrors = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('response', (response) => {
    if (!response.ok()) {
      networkErrors.push({
        url: response.url(),
        status: response.status(),
        statusText: response.statusText()
      });
    }
  });

  try {
    await page.goto(`http://127.0.0.1:5173${route}`, { waitUntil: 'networkidle' });
  } catch (err) {
    networkErrors.push({ error: err.message });
  }

  const screenshot = await page.screenshot({ encoding: 'base64' });

  await browser.close();

  return {
    route,
    url: `http://127.0.0.1:5173${route}`,
    status: consoleErrors.length > 0 ? 'error' : 'ok',
    consoleErrors,
    networkErrors,
    screenshot
  };
}
```

---

### 3. `run_health_check` Tool

**Description:** Run comprehensive health check on a route and capture errors

**Input:**
```json
{
  "route": "/analysis-center"
}
```

**Output:**
```json
{
  "route": "/analysis-center",
  "passed": false,
  "errors": [
    {
      "type": "console",
      "message": "Cannot import $lib/server/ollama/client.ts..."
    }
  ],
  "capturedToPhase72": true,
  "phase72ErrorHash": "abc123def456..."
}
```

**Implementation (pseudo-code):**
```javascript
async function runHealthCheck(route) {
  const result = await openRoute(route);

  const errors = [];

  for (const err of result.consoleErrors) {
    errors.push({ type: 'console', message: err });
  }

  for (const err of result.networkErrors) {
    errors.push({ type: 'network', message: JSON.stringify(err) });
  }

  // Capture to Phase 72 if there are errors
  let capturedToPhase72 = false;
  let phase72ErrorHash = null;

  if (errors.length > 0) {
    try {
      const captureRes = await fetch('http://127.0.0.1:5173/api/phase72/capture-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_path: `route:${route}`,
          line: 0,
          col: 0,
          code: 'PLAYWRIGHT_HEALTH_CHECK',
          severity: 'error',
          message: errors.map((e) => e.message).join(' | ')
        })
      });

      if (captureRes.ok) {
        const data = await captureRes.json();
        capturedToPhase72 = true;
        phase72ErrorHash = data.error_hash;
      }
    } catch (err) {
      console.error('Failed to capture to Phase 72:', err);
    }
  }

  return {
    route,
    passed: errors.length === 0,
    errors,
    capturedToPhase72,
    phase72ErrorHash
  };
}
```

---

## MCP Server Configuration

### Example `mcp.json` entry:

```json
{
  "mcpServers": {
    "playwright-phase72": {
      "command": "node",
      "args": ["path/to/playwright-mcp-server.js"],
      "env": {
        "BROWSER_TIMEOUT": "30000",
        "DEV_URL": "http://127.0.0.1:5173"
      },
      "autoApprove": ["list_routes", "open_route", "run_health_check"]
    }
  }
}
```

---

## Usage Examples

### Gemini CLI Example

```bash
# List all routes and their health
gemini "Use the list_routes tool to get all routes, then tell me which ones are red"

# Check a specific route
gemini "Use open_route to check /analysis-center and tell me what errors you see"

# Run health checks on all red routes
gemini "Use list_routes to find red routes, then run_health_check on each one"
```

### Claude Example

```bash
# Similar pattern with Claude
claude "Use the Playwright tools to check all routes and report which ones need fixes"
```

---

## Integration with Phase 72

When `run_health_check` captures errors:

1. Error is POSTed to `/api/phase72/capture-error`
2. Stored in `phase72_error` table
3. Automatically triggers `/api/phase72/suggest-fix`
4. AI suggestion is available for the LLM to read
5. /all-routes dashboard updates with new error status

This creates a closed loop:
```
Playwright detects error
    ↓
Captures to Phase 72
    ↓
AI generates suggestion
    ↓
LLM reads suggestion
    ↓
LLM can propose fix or next action
```

---

## Next Steps

1. **Implement MCP server** with the three tools above
2. **Test with Gemini CLI:** `gemini "list all routes"`
3. **Integrate with your agent loop** (e.g., Kiro IDE hooks)
4. **Extend tools** as needed (e.g., `click_button`, `fill_form`, etc.)

---

**Status:** Ready to implement
**Complexity:** Medium (Playwright + MCP integration)
**Value:** Enables autonomous route verification + error capture
