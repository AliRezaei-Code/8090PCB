# 8090PCB Validation Interface

A web-based validation UI that integrates with the KiCad MCP server to analyze uploaded KiCad designs, generate a validation report, and produce a firmware bring-up plan with per-component technical notes.

## Table of contents

- Quick start
- Prerequisites
- MCP server setup
- Running the app
- Validation workflow
- Upload requirements and limits
- Outputs
- API
- Configuration
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
- Python 3.8+ (for the KiCad MCP server)
- KiCad 9+ (for kicad-cli used by DRC)

## MCP server setup

The backend spawns the MCP server as a Python process per validation request. Make sure the MCP server dependencies are installed.

From the repo root:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -e .
```

If you prefer uv:

```bash
uv venv
source .venv/bin/activate
uv pip install -e .
```

If KiCad is installed, ensure `kicad-cli` is in your PATH or available at the default KiCad install location so DRC can run.

## Running the app

Terminal 1 (backend):

```bash
cd web-app/backend
cp .env.example .env
npm install
npm run dev
```

Terminal 2 (frontend):

```bash
cd web-app/frontend
npm install
npm run dev
```

## Validation workflow

High-level flow:

```
Upload KiCad files
   -> /api/pcb/validate
   -> MCP tools (DRC, boundaries, netlist, patterns, BOM)
   -> Report + firmware plan + component notes
   -> Download artifacts
```

The backend uses MCP tools when available and degrades gracefully if some inputs or tools are missing.

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

- `validation_<id>_report.md`: consolidated validation report
- `validation_<id>_firmware_plan.md`: firmware bring-up plan
- `validation_<id>_components.md`: per-component technical notes
- `validation_<id>_summary.json`: machine-readable summary

Uploads are stored in `web-app/backend/uploads/<validationId>`.

Status levels:

- `pass`: DRC and boundary checks show no issues
- `review`: incomplete data or checks not run
- `issues`: DRC or boundary issues detected

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
    "status": "issues",
    "counts": {
      "components": 42,
      "drcViolations": 3
    }
  },
  "files": {
    "report": "validation_123456_report.md",
    "firmwarePlan": "validation_123456_firmware_plan.md",
    "components": "validation_123456_components.md",
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
KICAD_MCP_SERVER_PATH=../../main.py
KICAD_MCP_PYTHON=/path/to/python
NODE_ENV=development
```

Frontend environment variables:

- `VITE_API_URL` (default: `http://localhost:3001/api`)

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
- `MCP server not found`: verify `KICAD_MCP_SERVER_PATH` and Python dependencies.
- `kicad-cli not found`: install KiCad 9+ or add `kicad-cli` to PATH.
- Empty output: check that `.kicad_pro` or `.kicad_sch` was uploaded.

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
