import React, { useState } from 'react';

const actionIcons = {
  created: '🆕',
  updated: '✏️',
  confirmed: '✅',
  processing: '⚙️',
  ready_to_ship: '📦',
  dispatch_created: '🚚',
  invoice_created: '📄',
  invoice_sent: '📨',
  payment_added: '💰',
  cancelled: '❌',
  returned: '⏪',
  note_added: '📝',
  delivered: '🏁',
  credit_warning: '⚠️'
};

const OrderTimelineLog = ({ timeline = [], onAddNote }) => {
  const [newNote, setNewNote] = useState('');

  const handleSubmitNote = (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    onAddNote(newNote);
    setNewNote('');
  };

  // Sort timeline by date descending (latest first)
  const sortedTimeline = [...timeline].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return (
    <div className="space-y-6">
      {/* Note Form */}
      {onAddNote && (
        <form onSubmit={handleSubmitNote} className="flex gap-2">
          <input
            type="text"
            placeholder="Add a comment or internal note to the timeline..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
          <button
            type="submit"
            className="bg-slate-800 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-slate-700 transition"
          >
            Comment
          </button>
        </form>
      )}

      {/* Timeline List */}
      <div className="flow-root">
        <ul className="-mb-8">
          {sortedTimeline.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">No activity logged.</p>
          ) : (
            sortedTimeline.map((event, idx) => (
              <li key={event._id || idx}>
                <div className="relative pb-8">
                  {idx !== sortedTimeline.length - 1 ? (
                    <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-slate-200" aria-hidden="true" />
                  ) : null}
                  <div className="relative flex space-x-3">
                    <div>
                      <span className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center ring-8 ring-white text-sm">
                        {actionIcons[event.action] || '🔹'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0 pt-1.5 flex justify-between space-x-4">
                      <div>
                        <p className="text-sm text-slate-800 font-semibold">{event.details}</p>
                        {event.note && (
                          <p className="mt-1 text-sm text-slate-600 bg-slate-50 rounded-lg p-2 border border-slate-100 italic">
                            "{event.note}"
                          </p>
                        )}
                        <p className="mt-1 text-xs text-slate-400">
                          Performed by {event.performedBy?.name || 'System'}
                        </p>
                      </div>
                      <div className="text-right text-xs whitespace-nowrap text-slate-400">
                        {new Date(event.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
};

export default OrderTimelineLog;
