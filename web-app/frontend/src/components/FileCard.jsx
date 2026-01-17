import React from 'react';
import { Download, FileText, File, FileJson } from 'lucide-react';
import api from '../services/api';

const FileCard = ({ filename, designId, type }) => {
  const handleDownload = () => {
    const url = api.getFileDownloadUrl(filename);
    window.open(url, '_blank');
  };

  const getIcon = () => {
    if (filename.endsWith('.kicad_pcb')) {
      return <File className="w-6 h-6 text-blue-400" />;
    }
    if (filename.endsWith('.md')) {
      return <FileText className="w-6 h-6 text-green-400" />;
    }
    if (filename.endsWith('.json')) {
      return <FileJson className="w-6 h-6 text-amber-500" />;
    }
    return <File className="w-6 h-6 text-gray-400" />;
  };

  const getLabel = () => {
    if (filename.endsWith('.kicad_pcb')) {
      return 'CAD File (KiCad PCB)';
    }
    if (filename.endsWith('_report.md')) {
      return 'Validation Report';
    }
    if (filename.endsWith('_firmware_plan.md')) {
      return 'Firmware Plan';
    }
    if (filename.endsWith('_components.md')) {
      return 'Component Reference';
    }
    if (filename.endsWith('.md')) {
      return 'Markdown Document';
    }
    if (filename.endsWith('_summary.json')) {
      return 'Validation Summary (JSON)';
    }
    return 'File';
  };

  return (
    <div className="file-card" onClick={handleDownload}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {getIcon()}
          <div>
            <p className="font-medium text-sm">{getLabel()}</p>
            <p className="text-xs text-gray-400">{filename}</p>
          </div>
        </div>
        <Download className="w-5 h-5 text-gray-400 hover:text-blue-400" />
      </div>
    </div>
  );
};

export default FileCard;
