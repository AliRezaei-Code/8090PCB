import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
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
import BackgroundParticles from './BackgroundParticles';

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
  const shouldReduceMotion = useReducedMotion();

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
        tone: 'bg-purple-500/15 text-purple-100 border-purple-400/40',
      };
    }
    if (status === 'issues') {
      return {
        label: 'Issues Found',
        icon: AlertTriangle,
        tone: 'bg-rose-500/20 text-rose-100 border-rose-400/50',
      };
    }
    return {
      label: 'Needs Review',
      icon: FileCheck2,
      tone: 'bg-rose-500/15 text-rose-100 border-rose-400/40',
    };
  }, [result]);

  const StatusIcon = statusConfig.icon;

  const pageVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.08,
      },
    },
  };

  const fadeUpVariants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 18 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 140,
        damping: 18,
      },
    },
  };

  const listVariants = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.05,
      },
    },
  };

  const statListVariants = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.02,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 12 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 160,
        damping: 20,
      },
    },
  };

  const statItemVariants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 8 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 220,
        damping: 18,
      },
    },
  };

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
      <motion.div className="page-shell" initial="hidden" animate="show" variants={pageVariants}>
        <BackgroundParticles />
        <div className="background-orbit orbit-a" />
        <div className="background-orbit orbit-b" />
        <div className="background-orbit orbit-c" />

        <motion.header className="relative z-10 px-6 pt-12 pb-10" variants={fadeUpVariants}>
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-3 text-purple-100">
              <img src="/favicon.svg" alt="Omni Board logo" className="w-9 h-9" />
              <span className="text-xs uppercase tracking-[0.3em]">Omni Board</span>
            </div>
            <h1 className="mt-4 text-4xl md:text-6xl font-semibold text-purple-50 leading-tight">
              Omni Board validates KiCad designs with firmware-ready precision.
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-purple-200">
              Upload your KiCad project files and get a structured validation report, firmware
              bring-up plan, and technical notes for every component.
            </p>
          </div>
        </motion.header>

        <motion.main className="relative z-10 px-6 pb-16" variants={fadeUpVariants}>
          <div className="max-w-6xl mx-auto space-y-10">
            <motion.section className="glass-card" variants={fadeUpVariants}>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div>
                  <h2 className="text-xl font-semibold text-purple-100">Upload design files</h2>
                  <p className="text-sm text-purple-300 mt-1">
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

              <motion.label
                className={`upload-zone ${isDragging ? 'upload-zone-active' : ''}`}
                onMouseMove={(event) => {
                  if (shouldReduceMotion) return;
                  const rect = event.currentTarget.getBoundingClientRect();
                  const x = (event.clientX - rect.left) / rect.width - 0.5;
                  const y = (event.clientY - rect.top) / rect.height - 0.5;
                  event.currentTarget.style.setProperty('--tilt-x', `${(x * 8).toFixed(2)}deg`);
                  event.currentTarget.style.setProperty('--tilt-y', `${(-y * 8).toFixed(2)}deg`);
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.setProperty('--tilt-x', '0deg');
                  event.currentTarget.style.setProperty('--tilt-y', '0deg');
                }}
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
                  <UploadCloud className="w-8 h-8 text-purple-300" />
                  <p className="mt-3 text-sm text-purple-200">
                    Drag and drop files here, or click to browse
                  </p>
                  <p className="mt-1 text-xs text-purple-400">
                    Accepted: {ACCEPTED_EXTENSIONS.join(', ')}
                  </p>
                </div>
              </motion.label>

              <AnimatePresence>
                {selectedFiles.length > 0 && (
                  <motion.div
                    className="mt-6 grid gap-3 md:grid-cols-2"
                    variants={listVariants}
                    initial="hidden"
                    animate="show"
                    exit="hidden"
                  >
                    {selectedFiles.map((file) => (
                      <motion.div
                        key={`${file.name}-${file.size}`}
                        className="file-pill"
                        variants={itemVariants}
                        layout
                      >
                        <span className="truncate text-sm text-purple-100">{file.name}</span>
                        <button
                          type="button"
                          className="text-purple-300 hover:text-purple-100"
                          onClick={() => removeFile(file)}
                          aria-label={`Remove ${file.name}`}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {error && (
                  <motion.p
                    className="mt-4 text-sm text-rose-200"
                    initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: shouldReduceMotion ? 0 : -8 }}
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.section>

            <AnimatePresence>
              {result && (
                <motion.div
                  className="space-y-10"
                  variants={listVariants}
                  initial="hidden"
                  animate="show"
                  exit="hidden"
                >
                  <motion.section className="space-y-4" variants={fadeUpVariants}>
                    <motion.div className="grid gap-4 md:grid-cols-4" layout variants={statListVariants}>
                      <motion.div
                        className={`stat-card ${statusConfig.tone}`}
                        variants={statItemVariants}
                        whileHover={{ y: -4 }}
                      >
                        <StatusIcon className="w-6 h-6" />
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em]">Status</p>
                          <p className="text-lg font-semibold">{statusConfig.label}</p>
                        </div>
                      </motion.div>
                      <motion.div
                        className="stat-card text-rose-100 border-rose-400/40 bg-rose-500/10"
                        variants={statItemVariants}
                        whileHover={{ y: -4 }}
                      >
                        <CircuitBoard className="w-6 h-6 text-rose-200" />
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-rose-200">
                            Components
                          </p>
                          <p className="text-lg font-semibold text-rose-100">
                            {fileSummary?.components ?? '--'}
                          </p>
                        </div>
                      </motion.div>
                      <motion.div
                        className="stat-card text-rose-100 border-rose-400/40 bg-rose-500/10"
                        variants={statItemVariants}
                        whileHover={{ y: -4 }}
                      >
                        <AlertTriangle className="w-6 h-6 text-rose-200" />
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-rose-200">DRC</p>
                          <p className="text-lg font-semibold text-rose-100">
                            {fileSummary?.drcViolations ?? '--'}
                          </p>
                        </div>
                      </motion.div>
                      <motion.div
                        className="stat-card text-rose-100 border-rose-400/40 bg-rose-500/10"
                        variants={statItemVariants}
                        whileHover={{ y: -4 }}
                      >
                        <Cpu className="w-6 h-6 text-rose-200" />
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-rose-200">
                            Patterns
                          </p>
                          <p className="text-lg font-semibold text-rose-100">
                            {fileSummary?.patterns ?? '--'}
                          </p>
                        </div>
                      </motion.div>
                    </motion.div>

                    {result.summary?.notes?.length > 0 && (
                      <motion.div
                        className="text-sm text-rose-200"
                        variants={itemVariants}
                        initial="hidden"
                        animate="show"
                      >
                        {result.summary.notes.map((note) => (
                          <p key={note}>- {note}</p>
                        ))}
                      </motion.div>
                    )}

                    {result.mcp?.available === false && (
                      <motion.div
                        className="border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
                        variants={itemVariants}
                      >
                        MCP server could not be reached. Validation ran with limited data.
                      </motion.div>
                    )}
                  </motion.section>

                  <motion.section className="glass-card" variants={fadeUpVariants}>
                    <h2 className="text-xl font-semibold text-purple-100">Validation outputs</h2>
                    <p className="mt-1 text-sm text-purple-300">
                      Download the generated report, firmware plan, and component notes.
                    </p>
                    <motion.div className="mt-5 grid gap-4 md:grid-cols-3" variants={listVariants}>
                      {Object.entries(result.files || {}).map(([key, filename]) => (
                        <motion.div key={key} variants={itemVariants} whileHover={{ y: -4 }}>
                          <FileCard filename={filename} />
                        </motion.div>
                      ))}
                    </motion.div>
                  </motion.section>

                  <motion.section className="grid gap-6 md:grid-cols-2" variants={fadeUpVariants}>
                    <motion.div className="glass-card" variants={itemVariants}>
                      <h3 className="text-lg font-semibold text-purple-100">DRC overview</h3>
                      {drcCategories.length === 0 ? (
                        <p className="mt-3 text-sm text-purple-300">
                          No DRC categories available yet. Upload a full project to run DRC checks.
                        </p>
                      ) : (
                        <motion.ul className="mt-4 space-y-2 text-sm text-purple-200" variants={listVariants}>
                          {drcCategories.map(([name, count]) => (
                            <motion.li
                              key={name}
                              variants={itemVariants}
                              className="flex items-center justify-between gap-4"
                            >
                              <span className="truncate">{name}</span>
                              <span className="font-semibold text-purple-100">{count}</span>
                            </motion.li>
                          ))}
                        </motion.ul>
                      )}
                    </motion.div>

                    <motion.div className="glass-card" variants={itemVariants}>
                      <h3 className="text-lg font-semibold text-purple-100">Boundary issues</h3>
                      {boundaryIssues.length === 0 ? (
                        <p className="mt-3 text-sm text-purple-300">No boundary issues reported.</p>
                      ) : (
                        <motion.ul className="mt-4 space-y-2 text-sm text-purple-200" variants={listVariants}>
                          {boundaryIssues.map((issue, index) => (
                            <motion.li key={`${issue.component_ref}-${index}`} variants={itemVariants}>
                              <span className="font-semibold text-purple-100">
                                {issue.component_ref}
                              </span>
                              {`: ${issue.message}`}
                            </motion.li>
                          ))}
                        </motion.ul>
                      )}
                    </motion.div>
                  </motion.section>

                  <motion.section className="grid gap-6 md:grid-cols-2" variants={fadeUpVariants}>
                    <motion.div className="glass-card" variants={itemVariants}>
                      <h3 className="text-lg font-semibold text-purple-100">Firmware plan</h3>
                      <p className="mt-2 text-sm text-purple-300">{result.firmwarePlan?.overview}</p>
                      <motion.div className="mt-4 space-y-4" variants={listVariants}>
                        {(result.firmwarePlan?.phases || []).map((phase) => (
                          <motion.div key={phase.phase} className="phase-card" variants={itemVariants}>
                            <h4 className="text-sm font-semibold text-purple-200 uppercase tracking-[0.2em]">
                              {phase.phase}
                            </h4>
                            <ul className="mt-2 text-sm text-purple-200 list-disc list-inside space-y-1">
                              {phase.tasks.map((task) => (
                                <li key={task}>{task}</li>
                              ))}
                            </ul>
                          </motion.div>
                        ))}
                      </motion.div>
                    </motion.div>

                    <motion.div className="glass-card" variants={itemVariants}>
                      <h3 className="text-lg font-semibold text-purple-100">
                        Component technical notes
                      </h3>
                      <p className="mt-2 text-sm text-purple-300">
                        Key components and their firmware-facing roles.
                      </p>
                      <motion.div className="mt-4 space-y-3" variants={listVariants}>
                        {componentList.map((component) => (
                          <motion.div
                            key={component.reference}
                            className="component-row"
                            variants={itemVariants}
                            layout
                          >
                            <div>
                              <p className="text-sm font-semibold text-purple-100">
                                {component.reference} · {component.category}
                              </p>
                              <p className="text-xs text-purple-300">
                                {component.value || 'No value'}
                              </p>
                            </div>
                            <p className="text-xs text-purple-300 max-w-xs">
                              {component.description}
                            </p>
                          </motion.div>
                        ))}
                      </motion.div>
                      {result.components?.list?.length > 18 && (
                        <button
                          type="button"
                          className="mt-4 text-sm font-semibold text-purple-200 hover:text-purple-50"
                          onClick={() => setShowAllComponents((prev) => !prev)}
                        >
                          {showAllComponents ? 'Show fewer components' : 'Show all components'}
                        </button>
                      )}
                    </motion.div>
                  </motion.section>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.main>
      </motion.div>
    </div>
  );
};

export default PcbValidator;
