# Troubleshooting

## Backend not reachable

Symptoms:
- Frontend shows connection errors
- `ECONNREFUSED` on port 3001

Fix:
- Ensure `npm run dev` is running in `web-app/backend`
- Confirm `PORT` in `.env` matches the frontend proxy (default 3001)

## LlamaIndex agent fails to launch

Symptoms:
- Plan generation returns an error
- Backend logs show "LlamaIndex agent failed"

Fix:
- Install agent dependencies:
  ```bash
  python3 -m venv .agent-venv
  source .agent-venv/bin/activate
  pip install -r web-app/backend/agent/requirements.txt
  ```
- Set `CEREBRAS_API_KEY` and `CEREBRAS_MODEL` in `web-app/backend/.env`
- If needed, set `LLAMA_AGENT_PYTHON` to the agent venv python path

## Render fails

Symptoms:
- PCB render window is blank
- Notes show "Render failed"

Fix:
- Install KiCad 9+ and ensure `kicad-cli` is available
- If on macOS, confirm `kicad-cli` exists in:
  `/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli`
- Set `KICAD_CLI_PATH` if KiCad is installed elsewhere

## Sparse plan output

Symptoms:
- Plan or PRD is missing items

Fix:
- Upload `.kicad_pro`, `.kicad_sch`, and `.kicad_pcb` together
- Increase `LLM_MAX_FILE_CHARS` / `LLM_MAX_TOTAL_CHARS` if input is large

## Upload too large

Symptoms:
- 413 or upload errors

Fix:
- Limit to 20 files, 50MB per file
- Remove large assets not required for planning

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
