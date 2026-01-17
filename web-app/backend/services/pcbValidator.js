import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import { runAgent } from './llmAgent.js';
import { renderPcbSvg } from './kicadRender.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const GENERATED_DIR = path.join(__dirname, '..', 'generated');

const DEFAULT_MAX_FILE_CHARS = 120000;
const DEFAULT_MAX_TOTAL_CHARS = 400000;

function fileExt(filename) {
  return path.extname(filename || '').toLowerCase();
}

function findUploadedFile(uploadedFiles, predicate) {
  return uploadedFiles.find((file) => predicate(file));
}

async function readFileLimited(filePath, limit) {
  const content = await fs.readFile(filePath, 'utf-8');
  if (content.length <= limit) {
    return { content, truncated: false };
  }
  return { content: content.slice(0, limit), truncated: true };
}

async function collectFilePayload(files) {
  const maxPerFile = Number(process.env.LLM_MAX_FILE_CHARS) || DEFAULT_MAX_FILE_CHARS;
  const maxTotal = Number(process.env.LLM_MAX_TOTAL_CHARS) || DEFAULT_MAX_TOTAL_CHARS;
  const includedExts = new Set([
    '.kicad_pro',
    '.kicad_pcb',
    '.kicad_sch',
    '.kicad_prl',
    '.kicad_sym',
    '.kicad_mod',
    '.csv',
  ]);

  const metadata = files.map((file) => ({
    name: file.originalName,
    filename: file.filename,
    ext: fileExt(file.originalName),
    size: file.size,
  }));

  const payloadFiles = [];
  const truncatedFiles = [];
  let totalChars = 0;

  for (const file of files) {
    const ext = fileExt(file.originalName);
    if (!includedExts.has(ext)) continue;

    const remaining = Math.max(0, maxTotal - totalChars);
    if (remaining === 0) break;

    const limit = Math.min(maxPerFile, remaining);
    const { content, truncated } = await readFileLimited(file.path, limit);
    totalChars += content.length;
    if (truncated) truncatedFiles.push(file.originalName);

    payloadFiles.push({
      name: file.originalName,
      ext,
      size: file.size,
      content,
      truncated,
    });
  }

  return { metadata, payloadFiles, totalChars, truncatedFiles };
}

function defaultFirmwarePlan() {
  return {
    overview: 'Generate a firmware implementation plan based on the uploaded KiCad files.',
    phases: [
      {
        phase: 'Bring-up',
        tasks: ['Power rails verification', 'Clock configuration', 'Basic GPIO smoke test'],
      },
      {
        phase: 'Peripheral Enablement',
        tasks: ['Bus initialization', 'Driver bring-up', 'Hardware validation'],
      },
    ],
    perComponent: [],
  };
}

function defaultPrd() {
  return {
    productBrief: 'Define firmware scope, requirements, and delivery plan for this PCB.',
    functionalRequirements: [],
    nonfunctionalRequirements: [],
    risks: [],
    milestones: [],
  };
}

function normalizeAgentResponse(agentResponse) {
  const firmware = agentResponse?.firmware_plan || {};
  const prd = agentResponse?.prd_summary || {};
  const notes = Array.isArray(agentResponse?.notes) ? agentResponse.notes : [];

  const firmwarePlan = {
    overview: firmware.overview || defaultFirmwarePlan().overview,
    phases: Array.isArray(firmware.phases) ? firmware.phases : defaultFirmwarePlan().phases,
    perComponent: Array.isArray(firmware.per_component) ? firmware.per_component : [],
  };

  const prdSummary = {
    productBrief: prd.product_brief || defaultPrd().productBrief,
    functionalRequirements: Array.isArray(prd.functional_requirements)
      ? prd.functional_requirements
      : [],
    nonfunctionalRequirements: Array.isArray(prd.nonfunctional_requirements)
      ? prd.nonfunctional_requirements
      : [],
    risks: Array.isArray(prd.risks) ? prd.risks : [],
    milestones: Array.isArray(prd.milestones) ? prd.milestones : [],
  };

  return { firmwarePlan, prdSummary, notes };
}

function formatFirmwarePlanMarkdown(plan) {
  const lines = [];
  lines.push('# Firmware Implementation Plan');
  lines.push('');
  lines.push(plan.overview || '');
  lines.push('');

  for (const phase of plan.phases || []) {
    lines.push(`## ${phase.phase}`);
    for (const task of phase.tasks || []) {
      lines.push(`- ${task}`);
    }
    lines.push('');
  }

  if (plan.perComponent && plan.perComponent.length > 0) {
    lines.push('## Per-Component Tasks');
    for (const item of plan.perComponent) {
      lines.push(`### ${item.reference || 'Component'} (${item.role || 'Component'})`);
      for (const task of item.tasks || []) {
        lines.push(`- ${task}`);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}

function formatPrdMarkdown(prd) {
  const lines = [];
  lines.push('# PRD Summary');
  lines.push('');
  lines.push(prd.productBrief || '');
  lines.push('');

  const sections = [
    { title: 'Functional Requirements', items: prd.functionalRequirements || [] },
    { title: 'Non-Functional Requirements', items: prd.nonfunctionalRequirements || [] },
    { title: 'Risks', items: prd.risks || [] },
    { title: 'Milestones', items: prd.milestones || [] },
  ];

  for (const section of sections) {
    lines.push(`## ${section.title}`);
    if (section.items.length === 0) {
      lines.push('- (none provided)');
    } else {
      for (const item of section.items) {
        lines.push(`- ${item}`);
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}

export async function validateUploadedDesign({ validationId, uploadedFiles }) {
  const effectiveValidationId = validationId || `validation_${Date.now()}`;
  await fs.mkdir(GENERATED_DIR, { recursive: true });

  const files = uploadedFiles.map((file) => ({
    originalName: file.originalname,
    filename: file.filename,
    path: file.path,
    size: file.size,
  }));

  const pcbFile = findUploadedFile(files, (file) => fileExt(file.originalName) === '.kicad_pcb');
  const projectFile = findUploadedFile(files, (file) => fileExt(file.originalName) === '.kicad_pro');
  const schematicFile = findUploadedFile(files, (file) => fileExt(file.originalName) === '.kicad_sch');

  if (!projectFile && !pcbFile && !schematicFile) {
    return {
      success: false,
      error: 'No KiCad project, schematic, or PCB file found in upload.',
    };
  }

  const { metadata, payloadFiles, totalChars, truncatedFiles } = await collectFilePayload(files);

  let agentResponse = null;
  try {
    agentResponse = await runAgent({
      mode: 'firmware',
      context: {
        validation_id: effectiveValidationId,
        metadata,
        total_chars: totalChars,
        files: payloadFiles,
      },
    });
  } catch (error) {
    console.warn('LlamaIndex agent failed for firmware planning:', error.message);
  }

  const { firmwarePlan, prdSummary, notes } = normalizeAgentResponse(agentResponse);
  if (!agentResponse) {
    notes.push('LLM agent unavailable; using a default firmware plan.');
  }
  if (truncatedFiles.length > 0) {
    notes.push(`Input truncated for: ${truncatedFiles.join(', ')}`);
  }
  if (payloadFiles.length === 0) {
    notes.push('No readable KiCad files were parsed for the LLM.');
  }

  let renderResult = null;
  if (pcbFile) {
    try {
      renderResult = await renderPcbSvg({
        pcbPath: pcbFile.path,
        outputDir: GENERATED_DIR,
        baseName: effectiveValidationId,
      });
    } catch (error) {
      notes.push(`Render failed: ${error.message}`);
    }
  } else {
    notes.push('Render skipped: no .kicad_pcb file found.');
  }

  const summary = {
    validationId: effectiveValidationId,
    notes,
    counts: {
      files: files.length,
      bytes: files.reduce((sum, file) => sum + (file.size || 0), 0),
    },
  };

  const firmwareMarkdown = formatFirmwarePlanMarkdown(firmwarePlan);
  const prdMarkdown = formatPrdMarkdown(prdSummary);

  const firmwareFilename = `${effectiveValidationId}_firmware_plan.md`;
  const prdFilename = `${effectiveValidationId}_prd.md`;
  const summaryFilename = `${effectiveValidationId}_summary.json`;

  await fs.writeFile(path.join(GENERATED_DIR, firmwareFilename), firmwareMarkdown, 'utf-8');
  await fs.writeFile(path.join(GENERATED_DIR, prdFilename), prdMarkdown, 'utf-8');
  await fs.writeFile(
    path.join(GENERATED_DIR, summaryFilename),
    JSON.stringify(
      {
        summary,
        firmwarePlan,
        prd: prdSummary,
        render: renderResult,
        input: {
          metadata,
          totalChars,
        },
      },
      null,
      2
    ),
    'utf-8'
  );

  return {
    success: true,
    validationId: effectiveValidationId,
    project: {
      name: projectFile ? path.basename(projectFile.originalName, '.kicad_pro') : null,
      projectPath: projectFile?.path || null,
      pcbPath: pcbFile?.path || null,
      schematicPath: schematicFile?.path || null,
      files,
    },
    summary,
    firmwarePlan,
    prd: prdSummary,
    render: renderResult ? { svg: renderResult.filename } : null,
    files: {
      firmwarePlan: firmwareFilename,
      prd: prdFilename,
      summary: summaryFilename,
      render: renderResult ? renderResult.filename : null,
    },
  };
}
