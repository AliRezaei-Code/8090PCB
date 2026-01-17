# Validation Pipeline

This document explains how the backend turns uploaded KiCad files into validation outputs.

## Pipeline steps

1. Upload files via `POST /api/pcb/validate`.
2. Backend stores uploads under `backend/uploads/<validationId>`.
3. Backend calls MCP tools (if available).
4. Backend builds:
   - Validation report (markdown)
   - Firmware bring-up plan (markdown)
   - Component technical notes (markdown)
   - Summary JSON
5. Files are written to `backend/generated/` and returned to the UI.

## Tool calls

The validator will attempt these MCP tool calls depending on which files are present:

- Project-level tools (require `.kicad_pro`):
  - `validate_project`
  - `run_drc_check`
  - `validate_project_boundaries`
  - `extract_project_netlist`
  - `analyze_project_circuit_patterns`
  - `analyze_bom`

- Schematic-level tools (require `.kicad_sch`):
  - `extract_schematic_netlist`
  - `identify_circuit_patterns`

If a tool call fails, the error is recorded in the summary notes and the pipeline continues.

## Firmware plan generation

The firmware plan uses:

- Detected MCU patterns for bring-up steps
- Detected interface patterns (I2C/SPI/UART/USB) for enable tasks
- Detected sensor patterns for initialization tasks

Per-component tasks are built from the component list and pattern tags.

## Component technical notes

Component notes are built from the netlist and simple heuristics:

- Reference prefix (R/C/U/D/Q) guides categories
- Known MCU and sensor patterns add richer descriptions
- Default advice is added when no pattern is detected

## Output structure

Generated files:

- `validation_<id>_report.md`: summary + DRC + boundary + pattern info
- `validation_<id>_firmware_plan.md`: phase-based plan
- `validation_<id>_components.md`: component technical notes
- `validation_<id>_summary.json`: machine-readable data

## Extending the pipeline

- Add or change tool calls in `backend/services/pcbValidator.js`.
- Update report formatting in `formatMarkdownReport()`.
- Adjust component classification in `componentCategory()`.
- Extend firmware tasks in `buildFirmwareTasks()`.
