import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  UploadCloud,
  Cpu,
  FileText,
  Image,
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
  const shouldReduceMotion = useReducedMotion();

  const firmwarePlan = useMemo(() => result?.firmwarePlan || {}, [result]);
  const prdSummary = useMemo(() => result?.prd || {}, [result]);
  const renderFilename = result?.render?.svg || result?.files?.render || null;
  const renderUrl = renderFilename ? api.getFileDownloadUrl(renderFilename) : null;

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
        throw new Error(response.error || 'Plan generation failed');
      }
      setResult(response);
    } catch (err) {
      setError(err.message || 'Failed to generate plan');
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
              Omni Board turns KiCad files into firmware implementation plans.
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-purple-200">
              Upload your KiCad project files and receive a firmware plan plus a PRD-ready summary
              generated from the raw design data.
            </p>
          </div>
        </motion.header>

        <motion.main className="relative z-10 px-6 pb-16" variants={fadeUpVariants}>
          <div className="max-w-6xl mx-auto space-y-10">
            <motion.section className="glass-card" variants={fadeUpVariants}>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div>
                  <h2 className="text-xl font-semibold text-purple-100">Upload KiCad files</h2>
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
                        Generating plan...
                      </span>
                    ) : (
                      'Generate Firmware Plan'
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
                  {result.summary?.notes?.length > 0 && (
                    <motion.section className="glass-card" variants={fadeUpVariants}>
                      <h2 className="text-xl font-semibold text-purple-100">Plan notes</h2>
                      <motion.div className="mt-3 space-y-2 text-sm text-purple-300" variants={listVariants}>
                        {result.summary.notes.map((note) => (
                          <motion.p key={note} variants={itemVariants}>
                            - {note}
                          </motion.p>
                        ))}
                      </motion.div>
                    </motion.section>
                  )}

                  <motion.section className="glass-card" variants={fadeUpVariants}>
                    <h2 className="text-xl font-semibold text-purple-100">Generated outputs</h2>
                    <p className="mt-1 text-sm text-purple-300">
                      Download the firmware plan, PRD summary, and render artifacts.
                    </p>
                    <motion.div className="mt-5 grid gap-4 md:grid-cols-3" variants={listVariants}>
                      {Object.entries(result.files || {})
                        .filter(([, filename]) => Boolean(filename))
                        .map(([key, filename]) => (
                          <motion.div key={key} variants={itemVariants} whileHover={{ y: -4 }}>
                            <FileCard filename={filename} />
                          </motion.div>
                        ))}
                    </motion.div>
                  </motion.section>

                  <motion.section className="glass-card" variants={fadeUpVariants}>
                    <div className="flex items-center gap-2 text-purple-100">
                      <Image className="w-5 h-5" />
                      <h2 className="text-xl font-semibold">KiCad render</h2>
                    </div>
                    {renderUrl ? (
                      <a href={renderUrl} target="_blank" rel="noreferrer">
                        <div className="mt-4 border border-purple-500/30 bg-[#160b2a] p-4">
                          <img
                            src={renderUrl}
                            alt="KiCad PCB render"
                            className="w-full h-auto"
                          />
                        </div>
                      </a>
                    ) : (
                      <p className="mt-4 text-sm text-purple-300">
                        Render not available yet. Upload a .kicad_pcb file to generate a board view.
                      </p>
                    )}
                  </motion.section>

                  <motion.section className="grid gap-6 md:grid-cols-2" variants={fadeUpVariants}>
                    <motion.div className="glass-card" variants={itemVariants}>
                      <div className="flex items-center gap-2 text-purple-100">
                        <Cpu className="w-5 h-5" />
                        <h3 className="text-lg font-semibold">Firmware implementation plan</h3>
                      </div>
                      <p className="mt-2 text-sm text-purple-300">{firmwarePlan?.overview}</p>
                      <motion.div className="mt-4 space-y-4" variants={listVariants}>
                        {(firmwarePlan?.phases || []).map((phase) => (
                          <motion.div key={phase.phase} className="phase-card" variants={itemVariants}>
                            <h4 className="text-sm font-semibold text-purple-200 uppercase tracking-[0.2em]">
                              {phase.phase}
                            </h4>
                            <ul className="mt-2 text-sm text-purple-200 list-disc list-inside space-y-1">
                              {(phase.tasks || []).map((task) => (
                                <li key={task}>{task}</li>
                              ))}
                            </ul>
                          </motion.div>
                        ))}
                      </motion.div>
                    </motion.div>

                    <motion.div className="glass-card" variants={itemVariants}>
                      <div className="flex items-center gap-2 text-purple-100">
                        <FileText className="w-5 h-5" />
                        <h3 className="text-lg font-semibold">PRD summary</h3>
                      </div>
                      <p className="mt-2 text-sm text-purple-300">
                        {prdSummary?.productBrief}
                      </p>
                      <div className="mt-4 space-y-4 text-sm text-purple-200">
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-purple-300">
                            Functional requirements
                          </p>
                          <ul className="mt-2 list-disc list-inside space-y-1">
                            {(prdSummary?.functionalRequirements?.length
                              ? prdSummary.functionalRequirements
                              : ['(none provided)']
                            ).map((item) => (
                              <li key={item}>{item}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-purple-300">
                            Non-functional requirements
                          </p>
                          <ul className="mt-2 list-disc list-inside space-y-1">
                            {(prdSummary?.nonfunctionalRequirements?.length
                              ? prdSummary.nonfunctionalRequirements
                              : ['(none provided)']
                            ).map((item) => (
                              <li key={item}>{item}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-purple-300">Risks</p>
                          <ul className="mt-2 list-disc list-inside space-y-1">
                            {(prdSummary?.risks?.length ? prdSummary.risks : ['(none provided)']).map(
                              (item) => (
                              <li key={item}>{item}</li>
                              )
                            )}
                          </ul>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-purple-300">
                            Milestones
                          </p>
                          <ul className="mt-2 list-disc list-inside space-y-1">
                            {(prdSummary?.milestones?.length
                              ? prdSummary.milestones
                              : ['(none provided)']
                            ).map((item) => (
                              <li key={item}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
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
