import React from 'react';

export type ActiveTab = 'companion' | 'designer' | 'memory' | 'reminders' | 'python';

interface TopBarProps {
  petName: string;
  activeTab: ActiveTab;
  isNight: boolean;
  onSelectTab: (tab: ActiveTab) => void;
  onOpenAdoption: () => void;
}

const NAV_ITEMS: Array<{ id: ActiveTab; label: string }> = [
  { id: 'companion', label: 'Companion' },
  { id: 'designer', label: 'Designer' },
  { id: 'memory', label: 'Memory' },
  { id: 'reminders', label: 'Reminders' },
  { id: 'python', label: 'Desktop Code' },
];

export const TopBar: React.FC<TopBarProps> = ({
  petName,
  activeTab,
  isNight,
  onSelectTab,
  onOpenAdoption,
}) => {
  return (
    <header
      className={`fixed top-0 left-0 right-0 z-20 flex items-center justify-between gap-8 px-6 py-3.5 border-b transition-colors ${
        isNight
          ? 'bg-[#141720]/95 border-slate-800 text-slate-100'
          : 'bg-[#FAF8F5]/95 border-stone-200 text-stone-900'
      }`}
    >
      {/* Zone 1: Single text element wordmark */}
      <button
        type="button"
        onClick={() => onSelectTab('companion')}
        className="font-display text-lg font-bold tracking-tight whitespace-nowrap shrink-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 rounded"
      >
        {petName} AI
      </button>

      {/* Zone 2: Clean single-line text navigation links */}
      <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
        {NAV_ITEMS.map((item) => {
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`py-1 whitespace-nowrap shrink-0 transition-colors border-b-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 ${
                active
                  ? isNight
                    ? 'border-rose-400 text-white'
                    : 'border-rose-600 text-stone-950'
                  : isNight
                    ? 'border-transparent text-slate-400 hover:text-slate-100'
                    : 'border-transparent text-stone-600 hover:text-stone-900'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Zone 3: 1 primary action */}
      <div className="flex items-center shrink-0">
        <button
          type="button"
          onClick={onOpenAdoption}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 ${
            isNight
              ? 'bg-rose-500 text-white hover:bg-rose-400'
              : 'bg-stone-900 text-white hover:bg-stone-800'
          }`}
        >
          Adopt &amp; Rename
        </button>
      </div>
    </header>
  );
};
