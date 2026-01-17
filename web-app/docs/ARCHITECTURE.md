# Web App Architecture

This document explains how the validation UI is wired and how data moves through the system.

## High-level components

- Frontend (React + Vite): upload UI, status dashboard, and download links.
- Backend (Express): file upload handling, MCP tool orchestration, report generation.
- MCP server (Python): KiCad-aware tools for DRC, netlist, boundary checks, and pattern analysis.

## Data flow

```
Browser
  -> POST /api/pcb/validate (multipart form)
     -> backend/routes/pcb.js
        -> backend/services/pcbValidator.js
           -> backend/services/mcpBridge.js (stdio client)
           -> MCP tools (Python)
           -> generate markdown + JSON files
     <- response with summary + filenames
  -> GET /api/files/:filename
```

## Backend modules

- `web-app/backend/routes/pcb.js`
  - Upload handling via multer
  - Creates a validation ID and storage directory
  - Calls the validation pipeline

- `web-app/backend/services/pcbValidator.js`
  - Orchestrates MCP tool calls
  - Builds component summaries
  - Generates report, firmware plan, and component notes

- `web-app/backend/services/mcpBridge.js`
  - Spawns the MCP server with stdio transport
  - Supports `KICAD_MCP_PYTHON` and `KICAD_MCP_SERVER_PATH`
  - Closes the client after each call

## Frontend modules

- `web-app/frontend/src/components/PcbValidator.jsx`
  - Drag and drop upload UI
  - Validation status cards and summaries
  - Download links for output artifacts

- `web-app/frontend/src/services/api.js`
  - `validatePcb()` handles multipart upload

## Storage

- Uploads: `web-app/backend/uploads/<validationId>/...`
- Outputs: `web-app/backend/generated/` (report + plan + summary)

There is no automatic cleanup of uploads or generated files. Add a cron job or cleanup task if needed.

## MCP tools used

The validator calls these MCP tools when inputs allow:

- `validate_project` (project presence check)
- `run_drc_check` (DRC via `kicad-cli`)
- `validate_project_boundaries` (component boundary checks)
- `extract_project_netlist` or `extract_schematic_netlist`
- `analyze_project_circuit_patterns` or `identify_circuit_patterns`
- `analyze_bom` (if BOM is present)

If a tool fails or is unavailable, the UI still returns a summary with available data.
