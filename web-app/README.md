# 8090PCB Firmware Planner

A web-based firmware planning UI that analyzes raw KiCad files with a Cerebras-backed LLM, generates a firmware implementation plan, and produces a PRD-ready summary. It can also render the PCB via `kicad-cli`.

## Table of contents

- Quick start
- Prerequisites
- Running the app
- LLM agent setup
- Planning workflow
- Upload requirements and limits
- Outputs
- API
- Configuration
- UI and motion
- Deployment
- Troubleshooting
- Legacy chat interface
- Docs

## Quick start

```bash
cd web-app
bash setup.sh
npm run dev
```

Open `http://localhost:3000`.

## Prerequisites

- Node.js 16+ and npm
- Python 3.10+ (for the LlamaIndex agent)
- KiCad 9+ (for `kicad-cli` render output)

## LLM agent setup

The backend uses a Python LlamaIndex agent that calls the Cerebras OpenAI-compatible API.

```bash
python3 -m venv .agent-venv
source .agent-venv/bin/activate
pip install -r web-app/backend/agent/requirements.txt
```

Make sure `kicad-cli` is available for PCB renders. On macOS the default path is:
`/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli`.

## Running the app

Terminal 1 (backend):

```bash
cd web-app/backend
cp .env.example .env
npm install
npm run dev
```

If you want LlamaIndex agent summaries, install the agent dependencies:

```bash
python3 -m venv .agent-venv
source .agent-venv/bin/activate
pip install -r web-app/backend/agent/requirements.txt
```

Terminal 2 (frontend):

```bash
cd web-app/frontend
npm install
npm run dev
```

## Planning workflow

High-level flow:

```
Upload KiCad files
   -> /api/pcb/validate
   -> LlamaIndex agent (Cerebras)
   -> Firmware plan + PRD summary + PCB render
   -> Download artifacts
```

The backend uses the LLM agent to derive firmware and PRD outputs directly from the uploaded files.

## Upload requirements and limits

Recommended upload set:

- `.kicad_pro` (project file)
- `.kicad_sch` (schematic)
- `.kicad_pcb` (PCB layout)

Other accepted files:

- `.kicad_prl`, `.kicad_sym`, `.kicad_mod`, `.csv` (BOM)

Limits:

- Max 20 files per request
- Max 50MB per file

Behavior notes:

- If `.kicad_pro` is present, DRC and boundary checks run.
- If only `.kicad_sch` is present, netlist and pattern analysis still run.
- If only `.kicad_pcb` is present, output will be limited to a summary with minimal component data.

## Outputs

Generated files are stored in `web-app/backend/generated`:

- `validation_<id>_firmware_plan.md`: firmware implementation plan
- `validation_<id>_prd.md`: PRD-ready summary
- `validation_<id>_render.svg`: PCB render (if `.kicad_pcb` is present)
- `validation_<id>_summary.json`: machine-readable summary

Uploads are stored in `web-app/backend/uploads/<validationId>`.

## API

### POST /api/pcb/validate

- Content type: `multipart/form-data`
- Field name: `files` (multiple)

Example:

```bash
curl -X POST http://localhost:3001/api/pcb/validate \
  -F "files=@/path/to/design.kicad_pro" \
  -F "files=@/path/to/design.kicad_sch" \
  -F "files=@/path/to/design.kicad_pcb"
```

Example response (summary):

```json
{
  "success": true,
  "validationId": "validation_123456",
  "summary": {
    "notes": ["Render failed: ..."],
    "counts": {
      "files": 3,
      "bytes": 104857
    }
  },
  "firmwarePlan": {
    "overview": "..."
  },
  "prd": {
    "productBrief": "..."
  },
  "files": {
    "firmwarePlan": "validation_123456_firmware_plan.md",
    "prd": "validation_123456_prd.md",
    "render": "validation_123456_render.svg",
    "summary": "validation_123456_summary.json"
  }
}
```

### GET /api/files/:filename

Download a generated file.

### GET /api/files/preview/:filename

Preview a generated text file.

### GET /api/files

List generated files.

Legacy chat endpoints still exist under `/api/chat` but are not used by the validator UI.

## Configuration

Backend environment variables (`web-app/backend/.env`):

```env
PORT=3001
NODE_ENV=development
CEREBRAS_API_KEY=your_cerebras_key_here
CEREBRAS_MODEL=gpt-oss-120b
# Optional: override KiCad CLI path for render export
KICAD_CLI_PATH=/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli
# Optional: control layers used for SVG render export
KICAD_RENDER_LAYERS=F.Cu,B.Cu,F.SilkS,B.SilkS,F.Mask,B.Mask,Edge.Cuts
# Optional: limit raw KiCad payload size sent to LLM
LLM_MAX_FILE_CHARS=120000
LLM_MAX_TOTAL_CHARS=400000
# Optional: override the Cerebras OpenAI-compatible base URL.
# CEREBRAS_API_BASE=https://api.cerebras.ai/v1
# Optional: override the Python used for the LlamaIndex agent.
# LLAMA_AGENT_PYTHON=/path/to/python
# Optional: override the LlamaIndex agent script path.
# LLAMA_AGENT_SCRIPT=/absolute/path/to/llamaindex_agent.py
# Optional: timeout in milliseconds for the agent process.
# LLAMA_AGENT_TIMEOUT_MS=45000
```

Frontend environment variables:

- `VITE_API_URL` (default: `http://localhost:3001/api`)

## UI and motion

The validator UI uses Framer Motion for subtle, premium animations:

- Page-load stagger for major sections
- Upload zone spring/glow on drag
- Result reveal with enter transitions
- Hover lift on output cards

The custom favicon lives at `web-app/frontend/public/favicon.svg`.

## Deployment

1. Build the frontend:

```bash
cd web-app/frontend
npm run build
```

2. Serve the frontend (example):

```bash
cd web-app/frontend
npm run preview
```

3. Run the backend:

```bash
cd web-app/backend
npm start
```

You can also serve the frontend build from a static host and point it at the backend using `VITE_API_URL`.

## Troubleshooting

- `ECONNREFUSED` on port 3001: backend not running or wrong PORT.
- `LlamaIndex agent failed`: verify `CEREBRAS_API_KEY` and install `web-app/backend/agent/requirements.txt`.
- `kicad-cli not found`: install KiCad 9+ or set `KICAD_CLI_PATH`.
- Empty output: check that `.kicad_pro`, `.kicad_sch`, or `.kicad_pcb` was uploaded.

## Legacy chat interface

The previous chat-based UI and endpoints are still in the repo:

- Frontend: `web-app/frontend/src/components/ChatInterface.jsx`
- Backend: `web-app/backend/routes/chat.js`

They are not wired into the current `App.jsx` but can be restored if needed.

## Docs

Additional documentation:

- `web-app/docs/ARCHITECTURE.md`
- `web-app/docs/API.md`
- `web-app/docs/VALIDATION_PIPELINE.md`
- `web-app/docs/TROUBLESHOOTING.md`
