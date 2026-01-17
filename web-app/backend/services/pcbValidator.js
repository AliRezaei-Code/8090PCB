import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import { withMcpClient, parseToolTextContent } from './mcpBridge.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const GENERATED_DIR = path.join(__dirname, '..', 'generated');

function safeUpper(value) {
  return String(value || '').toUpperCase();
}

function fileExt(filename) {
  return path.extname(filename || '').toLowerCase();
}

function tryParseJson(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function normalizeToolResult(toolResult) {
  if (!toolResult) {
    return { ok: false, error: 'Tool not executed' };
  }
  return toolResult;
}

function findUploadedFile(uploadedFiles, predicate) {
  return uploadedFiles.find((file) => predicate(file));
}

function summarizeToolError(toolResult) {
  if (!toolResult) return null;
  if (toolResult.ok === false) return toolResult.error || 'Tool failed';
  if (toolResult.data && toolResult.data.success === false) return toolResult.data.error || 'Tool error';
  return null;
}

function componentCategory(reference, value, libId) {
  const ref = safeUpper(reference);
  const valueUpper = safeUpper(value);
  const libUpper = safeUpper(libId);

  if (valueUpper.match(/STM32|ATMEGA|ESP32|ESP8266|RP2040|PIC|MSP430|SAMD|CORTEX/)) {
    return 'Microcontroller';
  }
  if (ref.startsWith('U')) return 'IC';
  if (ref.startsWith('R')) return 'Resistor';
  if (ref.startsWith('C')) return 'Capacitor';
  if (ref.startsWith('L')) return 'Inductor';
  if (ref.startsWith('D')) return valueUpper.includes('LED') ? 'LED' : 'Diode';
  if (ref.startsWith('Q')) return 'Transistor';
  if (ref.startsWith('J') || ref.startsWith('P') || valueUpper.includes('CONN')) return 'Connector';
  if (ref.startsWith('SW') || valueUpper.includes('SWITCH')) return 'Switch';
  if (ref.startsWith('Y') || ref.startsWith('X') || valueUpper.includes('CRYSTAL')) return 'Crystal/Oscillator';
  if (libUpper.includes('SENSOR') || valueUpper.match(/SENSOR|BMP|BME|LPS|MPU|IMU|ACCEL/)) {
    return 'Sensor';
  }

  return 'Component';
}

function buildTechnicalDescription(component, mcuMap, sensorMap) {
  const reference = component.reference || 'Unknown';
  const value = component.value || 'Unknown';
  const libId = component.lib_id || '';
  const category = componentCategory(reference, value, libId);

  if (mcuMap.has(reference)) {
    const mcu = mcuMap.get(reference);
    const family = mcu.family || 'MCU';
    const model = mcu.model || value;
    const feature = mcu.features ? ` (${mcu.features})` : '';
    return `${family} ${model}${feature}. Configure clocking, boot, and peripheral muxing per datasheet.`;
  }

  if (sensorMap.has(reference)) {
    const sensor = sensorMap.get(reference);
    const subtype = sensor.subtype ? ` (${sensor.subtype})` : '';
    const iface = sensor.interface ? ` via ${sensor.interface}` : '';
    return `${sensor.type || 'Sensor'}${subtype}${iface}. Validate wiring, address selection, and calibration workflow.`;
  }

  switch (category) {
    case 'Resistor':
      return `Passive resistor (${value}). Verify tolerance and power rating against load conditions.`;
    case 'Capacitor':
      return `Passive capacitor (${value}). Confirm voltage rating and placement near load or supply.`;
    case 'Inductor':
      return `Inductor (${value}). Confirm current rating and saturation current.`;
    case 'Diode':
      return `Diode (${value}). Verify polarity orientation and forward voltage drop.`;
    case 'LED':
      return `LED (${value}). Confirm color and current-limiting resistor sizing.`;
    case 'Transistor':
      return `Transistor (${value}). Confirm pinout and biasing network.`;
    case 'Connector':
      return `Connector (${value}). Confirm pinout, mating part, and signal integrity needs.`;
    case 'Switch':
      return `Switch (${value}). Confirm debounce strategy and pull-up/down configuration.`;
    case 'Crystal/Oscillator':
      return `Clock source (${value}). Verify load capacitors and startup requirements.`;
    case 'Microcontroller':
      return `Microcontroller (${value}). Confirm boot configuration, clock source, and power rails.`;
    case 'IC':
      return `IC (${value}). Verify power, decoupling, and signal routing per datasheet.`;
    case 'Sensor':
      return `Sensor (${value}). Verify bus interface, address, and calibration.`;
    default:
      return `Component (${value}). Review datasheet for electrical and mechanical constraints.`;
  }
}

function buildFirmwareTasks(component, mcuMap, sensorMap) {
  const reference = component.reference || 'Unknown';
  const value = component.value || '';
  const category = componentCategory(reference, value, component.lib_id || '');

  if (mcuMap.has(reference)) {
    return [
      'Configure system clock tree and core voltage scaling',
      'Initialize GPIO and pin multiplexing',
      'Bring up debug/programming interface',
      'Validate boot configuration and flash settings',
    ];
  }

  if (sensorMap.has(reference)) {
    const sensor = sensorMap.get(reference);
    const iface = sensor.interface ? sensor.interface.toUpperCase() : 'BUS';
    return [
      `Initialize ${iface} interface and verify addressing`,
      'Read sensor ID/register map',
      'Apply calibration and conversion timing',
      'Stream data and validate scaling/units',
    ];
  }

  if (category === 'LED') {
    return ['Configure GPIO output', 'Add optional PWM control for dimming'];
  }

  if (category === 'Switch') {
    return ['Configure GPIO input', 'Implement debounce and event handling'];
  }

  if (category === 'Connector' && safeUpper(value).includes('USB')) {
    return ['Initialize USB stack', 'Validate VBUS detect and enumeration'];
  }

  return [];
}

function buildFirmwarePlan(componentDescriptions, patterns) {
  const phases = [];
  const perComponent = [];

  phases.push({
    phase: 'Board Bring-up',
    tasks: [
      'Verify power rails and grounding',
      'Check clock sources and reset circuitry',
      'Confirm programming/debug access',
      'Smoke-test GPIO with basic firmware',
    ],
  });

  const mcuList = patterns?.microcontroller_circuits || [];
  if (mcuList.length > 0) {
    phases.push({
      phase: 'MCU Bring-up',
      tasks: [
        'Configure clock tree and PLL settings',
        'Initialize GPIO, interrupts, and watchdog',
        'Set up memory map and boot configuration',
      ],
    });
  }

  const interfaceList = patterns?.digital_interface_circuits || [];
  if (interfaceList.length > 0) {
    phases.push({
      phase: 'Digital Interfaces',
      tasks: interfaceList.map((iface) => {
        const type = iface.type || 'interface';
        const signals = (iface.signals_found || []).slice(0, 4).join(', ');
        return signals ? `Enable ${type} (${signals})` : `Enable ${type}`;
      }),
    });
  }

  const sensorList = patterns?.sensor_interface_circuits || [];
  if (sensorList.length > 0) {
    phases.push({
      phase: 'Sensors',
      tasks: sensorList.map((sensor) => {
        const type = sensor.type || 'sensor';
        const ref = sensor.component || '';
        return ref ? `Initialize ${type} (${ref})` : `Initialize ${type}`;
      }),
    });
  }

  for (const component of componentDescriptions) {
    const tasks = component.firmwareTasks || [];
    if (tasks.length > 0) {
      perComponent.push({
        reference: component.reference,
        role: component.category,
        tasks,
      });
    }
  }

  return {
    overview: 'Firmware plan generated from the schematic netlist and pattern recognition.',
    phases,
    perComponent,
  };
}

function buildComponentDescriptions(netlist, patterns) {
  const components = netlist?.components || {};
  const componentEntries = Object.values(components);

  const mcuMap = new Map();
  for (const mcu of patterns?.microcontroller_circuits || []) {
    if (mcu.component) mcuMap.set(mcu.component, mcu);
  }

  const sensorMap = new Map();
  for (const sensor of patterns?.sensor_interface_circuits || []) {
    if (sensor.component) sensorMap.set(sensor.component, sensor);
  }

  const descriptions = componentEntries
    .map((component) => {
      const reference = component.reference || 'Unknown';
      const value = component.value || '';
      const libId = component.lib_id || '';
      const footprint = component.footprint || '';
      const category = componentCategory(reference, value, libId);
      const description = buildTechnicalDescription(component, mcuMap, sensorMap);
      const firmwareTasks = buildFirmwareTasks(component, mcuMap, sensorMap);

      return {
        reference,
        value,
        footprint,
        libId,
        category,
        description,
        firmwareTasks,
      };
    })
    .sort((a, b) => a.reference.localeCompare(b.reference, 'en'));

  return descriptions;
}

function formatMarkdownReport(summary, details, firmwarePlan, componentDescriptions) {
  const lines = [];
  lines.push('# PCB Validation Report');
  lines.push('');
  lines.push(`Validation ID: ${summary.validationId}`);
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');

  lines.push('## Summary');
  lines.push(`Status: ${summary.status}`);
  for (const note of summary.notes) {
    lines.push(`- ${note}`);
  }
  lines.push('');

  if (details.projectPath) {
    lines.push('## Project');
    lines.push(`Project file: ${details.projectPath}`);
    lines.push('');
  }

  if (details.drc?.data) {
    lines.push('## Design Rule Check (DRC)');
    if (details.drc.data.success === false) {
      lines.push(`DRC failed: ${details.drc.data.error || 'Unknown error'}`);
    } else {
      lines.push(`Total violations: ${details.drc.data.total_violations ?? 'unknown'}`);
      if (details.drc.data.violation_categories) {
        lines.push('Violation categories:');
        for (const [name, count] of Object.entries(details.drc.data.violation_categories)) {
          lines.push(`- ${name}: ${count}`);
        }
      }
    }
    lines.push('');
  }

  if (details.boundaries?.data) {
    lines.push('## Boundary Validation');
    if (details.boundaries.data.success === false) {
      lines.push(`Boundary validation failed: ${details.boundaries.data.error || 'Unknown error'}`);
    } else {
      lines.push(`Out of bounds components: ${details.boundaries.data.out_of_bounds_count ?? 0}`);
      const issues = details.boundaries.data.issues || [];
      if (issues.length > 0) {
        lines.push('Issues:');
        for (const issue of issues.slice(0, 20)) {
          lines.push(`- ${issue.component_ref}: ${issue.message}`);
        }
        if (issues.length > 20) lines.push('- (additional issues truncated)');
      }
    }
    lines.push('');
  }

  if (details.patterns?.data?.identified_patterns) {
    lines.push('## Circuit Patterns');
    const patterns = details.patterns.data.identified_patterns;
    for (const [name, items] of Object.entries(patterns)) {
      lines.push(`- ${name}: ${Array.isArray(items) ? items.length : 0}`);
    }
    lines.push('');
  }

  if (firmwarePlan?.phases) {
    lines.push('## Firmware Plan Overview');
    lines.push(firmwarePlan.overview || '');
    for (const phase of firmwarePlan.phases) {
      lines.push('');
      lines.push(`### ${phase.phase}`);
      for (const task of phase.tasks) {
        lines.push(`- ${task}`);
      }
    }
    lines.push('');
  }

  lines.push('## Component Technical Summary');
  lines.push(`Total components: ${componentDescriptions.length}`);
  lines.push('');
  for (const component of componentDescriptions.slice(0, 40)) {
    lines.push(`- ${component.reference}: ${component.description}`);
  }
  if (componentDescriptions.length > 40) {
    lines.push('- (additional components truncated)');
  }

  lines.push('');
  return lines.join('\n');
}

function formatFirmwarePlanMarkdown(firmwarePlan) {
  const lines = [];
  lines.push('# Firmware Implementation Plan');
  lines.push('');
  lines.push(firmwarePlan.overview || '');
  lines.push('');

  for (const phase of firmwarePlan.phases || []) {
    lines.push(`## ${phase.phase}`);
    for (const task of phase.tasks) {
      lines.push(`- ${task}`);
    }
    lines.push('');
  }

  if (firmwarePlan.perComponent && firmwarePlan.perComponent.length > 0) {
    lines.push('## Per-Component Tasks');
    for (const item of firmwarePlan.perComponent) {
      lines.push(`### ${item.reference} (${item.role})`);
      for (const task of item.tasks) {
        lines.push(`- ${task}`);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}

function formatComponentsMarkdown(componentDescriptions) {
  const lines = [];
  lines.push('# Component Technical Description');
  lines.push('');
  for (const component of componentDescriptions) {
    lines.push(`## ${component.reference}`);
    lines.push(`Category: ${component.category}`);
    if (component.value) lines.push(`Value: ${component.value}`);
    if (component.footprint) lines.push(`Footprint: ${component.footprint}`);
    if (component.libId) lines.push(`Library ID: ${component.libId}`);
    lines.push(`Description: ${component.description}`);
    if (component.firmwareTasks.length > 0) {
      lines.push('Firmware Tasks:');
      for (const task of component.firmwareTasks) {
        lines.push(`- ${task}`);
      }
    }
    lines.push('');
  }
  return lines.join('\n');
}

async function safeToolCall(client, name, args) {
  try {
    const result = await client.callTool({ name, arguments: args });
    const text = parseToolTextContent(result);
    const parsed = tryParseJson(text);
    return {
      ok: true,
      data: parsed || text || null,
    };
  } catch (error) {
    return { ok: false, error: error.message };
  }
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

  const projectFile = findUploadedFile(files, (file) => fileExt(file.originalName) === '.kicad_pro');
  const pcbFile = findUploadedFile(files, (file) => fileExt(file.originalName) === '.kicad_pcb');
  const schematicFile = findUploadedFile(files, (file) => fileExt(file.originalName) === '.kicad_sch');

  const projectPath = projectFile?.path || null;
  const schematicPath = schematicFile?.path || null;

  if (!projectPath && !pcbFile && !schematicFile) {
    return {
      success: false,
      error: 'No KiCad project, schematic, or PCB file found in upload.',
    };
  }

  const toolResults = {};
  let mcpAvailable = true;
  let mcpError = null;

  try {
    await withMcpClient(async (client) => {
      if (projectPath) {
        toolResults.validateProject = await safeToolCall(client, 'validate_project', {
          project_path: projectPath,
        });
        toolResults.drc = await safeToolCall(client, 'run_drc_check', {
          project_path: projectPath,
        });
        toolResults.boundaries = await safeToolCall(client, 'validate_project_boundaries', {
          project_path: projectPath,
        });
        toolResults.netlist = await safeToolCall(client, 'extract_project_netlist', {
          project_path: projectPath,
        });
        toolResults.patterns = await safeToolCall(client, 'analyze_project_circuit_patterns', {
          project_path: projectPath,
        });
        toolResults.bom = await safeToolCall(client, 'analyze_bom', {
          project_path: projectPath,
        });
      } else if (schematicPath) {
        toolResults.netlist = await safeToolCall(client, 'extract_schematic_netlist', {
          schematic_path: schematicPath,
        });
        toolResults.patterns = await safeToolCall(client, 'identify_circuit_patterns', {
          schematic_path: schematicPath,
        });
      }
    });
  } catch (error) {
    mcpAvailable = false;
    mcpError = error.message;
  }

  const netlistData =
    toolResults.netlist?.data && typeof toolResults.netlist.data === 'object'
      ? toolResults.netlist.data
      : {};
  const patternsData =
    toolResults.patterns?.data && typeof toolResults.patterns.data === 'object'
      ? toolResults.patterns.data
      : {};

  const componentDescriptions = buildComponentDescriptions(
    netlistData,
    patternsData.identified_patterns || {}
  );

  const firmwarePlan = buildFirmwarePlan(componentDescriptions, patternsData.identified_patterns || {});

  const summaryNotes = [];
  const drcError = summarizeToolError(toolResults.drc);
  if (drcError) summaryNotes.push(`DRC: ${drcError}`);

  const boundaryError = summarizeToolError(toolResults.boundaries);
  if (boundaryError) summaryNotes.push(`Boundary validation: ${boundaryError}`);

  if (!projectPath) {
    summaryNotes.push('Project file not provided; DRC and project-level checks may be skipped.');
  }

  if (toolResults.validateProject?.data && toolResults.validateProject.data.valid === false) {
    const issues = toolResults.validateProject.data.issues || [];
    if (issues.length > 0) {
      summaryNotes.push(`Project validation: ${issues.join('; ')}`);
    }
  }

  if (!mcpAvailable && mcpError) summaryNotes.push(`MCP unavailable: ${mcpError}`);

  const drcCount = toolResults.drc?.data?.total_violations ?? null;
  const boundaryIssues = toolResults.boundaries?.data?.out_of_bounds_count ?? null;
  const patternCount = patternsData.total_patterns_found ?? null;

  let status = 'review';
  if (drcCount === 0 && (boundaryIssues === 0 || boundaryIssues === null)) {
    status = 'pass';
  }
  if (drcCount > 0 || boundaryIssues > 0) {
    status = 'issues';
  }

  const summary = {
    validationId: effectiveValidationId,
    status,
    notes: summaryNotes,
    counts: {
      components: netlistData.component_count || componentDescriptions.length,
      nets: netlistData.net_count || null,
      drcViolations: drcCount,
      boundaryIssues,
      patterns: patternCount,
    },
  };

  const reportMarkdown = formatMarkdownReport(
    summary,
    {
      projectPath,
      drc: toolResults.drc,
      boundaries: toolResults.boundaries,
      patterns: toolResults.patterns,
    },
    firmwarePlan,
    componentDescriptions
  );

  const firmwareMarkdown = formatFirmwarePlanMarkdown(firmwarePlan);
  const componentMarkdown = formatComponentsMarkdown(componentDescriptions);

  const reportFilename = `${effectiveValidationId}_report.md`;
  const firmwareFilename = `${effectiveValidationId}_firmware_plan.md`;
  const componentsFilename = `${effectiveValidationId}_components.md`;
  const jsonFilename = `${effectiveValidationId}_summary.json`;

  await fs.writeFile(path.join(GENERATED_DIR, reportFilename), reportMarkdown, 'utf-8');
  await fs.writeFile(path.join(GENERATED_DIR, firmwareFilename), firmwareMarkdown, 'utf-8');
  await fs.writeFile(path.join(GENERATED_DIR, componentsFilename), componentMarkdown, 'utf-8');
  await fs.writeFile(
    path.join(GENERATED_DIR, jsonFilename),
    JSON.stringify(
      {
        summary,
        validation: toolResults,
        firmwarePlan,
        components: componentDescriptions,
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
      projectPath,
      pcbPath: pcbFile?.path || null,
      schematicPath: schematicPath || null,
      files,
    },
    mcp: {
      available: mcpAvailable,
      error: mcpError,
    },
    summary,
    validation: toolResults,
    firmwarePlan,
    components: {
      total: componentDescriptions.length,
      list: componentDescriptions,
    },
    files: {
      report: reportFilename,
      firmwarePlan: firmwareFilename,
      components: componentsFilename,
      summary: jsonFilename,
    },
  };
}
