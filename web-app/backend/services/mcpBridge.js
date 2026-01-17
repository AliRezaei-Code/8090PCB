import fs from 'fs';
import { dirname, resolve as resolvePath, join as joinPath } from 'path';
import { fileURLToPath } from 'url';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const backendDir = resolvePath(__dirname, '..');
const repoRootDir = resolvePath(backendDir, '..', '..');

function getPythonCommand() {
  const fromEnv = process.env.KICAD_MCP_PYTHON;
  if (fromEnv) return fromEnv;

  const venvPython = joinPath(repoRootDir, '.venv', 'bin', 'python');
  if (fs.existsSync(venvPython)) return venvPython;

  return 'python3';
}

function getServerScriptPath() {
  const configured = process.env.KICAD_MCP_SERVER_PATH || '../../main.py';
  return resolvePath(backendDir, configured);
}

function getSpawnEnv() {
  return Object.fromEntries(
    Object.entries(process.env).filter(([, value]) => typeof value === 'string')
  );
}

export async function withMcpClient(fn) {
  const transport = new StdioClientTransport({
    command: getPythonCommand(),
    args: [getServerScriptPath()],
    env: getSpawnEnv(),
    stderr: 'inherit',
  });

  const client = new Client(
    { name: '8090pcb-web-backend', version: '1.0.0' },
    { capabilities: {} }
  );

  await client.connect(transport);

  try {
    return await fn(client);
  } finally {
    await client.close();
  }
}

export function parseToolTextContent(toolResult) {
  const chunks = [];
  for (const item of toolResult?.content ?? []) {
    if (item?.type === 'text' && typeof item.text === 'string') {
      chunks.push(item.text);
    }
  }
  return chunks.join('\n').trim();
}

