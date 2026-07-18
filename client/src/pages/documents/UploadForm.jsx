import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Upload, Tag, Link as LinkIcon, Calendar, Loader, X, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { documentService } from '../../services/documentService';
import UploadDropzone, { DOCUMENT_ACCEPT } from '../../components/documents/UploadDropzone';
import UploadProgressRow from '../../components/documents/UploadProgressRow';
import { CATEGORY_LABELS } from '../../components/documents/DocumentCard';
import { ENTITY_LABELS } from '../../components/documents/LinkedEntityChips';

const STEPS = ['Select File', 'Document Details', 'Link & Tags', 'Review & Upload'];

const UploadForm = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(0);
  const [file, setFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState(null); // null | uploading | done | error
  const [uploadError, setUploadError] = useState('');

  // Form fields
  const [form, setForm] = useState({
    name: '',
    category: 'other',
    description: '',
    isConfidential: false,
    language: 'en',
    issueDate: '',
    expiryDate: '',
  });

  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [linkedEntities, setLinkedEntities] = useState([]);
  const [entityInput, setEntityInput] = useState({ entityType: 'ImportOrder', entityId: '', entityRef: '' });

  useEffect(() => {
    const entityType = searchParams.get('entityType');
    const entityId = searchParams.get('entityId');
    const entityRef = searchParams.get('entityRef') || '';
    if (entityType && entityId) {
      setLinkedEntities([{ entityType, entityId, entityRef }]);
      setEntityInput({ entityType, entityId: '', entityRef: '' });
      setStep(0);
    }
  }, [searchParams]);

  const handleFileAccepted = (files) => {
    const f = files[0];
    setFile(f);
    if (!form.name) setForm(prev => ({ ...prev, name: f.name.replace(/\.[^/.]+$/, '') }));
  };

  const handleNext = () => setStep(s => Math.min(s + 1, 3));
  const handleBack = () => setStep(s => Math.max(s - 1, 0));

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) {
      setTags(prev => [...prev, t]);
      setTagInput('');
    }
  };

  const addEntity = () => {
    if (!entityInput.entityId.trim()) return toast.error('Enter an entity ID');
    setLinkedEntities(prev => [...prev, { ...entityInput }]);
    setEntityInput({ entityType: 'ImportOrder', entityId: '', entityRef: '' });
  };

  const handleUpload = async () => {
    if (!file) return toast.error('Please select a file');
    setUploadStatus('uploading');
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);
      Object.entries(form).forEach(([k, v]) => formData.append(k, v));
      formData.append('tags', tags.join(','));
      formData.append('linkedEntities', JSON.stringify(linkedEntities));

      await documentService.upload(formData, (pct) => setUploadProgress(pct));
      setUploadStatus('done');
      toast.success('Document uploaded successfully!');
      setTimeout(() => navigate('/documents/library'), 1500);
    } catch (err) {
      setUploadStatus('error');
      setUploadError(err.response?.data?.message || 'Upload failed');
      toast.error('Upload failed');
    }
  };

  const canProceed = () => {
    if (step === 0) return !!file;
    if (step === 1) return !!form.name;
    return true;
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/documents/library')} className="text-slate-500 hover:text-slate-300 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Upload Document</h1>
          <p className="text-slate-400 text-sm mt-0.5">Add a new document to the centralised repository</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center">
        {STEPS.map((s, i) => (
          <React.Fragment key={s}>
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all
                ${i < step ? 'border-teal-500 bg-teal-500 text-white'
                  : i === step ? 'border-teal-500 text-teal-400 bg-teal-500/10'
                  : 'border-slate-700 text-slate-600'}`}>
                {i < step ? <Check size={14} /> : i + 1}
              </div>
              <span className={`text-sm hidden sm:block ${i === step ? 'text-teal-400 font-semibold' : 'text-slate-500'}`}>{s}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-3 transition-colors ${i < step ? 'bg-teal-500' : 'bg-slate-700'}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step content */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">

        {/* Step 0: File selection */}
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
              <Upload size={18} className="text-teal-400" /> Select File
            </h2>
            <UploadDropzone onFilesAccepted={handleFileAccepted} accept={DOCUMENT_ACCEPT} />
            {file && (
              <div className="flex items-center justify-between p-3 bg-slate-700 rounded-xl text-sm">
                <div>
                  <p className="text-slate-200 font-medium">{file.name}</p>
                  <p className="text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
                <button onClick={() => setFile(null)} className="text-slate-500 hover:text-red-400">
                  <X size={16} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 1: Document Details */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-200">Document Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Document Name *</label>
                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 focus:border-teal-500 rounded-xl text-slate-200 text-sm outline-none transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Category</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 focus:border-teal-500 rounded-xl text-slate-200 text-sm outline-none transition-colors">
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Language</label>
                <select value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 focus:border-teal-500 rounded-xl text-slate-200 text-sm outline-none transition-colors">
                  <option value="en">English</option>
                  <option value="si">Sinhala</option>
                  <option value="ta">Tamil</option>
                  <option value="zh">Chinese</option>
                  <option value="ar">Arabic</option>
                  <option value="fr">French</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Issue Date</label>
                <input type="date" value={form.issueDate} onChange={e => setForm(f => ({ ...f, issueDate: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 focus:border-teal-500 rounded-xl text-slate-200 text-sm outline-none transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Expiry Date</label>
                <input type="date" value={form.expiryDate} onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 focus:border-teal-500 rounded-xl text-slate-200 text-sm outline-none transition-colors" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3}
                  className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 focus:border-teal-500 rounded-xl text-slate-200 text-sm outline-none transition-colors resize-none" />
              </div>
              <div className="sm:col-span-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.isConfidential} onChange={e => setForm(f => ({ ...f, isConfidential: e.target.checked }))}
                    className="w-4 h-4 rounded accent-teal-500" />
                  <span className="text-sm text-slate-300">Mark as Confidential</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Tags & Links */}
        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
              <Tag size={16} className="text-teal-400" /> Tags & Entity Links
            </h2>

            {/* Tags */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Tags</label>
              <div className="flex gap-2 mb-2">
                <input type="text" value={tagInput} onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addTag()}
                  placeholder="Add a tag and press Enter"
                  className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 focus:border-teal-500 rounded-xl text-slate-200 text-sm outline-none transition-colors" />
                <button onClick={addTag} className="px-3 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-sm transition-colors">
                  <Plus size={15} />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                  <span key={tag} className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-700 text-teal-400 rounded-full text-xs font-medium">
                    {tag}
                    <button onClick={() => setTags(prev => prev.filter(t => t !== tag))} className="text-slate-500 hover:text-red-400">
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Linked Entities */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Link to Entity</label>
              <div className="grid grid-cols-3 gap-2 mb-2">
                <select value={entityInput.entityType} onChange={e => setEntityInput(ei => ({ ...ei, entityType: e.target.value }))}
                  className="px-3 py-2 bg-slate-700 border border-slate-600 focus:border-teal-500 rounded-xl text-slate-200 text-sm outline-none transition-colors">
                  {Object.entries(ENTITY_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
                <input type="text" placeholder="Entity ID" value={entityInput.entityId}
                  onChange={e => setEntityInput(ei => ({ ...ei, entityId: e.target.value }))}
                  className="px-3 py-2 bg-slate-700 border border-slate-600 focus:border-teal-500 rounded-xl text-slate-200 text-sm outline-none transition-colors" />
                <input type="text" placeholder="Reference (optional)" value={entityInput.entityRef}
                  onChange={e => setEntityInput(ei => ({ ...ei, entityRef: e.target.value }))}
                  className="px-3 py-2 bg-slate-700 border border-slate-600 focus:border-teal-500 rounded-xl text-slate-200 text-sm outline-none transition-colors" />
              </div>
              <button onClick={addEntity} className="flex items-center gap-1.5 px-3 py-2 bg-slate-700 hover:bg-teal-500/20 text-teal-400 rounded-xl text-sm transition-colors border border-teal-500/30">
                <LinkIcon size={13} /> Add Link
              </button>
              <div className="flex flex-wrap gap-2 mt-3">
                {linkedEntities.map((ent, idx) => {
                  const config = ENTITY_LABELS[ent.entityType] || { label: ent.entityType, color: 'bg-slate-700 text-slate-400 border-slate-600' };
                  return (
                    <span key={idx} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${config.color}`}>
                      {config.label} · {ent.entityRef || ent.entityId}
                      <button onClick={() => setLinkedEntities(prev => prev.filter((_, i) => i !== idx))}>
                        <X size={10} className="text-current opacity-60 hover:opacity-100" />
                      </button>
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-slate-200">Review & Upload</h2>

            {uploadStatus ? (
              <UploadProgressRow
                filename={file?.name}
                extension={file?.name?.split('.').pop()}
                progress={uploadProgress}
                status={uploadStatus}
                error={uploadError}
              />
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <InfoRow label="File" value={file?.name} />
                  <InfoRow label="Size" value={`${(file?.size / 1024).toFixed(1)} KB`} />
                  <InfoRow label="Name" value={form.name} />
                  <InfoRow label="Category" value={CATEGORY_LABELS[form.category]} />
                  <InfoRow label="Confidential" value={form.isConfidential ? 'Yes' : 'No'} />
                  <InfoRow label="Language" value={form.language.toUpperCase()} />
                  {form.expiryDate && <InfoRow label="Expires" value={form.expiryDate} />}
                  {tags.length > 0 && <InfoRow label="Tags" value={tags.join(', ')} />}
                  {linkedEntities.length > 0 && <InfoRow label="Linked to" value={`${linkedEntities.length} entity(ies)`} />}
                </div>
                <button onClick={handleUpload}
                  className="w-full py-3 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2 shadow-lg shadow-teal-900/30">
                  <Upload size={16} /> Upload Document
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button onClick={handleBack} disabled={step === 0}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700 text-slate-400 text-sm disabled:opacity-30 hover:border-teal-500/50 transition-colors">
          <ArrowLeft size={14} /> Back
        </button>
        {step < 3 && (
          <button onClick={handleNext} disabled={!canProceed()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-sm font-semibold disabled:opacity-40 transition-colors">
            Next <ArrowRight size={14} />
          </button>
        )}
      </div>
    </div>
  );
};

const InfoRow = ({ label, value }) => (
  <div className="bg-slate-700/50 rounded-lg p-3">
    <p className="text-xs text-slate-500 mb-0.5">{label}</p>
    <p className="text-slate-200 font-medium truncate">{value || '—'}</p>
  </div>
);

export default UploadForm;
