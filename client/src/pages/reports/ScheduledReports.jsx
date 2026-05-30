import React, { useState } from 'react';
import { 
  Plus, 
  Play, 
  Edit2, 
  Trash2, 
  ToggleLeft, 
  ToggleRight, 
  Mail, 
  Clock, 
  AlertCircle,
  CheckCircle,
  FileSpreadsheet
} from 'lucide-react';
import { 
  useScheduledReports, 
  useReportDefinitions,
  useCreateScheduledReport, 
  useUpdateScheduledReport, 
  useDeleteScheduledReport, 
  useToggleScheduledReport,
  useRunScheduledReportNow
} from '../../hooks/useReports';
import ScheduleSlideOver from '../../components/reports/ScheduleSlideOver';
import toast from 'react-hot-toast';

const ScheduledReports = () => {
  // Queries
  const { data: schedules = [], isLoading: listLoading, refetch } = useScheduledReports();
  const { data: definitions = [] } = useReportDefinitions();

  // Mutations
  const createMutation = useCreateScheduledReport();
  const updateMutation = useUpdateScheduledReport();
  const deleteMutation = useDeleteScheduledReport();
  const toggleMutation = useToggleScheduledReport();
  const runNowMutation = useRunScheduledReportNow();

  // State
  const [isSlideOpen, setIsSlideOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);

  const handleOpenCreate = () => {
    setSelectedSchedule(null);
    setIsSlideOpen(true);
  };

  const handleOpenEdit = (schedule) => {
    setSelectedSchedule(schedule);
    setIsSlideOpen(true);
  };

  const handleSave = async (payload) => {
    try {
      if (selectedSchedule) {
        // Edit mode
        await updateMutation.mutateAsync({ id: selectedSchedule._id, ...payload });
        toast.success('Scheduled report updated.');
      } else {
        // Create mode
        await createMutation.mutateAsync(payload);
        toast.success('New report schedule created.');
      }
      setIsSlideOpen(false);
      refetch();
    } catch (err) {
      toast.error('Failed to save scheduled report.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this scheduled report email schedule?')) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Scheduled report deleted.');
      refetch();
    } catch (err) {
      toast.error('Failed to delete scheduled report.');
    }
  };

  const handleToggle = async (id) => {
    try {
      const updated = await toggleMutation.mutateAsync(id);
      toast.success(updated.isActive ? 'Schedule activated.' : 'Schedule paused.');
      refetch();
    } catch (err) {
      toast.error('Failed to toggle scheduled report.');
    }
  };

  const handleRunNow = async (id) => {
    try {
      toast.loading('Triggering report generation task...', { id: 'run-now' });
      await runNowMutation.mutateAsync(id);
      toast.success('Report run triggered! View generated files in Export History soon.', { id: 'run-now', duration: 4000 });
      refetch();
    } catch (err) {
      toast.error('Failed to trigger run.', { id: 'run-now' });
    }
  };

  const formatRecipients = (recipients) => {
    if (!recipients || recipients.length === 0) return 'No recipients';
    if (recipients.length === 1) return recipients[0].email;
    return `${recipients[0].email} (+${recipients.length - 1} more)`;
  };

  const getFormatBadge = (format) => {
    switch (format) {
      case 'xlsx':
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-emerald-50 text-emerald-700 border border-emerald-100">XLSX</span>;
      case 'pdf':
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-rose-50 text-rose-700 border border-rose-100">PDF</span>;
      case 'csv':
      default:
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-slate-50 text-slate-600 border border-slate-205">CSV</span>;
    }
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Clock className="text-teal-650" size={24} />
            <span>Scheduled Reports Automation</span>
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Configure automated aggregation jobs on a daily, weekly, or monthly cron schedule. Delivers reports to recipients via email.
          </p>
        </div>
        <div>
          <button
            onClick={handleOpenCreate}
            className="btn-primary py-2 px-3.5 text-xs font-bold flex items-center gap-1.5 shadow-teal-500/10"
          >
            <Plus size={14} />
            <span>Schedule New Report</span>
          </button>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden text-xs">
        
        {/* Table header */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-450">
            Active Automation Schedules ({schedules.length})
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-slate-805">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-150 text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">
                <th className="py-3 px-5">Schedule Name</th>
                <th className="py-3 px-5">Target Template</th>
                <th className="py-3 px-5 text-center">Frequency</th>
                <th className="py-3 px-5 text-center">Format</th>
                <th className="py-3 px-5">Recipients</th>
                <th className="py-3 px-5">Next Run Time</th>
                <th className="py-3 px-5 text-center">Status</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {listLoading ? (
                <tr>
                  <td colSpan="8" className="py-12 bg-slate-50 animate-pulse text-center font-bold text-slate-400">Loading scheduled reports...</td>
                </tr>
              ) : schedules.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400 font-semibold italic">
                    No active automation schedules configured. Click "Schedule New Report" to start.
                  </td>
                </tr>
              ) : (
                schedules.map(sched => (
                  <tr key={sched._id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="py-3.5 px-5 font-bold text-slate-700">{sched.name}</td>
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-1.5">
                        <FileSpreadsheet size={13} className="text-slate-400 shrink-0" />
                        <span className="font-semibold text-slate-600 truncate max-w-44 block">
                          {sched.reportDefinition?.name || 'Unsaved Builder'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-5 text-center">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider bg-teal-50 text-teal-700 border border-teal-100">
                        {sched.frequency}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-center">{getFormatBadge(sched.format)}</td>
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-1 text-slate-500 font-semibold" title={sched.recipients?.map(r => r.email).join(', ')}>
                        <Mail size={12} className="shrink-0" />
                        <span className="truncate max-w-48 block">{formatRecipients(sched.recipients)}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-5 font-mono font-bold text-slate-600">
                      {sched.isActive && sched.nextRunAt ? (
                        new Date(sched.nextRunAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
                      ) : (
                        <span className="text-slate-400 font-semibold italic font-sans text-[10px]">Paused</span>
                      )}
                    </td>
                    <td className="py-3.5 px-5 text-center">
                      <button
                        onClick={() => handleToggle(sched._id)}
                        className="transition-colors focus:outline-none"
                        title={sched.isActive ? 'Pause Schedule' : 'Activate Schedule'}
                      >
                        {sched.isActive ? (
                          <ToggleRight size={22} className="text-teal-650" />
                        ) : (
                          <ToggleLeft size={22} className="text-slate-350" />
                        )}
                      </button>
                    </td>
                    <td className="py-3.5 px-5 text-right shrink-0">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleRunNow(sched._id)}
                          className="p-1 border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-teal-650 rounded-lg shadow-sm transition-all"
                          title="Run Immediate Email"
                        >
                          <Play size={12} />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(sched)}
                          className="p-1 border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-teal-650 rounded-lg shadow-sm transition-all"
                          title="Edit Schedule"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          onClick={() => handleDelete(sched._id)}
                          className="p-1 border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-rose-600 rounded-lg shadow-sm transition-all"
                          title="Delete Schedule"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* Slide Over component */}
      <ScheduleSlideOver
        isOpen={isSlideOpen}
        onClose={() => setIsSlideOpen(false)}
        onSave={handleSave}
        schedule={selectedSchedule}
        reportDefinitions={definitions}
        isSaving={createMutation.isPending || updateMutation.isPending}
      />

    </div>
  );
};

export default ScheduledReports;
