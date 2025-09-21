# Demo Routes Archive

This directory contains experimental and demo routes that were moved from the main application to reduce clutter and improve maintainability.

## Archived Directories

### Main Demo Routes (`/demo/`)
- Comprehensive collection of demo pages showcasing various features
- AI integrations, GPU demos, legal analysis tools
- UI component showcases and experimental features

### Individual Demo Routes
- `ai-demo/` - AI demonstration pages
- `ai-upload-demo/` - Document upload with AI processing
- `bits-uno-demo/` - UI component demonstrations
- `cache-demo/` - Redis and caching demonstrations
- `canvas-demo/` - Fabric.js canvas demonstrations
- `chat-demo/` - Chat interface experiments
- `gaming-demo/` - Gaming-style UI demonstrations
- `gpu-demo/` - GPU acceleration showcases
- `legal-ai-demo/` - Legal AI feature demonstrations
- `webgpu-demo/` - WebGPU integration examples
- And many more...

### Test Routes (`/test-routes/`)
- `test-*` directories - Various testing pages
- `test/` - Main testing directory
- Integration tests, component tests, API tests

### Yorha Theme Routes
- `yorha-*` directories - NieR:Automata themed UI experiments
- `yorha-dashboard/`, `yorha-terminal/`, etc.

## Restoration Instructions

To restore any archived route:

1. Copy the desired directory from this archive
2. Move it back to `sveltekit-frontend/src/routes/`
3. Update any navigation references as needed

## Archive Date
${new Date().toISOString().split('T')[0]}

## Total Routes Archived
- Demo routes: ~40 directories
- Test routes: ~25 directories
- Yorha routes: ~8 directories

This cleanup reduced the main routes directory from ~300+ routes to a more manageable core set focused on production functionality.