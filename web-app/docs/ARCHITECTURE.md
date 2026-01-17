# Web App Architecture

This document explains how the firmware planning UI is wired and how data moves through the system.

## High-level components

- Frontend (React + Vite): upload UI, output cards, and render view.
- Backend (Express): file upload handling, LLM orchestration, render generation.
- LlamaIndex agent (Python): Ollama-backed firmware plan + PRD summary with RAG.

## Data flow

```
Browser
  -> POST /api/pcb/validate (multipart form)
     -> backend/routes/pcb.js
        -> backend/services/pcbValidator.js
           -> backend/services/llmAgent.js
           -> backend/services/kicadRender.js
           -> backend/agent/llamaindex_agent.py
           -> generate markdown + JSON files
     <- response with summary + filenames
  -> GET /api/files/:filename
```

## Backend modules

- `web-app/backend/routes/pcb.js`
  - Upload handling via multer
  - Creates a planning ID and storage directory
  - Calls the planning pipeline

- `web-app/backend/services/pcbValidator.js`
  - Sends raw KiCad payload to the LLM agent
  - Generates firmware plan + PRD summary markdown
  - Triggers a KiCad SVG render when a PCB is available

- `web-app/backend/services/llmAgent.js`
  - Spawns the LlamaIndex agent for chat/summary generation
  - Uses `OLLAMA_LLM_MODEL`, `OLLAMA_EMBED_MODEL`, and `OLLAMA_RERANK_MODEL`

- `web-app/backend/services/kicadRender.js`
  - Invokes `kicad-cli` to export SVG renders
  - Uses `KICAD_CLI_PATH` and `KICAD_RENDER_LAYERS`

## Frontend modules

- `web-app/frontend/src/components/PcbValidator.jsx`
  - Drag and drop upload UI
  - Validation status cards and summaries
  - Download links for output artifacts
  - Framer Motion transitions for section reveals and list items

- `web-app/frontend/src/services/api.js`
  - `validatePcb()` handles multipart upload

## UX layer

- Motion: Framer Motion is used for staggered entrance, hover lift, and drag feedback.
- Favicon: `web-app/frontend/public/favicon.svg` is linked in `web-app/frontend/index.html`.

## Storage

- Uploads: `web-app/backend/uploads/<validationId>/...`
- Outputs: `web-app/backend/generated/` (plan + PRD + render + summary)

There is no automatic cleanup of uploads or generated files. Add a cron job or cleanup task if needed.

## Render + LLM outputs

- The backend renders an SVG using `kicad-cli` when a `.kicad_pcb` file is present.
- The LlamaIndex agent generates the firmware plan and PRD summary from raw file content.
