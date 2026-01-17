# 8090PCB Web-App Quick Start Guide

## 🚀 Quick Start (2 minutes)

### Option 1: Automated Setup (Recommended)

```bash
cd web-app
bash setup.sh
```

Then update `.env` in `backend/` with your MCP path (and Python if needed).

### Option 2: Manual Setup

**Backend:**
```bash
cd web-app/backend
cp .env.example .env
npm install
npm run dev
```

**Frontend (new terminal):**
```bash
cd web-app/frontend
npm install
npm run dev
```

Visit `http://localhost:3000`

---

## 📝 Configuration

Edit `web-app/backend/.env`:
```env
PORT=3001
KICAD_MCP_SERVER_PATH=../../main.py
KICAD_MCP_PYTHON=/path/to/python
NODE_ENV=development
```

---

## 🎯 Features at a Glance

| Feature | Details |
|---------|---------|
| **Validation UI** | Upload and validate KiCad designs |
| **DRC + Boundaries** | Uses MCP tools for checks |
| **Firmware Plan** | Generates bring-up plan and per-component tasks |
| **Component Notes** | Technical descriptions for each component |
| **File Download** | One-click download of reports |

---

## 📁 File Flows

```
User Upload (KiCad files)
    ↓
Backend API (/api/pcb/validate)
    ↓
MCP Client (mcpBridge.js)
    ↓
KiCad MCP Server (../../main.py)
    ↓
Generate Files (Report + Firmware + Component Notes)
    ↓
Store in /backend/generated/
    ↓
Return Download Links
    ↓
Frontend displays File Cards
    ↓
User Downloads Files
```

---

## 🔧 API Quick Reference

### Validate PCB Upload
```bash
curl -X POST http://localhost:3001/api/pcb/validate \
  -F "files=@/path/to/design.kicad_pro" \
  -F "files=@/path/to/design.kicad_sch" \
  -F "files=@/path/to/design.kicad_pcb"
```

### Download File
```
GET http://localhost:3001/api/files/{filename}
```

### Download File
```
GET http://localhost:3001/api/files/{filename}
```

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Port 3000 in use | Kill process: `lsof -ti:3000 \| xargs kill -9` |
| Port 3001 in use | Kill process: `lsof -ti:3001 \| xargs kill -9` |
| Module not found | Run `npm install` in that directory |
| .env file missing | Run `cp .env.example .env` in backend |
| Can't find MCP server | Update KICAD_MCP_SERVER_PATH in .env |

---

## 📚 More Info

See [README.md](./README.md) for comprehensive documentation.

---

## 🎨 Tech Stack

- **Frontend**: React 18 + Vite + Tailwind CSS
- **Backend**: Express + Node.js
- **Integration**: KiCad MCP Protocol
- **File Format**: Markdown + JSON outputs

---

**Ready to validate!**
