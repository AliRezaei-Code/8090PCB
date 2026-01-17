# Planning Pipeline

This document explains how the backend turns uploaded KiCad files into a firmware plan and PRD summary.

## Pipeline steps

1. Upload files via `POST /api/pcb/validate`.
2. Backend stores uploads under `backend/uploads/<validationId>`.
3. Backend reads raw KiCad file content + metadata (size-limited).
4. Backend calls the LlamaIndex agent (Cerebras) to produce:
   - Firmware implementation plan
   - PRD-ready summary
5. Backend generates a KiCad SVG render (if `.kicad_pcb` is present).
6. Files are written to `backend/generated/` and returned to the UI.

Render settings can be adjusted with `KICAD_CLI_PATH` and `KICAD_RENDER_LAYERS`.

## LLM plan generation

The LlamaIndex agent receives:

- Raw KiCad file content (size-limited)
- File metadata (names, sizes, extensions)

It returns a firmware plan (phases + per-component tasks when possible) and a PRD summary.

## Output structure

Generated files:

- `validation_<id>_firmware_plan.md`: phase-based firmware plan
- `validation_<id>_prd.md`: PRD-ready summary
- `validation_<id>_summary.json`: machine-readable data
- `validation_<id>_render.svg`: KiCad render (if PCB file is present)

## Extending the pipeline

- Adjust the LLM prompt in `web-app/backend/agent/llamaindex_agent.py`.
- Update payload sizing in `web-app/backend/services/pcbValidator.js`.
- Update render settings with `KICAD_RENDER_LAYERS`.
