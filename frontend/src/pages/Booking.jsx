import { useState, useEffect, useCallback } from 'react';
import {
  CalendarDaysIcon,
  ClockIcon,
  PlusIcon,
  XCircleIcon,
  ArrowPathIcon,
  TagIcon,
  MapPinIcon,
  BookmarkSquareIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../hooks/useAuth';
import { bookingService } from '../services/bookingService';
import { assetService } from '../services/assetService';
import SlidePanel from '../components/SlidePanel';
import Modal from '../components/Modal';

// Status badge styling map
const BADGE_STYLES = {
  Upcoming:  'bg-blue-900/40 text-blue-300 ring-blue-800/60',
  Ongoing:   'bg-amber-900/40 text-amber-300 ring-amber-800/60 animate-pulse',
  Completed: 'bg-emerald-900/40 text-emerald-300 ring-emerald-800/60',
  Cancelled: 'bg-slate-800 text-slate-400 ring-slate-700/60',
};

const Booking = () => {
  const { user } = useAuth();

  // Resource & Calendar states
  const [resources, setResources] = useState([]); // Bookable assets
  const [selectedResource, setSelectedResource] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [resourceBookings, setResourceBookings] = useState([]); // Bookings for selected resource

  // My Bookings lists
  const [myBookings, setMyBookings] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [timelineLoading, setTimelineLoading] = useState(false);

  // Form states
  const [panelOpen, setPanelOpen] = useState(false);
  const [formMode, setFormMode]   = useState('create'); // 'create' | 'edit'
  const [editBookingId, setEditBookingId] = useState(null);
  const [formData, setFormData]   = useState({
    date: '',
    startTime: '',
    endTime: '',
    purpose: '',
    notes: '',
  });

  // Conflict & submitting states
  const [error, setError]         = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Cancel Modal states
  const [cancelModal, setCancelModal] = useState({ open: false, booking: null });
  const [cancelling, setCancelling]   = useState(false);

  // ─── Fetch Resources ────────────────────────────────────────────────────────
  const fetchResources = useCallback(async () => {
    try {
      const { data } = await assetService.getAll({ isBookable: true, limit: 200 });
      const bookableAssets = data.data.assets.filter((a) => a.isBookable);
      setResources(bookableAssets);
      if (bookableAssets.length > 0 && !selectedResource) {
        setSelectedResource(bookableAssets[0]._id);
      }
    } catch { /* Handled */ }
  }, [selectedResource]);

  // ─── Fetch Resource Bookings (Timeline) ────────────────────────────────────
  const fetchResourceBookings = useCallback(async () => {
    if (!selectedResource) return;
    setTimelineLoading(true);
    try {
      const { data } = await bookingService.getResourceBookings(selectedResource);
      setResourceBookings(data.data.bookings);
    } catch { /* Handled */ }
    finally { setTimelineLoading(false); }
  }, [selectedResource]);

  // ─── Fetch My Bookings (Dashboard) ──────────────────────────────────────────
  const fetchMyBookings = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await bookingService.getAll();
      setMyBookings(data.data.bookings);
    } catch { /* Handled */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchResources();
    fetchMyBookings();
  }, [fetchResources, fetchMyBookings]);

  useEffect(() => {
    fetchResourceBookings();
  }, [fetchResourceBookings, selectedResource]);

  // ─── Handle Open Panel ──────────────────────────────────────────────────────
  const openCreatePanel = () => {
    setFormMode('create');
    setError('');
    setSuccessMsg('');
    setFormData({
      date: selectedDate,
      startTime: '09:00',
      endTime: '10:00',
      purpose: '',
      notes: '',
    });
    setPanelOpen(true);
  };

  const openEditPanel = (b) => {
    setFormMode('edit');
    setEditBookingId(b._id);
    setError('');
    setSuccessMsg('');

    const bDate = new Date(b.startTime).toISOString().slice(0, 10);
    const bStart = new Date(b.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    const bEnd = new Date(b.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

    setFormData({
      date: bDate,
      startTime: bStart,
      endTime: bEnd,
      purpose: b.purpose,
      notes: b.notes || '',
    });
    setPanelOpen(true);
  };

  // ─── Handle Form Submit (Book / Reschedule) ──────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!selectedResource) {
      setError('Please select a resource first.');
      return;
    }

    const startISO = new Date(`${formData.date}T${formData.startTime}`).toISOString();
    const endISO   = new Date(`${formData.date}T${formData.endTime}`).toISOString();

    if (new Date(startISO) >= new Date(endISO)) {
      setError('End time must be after start time.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        resource: selectedResource,
        startTime: startISO,
        endTime:   endISO,
        purpose:   formData.purpose,
        notes:     formData.notes,
      };

      if (formMode === 'create') {
        await bookingService.create(payload);
        setSuccessMsg('Booking confirmed successfully!');
      } else {
        await bookingService.update(editBookingId, payload);
        setSuccessMsg('Booking rescheduled successfully!');
      }

      setTimeout(() => {
        setPanelOpen(false);
        fetchMyBookings();
        fetchResourceBookings();
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to complete booking. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Handle Cancel ──────────────────────────────────────────────────────────
  const handleCancelClick = (b) => {
    setCancelModal({ open: true, booking: b });
  };

  const handleCancelConfirm = async () => {
    if (!cancelModal.booking) return;
    setCancelling(true);
    try {
      await bookingService.cancel(cancelModal.booking._id);
      setCancelModal({ open: false, booking: null });
      fetchMyBookings();
      fetchResourceBookings();
    } catch { /* Handled */ }
    finally { setCancelling(false); }
  };

  // ─── Format Helpers ─────────────────────────────────────────────────────────
  const formatTime = (isoString) => {
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (isoString) => {
    return new Date(isoString).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  };

  // Get active resource details
  const activeResource = resources.find((r) => r._id === selectedResource);

  // Generate hourly blocks for daily timeline (8:00 AM to 6:00 PM)
  const timelineHours = Array.from({ length: 11 }, (_, i) => i + 8);

  // Filter resource bookings matching the selected date
  const bookingsForSelectedDate = resourceBookings.filter((b) => {
    const bDateStr = new Date(b.startTime).toISOString().slice(0, 10);
    return bDateStr === selectedDate;
  });

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Shared Resource Scheduler</h2>
          <p className="text-sm text-slate-500 mt-1">Book common spaces, conference rooms, lab equipment, and fleet vehicles</p>
        </div>
      </div>

      {/* Grid: Left - Resource Selector & Timeline, Right - Booking Control */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timeline Panel */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-6 space-y-5">
            <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest">Resource Timeline Scheduler</p>

            {/* Selector controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500 font-semibold mb-1 block">1. Select Resource</label>
                <select
                  value={selectedResource}
                  onChange={(e) => setSelectedResource(e.target.value)}
                  className="input h-10 text-sm"
                >
                  {resources.length === 0 && <option value="">No bookable resources</option>}
                  {resources.map((r) => (
                    <option key={r._id} value={r._id}>
                      {r.name} ({r.assetTag})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 font-semibold mb-1 block">2. Select Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="input h-10 text-sm font-mono"
                />
              </div>
            </div>

            {/* Selected Resource info box */}
            {activeResource && (
              <div className="flex items-start gap-3 p-3 rounded-xl bg-surface border border-surface-border text-xs">
                <TagIcon className="w-5 h-5 text-primary-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-slate-300">{activeResource.name}</p>
                  <p className="text-slate-500">
                    Category: <span className="text-slate-400">{activeResource.category?.name}</span>
                    {activeResource.location && ` · Location: ${activeResource.location}`}
                  </p>
                </div>
              </div>
            )}

            {/* Daily Timeline */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">Daily Schedule ({formatDate(selectedDate)})</span>
                {isManager && selectedResource && (
                  <button onClick={openCreatePanel} className="btn-primary py-1 px-3 text-xs gap-1">
                    <PlusIcon className="w-3.5 h-3.5" /> Book Slot
                  </button>
                )}
              </div>

              {timelineLoading ? (
                <div className="flex items-center justify-center h-48 border border-surface-border rounded-2xl bg-surface/20">
                  <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="border border-surface-border rounded-2xl bg-surface/20 overflow-hidden divide-y divide-surface-border">
                  {timelineHours.map((hour) => {
                    const timeLabel = `${String(hour).padStart(2, '0')}:00`;
                    // Check if any booking falls on this hour block
                    const hourlyBookings = bookingsForSelectedDate.filter((b) => {
                      const bStart = new Date(b.startTime);
                      const bEnd   = new Date(b.endTime);
                      const currentHourStart = new Date(`${selectedDate}T${String(hour).padStart(2, '0')}:00`);
                      const currentHourEnd   = new Date(`${selectedDate}T${String(hour + 1).padStart(2, '0')}:00`);
                      return bStart < currentHourEnd && bEnd > currentHourStart;
                    });

                    return (
                      <div key={hour} className="flex min-h-[50px] relative group hover:bg-white/[0.01] transition-colors">
                        {/* Hour Label */}
                        <div className="w-16 border-r border-surface-border px-3 py-3 text-xs font-mono text-slate-500 shrink-0 select-none">
                          {timeLabel}
                        </div>
                        {/* Hour slots display */}
                        <div className="flex-1 flex flex-col justify-center p-2 relative gap-1">
                          {hourlyBookings.length === 0 ? (
                            <span className="text-[10px] text-slate-600 pl-2 italic">Available</span>
                          ) : (
                            hourlyBookings.map((b) => (
                              <div
                                key={b._id}
                                className="bg-primary-950/40 border border-primary-800/40 rounded-lg py-1 px-2.5 text-left shadow-sm flex items-center justify-between gap-2"
                              >
                                <div>
                                  <p className="text-xs font-semibold text-slate-300">{b.purpose}</p>
                                  <p className="text-[10px] text-slate-500 mt-0.5">
                                    Reserved by <span className="text-slate-400 font-medium">{b.bookedBy?.name}</span> ({formatTime(b.startTime)} - {formatTime(b.endTime)})
                                  </p>
                                </div>
                                <span className="text-[9px] bg-primary-900/50 border border-primary-800 text-primary-400 font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                                  Reserved
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* My Bookings Table */}
        <div className="space-y-4">
          <div className="card p-6 space-y-4">
            <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest">My Scheduler Dashboard</p>
            {!selectedResource && (
              <p className="text-xs text-slate-500">Please register shared resources to enable booking.</p>
            )}
            {selectedResource && (
              <button onClick={openCreatePanel} className="btn-primary w-full gap-1.5 py-2.5 shadow-lg shadow-primary-900/40">
                <CalendarDaysIcon className="w-5 h-5" /> Book a Resource
              </button>
            )}
            <div className="pt-2 border-t border-surface-border space-y-1">
              <p className="text-[10px] text-slate-500 font-semibold uppercase">Booking policy info</p>
              <ul className="text-[10px] text-slate-500 list-disc pl-4 space-y-1 leading-relaxed">
                <li>No overlapping bookings allowed for the same resource.</li>
                <li>Back-to-back bookings (e.g. 10:00-11:00 and 11:00-12:00) are allowed.</li>
                <li>Status shifts from <span className="text-blue-400 font-medium">Upcoming</span> → <span className="text-amber-400 font-medium">Ongoing</span> → <span className="text-emerald-400 font-medium">Completed</span> dynamically.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Grid bottom: My Bookings Dashboard */}
      <div className="card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-surface-border">
          <p className="text-sm font-semibold text-slate-200">My Booking History & Reschedules</p>
        </div>
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : myBookings.length === 0 ? (
          <p className="text-center text-slate-500 text-sm py-12">You have not created any bookings yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-surface-border text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Resource</th>
                  <th className="px-6 py-4">Date & Time Slot</th>
                  <th className="px-6 py-4">Purpose</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {myBookings.map((b) => {
                  const cancelable = ['Upcoming', 'Ongoing'].includes(b.status);
                  return (
                    <tr key={b._id} className="hover:bg-white/[0.01]">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-200">{b.resource?.name || 'Deleted Resource'}</p>
                        <p className="text-xs text-slate-500 font-mono mt-0.5">{b.resource?.assetTag || '—'}</p>
                      </td>
                      <td className="px-6 py-4 text-slate-400">
                        <p className="font-medium text-slate-300">{formatDate(b.startTime)}</p>
                        <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                          <ClockIcon className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                          {formatTime(b.startTime)} - {formatTime(b.endTime)}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-slate-300 font-medium">{b.purpose}</p>
                        {b.notes && (
                          <p className="text-xs text-slate-500 mt-0.5 max-w-xs truncate flex items-center gap-1">
                            <ChatBubbleLeftRightIcon className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                            {b.notes}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${BADGE_STYLES[b.status] || BADGE_STYLES.Upcoming}`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {cancelable ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => openEditPanel(b)}
                              className="btn-ghost border border-primary-900 text-primary-400 hover:bg-primary-900/20 text-xs py-1 px-2.5 rounded-lg"
                            >
                              Reschedule
                            </button>
                            <button
                              onClick={() => handleCancelClick(b)}
                              className="btn-ghost border border-red-950 text-red-400 hover:bg-red-950/20 text-xs py-1 px-2.5 rounded-lg"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-600 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Booking Form SlidePanel */}
      <SlidePanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        title={formMode === 'create' ? 'Book Resource' : 'Reschedule Booking'}
        subtitle={activeResource ? `${activeResource.name} (${activeResource.assetTag})` : undefined}
        width="max-w-md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="text-xs text-red-400 bg-red-900/20 border border-red-800/50 rounded-lg p-3 leading-relaxed">
              {error}
            </div>
          )}
          {successMsg && (
            <div className="text-xs text-emerald-400 bg-emerald-900/20 border border-emerald-800/50 rounded-lg p-3">
              {successMsg}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-400">Date</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData((f) => ({ ...f, date: e.target.value }))}
              className="input text-sm font-mono"
              required
              disabled={submitting}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400">Start Time</label>
              <input
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData((f) => ({ ...f, startTime: e.target.value }))}
                className="input text-sm font-mono"
                required
                disabled={submitting}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400">End Time</label>
              <input
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData((f) => ({ ...f, endTime: e.target.value }))}
                className="input text-sm font-mono"
                required
                disabled={submitting}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-400">Purpose</label>
            <input
              type="text"
              value={formData.purpose}
              onChange={(e) => setFormData((f) => ({ ...f, purpose: e.target.value }))}
              placeholder="e.g. Weekly Standup, Project sync..."
              className="input text-sm"
              required
              disabled={submitting}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-400">Notes (Optional)</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData((f) => ({ ...f, notes: e.target.value }))}
              rows={3}
              placeholder="e.g. Need HDMI adapter, room setup etc."
              className="input text-sm resize-none"
              disabled={submitting}
            />
          </div>

          <div className="flex gap-3 pt-4 border-t border-surface-border">
            <button type="submit" disabled={submitting} className="btn-primary flex-1">
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Confirming...
                </span>
              ) : formMode === 'create' ? (
                'Book Time Slot'
              ) : (
                'Confirm Reschedule'
              )}
            </button>
            <button type="button" onClick={() => setPanelOpen(false)} className="btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      </SlidePanel>

      {/* Cancel Confirmation Modal */}
      <Modal
        open={cancelModal.open}
        onClose={() => setCancelModal({ open: false, booking: null })}
        onConfirm={handleCancelConfirm}
        title="Cancel Booking"
        message={
          <span>
            Are you sure you want to cancel the booking for{' '}
            <span className="font-semibold text-slate-200">{cancelModal.booking?.resource?.name}</span>?
            <br />
            Time: {cancelModal.booking && formatDate(cancelModal.booking.startTime)} (
            {cancelModal.booking && formatTime(cancelModal.booking.startTime)} -{' '}
            {cancelModal.booking && formatTime(cancelModal.booking.endTime)})
          </span>
        }
        confirmText="Yes, Cancel Booking"
        variant="danger"
        loading={cancelling}
      />
    </div>
  );
};

export default Booking;
