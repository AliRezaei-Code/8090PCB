# 8090PCB Validation Interface

A modern web-based validation UI that integrates with KiCad MCP (Model Context Protocol) to analyze uploaded KiCad designs, generate a validation report, and produce a firmware bring-up plan with per-component technical notes.

## Features

- **Validation Workflow** - Upload .kicad_pro/.kicad_pcb/.kicad_sch and receive a structured report
- **MCP Integration** - Uses KiCad MCP tools for DRC, boundary checks, netlist extraction, and pattern analysis
- **Firmware Plan** - Generates a bring-up plan and per-component firmware tasks
- **Component Notes** - Technical descriptions for each component in the design
- **Fast UI** - React + Vite + Tailwind for responsive UX

## Project Structure

```
web-app/
├── frontend/              # React + Vite frontend application
│   ├── src/
│   │   ├── components/
│   │   │   ├── PcbValidator.jsx     # Main validation workflow UI
│   │   │   ├── FileCard.jsx         # File download card component
│   │   │   ├── ChatInterface.jsx    # Legacy chat component (optional)
│   │   │   └── ChatMessage.jsx      # Legacy chat message component
│   │   ├── services/
│   │   │   └── api.js               # API client service
│   │   ├── App.jsx                  # Root component
│   │   ├── index.css                # Global styles + Tailwind
│   │   └── main.jsx                 # React entry point
│   ├── index.html                   # HTML template
│   ├── vite.config.js               # Vite configuration
│   ├── tailwind.config.js           # Tailwind CSS configuration
│   ├── postcss.config.js            # PostCSS configuration
│   └── package.json                 # Frontend dependencies
│
└── backend/               # Node.js + Express backend server
    ├── routes/
    │   ├── pcb.js                   # PCB validation upload endpoint
    │   ├── chat.js                  # Legacy chat endpoints
    │   └── files.js                 # File download endpoints
    ├── services/
    │   ├── mcpBridge.js             # MCP stdio client bridge
    │   ├── pcbValidator.js          # Validation pipeline
    │   └── mcpClient.js             # Legacy chat MCP client
    ├── generated/                   # Generated PCB files
    ├── uploads/                     # Uploaded file storage
    ├── server.js                    # Express server setup
    ├── .env.example                 # Environment variables template
    ├── package.json                 # Backend dependencies
    └── .gitignore                   # Git ignore rules
```

## Setup & Installation

### Prerequisites

- **Node.js** 16+ and npm
- **Python** 3.8+ (for running the KiCad MCP server)
- **KiCad** installed on your system (for actual PCB design operations)

### Backend Setup

1. Navigate to the backend directory:
```bash
cd web-app/backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file from the template:
```bash
cp .env.example .env
```

4. Update `.env` with your configuration:
```env
PORT=3001
KICAD_MCP_SERVER_PATH=../../main.py
# Optional: specify Python executable for the MCP server
KICAD_MCP_PYTHON=/path/to/python
NODE_ENV=development
```

5. Start the backend server:
```bash
npm start
# or for development with auto-reload
npm run dev
```

The backend will be available at `http://localhost:3001`

### Frontend Setup

1. In a new terminal, navigate to the frontend directory:
```bash
cd web-app/frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`

## Running the Application

### Development Mode

Terminal 1 - Backend:
```bash
cd web-app/backend
npm run dev
```

Terminal 2 - Frontend:
```bash
cd web-app/frontend
npm run dev
```

Open your browser to `http://localhost:3000`

### Production Build

Backend (no build needed):
```bash
cd web-app/backend
npm start
```

Frontend build:
```bash
cd web-app/frontend
npm run build
npm run preview
```

## API Endpoints

### PCB Validation API

**POST /api/pcb/validate**
- Upload KiCad files and return validation output.
- Content type: `multipart/form-data`
- Field name: `files` (multiple)
- Recommended files: `.kicad_pro`, `.kicad_sch`, `.kicad_pcb`
- Response (summary):
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
      "components": "validation_123456_components.md"
    }
  }
  ```

### File API

**GET /api/files/:filename**
- Download a generated file

**GET /api/files/preview/:filename**
- Preview file content (for text files)
- Response:
  ```json
  {
    "filename": "design_123.md",
    "content": "...",
    "size": 1024
  }
  ```

**GET /api/files**
- List all generated files
- Response: Array of file metadata

## Usage

1. **Open the Validation UI**
   - Navigate to http://localhost:3000

2. **Upload KiCad Files**
   - Drag and drop `.kicad_pro`, `.kicad_pcb`, and `.kicad_sch`
   - The project file enables DRC, boundary checks, and full netlist extraction

3. **Run Validation**
   - Click "Validate PCB"
   - The backend runs MCP tools and generates reports

4. **Download Outputs**
   - **Validation Report** (.md)
   - **Firmware Plan** (.md)
   - **Component Notes** (.md)
   - **Summary JSON** (.json)

## Generated Files

### Validation Report (.md)
- DRC summary, boundary checks, and circuit pattern overview
- Includes key issues and remediation notes

### Firmware Plan (.md)
- Phased bring-up plan with MCU and interface tasks
- Per-component firmware action list

### Component Notes (.md)
- Technical description per component
- Firmware-facing considerations

### Summary JSON (.json)
- Machine-readable version of validation outputs

## Environment Variables

```env
# Server port
PORT=3001

# Path to KiCad MCP server (relative to backend directory)
KICAD_MCP_SERVER_PATH=../../main.py

# Optional: Python executable for the MCP server
KICAD_MCP_PYTHON=/path/to/python

# Environment mode
NODE_ENV=development
```

## Troubleshooting

### Backend Connection Issues

**Error: "ECONNREFUSED on port 3001"**
- Ensure backend is running: `npm start` in `/web-app/backend`
- Check PORT in `.env` matches the server configuration

### MCP Server Not Found

**Error: "KICAD_MCP_SERVER_PATH not found"**
- Verify the path to `main.py` is correct
- Update `KICAD_MCP_SERVER_PATH` in `.env`
- Ensure Python 3.8+ is installed

### Validation Output Issues

**Error: "Failed to validate design"**
- Ensure KiCad MCP server can launch from `KICAD_MCP_SERVER_PATH`
- Verify Python dependencies for the MCP server are installed
- Ensure write permissions in `web-app/backend/generated/`
- Review browser console and server logs for details

### Port Already in Use

**Error: "Port 3000/3001 already in use"**
```bash
# Kill process on specific port (macOS/Linux)
lsof -ti:3000 | xargs kill -9
lsof -ti:3001 | xargs kill -9
```

## Development

### Adding New Components

1. Create component in `frontend/src/components/`
2. Use Tailwind CSS classes for styling
3. Import and use in parent components

### Extending API Endpoints

1. Add new route file in `backend/routes/`
2. Create corresponding service in `backend/services/`
3. Import route in `server.js`

### Modifying MCP Integration

Edit `backend/services/mcpBridge.js` and `backend/services/pcbValidator.js` to:
- Change how requests are sent to the MCP server
- Add new MCP tool support
- Customize validation logic and report generation

## Performance Optimization

- **Frontend**: Vite hot module replacement for fast development
- **Backend**: Connection pooling for MCP server
- **Files**: Automatic cleanup of old generated files (future)

## Security Considerations

- Input validation on all API endpoints
- File path traversal prevention
- CORS configuration for production
- Environment variables for sensitive data
- No sensitive data in version control

## Future Enhancements

- [ ] Real MCP server integration (currently mocked)
- [ ] File versioning and history
- [ ] Collaborative design editing
- [ ] Design templates and presets
- [ ] Advanced routing and placement
- [ ] 3D PCB preview
- [ ] Bill of Materials (BOM) generation
- [ ] Cost estimation
- [ ] Design rule checking (DRC)

## License

This project is part of 8090PCB and follows the same license terms.

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review server logs in both terminals
3. Check browser console for client-side errors
4. Open an issue in the repository

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

---

Built with ❤️ for PCB designers everywhere.
