import React, { useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import type { PersonalityArchetype, PetProfile } from '../types.ts';

interface AdoptionModalProps {
  profile: PetProfile;
  onComplete: (patch: Partial<PetProfile>) => void;
  onClose: () => void;
}

const ARCHETYPES: Array<{ id: PersonalityArchetype; title: string; summary: string }> = [
  { id: 'playful', title: 'Playful', summary: 'Bouncy, affectionate, loves games and head pats.' },
  { id: 'calm', title: 'Calm', summary: 'Soothing, mindful presence for deep focus.' },
  { id: 'tsundere', title: 'Tsundere', summary: 'Flustered and proud outside, secretly devoted.' },
  { id: 'scholarly', title: 'Scholarly', summary: 'Curious thinker who enjoys facts and notes.' },
  { id: 'energetic', title: 'Energetic', summary: 'Upbeat cheerleader ready to dance anytime.' },
];

const STARTER_PALETTES = [
  { label: 'Sakura Mochi', primary: '#FAF5F0', secondary: '#F6C2D0', aura: '#F9A8D4' },
  { label: 'Matcha Cream', primary: '#F3F7EE', secondary: '#A3C99A', aura: '#86EFAC' },
  { label: 'Starlight Cloud', primary: '#EEF2FF', secondary: '#93C5FD', aura: '#7DD3FC' },
  { label: 'Honey Oat', primary: '#FFF9EC', secondary: '#F5C77E', aura: '#FDE68A' },
];

export const AdoptionModal: React.FC<AdoptionModalProps> = ({
  profile,
  onComplete,
  onClose,
}) => {
  const [name, setName] = useState(profile.name);
  const [nickname, setNickname] = useState(profile.nickname);
  const [ownerName, setOwnerName] = useState(profile.ownerName);
  const [archetype, setArchetype] = useState<PersonalityArchetype>(profile.archetype);
  const [paletteIdx, setPaletteIdx] = useState(0);
  const isNight = profile.studioTheme === 'night';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const chosen = STARTER_PALETTES[paletteIdx];
    onComplete({
      name: name.trim() || 'Mochi',
      nickname: nickname.trim() || 'Little Cloud',
      ownerName: ownerName.trim() || 'Friend',
      archetype,
      primaryColor: chosen.primary,
      secondaryColor: chosen.secondary,
      auraColor: chosen.aura,
      onboardingComplete: true,
      adoptedAt: new Date().toISOString(),
      mood: 'excited',
    });
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/45">
      <div
        className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden ${
          isNight
            ? 'bg-[#161A24] border-slate-700 text-slate-100'
            : 'bg-white border-stone-200 text-stone-900'
        }`}
      >
        <div
          className={`flex items-center justify-between px-6 py-4 border-b ${
            isNight ? 'border-slate-800' : 'border-stone-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-rose-500" />
            <h2 className="font-display text-lg font-semibold">Adoption &amp; Naming Ceremony</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close adoption ceremony"
            className={`p-1.5 rounded-lg ${
              isNight ? 'text-slate-400 hover:bg-slate-800' : 'text-stone-500 hover:bg-stone-100'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block text-xs">
              <span className={`block mb-1 font-medium ${isNight ? 'text-slate-300' : 'text-stone-700'}`}>
                Companion Name
              </span>
              <input
                type="text"
                value={name}
                maxLength={24}
                onChange={(e) => setName(e.target.value)}
                required
                className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 ${
                  isNight ? 'bg-[#0F1219] border-slate-700 text-white' : 'bg-stone-50 border-stone-200 text-stone-900'
                }`}
              />
            </label>
            <label className="block text-xs">
              <span className={`block mb-1 font-medium ${isNight ? 'text-slate-300' : 'text-stone-700'}`}>
                Your Name
              </span>
              <input
                type="text"
                value={ownerName}
                maxLength={24}
                onChange={(e) => setOwnerName(e.target.value)}
                required
                className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 ${
                  isNight ? 'bg-[#0F1219] border-slate-700 text-white' : 'bg-stone-50 border-stone-200 text-stone-900'
                }`}
              />
            </label>
          </div>

          <label className="block text-xs">
            <span className={`block mb-1 font-medium ${isNight ? 'text-slate-300' : 'text-stone-700'}`}>
              Affectionate Nickname
            </span>
            <input
              type="text"
              value={nickname}
              maxLength={28}
              onChange={(e) => setNickname(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 ${
                isNight ? 'bg-[#0F1219] border-slate-700 text-white' : 'bg-stone-50 border-stone-200 text-stone-900'
              }`}
            />
          </label>

          <div className="space-y-2">
            <span className={`block text-xs font-medium ${isNight ? 'text-slate-300' : 'text-stone-700'}`}>
              Personality Archetype
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ARCHETYPES.map((item) => {
                const active = archetype === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setArchetype(item.id)}
                    className={`p-2.5 rounded-xl border text-left transition-colors ${
                      active
                        ? 'border-rose-500 bg-rose-500/10'
                        : isNight
                          ? 'border-slate-800 bg-[#0F1219] hover:border-slate-600'
                          : 'border-stone-200 bg-stone-50 hover:border-stone-300'
                    }`}
                  >
                    <div className="text-xs font-semibold">{item.title}</div>
                    <div className={`text-[11px] mt-0.5 ${isNight ? 'text-slate-400' : 'text-stone-500'}`}>
                      {item.summary}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <span className={`block text-xs font-medium ${isNight ? 'text-slate-300' : 'text-stone-700'}`}>
              Starter Coat Palette
            </span>
            <div className="flex flex-wrap gap-2">
              {STARTER_PALETTES.map((p, idx) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setPaletteIdx(idx)}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                    paletteIdx === idx
                      ? 'border-rose-500 bg-rose-500/10'
                      : isNight
                        ? 'border-slate-800 bg-[#0F1219]'
                        : 'border-stone-200 bg-stone-50'
                  }`}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-black/15"
                    style={{ background: `linear-gradient(135deg, ${p.primary}, ${p.secondary})` }}
                  />
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-lg text-xs font-medium ${
                isNight ? 'text-slate-300 hover:bg-slate-800' : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-500 transition-colors"
            >
              Complete Adoption
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
