import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileCheck } from 'lucide-react';

const MAX_SIZE = 20 * 1024 * 1024; // 20 MB

export const DOCUMENT_ACCEPT = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png']
};

const UploadDropzone = ({ onFilesAccepted, multiple = false, accept = DOCUMENT_ACCEPT }) => {
  const onDrop = useCallback((acceptedFiles) => {
    if (onFilesAccepted) onFilesAccepted(acceptedFiles);
  }, [onFilesAccepted]);

  const { getRootProps, getInputProps, isDragActive, acceptedFiles, fileRejections } = useDropzone({
    onDrop,
    multiple,
    maxSize: MAX_SIZE,
    accept
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200
        ${isDragActive
          ? 'border-teal-500 bg-teal-500/10'
          : 'border-slate-600 hover:border-teal-500/50 hover:bg-slate-800/50'}`}
    >
      <input {...getInputProps()} />

      {acceptedFiles.length > 0 ? (
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 bg-teal-500/20 rounded-full flex items-center justify-center">
            <FileCheck size={24} className="text-teal-400" />
          </div>
          <p className="text-slate-300 font-semibold">{acceptedFiles.length} file{acceptedFiles.length > 1 ? 's' : ''} selected</p>
          <p className="text-xs text-slate-500">{acceptedFiles.map(f => f.name).join(', ')}</p>
          <p className="text-xs text-teal-400 mt-1">Click or drag to replace</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors
            ${isDragActive ? 'bg-teal-500/30' : 'bg-slate-700'}`}>
            <Upload size={26} className={isDragActive ? 'text-teal-400' : 'text-slate-400'} />
          </div>
          <div>
            <p className="text-slate-300 font-semibold">
              {isDragActive ? 'Drop your file here' : 'Drag & drop or click to upload'}
            </p>
            <p className="text-slate-500 text-sm mt-1">PDF, DOCX, XLSX, JPG, PNG — max 20 MB</p>
            {fileRejections?.length > 0 && (
              <p className="text-rose-400 text-xs mt-2">File rejected: check type and size.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadDropzone;
