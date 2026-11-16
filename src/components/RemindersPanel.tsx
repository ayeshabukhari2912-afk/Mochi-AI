import React, { useState } from 'react';
import { Bell, Plus, Trash2, X } from 'lucide-react';
import type { PetProfile, PetReminder, ReminderType } from '../types.ts';

interface RemindersPanelProps {
  profile: PetProfile;
  reminders: PetReminder[];
  onAddReminder: (title: string, type: ReminderType, intervalMinutes: number) => void;
  onToggleReminder: (id: number, enabled: boolean) => void;
  onDeleteReminder: (id: number) => void;
  onTriggerTestAlert: (reminder: PetReminder) => void;
  onClose: () => void;
}

export const RemindersPanel: React.FC<RemindersPanelProps> = ({
  profile,
  reminders,
  onAddReminder,
  onToggleReminder,
  onDeleteReminder,
  onTriggerTestAlert,
  onClose,
}) => {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<ReminderType>('hydration');
  const [intervalMinutes, setIntervalMinutes] = useState(30);
  const isNight = profile.studioTheme === 'night';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAddReminder(title.trim(), type, intervalMinutes);
    setTitle('');
  };

  return (
    <aside
      className={`fixed top-16 right-4 bottom-24 z-20 w-[390px] max-w-[92vw] rounded-2xl border shadow-xl flex flex-col overflow-hidden ${
        isNight
          ? 'bg-[#161A24]/95 border-slate-800 text-slate-100'
          : 'bg-white/95 border-stone-200 text-stone-900'
      }`}
    >
      <div
        className={`flex items-center justify-between px-5 py-4 border-b ${
          isNight ? 'border-slate-800' : 'border-stone-200'
        }`}
      >
        <div>
          <h2 className="font-display text-base font-semibold">Desk Reminders &amp; Care</h2>
          <p className={`text-xs ${isNight ? 'text-slate-400' : 'text-stone-500'}`}>
            {profile.name} pops up with chimes &amp; bubbles
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close reminders"
          className={`p-1.5 rounded-lg transition-colors ${
            isNight ? 'text-slate-400 hover:bg-slate-800' : 'text-stone-500 hover:bg-stone-100'
          }`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto studio-scroll p-5 space-y-5">
        <form onSubmit={handleSubmit} className="space-y-2.5">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Reminder message (e.g. Stretch wrists)..."
            className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-none focus:ring-2 focus:ring-rose-500 ${
              isNight ? 'bg-[#0F1219] border-slate-700 text-white' : 'bg-stone-50 border-stone-200 text-stone-900'
            }`}
          />
          <div className="flex items-center gap-2">
            <select
              value={type}
              onChange={(e) => setType(e.target.value as ReminderType)}
              className={`px-2.5 py-2 rounded-lg border text-xs font-medium ${
                isNight ? 'bg-[#0F1219] border-slate-700 text-slate-200' : 'bg-stone-50 border-stone-200 text-stone-800'
              }`}
            >
              <option value="hydration">Hydration</option>
              <option value="break">Eye / Stretch Break</option>
              <option value="calendar">Calendar</option>
              <option value="custom">Custom</option>
            </select>
            <label className="flex items-center gap-1.5 text-xs tabular-nums">
              <span className={isNight ? 'text-slate-400' : 'text-stone-500'}>Every</span>
              <input
                type="number"
                min={1}
                max={720}
                value={intervalMinutes}
                onChange={(e) => setIntervalMinutes(Number(e.target.value) || 30)}
                className={`w-16 px-2 py-2 rounded-lg border text-xs text-center ${
                  isNight ? 'bg-[#0F1219] border-slate-700 text-white' : 'bg-stone-50 border-stone-200 text-stone-900'
                }`}
              />
              <span className={isNight ? 'text-slate-400' : 'text-stone-500'}>min</span>
            </label>
            <button
              type="submit"
              disabled={!title.trim()}
              className="ml-auto inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-500 disabled:opacity-45 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add
            </button>
          </div>
        </form>

        <div className="divide-y divide-stone-200/70 dark:divide-slate-800">
          {reminders.map((rem) => (
            <div key={rem.id} className="py-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className={`text-[11px] capitalize tabular-nums ${isNight ? 'text-slate-400' : 'text-stone-500'}`}>
                    {rem.type} · Every {rem.intervalMinutes} min
                  </div>
                  <p className="text-xs font-medium mt-0.5">{rem.title}</p>
                </div>
                <input
                  type="checkbox"
                  checked={rem.enabled}
                  onChange={(e) => onToggleReminder(rem.id, e.target.checked)}
                  aria-label={`Toggle ${rem.title}`}
                  className="w-4 h-4 accent-rose-600 mt-1 shrink-0"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onTriggerTestAlert(rem)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md border text-[11px] font-medium transition-colors ${
                    isNight
                      ? 'bg-[#1D2230] border-slate-700 text-slate-200 hover:border-rose-400'
                      : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  <Bell className="w-3 h-3" />
                  Trigger Alert Now
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteReminder(rem.id)}
                  aria-label="Delete reminder"
                  className={`ml-auto p-1 rounded hover:text-rose-500 ${
                    isNight ? 'text-slate-500' : 'text-stone-400'
                  }`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
};
