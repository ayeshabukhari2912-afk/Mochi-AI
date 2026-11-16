import React, { useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import type { ConversationTurn, MemoryCategory, PetMemory, PetProfile } from '../types.ts';

interface MemoryPanelProps {
  profile: PetProfile;
  memories: PetMemory[];
  conversations: ConversationTurn[];
  onAddMemory: (content: string, category: MemoryCategory) => void;
  onDeleteMemory: (id: number) => void;
  onClearMemories: () => void;
  onToggleAutoSave: (val: boolean) => void;
  onClose: () => void;
}

export const MemoryPanel: React.FC<MemoryPanelProps> = ({
  profile,
  memories,
  conversations,
  onAddMemory,
  onDeleteMemory,
  onClearMemories,
  onToggleAutoSave,
  onClose,
}) => {
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<MemoryCategory>('preference');
  const isNight = profile.studioTheme === 'night';

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    onAddMemory(content.trim(), category);
    setContent('');
  };

  return (
    <aside
      className={`fixed top-16 right-4 bottom-24 z-20 w-[400px] max-w-[92vw] rounded-2xl border shadow-xl flex flex-col overflow-hidden ${
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
          <h2 className="font-display text-base font-semibold">SQLite Memory &amp; Privacy</h2>
          <p className={`text-xs ${isNight ? 'text-slate-400' : 'text-stone-500'}`}>
            {memories.length} saved facts · {conversations.length} recent turns
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close memory manager"
          className={`p-1.5 rounded-lg transition-colors ${
            isNight ? 'text-slate-400 hover:bg-slate-800' : 'text-stone-500 hover:bg-stone-100'
          }`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto studio-scroll p-5 space-y-5">
        {/* Privacy Control */}
        <label
          className={`flex items-center justify-between gap-3 p-3 rounded-xl border text-xs cursor-pointer ${
            isNight ? 'bg-[#0F1219] border-slate-800' : 'bg-stone-50 border-stone-200'
          }`}
        >
          <div>
            <div className="font-medium">Auto-save AI-detected memories</div>
            <div className={isNight ? 'text-slate-400' : 'text-stone-500'}>
              When off, {profile.name} asks for approval before storing facts
            </div>
          </div>
          <input
            type="checkbox"
            checked={profile.autoSaveMemories}
            onChange={(e) => onToggleAutoSave(e.target.checked)}
            className="w-4 h-4 accent-rose-600 shrink-0"
          />
        </label>

        {/* Add Memory */}
        <form onSubmit={handleAdd} className="space-y-2">
          <div className="flex gap-2">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as MemoryCategory)}
              className={`px-2.5 py-2 rounded-lg border text-xs font-medium ${
                isNight ? 'bg-[#0F1219] border-slate-700 text-slate-200' : 'bg-stone-50 border-stone-200 text-stone-800'
              }`}
            >
              <option value="preference">Preference</option>
              <option value="fact">Fact</option>
              <option value="milestone">Milestone</option>
            </select>
            <input
              type="text"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={`Teach ${profile.name} something to remember...`}
              className={`flex-1 px-3 py-2 rounded-lg border text-xs focus:outline-none focus:ring-2 focus:ring-rose-500 ${
                isNight ? 'bg-[#0F1219] border-slate-700 text-white' : 'bg-stone-50 border-stone-200 text-stone-900'
              }`}
            />
            <button
              type="submit"
              disabled={!content.trim()}
              className="px-3 py-2 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-500 disabled:opacity-45 transition-colors shrink-0"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </form>

        {/* Saved Memories List */}
        <section className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-stone-500 dark:text-slate-400">
              Stored Memories
            </h3>
            {memories.length > 0 && (
              <button
                type="button"
                onClick={onClearMemories}
                className="text-xs text-rose-500 hover:text-rose-400 font-medium"
              >
                Clear All
              </button>
            )}
          </div>

          {memories.length === 0 ? (
            <p className={`text-xs py-4 text-center ${isNight ? 'text-slate-500' : 'text-stone-400'}`}>
              No saved memories yet. Chat with {profile.name} or add one above.
            </p>
          ) : (
            <div className="divide-y divide-stone-200/70 dark:divide-slate-800">
              {memories.map((mem) => (
                <div key={mem.id} className="py-2.5 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className={`text-[11px] capitalize mb-0.5 ${isNight ? 'text-slate-400' : 'text-stone-500'}`}>
                      {mem.category} · {new Date(mem.createdAt).toLocaleDateString()}
                    </div>
                    <p className="text-xs leading-relaxed break-words">{mem.content}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDeleteMemory(mem.id)}
                    aria-label="Delete memory"
                    className={`p-1 rounded hover:text-rose-500 shrink-0 ${
                      isNight ? 'text-slate-500' : 'text-stone-400'
                    }`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Recent Conversation Log */}
        <section className="space-y-2 pt-4 border-t border-stone-200/70 dark:border-slate-800">
          <h3 className="text-xs font-semibold text-stone-500 dark:text-slate-400">
            Recent Conversation Log
          </h3>
          {conversations.length === 0 ? (
            <p className={`text-xs ${isNight ? 'text-slate-500' : 'text-stone-400'}`}>
              No messages yet.
            </p>
          ) : (
            <div className="space-y-2">
              {conversations.slice(-10).map((turn) => (
                <div key={turn.id} className="text-xs leading-relaxed">
                  <span className="font-semibold">
                    {turn.role === 'user' ? profile.ownerName : profile.name}:{' '}
                  </span>
                  <span className={isNight ? 'text-slate-300' : 'text-stone-700'}>{turn.message}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </aside>
  );
};
