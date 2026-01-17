import React, { useMemo, useState } from 'react';
import {
  UploadCloud,
  ShieldCheck,
  AlertTriangle,
  Cpu,
  CircuitBoard,
  FileCheck2,
  Loader2,
  X,
} from 'lucide-react';
import api from '../services/api';
import FileCard from './FileCard';

const ACCEPTED_EXTENSIONS = [
  '.kicad_pro',
  '.kicad_pcb',
  '.kicad_sch',
  '.kicad_prl',
  '.kicad_sym',
  '.kicad_mod',
  '.csv',
];

const PcbValidator = () => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [showAllComponents, setShowAllComponents] = useState(false);

  const fileSummary = useMemo(() => {
    if (!result?.summary) return null;
    return result.summary.counts || {};
  }, [result]);

  const componentList = useMemo(() => {
    const list = result?.components?.list || [];
    if (showAllComponents) return list;
    return list.slice(0, 18);
  }, [result, showAllComponents]);

  const drcCategories = useMemo(() => {
    const categories = result?.validation?.drc?.data?.violation_categories || {};
    return Object.entries(categories).slice(0, 6);
  }, [result]);

  const boundaryIssues = useMemo(() => {
    const issues = result?.validation?.boundaries?.data?.issues || [];
    return issues.slice(0, 6);
  }, [result]);

  const statusConfig = useMemo(() => {
    const status = result?.summary?.status || 'review';
    if (status === 'pass') {
      return {
        label: 'Pass',
        icon: ShieldCheck,
        tone: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      };
    }
    if (status === 'issues') {
      return {
        label: 'Issues Found',
        icon: AlertTriangle,
        tone: 'bg-rose-100 text-rose-700 border-rose-200',
      };
    }
    return {
      label: 'Needs Review',
      icon: FileCheck2,
      tone: 'bg-amber-100 text-amber-700 border-amber-200',
    };
  }, [result]);

  const StatusIcon = statusConfig.icon;

  const addFiles = (files) => {
    const incoming = Array.from(files || []);
    if (incoming.length === 0) return;

    setSelectedFiles((prev) => {
      const existing = new Map(prev.map((file) => [`${file.name}-${file.size}`, file]));
      for (const file of incoming) {
        existing.set(`${file.name}-${file.size}`, file);
      }
      return Array.from(existing.values());
    });
  };

  const handleFileInput = (event) => {
    addFiles(event.target.files);
  };

  const removeFile = (target) => {
    setSelectedFiles((prev) => prev.filter((file) => file !== target));
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    addFiles(event.dataTransfer.files);
  };

  const handleValidate = async () => {
    if (selectedFiles.length === 0 || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const response = await api.validatePcb(selectedFiles);
      if (!response.success) {
        throw new Error(response.error || 'Validation failed');
      }
      setResult(response);
    } catch (err) {
      setError(err.message || 'Failed to validate design');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen">
      <div className="page-shell">
        <div className="background-orbit orbit-a" />
        <div className="background-orbit orbit-b" />
        <div className="background-orbit orbit-c" />

        <header className="relative z-10 px-6 pt-12 pb-10">
          <div className="max-w-6xl mx-auto">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">8090PCB Validator</p>
            <h1 className="mt-4 text-4xl md:text-6xl font-semibold text-slate-900 leading-tight">
              Validate KiCad boards, then ship firmware with confidence.
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-slate-600">
              Upload your KiCad project files and get a structured validation report, firmware
              bring-up plan, and technical notes for every component.
            </p>
          </div>
        </header>

        <main className="relative z-10 px-6 pb-16">
          <div className="max-w-6xl mx-auto space-y-10">
            <section className="glass-card fade-up">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Upload design files</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Recommended: .kicad_pro + .kicad_pcb + .kicad_sch
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleValidate}
                    disabled={selectedFiles.length === 0 || isSubmitting}
                    className="btn-primary"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Validating...
                      </span>
                    ) : (
                      'Validate PCB'
                    )}
                  </button>
                </div>
              </div>

              <label
                className={`upload-zone ${isDragging ? 'upload-zone-active' : ''}`}
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  multiple
                  accept={ACCEPTED_EXTENSIONS.join(',')}
                  className="sr-only"
                  onChange={handleFileInput}
                />
                <div className="flex flex-col items-center text-center">
                  <UploadCloud className="w-8 h-8 text-slate-400" />
                  <p className="mt-3 text-sm text-slate-600">
                    Drag and drop files here, or click to browse
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Accepted: {ACCEPTED_EXTENSIONS.join(', ')}
                  </p>
                </div>
              </label>

              {selectedFiles.length > 0 && (
                <div className="mt-6 grid gap-3 md:grid-cols-2">
                  {selectedFiles.map((file) => (
                    <div key={`${file.name}-${file.size}`} className="file-pill">
                      <span className="truncate text-sm text-slate-700">{file.name}</span>
                      <button
                        type="button"
                        className="text-slate-400 hover:text-rose-500"
                        onClick={() => removeFile(file)}
                        aria-label={`Remove ${file.name}`}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}
            </section>

            {result && (
              <>
                <section className="fade-up">
                  <div className="grid gap-4 md:grid-cols-4">
                    <div className={`stat-card ${statusConfig.tone}`}>
                      <StatusIcon className="w-6 h-6" />
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em]">Status</p>
                        <p className="text-lg font-semibold">{statusConfig.label}</p>
                      </div>
                    </div>
                    <div className="stat-card bg-white/70 text-slate-700 border-slate-200">
                      <CircuitBoard className="w-6 h-6 text-slate-500" />
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Components</p>
                        <p className="text-lg font-semibold">{fileSummary?.components ?? '--'}</p>
                      </div>
                    </div>
                    <div className="stat-card bg-white/70 text-slate-700 border-slate-200">
                      <AlertTriangle className="w-6 h-6 text-slate-500" />
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">DRC</p>
                        <p className="text-lg font-semibold">
                          {fileSummary?.drcViolations ?? '--'}
                        </p>
                      </div>
                    </div>
                    <div className="stat-card bg-white/70 text-slate-700 border-slate-200">
                      <Cpu className="w-6 h-6 text-slate-500" />
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Patterns</p>
                        <p className="text-lg font-semibold">{fileSummary?.patterns ?? '--'}</p>
                      </div>
                    </div>
                  </div>

                  {result.summary?.notes?.length > 0 && (
                    <div className="mt-4 text-sm text-slate-500">
                      {result.summary.notes.map((note) => (
                        <p key={note}>- {note}</p>
                      ))}
                    </div>
                  )}

                  {result.mcp?.available === false && (
                    <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                      MCP server could not be reached. Validation ran with limited data.
                    </div>
                  )}
                </section>

                <section className="glass-card fade-up">
                  <h2 className="text-xl font-semibold text-slate-900">Validation outputs</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Download the generated report, firmware plan, and component notes.
                  </p>
                  <div className="mt-5 grid gap-4 md:grid-cols-3">
                    {Object.entries(result.files || {}).map(([key, filename]) => (
                      <FileCard key={key} filename={filename} />
                    ))}
                  </div>
                </section>

                <section className="grid gap-6 md:grid-cols-2 fade-up">
                  <div className="glass-card">
                    <h3 className="text-lg font-semibold text-slate-900">DRC overview</h3>
                    {drcCategories.length === 0 ? (
                      <p className="mt-3 text-sm text-slate-500">
                        No DRC categories available yet. Upload a full project to run DRC checks.
                      </p>
                    ) : (
                      <ul className="mt-4 space-y-2 text-sm text-slate-600">
                        {drcCategories.map(([name, count]) => (
                          <li key={name} className="flex items-center justify-between gap-4">
                            <span className="truncate">{name}</span>
                            <span className="font-semibold text-slate-700">{count}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="glass-card">
                    <h3 className="text-lg font-semibold text-slate-900">Boundary issues</h3>
                    {boundaryIssues.length === 0 ? (
                      <p className="mt-3 text-sm text-slate-500">
                        No boundary issues reported.
                      </p>
                    ) : (
                      <ul className="mt-4 space-y-2 text-sm text-slate-600">
                        {boundaryIssues.map((issue, index) => (
                          <li key={`${issue.component_ref}-${index}`}>
                            <span className="font-semibold text-slate-700">
                              {issue.component_ref}
                            </span>
                            {`: ${issue.message}`}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </section>

                <section className="grid gap-6 md:grid-cols-2 fade-up">
                  <div className="glass-card">
                    <h3 className="text-lg font-semibold text-slate-900">Firmware plan</h3>
                    <p className="mt-2 text-sm text-slate-500">{result.firmwarePlan?.overview}</p>
                    <div className="mt-4 space-y-4">
                      {(result.firmwarePlan?.phases || []).map((phase) => (
                        <div key={phase.phase} className="phase-card">
                          <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-[0.2em]">
                            {phase.phase}
                          </h4>
                          <ul className="mt-2 text-sm text-slate-600 list-disc list-inside space-y-1">
                            {phase.tasks.map((task) => (
                              <li key={task}>{task}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="glass-card">
                    <h3 className="text-lg font-semibold text-slate-900">Component technical notes</h3>
                    <p className="mt-2 text-sm text-slate-500">
                      Key components and their firmware-facing roles.
                    </p>
                    <div className="mt-4 space-y-3">
                      {componentList.map((component) => (
                        <div key={component.reference} className="component-row">
                          <div>
                            <p className="text-sm font-semibold text-slate-700">
                              {component.reference} · {component.category}
                            </p>
                            <p className="text-xs text-slate-500">{component.value || 'No value'}</p>
                          </div>
                          <p className="text-xs text-slate-500 max-w-xs">{component.description}</p>
                        </div>
                      ))}
                    </div>
                    {result.components?.list?.length > 18 && (
                      <button
                        type="button"
                        className="mt-4 text-sm font-semibold text-slate-600 hover:text-slate-900"
                        onClick={() => setShowAllComponents((prev) => !prev)}
                      >
                        {showAllComponents ? 'Show fewer components' : 'Show all components'}
                      </button>
                    )}
                  </div>
                </section>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default PcbValidator;
