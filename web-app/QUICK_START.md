# 8090PCB Web-App Quick Start Guide

## 🚀 Quick Start (2 minutes)

### Option 1: Automated Setup (Recommended)

```bash
cd web-app
bash setup.sh
```

Then update `.env` in `backend/` with your KiCad project path.

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
KICAD_PROJECT_PATH=/your/kicad/project/path
NODE_ENV=development
```

---

## 🎯 Features at a Glance

| Feature | Details |
|---------|---------|
| **Chat Interface** | Clean, modern React-based UI |
| **PCB Generation** | Generate KiCad .kicad_pcb files |
| **Descriptions** | Auto-generate design specs in Markdown |
| **MCP Integration** | Connect to KiCad MCP server |
| **File Download** | One-click download of generated files |
| **History** | Track design conversations |

---

## 📁 File Flows

```
User Input (Chat)
    ↓
Backend API (/api/chat/message)
    ↓
MCP Client (mcpClient.js)
    ↓
KiCad MCP Server (../../main.py)
    ↓
Generate Files (CAD + Description)
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

### Send Chat Message
```bash
POST http://localhost:3001/api/chat/message
{
  "message": "Design a blink LED circuit",
  "conversationId": "conv_123" // optional
}
```

### Download File
```
GET http://localhost:3001/api/files/{filename}
```

### Get Chat History
```
GET http://localhost:3001/api/chat/history/{conversationId}
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
- **File Format**: KiCad PCB (.kicad_pcb) + Markdown

---

**Ready to design!** 🎯
