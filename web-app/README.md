# 8090PCB Chat Interface

A modern web-based chat interface for PCB design that integrates with KiCad MCP (Model Context Protocol) to generate CAD files and design specifications.

## Features

- 🎨 **Modern Chat UI** - Clean, responsive interface built with React and Tailwind CSS
- 🔌 **MCP Integration** - Seamless integration with KiCad MCP server
- 📁 **File Generation** - Automatically generates KiCad PCB files and design descriptions
- 📥 **Easy Download** - Download generated files directly from the chat interface
- 💾 **Conversation History** - Track your design requests and responses
- 🚀 **Fast & Responsive** - Built with Vite for lightning-fast development and builds

## Project Structure

```
web-app/
├── frontend/              # React + Vite frontend application
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChatInterface.jsx    # Main chat component
│   │   │   ├── ChatMessage.jsx      # Individual message component
│   │   │   └── FileCard.jsx         # File download card component
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
    │   ├── chat.js                  # Chat endpoints
    │   └── files.js                 # File download endpoints
    ├── services/
    │   └── mcpClient.js             # KiCad MCP client
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
KICAD_PROJECT_PATH=/path/to/your/kicad/project
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

### Chat API

**POST /api/chat/message**
- Send a chat message and generate PCB design
- Request body:
  ```json
  {
    "message": "Design a blinking LED circuit",
    "conversationId": "conv_123456" // optional
  }
  ```
- Response:
  ```json
  {
    "success": true,
    "conversationId": "conv_123456",
    "response": {
      "role": "assistant",
      "content": "PCB design generated successfully",
      "files": {
        "cad": "design_1234567890.kicad_pcb",
        "description": "design_1234567890_description.md"
      }
    },
    "history": [...]
  }
  ```

**GET /api/chat/history/:conversationId**
- Retrieve conversation history
- Response: Array of messages with timestamps

**DELETE /api/chat/history/:conversationId**
- Clear conversation history

**GET /api/chat/tools**
- List available MCP tools

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

1. **Open the Chat Interface**
   - Navigate to http://localhost:3000

2. **Describe Your PCB Design**
   - Type your design requirements in the input field
   - Example: "Design a 555 timer astable oscillator for a 1kHz square wave"

3. **Generate Design**
   - Click "Send" to generate the PCB design
   - The AI will process your request via the KiCad MCP server

4. **Download Files**
   - Two files are generated:
     - **CAD File** (.kicad_pcb) - Direct import into KiCad
     - **Description** (.md) - Design specification for PM tools

5. **Review & Export**
   - Download files and open the PCB in KiCad
   - Share the description with your PM tool

## Generated Files

### CAD Files (.kicad_pcb)
- Standard KiCad PCB format
- Fully compatible with KiCad 7.0+
- Ready for further editing and manufacturing

### Design Descriptions (.md)
- Markdown format for easy viewing
- Includes:
  - Design specifications
  - Component placement
  - Board properties
  - Manufacturing notes
  - Metadata for PM integration

## Environment Variables

```env
# Server port
PORT=3001

# Path to KiCad MCP server (relative to backend directory)
KICAD_MCP_SERVER_PATH=../../main.py

# Path to your KiCad project directory
KICAD_PROJECT_PATH=/path/to/your/kicad/project

# Environment mode
NODE_ENV=development
```

## Integration with PM Software

The generated design description files are formatted specifically for integration with Project Management tools:

1. **File Format**: Standard Markdown (.md) - Compatible with most PM tools
2. **Content Structure**: 
   - Design ID for tracking
   - Technical specifications
   - Component list
   - Manufacturing requirements
   - Metadata and timestamps

3. **Workflow**:
   ```
   Chat Interface → Generate Files → Download Description
   → PM Tool (Jira, Linear, etc.) → Create PRD
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

### File Generation Issues

**Error: "Failed to generate PCB file"**
- Check KICAD_PROJECT_PATH is valid
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

Edit `backend/services/mcpClient.js` to:
- Change how requests are sent to the MCP server
- Add new MCP tool support
- Customize file generation logic

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
