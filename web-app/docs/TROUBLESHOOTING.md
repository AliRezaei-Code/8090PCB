# Troubleshooting

## Backend not reachable

Symptoms:
- Frontend shows connection errors
- `ECONNREFUSED` on port 3001

Fix:
- Ensure `npm run dev` is running in `web-app/backend`
- Confirm `PORT` in `.env` matches the frontend proxy (default 3001)

## MCP server fails to launch

Symptoms:
- Validation returns "MCP unavailable"
- Backend logs show Python import errors

Fix:
- Install Python dependencies from the repo root:
  ```bash
  python3 -m venv .venv
  source .venv/bin/activate
  pip install -e .
  ```
- Set `KICAD_MCP_PYTHON` if you need a specific interpreter
- Verify `KICAD_MCP_SERVER_PATH` points to `main.py`

## DRC fails

Symptoms:
- Report shows DRC errors or missing data

Fix:
- Install KiCad 9+ and ensure `kicad-cli` is in PATH
- If on macOS, confirm `kicad-cli` exists in:
  `/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli`

## Empty component list

Symptoms:
- Component list is empty or missing

Fix:
- Make sure a schematic file (`.kicad_sch`) was uploaded
- Verify the schematic file is valid and readable

## Upload too large

Symptoms:
- 413 or upload errors

Fix:
- Limit to 20 files, 50MB per file
- Remove large assets not required for validation

## Ports in use

Fix:

```bash
lsof -ti:3000 | xargs kill -9
lsof -ti:3001 | xargs kill -9
```

## UI build fails with "Failed to resolve import framer-motion"

Fix:

```bash
cd web-app/frontend
npm install
```

## LlamaIndex agent not running

Symptoms:
- Chat responses fall back to mock output
- Validation summaries never change
- Backend logs show "LlamaIndex agent failed"

Fix:
- Install agent dependencies:
  ```bash
  python3 -m venv .agent-venv
  source .agent-venv/bin/activate
  pip install -r web-app/backend/agent/requirements.txt
  ```
- Set `CEREBRAS_API_KEY` and `CEREBRAS_MODEL` in `web-app/backend/.env`
- If Cerebras uses a custom base URL, set `CEREBRAS_API_BASE`
