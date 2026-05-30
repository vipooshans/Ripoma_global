import React, { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { useCreateReportExport, useDownloadReportExport } from '../../hooks/useReports';
import toast from 'react-hot-toast';

const ExportButtonGroup = ({ name, type, columns = [], data = [] }) => {
  const [activeFormat, setActiveFormat] = useState(null); // 'csv' | 'xlsx' | 'pdf' | null
  
  const createExportMutation = useCreateReportExport();
  const downloadExportMutation = useDownloadReportExport();

  const handleExport = async (format) => {
    if (columns.length === 0 || data.length === 0) {
      toast.error('No report data available to export.');
      return;
    }

    try {
      setActiveFormat(format);
      const toastId = toast.loading(`Generating ${format.toUpperCase()} export...`);

      // 1. Trigger export generation
      const exportLog = await createExportMutation.mutateAsync({
        name: `${name} (${format.toUpperCase()})`,
        type,
        format,
        columns,
        data
      });

      // 2. Poll download endpoint until file is ready
      let attempts = 0;
      const maxAttempts = 20; // 40 seconds max
      const exportId = exportLog._id;

      const pollForDownload = async () => {
        try {
          const res = await downloadExportMutation.mutateAsync(exportId);
          if (res && res.url) {
            toast.success('Report export ready! Downloading...', { id: toastId });
            window.open(res.url, '_blank');
            setActiveFormat(null);
          } else {
            throw new Error('Not ready');
          }
        } catch (err) {
          attempts++;
          if (attempts >= maxAttempts) {
            toast.error('Export timeout. You can find the generated report in History later.', { id: toastId });
            setActiveFormat(null);
          } else {
            // Wait 2 seconds and poll again
            setTimeout(pollForDownload, 2000);
          }
        }
      };

      // Start polling
      setTimeout(pollForDownload, 1500);

    } catch (err) {
      toast.error('Failed to initiate export.');
      setActiveFormat(null);
    }
  };

  const formats = [
    { code: 'csv', label: 'Export CSV', color: 'hover:border-slate-350 hover:bg-slate-50' },
    { code: 'xlsx', label: 'Export Excel', color: 'hover:border-emerald-300 hover:bg-emerald-50/50 hover:text-emerald-700' },
    { code: 'pdf', label: 'Export PDF', color: 'hover:border-rose-300 hover:bg-rose-50/50 hover:text-rose-700' }
  ];

  return (
    <div className="flex flex-wrap gap-2 font-sans text-xs font-bold">
      {formats.map(fmt => {
        const isCurrentActive = activeFormat === fmt.code;
        return (
          <button
            key={fmt.code}
            disabled={activeFormat !== null}
            onClick={() => handleExport(fmt.code)}
            className={`border border-slate-200 bg-white text-slate-700 py-2 px-3.5 rounded-lg transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:pointer-events-none ${fmt.color}`}
          >
            {isCurrentActive ? (
              <Loader2 size={13} className="animate-spin text-teal-650" />
            ) : (
              <Download size={13} className="text-slate-450" />
            )}
            <span>{isCurrentActive ? 'Generating...' : fmt.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default ExportButtonGroup;
