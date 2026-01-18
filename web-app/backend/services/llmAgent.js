import { spawn } from 'child_process';
import { dirname, resolve as resolvePath } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DEFAULT_TIMEOUT_MS = 45000;

function getPythonCommand() {
  return (
    process.env.LLAMA_AGENT_PYTHON ||
    process.env.PYTHON ||
    'python3'
  );
}

function getAgentScriptPath() {
  const fromEnv = process.env.LLAMA_AGENT_SCRIPT;
  if (fromEnv) return fromEnv;
  return resolvePath(__dirname, '..', 'agent', 'llamaindex_agent.py');
}

function buildSpawnEnv() {
  return Object.fromEntries(
    Object.entries(process.env).filter(([, value]) => typeof value === 'string')
  );
}

function parseAgentOutput(output) {
  const trimmed = output.trim();
  if (!trimmed) return null;
  const lastLine = trimmed.split('\n').filter(Boolean).pop();
  try {
    return JSON.parse(lastLine);
  } catch {
    return null;
  }
}

export async function runAgent(payload) {

  const timeoutMs = Number(process.env.LLAMA_AGENT_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS;
  const pythonCommand = getPythonCommand();
  const scriptPath = getAgentScriptPath();

  return new Promise((resolve, reject) => {
    const proc = spawn(pythonCommand, [scriptPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: buildSpawnEnv(),
    });

    let stdout = '';
    let stderr = '';

    const timer = setTimeout(() => {
      proc.kill('SIGKILL');
      reject(new Error('LlamaIndex agent timed out'));
    }, timeoutMs);

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });

    proc.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(`LlamaIndex agent exited with code ${code}: ${stderr}`));
        return;
      }
      const parsed = parseAgentOutput(stdout);
      if (!parsed) {
        reject(new Error('LlamaIndex agent returned invalid JSON'));
        return;
      }
      resolve(parsed);
    });

    proc.stdin.write(JSON.stringify(payload));
    proc.stdin.end();
  });
}
