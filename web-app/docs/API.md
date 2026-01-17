# Web App API

Base URL (dev): `http://localhost:3001/api`

## POST /pcb/validate

Upload KiCad files and generate validation output.

### Request

- Content type: `multipart/form-data`
- Field name: `files` (multiple)
- Recommended files: `.kicad_pro`, `.kicad_sch`, `.kicad_pcb`

Example:

```bash
curl -X POST http://localhost:3001/api/pcb/validate \
  -F "files=@/path/to/design.kicad_pro" \
  -F "files=@/path/to/design.kicad_sch" \
  -F "files=@/path/to/design.kicad_pcb"
```

### Response (summary)

```json
{
  "success": true,
  "validationId": "validation_1700000000000",
  "summary": {
    "validationId": "validation_1700000000000",
    "status": "issues",
    "notes": ["DRC: ..."],
    "counts": {
      "components": 42,
      "nets": 18,
      "drcViolations": 3,
      "boundaryIssues": 1,
      "patterns": 4
    }
  },
  "files": {
    "report": "validation_1700000000000_report.md",
    "firmwarePlan": "validation_1700000000000_firmware_plan.md",
    "components": "validation_1700000000000_components.md",
    "summary": "validation_1700000000000_summary.json"
  }
}
```

### Error response

```json
{
  "error": "Failed to validate design",
  "message": "..."
}
```

## GET /files/:filename

Download a generated file from `backend/generated`.

## GET /files/preview/:filename

Preview a generated text file (markdown or json). Returns:

```json
{
  "filename": "validation_..._report.md",
  "content": "...",
  "size": 1024
}
```

## GET /files

List all generated files:

```json
{
  "files": [
    {
      "filename": "validation_..._report.md",
      "size": 1234,
      "created": "...",
      "modified": "..."
    }
  ]
}
```

## Legacy endpoints

- `/api/chat/*` remains for the older chat UI but is not used by the validator.
