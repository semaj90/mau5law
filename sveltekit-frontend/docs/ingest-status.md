Ingest job status UI and APIs

- UI: /dev/ingest-status — enter a job ID to poll status.
- API: POST /api/ingest — enqueue a job with { id?, content, metadata? }.
- API: GET /api/ingest/status/:id — fetch current job status.
- API: POST /api/ingest/smoke-test — enqueue a sample and poll until done.

Status keys are stored in Redis with prefix job:ingest:<id> as JSON and expire after 24h.
