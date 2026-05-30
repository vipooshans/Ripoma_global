import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  FileText, 
  Star, 
  Trash2, 
  Edit2, 
  Play, 
  Plus, 
  Sparkles, 
  CheckCircle,
  Clock
} from 'lucide-react';
import { 
  useReportDefinitions, 
  useCreateReportDefinition, 
  useUpdateReportDefinition, 
  useDeleteReportDefinition, 
  useRunReportDefinition,
  useToggleFavouriteReport
} from '../../hooks/useReports';
import ReportBuilderPanel from '../../components/reports/ReportBuilderPanel';
import ReportDataTable from '../../components/reports/ReportDataTable';
import ExportButtonGroup from '../../components/reports/ExportButtonGroup';
import toast from 'react-hot-toast';

const ReportBuilder = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const editId = searchParams.get('editId');

  // React Query Hooks
  const { data: definitions = [], isLoading: listLoading, refetch } = useReportDefinitions();
  const createMutation = useCreateReportDefinition();
  const updateMutation = useUpdateReportDefinition();
  const deleteMutation = useDeleteReportDefinition();
  const runMutation = useRunReportDefinition();
  const favMutation = useToggleFavouriteReport();

  // Local State
  const [selectedDefinition, setSelectedDefinition] = useState(null);
  const [runResult, setRunResult] = useState(null);
  const [isRunning, setIsRunning] = useState(false);

  // Sync editId from URL to selected definition
  useEffect(() => {
    if (editId && definitions.length > 0) {
      const found = definitions.find(d => d._id === editId);
      if (found) {
        setSelectedDefinition(found);
      }
    } else if (!editId) {
      setSelectedDefinition(null);
    }
  }, [editId, definitions]);

  const handleSave = async (payload) => {
    try {
      if (selectedDefinition) {
        // Update existing
        await updateMutation.mutateAsync({ id: selectedDefinition._id, ...payload });
        toast.success('Report definition updated successfully.');
      } else {
        // Create new
        const newDef = await createMutation.mutateAsync(payload);
        setSearchParams({ editId: newDef._id });
        toast.success('New report template saved.');
      }
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save report definition.');
    }
  };

  const handleRun = async (payload) => {
    try {
      setIsRunning(true);
      let targetId = selectedDefinition?._id;

      if (!targetId) {
        // Save first if it's new
        const saved = await createMutation.mutateAsync(payload);
        targetId = saved._id;
        setSearchParams({ editId: saved._id });
        refetch();
      } else {
        // Update modifications first
        await updateMutation.mutateAsync({ id: targetId, ...payload });
      }

      toast.loading('Running aggregation pipeline...', { id: 'run-report' });
      
      const result = await runMutation.mutateAsync({
        id: targetId,
        dateFrom: payload.config.dateFrom,
        dateTo: payload.config.dateTo
      });

      setRunResult({
        columns: result.columns,
        data: result.data,
        name: payload.name,
        type: payload.type,
        exportId: result.exportId
      });

      toast.success('Report generated successfully!', { id: 'run-report' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to run report pipeline.', { id: 'run-report' });
    } finally {
      setIsRunning(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this report template? All scheduled jobs for this report will be deleted.')) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Report definition deleted.');
      if (editId === id) {
        setSearchParams({});
      }
      refetch();
    } catch (err) {
      toast.error('Failed to delete report.');
    }
  };

  const handleToggleFav = async (id, e) => {
    e.stopPropagation();
    try {
      await favMutation.mutateAsync(id);
      toast.success('Favorites updated.');
      refetch();
    } catch (err) {
      toast.error('Failed to update favorites status.');
    }
  };

  const startNew = () => {
    setSearchParams({});
    setSelectedDefinition(null);
    setRunResult(null);
  };

  return (
    <div className="space-y-6">
      
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Sparkles className="text-teal-650" size={24} />
            <span>Custom Report Builder</span>
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Configure custom data schemas, filters, and metrics parameters. Save templates for recurring automation schedules.
          </p>
        </div>
        <div>
          <button
            onClick={startNew}
            className="btn-secondary py-2 px-3.5 text-xs font-bold flex items-center gap-1.5 border-slate-300 bg-white"
          >
            <Plus size={14} />
            <span>Create New Template</span>
          </button>
        </div>
      </div>

      {/* Main Builder Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Existing Saved Definitions */}
        <div className="lg:col-span-4 space-y-4">
          <div className="px-1">
            <h3 className="font-extrabold text-slate-805 text-sm flex items-center gap-1.5">
              <FileText size={16} className="text-teal-650" />
              <span>Saved Templates ({definitions.length})</span>
            </h3>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden font-sans">
            <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
              {listLoading ? (
                [...Array(4)].map((_, i) => (
                  <div key={i} className="p-4 animate-pulse h-16 bg-slate-50/20" />
                ))
              ) : definitions.length === 0 ? (
                <div className="p-8 text-center text-slate-400 font-semibold italic text-xs leading-relaxed">
                  No saved templates found. Create your first template on the right panel.
                </div>
              ) : (
                definitions.map(item => {
                  const isActive = editId === item._id;
                  return (
                    <div 
                      key={item._id} 
                      onClick={() => setSearchParams({ editId: item._id })}
                      className={`p-4 hover:bg-slate-50 transition-colors flex items-start justify-between gap-3 cursor-pointer ${
                        isActive ? 'bg-slate-50 border-l-[3.5px] border-teal-650 pl-3.5' : ''
                      }`}
                    >
                      <div className="truncate">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-700 text-xs truncate">{item.name}</span>
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase bg-slate-100 text-slate-500 border border-slate-205">
                            {item.type}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">{item.description || 'No description provided.'}</p>
                        <span className="text-[8px] text-slate-400 font-extrabold font-mono uppercase tracking-wider block mt-1">
                          Ref: {item.reportId}
                        </span>
                      </div>
                      
                      {/* Action buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={(e) => handleToggleFav(item._id, e)}
                          className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-amber-500 transition-colors"
                          title="Toggle Star"
                        >
                          <Star size={13} className={item.isFavourite ? 'text-amber-500 fill-amber-500' : ''} />
                        </button>
                        <button
                          onClick={(e) => handleDelete(item._id, e)}
                          className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-rose-600 transition-colors"
                          title="Delete Template"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Builder Editor Panel */}
        <div className="lg:col-span-8">
          <ReportBuilderPanel
            definition={selectedDefinition}
            onSave={handleSave}
            onRun={handleRun}
            isSaving={createMutation.isPending || updateMutation.isPending}
            isRunning={isRunning}
          />
        </div>

      </div>

      {/* Report Data Results Sheet Section */}
      {runResult && (
        <div className="space-y-4 pt-4 border-t border-slate-150 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 text-emerald-650 border border-emerald-100 rounded-xl">
                <CheckCircle size={20} />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-805 text-sm">Query Results Summary</h3>
                <p className="text-[10px] text-slate-455">
                  Generated ad-hoc data sheet for {runResult.name}.
                </p>
              </div>
            </div>
            
            <ExportButtonGroup
              name={runResult.name}
              type={runResult.type}
              columns={runResult.columns}
              data={runResult.data}
            />
          </div>

          <ReportDataTable
            columns={runResult.columns}
            data={runResult.data}
          />
        </div>
      )}

    </div>
  );
};

export default ReportBuilder;
