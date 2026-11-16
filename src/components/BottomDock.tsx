import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Mic,
  MicOff,
  Send,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import type { AnimationState, PetMood, PetProfile } from '../types.ts';

interface BottomDockProps {
  profile: PetProfile;
  animState: AnimationState;
  collapsed: boolean;
  isSending: boolean;
  isListening: boolean;
  micSupported: boolean;
  onToggleCollapsed: () => void;
  onSendMessage: (msg: string) => void;
  onToggleListen: () => void;
  onSelectAnim: (anim: AnimationState) => void;
  onSelectMood: (mood: PetMood) => void;
  onToggleVoice: () => void;
  onToggleSfx: () => void;
  onToggleTheme: () => void;
  onResetPosition: () => void;
  onPatPet: () => void;
}

const ANIM_OPTIONS: Array<{ id: AnimationState; label: string }> = [
  { id: 'idle', label: 'Idle' },
  { id: 'happy', label: 'Happy' },
  { id: 'chasing', label: 'Chase Cursor' },
  { id: 'walking', label: 'Walk' },
  { id: 'jumping', label: 'Jump' },
  { id: 'dancing', label: 'Dance' },
  { id: 'sleeping', label: 'Sleep' },
];

const MOOD_OPTIONS: PetMood[] = ['happy', 'excited', 'curious', 'mischievous', 'sleepy', 'lonely'];

export const BottomDock: React.FC<BottomDockProps> = ({
  profile,
  animState,
  collapsed,
  isSending,
  isListening,
  micSupported,
  onToggleCollapsed,
  onSendMessage,
  onToggleListen,
  onSelectAnim,
  onSelectMood,
  onToggleVoice,
  onToggleSfx,
  onToggleTheme,
  onResetPosition,
  onPatPet,
}) => {
  const [draft, setDraft] = useState('');
  const isNight = profile.studioTheme === 'night';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || isSending) return;
    setDraft('');
    onSendMessage(trimmed);
  };

  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center w-[min(920px,94vw)] pointer-events-none"
    >
      {/* Collapse / Expand Handle */}
      <button
        type="button"
        onClick={onToggleCollapsed}
        className={`pointer-events-auto mb-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-medium shadow-sm transition-colors whitespace-nowrap shrink-0 ${
          isNight
            ? 'bg-[#191D28] border-slate-700 text-slate-300 hover:text-white'
            : 'bg-white border-stone-200 text-stone-700 hover:text-stone-950'
        }`}
      >
        {collapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        <span>{collapsed ? 'Show Controls (H)' : 'Hide Controls (H)'}</span>
      </button>

      {!collapsed && (
        <div
          className={`pointer-events-auto w-full rounded-2xl border shadow-lg p-3.5 transition-colors ${
            isNight
              ? 'bg-[#161A24]/95 border-slate-800 text-slate-100'
              : 'bg-[#FFFFFF]/95 border-stone-200 text-stone-900'
          }`}
        >
          {/* Row 1: Chat + Voice + Quick Toggles */}
          <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
            <div className="flex-1 min-w-[220px] flex items-center gap-2">
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={`Talk to ${profile.name} (or right-click pet for menu)...`}
                className={`w-full px-3.5 py-2 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-rose-500 ${
                  isNight
                    ? 'bg-[#0F1219] border-slate-700 text-slate-100 placeholder:text-slate-500'
                    : 'bg-stone-50 border-stone-200 text-stone-900 placeholder:text-stone-400'
                }`}
              />
              <button
                type="submit"
                disabled={isSending || !draft.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl bg-rose-600 text-white hover:bg-rose-500 disabled:opacity-45 transition-colors whitespace-nowrap shrink-0"
              >
                <Send className="w-4 h-4" />
                <span>{isSending ? 'Thinking...' : 'Send'}</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {micSupported && (
                <button
                  type="button"
                  onClick={onToggleListen}
                  title="Push-to-talk voice input"
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    isListening
                      ? 'bg-rose-600 border-rose-500 text-white'
                      : isNight
                        ? 'bg-[#1D2230] border-slate-700 text-slate-200 hover:border-slate-500'
                        : 'bg-stone-100 border-stone-200 text-stone-700 hover:bg-stone-200'
                  }`}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  <span>{isListening ? 'Listening' : 'Voice'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={onPatPet}
                title="Pat companion"
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  isNight
                    ? 'bg-[#1D2230] border-slate-700 text-rose-300 hover:border-rose-400'
                    : 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Pat</span>
              </button>

              <button
                type="button"
                onClick={onToggleVoice}
                aria-label="Toggle TTS voice"
                title={profile.voiceEnabled ? 'Voice TTS On' : 'Voice TTS Off'}
                className={`p-2 rounded-xl border transition-colors ${
                  isNight
                    ? 'bg-[#1D2230] border-slate-700 text-slate-200 hover:border-slate-500'
                    : 'bg-stone-100 border-stone-200 text-stone-700 hover:bg-stone-200'
                }`}
              >
                {profile.voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={onToggleSfx}
                title={profile.sfxEnabled ? 'Sound Effects On' : 'Sound Effects Off'}
                className={`px-2.5 py-2 rounded-xl border text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  profile.sfxEnabled
                    ? isNight
                      ? 'bg-[#1D2230] border-slate-700 text-slate-100'
                      : 'bg-stone-100 border-stone-200 text-stone-800'
                    : isNight
                      ? 'bg-[#12151E] border-slate-800 text-slate-500'
                      : 'bg-stone-50 border-stone-200 text-stone-400'
                }`}
              >
                SFX
              </button>

              <button
                type="button"
                onClick={onToggleTheme}
                aria-label="Toggle day or night desk studio"
                title={isNight ? 'Switch to Day Desk' : 'Switch to Cozy Night'}
                className={`p-2 rounded-xl border transition-colors ${
                  isNight
                    ? 'bg-[#1D2230] border-slate-700 text-amber-300 hover:border-slate-500'
                    : 'bg-stone-100 border-stone-200 text-stone-700 hover:bg-stone-200'
                }`}
              >
                {isNight ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={onResetPosition}
                aria-label="Center companion on desk"
                title="Re-center on desk"
                className={`p-2 rounded-xl border transition-colors ${
                  isNight
                    ? 'bg-[#1D2230] border-slate-700 text-slate-300 hover:border-slate-500'
                    : 'bg-stone-100 border-stone-200 text-stone-700 hover:bg-stone-200'
                }`}
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </form>

          {/* Row 2: Animation State Machine + Mood + Clean Tabular Stats */}
          <div className="mt-3 pt-2.5 border-t border-stone-200/70 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div
              className={`flex items-center gap-1 p-1 rounded-xl overflow-x-auto ${
                isNight ? 'bg-[#0F1219]' : 'bg-stone-100'
              }`}
            >
              {ANIM_OPTIONS.map((opt) => {
                const active = animState === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onSelectAnim(opt.id)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                      active
                        ? isNight
                          ? 'bg-[#252B3B] text-white shadow-sm'
                          : 'bg-white text-stone-900 shadow-sm'
                        : isNight
                          ? 'text-slate-400 hover:text-slate-200'
                          : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-3 text-xs tabular-nums whitespace-nowrap">
              <label className="inline-flex items-center gap-1.5">
                <span className={isNight ? 'text-slate-400' : 'text-stone-500'}>Mood</span>
                <select
                  value={profile.mood}
                  onChange={(e) => onSelectMood(e.target.value as PetMood)}
                  className={`px-2 py-1 rounded-lg border text-xs font-medium capitalize focus:outline-none ${
                    isNight
                      ? 'bg-[#0F1219] border-slate-700 text-slate-100'
                      : 'bg-stone-50 border-stone-200 text-stone-800'
                  }`}
                >
                  {MOOD_OPTIONS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </label>

              <span aria-hidden="true" className={isNight ? 'text-slate-600' : 'text-stone-300'}>·</span>
              <span className={isNight ? 'text-slate-300' : 'text-stone-600'}>
                Affection <strong className="font-semibold">{profile.affection}%</strong>
              </span>
              <span aria-hidden="true" className={isNight ? 'text-slate-600' : 'text-stone-300'}>·</span>
              <span className={isNight ? 'text-slate-300' : 'text-stone-600'}>
                Energy <strong className="font-semibold">{profile.energy}%</strong>
              </span>
              <span aria-hidden="true" className={isNight ? 'text-slate-600' : 'text-stone-300'}>·</span>
              <span className={isNight ? 'text-slate-300' : 'text-stone-600'}>
                Interactions <strong className="font-semibold">{profile.interactionCount}</strong>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
