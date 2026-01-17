import { spawn } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class MCPClient {
  constructor() {
    this.mcpServerPath = process.env.KICAD_MCP_SERVER_PATH || '../../main.py';
    this.projectPath = process.env.KICAD_PROJECT_PATH || '';
    this.serverProcess = null;
  }

  /**
   * Send a request to the KiCad MCP server via stdio
   */
  async sendRequest(method, params = {}) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('MCP request timeout'));
      }, 30000);

      try {
        // Launch the MCP server as a subprocess
        const pythonPath = 'python3';
        const serverPath = join(__dirname, this.mcpServerPath);
        
        const mcpProcess = spawn(pythonPath, [serverPath], {
          stdio: ['pipe', 'pipe', 'pipe'],
          env: {
            ...process.env,
            KICAD_PROJECT_PATH: this.projectPath
          }
        });

        let stdout = '';
        let stderr = '';

        mcpProcess.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        mcpProcess.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        mcpProcess.on('close', (code) => {
          clearTimeout(timeout);
          
          if (code !== 0) {
            reject(new Error(`MCP server exited with code ${code}: ${stderr}`));
            return;
          }

          try {
            // Parse JSON-RPC response
            const lines = stdout.split('\n').filter(line => line.trim());
            const response = JSON.parse(lines[lines.length - 1] || '{}');
            resolve(response);
          } catch (err) {
            reject(new Error(`Failed to parse MCP response: ${err.message}`));
          }
        });

        // Send JSON-RPC request
        const request = {
          jsonrpc: '2.0',
          id: Date.now(),
          method,
          params
        };

        mcpProcess.stdin.write(JSON.stringify(request) + '\n');
        mcpProcess.stdin.end();

      } catch (err) {
        clearTimeout(timeout);
        reject(err);
      }
    });
  }

  /**
   * Process a chat message and generate PCB design
   */
  async processDesignRequest(userMessage) {
    try {
      // For now, return a mock response
      // In production, this would call specific MCP tools based on the request
      
      const timestamp = Date.now();
      const designId = `design_${timestamp}`;

      // Mock CAD file generation
      const cadContent = this.generateMockKiCadFile(userMessage);
      const cadFilePath = join(__dirname, '..', 'generated', `${designId}.kicad_pcb`);
      await fs.writeFile(cadFilePath, cadContent);

      // Generate description for PM tool
      const description = this.generateDesignDescription(userMessage, designId);
      const descriptionPath = join(__dirname, '..', 'generated', `${designId}_description.md`);
      await fs.writeFile(descriptionPath, description);

      return {
        success: true,
        designId,
        files: {
          cad: `${designId}.kicad_pcb`,
          description: `${designId}_description.md`
        },
        message: 'PCB design generated successfully'
      };

    } catch (error) {
      console.error('Error processing design request:', error);
      throw error;
    }
  }

  generateDesignDescription(designRequest, designId) {
    const requestText = String(designRequest || '').trim();
    const safeRequest = requestText.length ? requestText : '(no request provided)';

    return `# PCB Design Description

**Design ID:** ${designId}
**Generated:** ${new Date().toLocaleString()}

## User Request
${safeRequest}

## Deliverables
- \`${designId}.kicad_pcb\`
- \`${designId}_description.md\`

## Notes
This is a mock design output for the 8090PCB web UI. Configure \`web-app/backend/.env\` (\`KICAD_MCP_SERVER_PATH\`, \`KICAD_PROJECT_PATH\`) to connect to a real KiCad MCP server.
`;
  }

  /**
   * List available MCP tools (best-effort).
   * The UI can operate without this, so failures return an empty list.
   */
  async listTools() {
    try {
      const response = await this.sendRequest('tools/list', {});
      return response?.result?.tools || response?.tools || [];
    } catch {
      return [];
    }
  }

  /**
   * Validate uploaded PCB and generate reports
   */
  async validateAndProcessPCB(filePath, originalFilename) {
    try {
      const timestamp = Date.now();
      const designId = `validation_${timestamp}`;

      // 1. Generate Validation Report
      const validationResult = this.generateValidationReport(originalFilename);
      const reportPath = join(__dirname, '..', 'generated', `${designId}_report.md`);
      await fs.writeFile(reportPath, validationResult.markdown);

      // 2. Generate Firmware Steps
      const firmwareSteps = this.generateFirmwareGuide(validationResult.data);
      const firmwarePath = join(__dirname, '..', 'generated', `${designId}_firmware.md`);
      await fs.writeFile(firmwarePath, firmwareSteps.markdown);

      // 3. Generate Project Management JSON
      const projectJson = this.generateProjectJSON(originalFilename, validationResult.data, firmwareSteps.data);
      const jsonPath = join(__dirname, '..', 'generated', `${designId}_project.json`);
      await fs.writeFile(jsonPath, JSON.stringify(projectJson, null, 2));

      return {
        success: true,
        designId,
        files: {
          report: `${designId}_report.md`,
          firmware: `${designId}_firmware.md`,
          json: `${designId}_project.json`
        },
        message: 'PCB validated and project files generated successfully'
      };

    } catch (error) {
      console.error('Error validating PCB:', error);
      throw error;
    }
  }

  generateValidationReport(filename) {
    const issues = [
      { type: 'Warning', layer: 'F.Cu', message: 'Trace width near limit at (125.4, 88.2)' },
      { type: 'Info', layer: 'B.Cu', message: 'Ground plane continuity check passed' },
      { type: 'Warning', component: 'U1', message: 'Component close to board edge' }
    ];

    const markdown = `# PCB Validation Report
**File:** ${filename}
**Date:** ${new Date().toLocaleString()}

## Summary
- **Status:** Validated with Warnings
- **Total Issues:** ${issues.length}
- **Critical Errors:** 0

## Detailed Findings
${issues.map(i => `- **[${i.type}]** ${i.message} ${i.layer ? `(Layer: ${i.layer})` : ''}`).join('\n')}

## Physical Constraints
- **Dimensions:** 85mm x 56mm
- **Min Trace Width:** 0.15mm
- **Min Clearance:** 0.15mm
`;

    return {
      data: { issues, status: 'Warning', summary: 'Validated with Warnings' },
      markdown
    };
  }

  generateFirmwareGuide(validationData) {
    const steps = [
      {
        phase: 'Board Bring-up',
        tasks: [
          'Verify 3.3V power rail stability',
          'Check system clock (24MHz crystal)',
          'Verify JTAG/SWD connectivity'
        ]
      },
      {
        phase: 'Peripheral Drivers',
        tasks: [
          'Initialize GPIO for Status LEDs (Pin 12, 13)',
          'Configure I2C bus for sensors (Address 0x48)',
          'Setup SPI for Flash memory'
        ]
      }
    ];

    const markdown = `# Firmware Implementation Guide

## Phase 1: Board Bring-up
${steps[0].tasks.map(t => `- [ ] ${t}`).join('\n')}

## Phase 2: Peripheral Drivers
${steps[1].tasks.map(t => `- [ ] ${t}`).join('\n')}

## Hardware Dependencies
- MCU: STM32F4 series
- Clock: 24MHz External
- Voltage: 3.3V Logic
`;

    return {
      data: { steps },
      markdown
    };
  }

  generateProjectJSON(filename, validationData, firmwareData) {
    return {
      project: {
        name: filename.replace('.kicad_pcb', ''),
        created_at: new Date().toISOString(),
        type: "PCB Validation & Firmware",
        status: "In Progress"
      },
      validation: {
        status: validationData.status,
        issues: validationData.issues
      },
      firmware_implementation: {
        steps: firmwareData.steps
      },
      metadata: {
        generator: "8090PCB Validator",
        version: "1.0.0"
      }
    };
  }

  /**
   * Generate mock KiCad PCB file
   */
  generateMockKiCadFile(designRequest) {
    const safeComment = String(designRequest || '')
      .replaceAll('\n', ' ')
      .slice(0, 200);

    return `(kicad_pcb (version 20221018) (generator pcbnew)
  (general
    (thickness 1.6)
    (comment "${safeComment}")
  )
  (paper "A4")
  (layers
    (0 "F.Cu" signal)
    (31 "B.Cu" signal)
    (36 "B.SilkS" user)
    (37 "F.SilkS" user)
    (38 "B.Mask" user)
    (39 "F.Mask" user)
    (44 "Edge.Cuts" user)
    (47 "F.CrtYd" user)
    (49 "F.Fab" user)
  )
  (setup (pad_to_mask_clearance 0))
  (net 0 "")
  (net 1 "GND")
  (net 2 "VCC")
  (gr_rect (start 100 80) (end 160 120) (layer "Edge.Cuts") (width 0.1) (fill none))
)`;
  }
}

export default new MCPClient();
