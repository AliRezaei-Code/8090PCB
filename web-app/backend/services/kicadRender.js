import fs from 'fs';
import { spawn } from 'child_process';
import { basename, join } from 'path';

const DEFAULT_MAC_CLI = '/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli';
const DEFAULT_LAYERS = 'F.Cu,B.Cu,F.SilkS,B.SilkS,F.Mask,B.Mask,Edge.Cuts';

function resolveKicadCli() {
  const fromEnv = process.env.KICAD_CLI_PATH;
  if (fromEnv && fs.existsSync(fromEnv)) {
    return fromEnv;
  }
  if (fs.existsSync(DEFAULT_MAC_CLI)) {
    return DEFAULT_MAC_CLI;
  }
  return 'kicad-cli';
}

export async function renderPcbSvg({ pcbPath, outputDir, baseName }) {
  if (!pcbPath) return null;
  if (!fs.existsSync(pcbPath)) {
    throw new Error(`PCB file not found: ${pcbPath}`);
  }

  const kicadCli = resolveKicadCli();
  const outputName = `${baseName}_render.svg`;
  const outputPath = join(outputDir, outputName);
  const layers = process.env.KICAD_RENDER_LAYERS || DEFAULT_LAYERS;

  const args = [
    'pcb',
    'export',
    'svg',
    '--output',
    outputPath,
    '--layers',
    layers,
    pcbPath,
  ];

  return new Promise((resolve, reject) => {
    const proc = spawn(kicadCli, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('error', (error) => {
      reject(new Error(`kicad-cli failed: ${error.message}`));
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`kicad-cli exited ${code}: ${stderr}`));
        return;
      }
      resolve({ filename: outputName, path: outputPath, pcb: basename(pcbPath) });
    });
  });
}
