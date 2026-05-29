import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Download, Trash2, Edit3, Clock, Lock, Tag, History,
  Upload, Eye, CheckCircle, AlertTriangle, Loader, Plus, X
} from 'lucide-react';
import toast from 'react-hot-toast';
import { documentService } from '../../services/documentService';
import FileTypeIcon from '../../components/documents/FileTypeIcon';
import LinkedEntityChips from '../../components/documents/LinkedEntityChips';
import VersionHistoryTable from '../../components/documents/VersionHistoryTable';
import DocPreviewPanel from '../../components/documents/DocPreviewPanel';
import { useDocumentActivity } from '../../hooks/useDocumentActivity';
import { CATEGORY_LABELS, formatBytes } from '../../components/documents/DocumentCard';
import UploadDropzone from '../../components/documents/UploadDropzone';

const DocumentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [activeTab, setActiveTab] = useState('details');
  const [showVersionUpload, setShowVersionUpload] = useState(false);
  const [newVersionFile, setNewVersionFile] = useState(null);
  const [changeNote, setChangeNote] = useState('');
  const [uploading, setUploading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [tagInput, setTagInput] = useState('');

  const { activities, loading: actLoading, fetchActivity } = useDocumentActivity(id);

  useEffect(() => {
    fetchDoc();
  }, [id]);

  useEffect(() => {
    if (activeTab === 'activity') fetchActivity(1);
  }, [activeTab, fetchActivity]);

  const fetchDoc = async () => {
    setLoading(true);
    try {
      const { data } = await documentService.getById(id);
      setDoc(data);
      setEditForm({
        name: data.name,
        category: data.category,
        description: data.description || '',
        isConfidential: data.isConfidential,
        expiryDate: data.expiryDate ? data.expiryDate.split('T')[0] : '',
        issueDate: data.issueDate ? data.issueDate.split('T')[0] : '',
        tags: data.tags || [],
      });
    } catch {
      toast.error('Failed to load document');
      navigate('/documents/library');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      const { data } = await documentService.getDownloadUrl(id);
      const link = document.createElement('a');
      link.href = data.url;
      link.download = doc.originalFilename;
      link.target = '_blank';
      link.click();
      toast.success('Download started');
    } catch {
      toast.error('Download failed');
    }
  };

  const handlePreview = async () => {
    try {
      const { data } = await documentService.getDownloadUrl(id);
      setPreviewUrl(data.url);
      setShowPreview(true);
    } catch {
      toast.error('Preview unavailable');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this document?')) return;
    try {
      await documentService.delete(id);
      toast.success('Document deleted');
      navigate('/documents/library');
    } catch {
      toast.error('Delete failed');
    }
  };

  const handleSaveEdit = async () => {
    try {
      await documentService.update(id, { ...editForm, tags: editForm.tags });
      toast.success('Document updated');
      setEditMode(false);
      fetchDoc();
    } catch {
      toast.error('Update failed');
    }
  };

  const handleNewVersionUpload = async () => {
    if (!newVersionFile) return toast.error('Select a file');
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', newVersionFile);
      fd.append('changeNote', changeNote);
      await documentService.uploadVersion(id, fd);
      toast.success('New version uploaded');
      setShowVersionUpload(false);
      setNewVersionFile(null);
      setChangeNote('');
      fetchDoc();
    } catch {
      toast.error('Version upload failed');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-teal-400">
        <Loader size={32} className="animate-spin" />
      </div>
    );
  }

  const isExpired = doc?.isExpired;
  const expiringWarning = !isExpired && doc?.expiryDate &&
    new Date(doc.expiryDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const tabs = ['details', 'versions', 'activity'];

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <button onClick={() => navigate('/documents/library')} className="text-slate-500 hover:text-slate-300 mt-1 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-100">{doc.name}</h1>
              {doc.isConfidential && (
                <span className="flex items-center gap-1 text-xs bg-amber-900/40 text-amber-400 border border-amber-600/30 px-2 py-0.5 rounded-full">
                  <Lock size={10} /> Confidential
                </span>
              )}
              {isExpired && (
                <span className="flex items-center gap-1 text-xs bg-red-900/40 text-red-400 border border-red-600/30 px-2 py-0.5 rounded-full">
                  <AlertTriangle size={10} /> Expired
                </span>
              )}
              {expiringWarning && (
                <span className="flex items-center gap-1 text-xs bg-amber-900/40 text-amber-400 border border-amber-600/30 px-2 py-0.5 rounded-full">
                  <Clock size={10} /> Expiring Soon
                </span>
              )}
            </div>
            <p className="text-slate-500 text-sm mt-0.5">{doc.docNumber} · {doc.originalFilename}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={handlePreview}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-700 hover:bg-teal-500/20 text-slate-300 hover:text-teal-400 text-sm transition-colors">
            <Eye size={14} /> Preview
          </button>
          <button onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium transition-colors">
            <Download size={14} /> Download
          </button>
          <button onClick={handleDelete}
            className="p-2 rounded-lg bg-slate-700 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors">
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main panel */}
        <div className="lg:col-span-2 space-y-5">
          {/* Tabs */}
          <div className="flex gap-1 bg-slate-800 border border-slate-700 rounded-xl p-1">
            {tabs.map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-colors
                  ${activeTab === tab ? 'bg-teal-500/20 text-teal-400' : 'text-slate-500 hover:text-slate-300'}`}>
                {tab}
              </button>
            ))}
          </div>

          {/* Details tab */}
          {activeTab === 'details' && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-300 text-sm">Document Information</h3>
                <button onClick={() => setEditMode(e => !e)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                    ${editMode ? 'bg-slate-700 text-slate-400' : 'bg-teal-500/20 text-teal-400 hover:bg-teal-500/30'}`}>
                  <Edit3 size={12} /> {editMode ? 'Cancel' : 'Edit'}
                </button>
              </div>

              {editMode ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Name</label>
                    <input type="text" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 focus:border-teal-500 rounded-lg text-slate-200 text-sm outline-none transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Category</label>
                    <select value={editForm.category} onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 focus:border-teal-500 rounded-lg text-slate-200 text-sm outline-none transition-colors">
                      {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Description</label>
                    <textarea value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                      rows={3} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 focus:border-teal-500 rounded-lg text-slate-200 text-sm outline-none resize-none transition-colors" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Issue Date</label>
                      <input type="date" value={editForm.issueDate} onChange={e => setEditForm(f => ({ ...f, issueDate: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 focus:border-teal-500 rounded-lg text-slate-200 text-sm outline-none transition-colors" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Expiry Date</label>
                      <input type="date" value={editForm.expiryDate} onChange={e => setEditForm(f => ({ ...f, expiryDate: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 focus:border-teal-500 rounded-lg text-slate-200 text-sm outline-none transition-colors" />
                    </div>
                  </div>
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={editForm.isConfidential} onChange={e => setEditForm(f => ({ ...f, isConfidential: e.target.checked }))}
                        className="w-4 h-4 rounded accent-teal-500" />
                      <span className="text-sm text-slate-300">Confidential</span>
                    </label>
                  </div>
                  {/* Tag edit */}
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Tags</label>
                    <div className="flex gap-2 mb-2">
                      <input type="text" value={tagInput} onChange={e => setTagInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { if (tagInput.trim() && !editForm.tags.includes(tagInput.trim())) setEditForm(f => ({ ...f, tags: [...f.tags, tagInput.trim()] })); setTagInput(''); } }}
                        placeholder="Add tag and press Enter"
                        className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 focus:border-teal-500 rounded-lg text-slate-200 text-sm outline-none transition-colors" />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {editForm.tags.map(tag => (
                        <span key={tag} className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-700 text-teal-400 rounded-full text-xs">
                          {tag}
                          <button onClick={() => setEditForm(f => ({ ...f, tags: f.tags.filter(t => t !== tag) }))}><X size={10} /></button>
                        </span>
                      ))}
                    </div>
                  </div>
                  <button onClick={handleSaveEdit}
                    className="w-full py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-sm font-semibold transition-colors">
                    Save Changes
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <MetaItem label="Category" value={CATEGORY_LABELS[doc.category] || doc.category} />
                  <MetaItem label="Language" value={doc.language?.toUpperCase()} />
                  <MetaItem label="Size" value={formatBytes(doc.sizeBytes)} />
                  <MetaItem label="Version" value={`v${doc.version}`} />
                  <MetaItem label="Downloads" value={doc.downloadCount} />
                  {doc.issueDate && <MetaItem label="Issue Date" value={new Date(doc.issueDate).toLocaleDateString()} />}
                  {doc.expiryDate && (
                    <MetaItem label="Expiry Date"
                      value={new Date(doc.expiryDate).toLocaleDateString()}
                      valueClass={isExpired ? 'text-red-400' : expiringWarning ? 'text-amber-400' : 'text-slate-200'} />
                  )}
                  <MetaItem label="Uploaded By" value={`${doc.uploadedBy?.firstName} ${doc.uploadedBy?.lastName}`} />
                  <MetaItem label="Uploaded At" value={new Date(doc.uploadedAt).toLocaleDateString()} />
                  {doc.description && (
                    <div className="col-span-2">
                      <p className="text-xs text-slate-500 mb-1">Description</p>
                      <p className="text-slate-300">{doc.description}</p>
                    </div>
                  )}
                  {doc.tags?.length > 0 && (
                    <div className="col-span-2">
                      <p className="text-xs text-slate-500 mb-1.5">Tags</p>
                      <div className="flex flex-wrap gap-1.5">
                        {doc.tags.map(t => (
                          <span key={t} className="flex items-center gap-1 text-xs bg-slate-700 text-teal-400 px-2.5 py-1 rounded-full">
                            <Tag size={9} /> {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Versions tab */}
          {activeTab === 'versions' && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-300 text-sm flex items-center gap-2">
                  <History size={14} className="text-teal-400" /> Version History
                </h3>
                <button onClick={() => setShowVersionUpload(v => !v)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-500/20 text-teal-400 hover:bg-teal-500/30 text-xs font-medium transition-colors">
                  <Plus size={12} /> New Version
                </button>
              </div>

              {showVersionUpload && (
                <div className="border border-slate-700 rounded-xl p-4 space-y-3">
                  <UploadDropzone onFilesAccepted={files => setNewVersionFile(files[0])} />
                  <input type="text" value={changeNote} onChange={e => setChangeNote(e.target.value)}
                    placeholder="Change note (optional)"
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 focus:border-teal-500 rounded-lg text-slate-200 text-sm outline-none transition-colors" />
                  <button onClick={handleNewVersionUpload} disabled={!newVersionFile || uploading}
                    className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-sm font-medium disabled:opacity-40 transition-colors">
                    {uploading ? <Loader size={14} className="animate-spin" /> : <Upload size={14} />}
                    Upload Version
                  </button>
                </div>
              )}

              <VersionHistoryTable
                versions={doc.previousVersions || []}
                currentVersion={doc.version}
                currentKey={doc.storageKey}
              />
            </div>
          )}

          {/* Activity tab */}
          {activeTab === 'activity' && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <h3 className="font-semibold text-slate-300 text-sm mb-4">Activity Log</h3>
              {actLoading ? (
                <div className="flex justify-center py-8 text-teal-400"><Loader size={24} className="animate-spin" /></div>
              ) : (
                <div className="space-y-3">
                  {activities.length === 0 && <p className="text-slate-600 text-sm">No activity recorded</p>}
                  {activities.map((act, idx) => (
                    <div key={idx} className="flex items-start gap-3 text-sm">
                      <div className="w-2 h-2 rounded-full bg-teal-500 mt-2 flex-shrink-0" />
                      <div>
                        <div className="text-slate-300">
                          <span className="font-medium">{act.performedBy?.firstName} {act.performedBy?.lastName}</span>
                          {' · '}
                          <span className="text-teal-400 capitalize">{act.action?.replace(/_/g, ' ')}</span>
                          {act.details && <span className="text-slate-500"> — {act.details}</span>}
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5">{new Date(act.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* File icon card */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 flex flex-col items-center gap-3">
            <FileTypeIcon extension={doc.extension} size="xl" />
            <div className="text-center">
              <p className="text-sm font-semibold text-slate-300">{doc.originalFilename}</p>
              <p className="text-xs text-slate-500">{formatBytes(doc.sizeBytes)}</p>
            </div>
            <div className="flex gap-2 w-full">
              <button onClick={handlePreview}
                className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-slate-700 hover:bg-teal-500/20 text-slate-300 hover:text-teal-400 text-xs transition-colors">
                <Eye size={12} /> Preview
              </button>
              <button onClick={handleDownload}
                className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-medium transition-colors">
                <Download size={12} /> Download
              </button>
            </div>
          </div>

          {/* Linked entities */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h3 className="font-semibold text-slate-300 text-sm mb-3 flex items-center gap-2">
              <CheckCircle size={13} className="text-teal-400" /> Linked To
            </h3>
            <LinkedEntityChips linkedEntities={doc.linkedEntities} readOnly />
          </div>
        </div>
      </div>

      {/* Preview panel */}
      {showPreview && (
        <DocPreviewPanel
          doc={doc}
          previewUrl={previewUrl}
          onClose={() => { setShowPreview(false); setPreviewUrl(null); }}
          onDownload={handleDownload}
        />
      )}
    </div>
  );
};

const MetaItem = ({ label, value, valueClass = 'text-slate-200' }) => (
  <div className="bg-slate-700/40 rounded-lg p-3">
    <p className="text-xs text-slate-500 mb-0.5">{label}</p>
    <p className={`font-medium text-sm ${valueClass}`}>{value || '—'}</p>
  </div>
);

export default DocumentDetail;
