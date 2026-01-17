# 8090PCB Web-App Quick Start Guide

## 🚀 Quick Start (2 minutes)

### Option 1: Automated Setup (Recommended)

```bash
cd web-app
bash setup.sh
```

Then update `backend/.env` with your Ollama model settings.

### Option 2: Manual Setup

**Backend:**
```bash
cd web-app/backend
cp .env.example .env
npm install
npm run dev
```

**Agent (new terminal):**
```bash
python3 -m venv .agent-venv
source .agent-venv/bin/activate
pip install -r web-app/backend/agent/requirements.txt
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
NODE_ENV=development
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_LLM_MODEL=gpt-oss:20b
OLLAMA_EMBED_MODEL=qwen3-embedding:0.6b
OLLAMA_RERANK_MODEL=sam860/qwen3-reranker:0.6b-F16
KICAD_CLI_PATH=/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli
KICAD_RENDER_LAYERS=F.Cu,B.Cu,F.SilkS,B.SilkS,F.Mask,B.Mask,Edge.Cuts
```

---

## 🎯 Features at a Glance

| Feature | Details |
|---------|---------|
| **Firmware Plan** | Generates phased bring-up plan from KiCad files |
| **PRD Summary** | LLM-generated product requirements summary |
| **PCB Render** | SVG render via `kicad-cli` |
| **File Download** | One-click download of outputs |

---

## 📁 File Flows

```
User Upload (KiCad files)
    ↓
Backend API (/api/pcb/validate)
    ↓
LlamaIndex Agent (Ollama + RAG)
    ↓
KiCad CLI Render (SVG)
    ↓
Generate Files (Firmware Plan + PRD + Summary)
    ↓
Store in /backend/generated/
    ↓
Return Download Links
    ↓
Frontend displays outputs + render
```

---

## 🔧 API Quick Reference

### Generate firmware plan
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

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Port 3000 in use | Kill process: `lsof -ti:3000 \| xargs kill -9` |
| Port 3001 in use | Kill process: `lsof -ti:3001 \| xargs kill -9` |
| Module not found | Run `npm install` in that directory |
| .env file missing | Run `cp .env.example .env` in backend |
| Agent not running | Install `web-app/backend/agent/requirements.txt` |
| Render fails | Verify `kicad-cli` path or set `KICAD_CLI_PATH` |

---

## 📚 More Info

See [README.md](./README.md) for comprehensive documentation.
Additional docs are in `web-app/docs/`.

---

## 🎨 Tech Stack

- **Frontend**: React 18 + Vite + Tailwind CSS
- **Backend**: Express + Node.js
- **LLM Agent**: LlamaIndex + Cerebras API

---

**Ready to plan firmware!**
