import React from 'react';

const ICONS = {
  pdf: { bg: 'bg-red-900/40', text: 'text-red-400', label: 'PDF' },
  doc: { bg: 'bg-blue-900/40', text: 'text-blue-400', label: 'DOC' },
  docx: { bg: 'bg-blue-900/40', text: 'text-blue-400', label: 'DOCX' },
  xls: { bg: 'bg-green-900/40', text: 'text-green-400', label: 'XLS' },
  xlsx: { bg: 'bg-green-900/40', text: 'text-green-400', label: 'XLSX' },
  csv: { bg: 'bg-emerald-900/40', text: 'text-emerald-400', label: 'CSV' },
  jpg: { bg: 'bg-purple-900/40', text: 'text-purple-400', label: 'IMG' },
  jpeg: { bg: 'bg-purple-900/40', text: 'text-purple-400', label: 'IMG' },
  png: { bg: 'bg-purple-900/40', text: 'text-purple-400', label: 'IMG' },
  gif: { bg: 'bg-pink-900/40', text: 'text-pink-400', label: 'GIF' },
  zip: { bg: 'bg-yellow-900/40', text: 'text-yellow-400', label: 'ZIP' },
  rar: { bg: 'bg-yellow-900/40', text: 'text-yellow-400', label: 'RAR' },
  txt: { bg: 'bg-slate-700', text: 'text-slate-300', label: 'TXT' },
  ppt: { bg: 'bg-orange-900/40', text: 'text-orange-400', label: 'PPT' },
  pptx: { bg: 'bg-orange-900/40', text: 'text-orange-400', label: 'PPTX' },
};

const DEFAULT_ICON = { bg: 'bg-slate-700', text: 'text-slate-400', label: 'FILE' };

const FileTypeIcon = ({ extension = '', size = 'md' }) => {
  const ext = (extension || '').toLowerCase().replace('.', '');
  const config = ICONS[ext] || DEFAULT_ICON;

  const sizeClass = {
    sm: 'w-8 h-8 text-[8px]',
    md: 'w-12 h-12 text-[10px]',
    lg: 'w-16 h-16 text-xs',
    xl: 'w-24 h-24 text-sm'
  }[size] || 'w-12 h-12 text-[10px]';

  return (
    <div className={`${sizeClass} ${config.bg} ${config.text} rounded-lg flex items-center justify-center font-bold tracking-wide border border-white/5`}>
      {config.label}
    </div>
  );
};

export default FileTypeIcon;
