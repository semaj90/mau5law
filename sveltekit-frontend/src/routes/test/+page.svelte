<script lang="ts">
  // Minimal test page to verify server works
  let timestamp = $state(new Date().toISOString());
</script>

<svelte:head>
  <title>Test Page - Server Working!</title>
</svelte:head>

<div style="padding: 2rem; font-family: monospace;">
  <h1 style="color: green;">✅ Server is Working!</h1>
  <p>If you can see this page, the SvelteKit server is successfully handling requests.</p>
  <p><strong>Timestamp:</strong> {timestamp}</p>
  <p><strong>Status:</strong> All hooks initialized, routes are responsive</p>

  <hr style="margin: 2rem 0;" />

  <h2>Fixed Issues:</h2>
  <ul>
    <li>✅ Database connection (port 5434)</li>
    <li>✅ Sessions table import (from schema-postgres)</li>
    <li>✅ Lucia auth initialization</li>
    <li>✅ Import path corrections (drizzle.ts, schema-actual.ts)</li>
    <li>✅ Evidence upload route (removed helpers.eq, using eq from drizzle-orm)</li>
  </ul>

  <hr style="margin: 2rem 0;" />

  <h2>Next Steps:</h2>
  <p>Test these routes:</p>
  <ul>
    <li><a href="/yorha/persons" style="color: blue;">/yorha/persons</a> - YoRHa Persons of Interest</li>
    <li><a href="/evidence/upload" style="color: blue;">/evidence/upload</a> - Evidence Upload Form</li>
  </ul>
</div>
