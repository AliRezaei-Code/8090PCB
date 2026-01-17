#!/bin/bash

# 8090PCB Web App Setup Script
# This script sets up both frontend and backend for development

set -e

echo "🚀 8090PCB Firmware Planner Setup"
echo "================================="

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check prerequisites
echo -e "${BLUE}Checking prerequisites...${NC}"

if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm"
    exit 1
fi

echo -e "${GREEN}✓ Node.js $(node --version)${NC}"
echo -e "${GREEN}✓ npm $(npm --version)${NC}"

# Setup Backend
echo ""
echo -e "${BLUE}Setting up backend...${NC}"
cd backend

if [ ! -f ".env" ]; then
    echo "Creating .env from template..."
    cp .env.example .env
    echo -e "${GREEN}✓ .env created. Please update with your Cerebras API key${NC}"
fi

echo "Installing backend dependencies..."
npm install
echo -e "${GREEN}✓ Backend dependencies installed${NC}"

cd ..

# Setup Frontend
echo ""
echo -e "${BLUE}Setting up frontend...${NC}"
cd frontend

echo "Installing frontend dependencies..."
npm install
echo -e "${GREEN}✓ Frontend dependencies installed${NC}"

cd ..

# Success message
echo ""
echo -e "${GREEN}✓ Setup complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Update backend/.env with CEREBRAS_API_KEY and CEREBRAS_MODEL"
echo "2. (Optional) Install agent deps: python3 -m venv .agent-venv && source .agent-venv/bin/activate && pip install -r backend/agent/requirements.txt"
echo "3. Run: npm run dev (from web-app directory)"
echo ""
echo "Or run in separate terminals:"
echo "  Terminal 1: cd backend && npm run dev"
echo "  Terminal 2: cd frontend && npm run dev"
echo ""
echo "Then open http://localhost:3000 in your browser"
