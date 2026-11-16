import React from 'react';
import { X } from 'lucide-react';
import type {
  AccessoryId,
  EyeStyle,
  NameplateMode,
  PersonalityArchetype,
  PetProfile,
} from '../types.ts';

interface DesignerPanelProps {
  profile: PetProfile;
  onUpdate: (patch: Partial<PetProfile>) => void;
  onClose: () => void;
}

const COLOR_PRESETS = [
  {
    label: 'Sakura Mochi',
    primary: '#FAF5F0',
    secondary: '#F6C2D0',
    eye: '#2F2638',
    aura: '#F9A8D4',
  },
  {
    label: 'Matcha Cream',
    primary: '#F3F7EE',
    secondary: '#A3C99A',
    eye: '#243326',
    aura: '#86EFAC',
  },
  {
    label: 'Starlight Cloud',
    primary: '#EEF2FF',
    secondary: '#93C5FD',
    eye: '#1E293B',
    aura: '#7DD3FC',
  },
  {
    label: 'Cosmic Berry',
    primary: '#F5EFFF',
    secondary: '#C084FC',
    eye: '#2E1065',
    aura: '#D8B4FE',
  },
  {
    label: 'Honey Oat',
    primary: '#FFF9EC',
    secondary: '#F5C77E',
    eye: '#3D2C1E',
    aura: '#FDE68A',
  },
];

const ARCHETYPES: Array<{ id: PersonalityArchetype; label: string }> = [
  { id: 'playful', label: 'Playful' },
  { id: 'calm', label: 'Calm' },
  { id: 'tsundere', label: 'Tsundere' },
  { id: 'scholarly', label: 'Scholarly' },
  { id: 'energetic', label: 'Energetic' },
];

const EYE_STYLES: Array<{ id: EyeStyle; label: string }> = [
  { id: 'anime', label: 'Anime Gloss' },
  { id: 'sparkle', label: 'Sparkle Oval' },
  { id: 'star', label: 'Star Pupil' },
  { id: 'sleepy', label: 'Sleepy Arc' },
];

const ACCESSORIES: Array<{ id: AccessoryId; label: string }> = [
  { id: 'cat_ears', label: 'Cat Ears' },
  { id: 'bunny_ears', label: 'Bunny Ears' },
  { id: 'antenna', label: 'Glow Antenna' },
  { id: 'wings', label: 'Tiny Wings' },
  { id: 'halo', label: 'Floating Halo' },
  { id: 'beret', label: 'Artist Beret' },
];

export const DesignerPanel: React.FC<DesignerPanelProps> = ({
  profile,
  onUpdate,
  onClose,
}) => {
  const isNight = profile.studioTheme === 'night';

  const toggleAccessory = (id: AccessoryId) => {
    const exists = profile.accessories.includes(id);
    const next = exists
      ? profile.accessories.filter((a) => a !== id)
      : [...profile.accessories, id];
    onUpdate({ accessories: next });
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
          <h2 className="font-display text-base font-semibold">Companion Designer</h2>
          <p className={`text-xs ${isNight ? 'text-slate-400' : 'text-stone-500'}`}>
            Live 3D appearance &amp; personality studio
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close designer"
          className={`p-1.5 rounded-lg transition-colors ${
            isNight ? 'text-slate-400 hover:bg-slate-800' : 'text-stone-500 hover:bg-stone-100'
          }`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto studio-scroll p-5 space-y-6">
        {/* Identity */}
        <section className="space-y-3">
          <h3 className="text-xs font-semibold tracking-wide text-stone-500 dark:text-slate-400">
            Identity &amp; Archetype
          </h3>
          <div className="grid grid-cols-2 gap-2.5">
            <label className="block text-xs">
              <span className={`block mb-1 ${isNight ? 'text-slate-300' : 'text-stone-600'}`}>Pet Name</span>
              <input
                type="text"
                value={profile.name}
                maxLength={24}
                onChange={(e) => onUpdate({ name: e.target.value })}
                className={`w-full px-3 py-1.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 ${
                  isNight ? 'bg-[#0F1219] border-slate-700 text-white' : 'bg-stone-50 border-stone-200 text-stone-900'
                }`}
              />
            </label>
            <label className="block text-xs">
              <span className={`block mb-1 ${isNight ? 'text-slate-300' : 'text-stone-600'}`}>Nickname</span>
              <input
                type="text"
                value={profile.nickname}
                maxLength={28}
                onChange={(e) => onUpdate({ nickname: e.target.value })}
                className={`w-full px-3 py-1.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 ${
                  isNight ? 'bg-[#0F1219] border-slate-700 text-white' : 'bg-stone-50 border-stone-200 text-stone-900'
                }`}
              />
            </label>
          </div>
          <label className="block text-xs">
            <span className={`block mb-1 ${isNight ? 'text-slate-300' : 'text-stone-600'}`}>Your Name (Owner)</span>
            <input
              type="text"
              value={profile.ownerName}
              maxLength={24}
              onChange={(e) => onUpdate({ ownerName: e.target.value })}
              className={`w-full px-3 py-1.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 ${
                isNight ? 'bg-[#0F1219] border-slate-700 text-white' : 'bg-stone-50 border-stone-200 text-stone-900'
              }`}
            />
          </label>
          <div className="flex flex-wrap gap-1.5">
            {ARCHETYPES.map((arch) => {
              const active = profile.archetype === arch.id;
              return (
                <button
                  key={arch.id}
                  type="button"
                  onClick={() => onUpdate({ archetype: arch.id })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    active
                      ? 'bg-rose-600 border-rose-600 text-white'
                      : isNight
                        ? 'bg-[#1D2230] border-slate-700 text-slate-300 hover:border-slate-500'
                        : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  {arch.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* Color Palette */}
        <section className="space-y-3 pt-4 border-t border-stone-200/70 dark:border-slate-800">
          <h3 className="text-xs font-semibold tracking-wide text-stone-500 dark:text-slate-400">
            Palette &amp; Gradients
          </h3>
          <div className="flex flex-wrap gap-2">
            {COLOR_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() =>
                  onUpdate({
                    primaryColor: preset.primary,
                    secondaryColor: preset.secondary,
                    eyeColor: preset.eye,
                    auraColor: preset.aura,
                  })
                }
                className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                  isNight
                    ? 'bg-[#1D2230] border-slate-700 text-slate-200 hover:border-slate-500'
                    : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                }`}
              >
                <span
                  className="w-3.5 h-3.5 rounded-full border border-black/15 shrink-0"
                  style={{
                    background: `linear-gradient(135deg, ${preset.primary} 45%, ${preset.secondary} 100%)`,
                  }}
                />
                <span>{preset.label}</span>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            {[
              { label: 'Primary', key: 'primaryColor' as const, val: profile.primaryColor },
              { label: 'Secondary', key: 'secondaryColor' as const, val: profile.secondaryColor },
              { label: 'Eye Iris', key: 'eyeColor' as const, val: profile.eyeColor },
              { label: 'Aura Glow', key: 'auraColor' as const, val: profile.auraColor },
            ].map((item) => (
              <label
                key={item.key}
                className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs ${
                  isNight ? 'bg-[#0F1219] border-slate-700' : 'bg-stone-50 border-stone-200'
                }`}
              >
                <span>{item.label}</span>
                <input
                  type="color"
                  value={item.val}
                  onChange={(e) => onUpdate({ [item.key]: e.target.value })}
                  className="w-6 h-6 rounded border-0 bg-transparent cursor-pointer"
                />
              </label>
            ))}
          </div>
        </section>

        {/* Eyes & Blush */}
        <section className="space-y-3 pt-4 border-t border-stone-200/70 dark:border-slate-800">
          <h3 className="text-xs font-semibold tracking-wide text-stone-500 dark:text-slate-400">
            Eyes &amp; Cheeks
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {EYE_STYLES.map((eye) => {
              const active = profile.eyeStyle === eye.id;
              return (
                <button
                  key={eye.id}
                  type="button"
                  onClick={() => onUpdate({ eyeStyle: eye.id })}
                  className={`px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
                    active
                      ? 'bg-rose-600 border-rose-600 text-white'
                      : isNight
                        ? 'bg-[#1D2230] border-slate-700 text-slate-300 hover:border-slate-500'
                        : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  {eye.label}
                </button>
              );
            })}
          </div>
          <label className="block text-xs space-y-1.5">
            <div className="flex justify-between tabular-nums">
              <span>Cheek Blush</span>
              <span>{Math.round(profile.blushIntensity * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={profile.blushIntensity}
              onChange={(e) => onUpdate({ blushIntensity: Number(e.target.value) })}
              className="w-full accent-rose-600"
            />
          </label>
        </section>

        {/* Modular 3D Accessories */}
        <section className="space-y-3 pt-4 border-t border-stone-200/70 dark:border-slate-800">
          <h3 className="text-xs font-semibold tracking-wide text-stone-500 dark:text-slate-400">
            Modular 3D Accessories
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {ACCESSORIES.map((acc) => {
              const active = profile.accessories.includes(acc.id);
              return (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => toggleAccessory(acc.id)}
                  className={`px-3 py-2 rounded-lg border text-xs font-medium transition-colors text-left ${
                    active
                      ? isNight
                        ? 'bg-rose-500/20 border-rose-400 text-rose-200'
                        : 'bg-rose-50 border-rose-500 text-rose-800'
                      : isNight
                        ? 'bg-[#1D2230] border-slate-700 text-slate-300 hover:border-slate-500'
                        : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  {acc.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* Scale, Aura, Nameplate */}
        <section className="space-y-3 pt-4 border-t border-stone-200/70 dark:border-slate-800">
          <h3 className="text-xs font-semibold tracking-wide text-stone-500 dark:text-slate-400">
            Scale, Aura &amp; Nameplate
          </h3>
          <label className="block text-xs space-y-1.5">
            <div className="flex justify-between tabular-nums">
              <span>Companion Scale</span>
              <span>{profile.scale.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min={0.65}
              max={1.45}
              step={0.05}
              value={profile.scale}
              onChange={(e) => onUpdate({ scale: Number(e.target.value) })}
              className="w-full accent-rose-600"
            />
          </label>

          <label className="block text-xs space-y-1.5">
            <div className="flex justify-between tabular-nums">
              <span>Ambient Aura Glow</span>
              <span>{Math.round(profile.auraIntensity * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={profile.auraIntensity}
              onChange={(e) => onUpdate({ auraIntensity: Number(e.target.value) })}
              className="w-full accent-rose-600"
            />
          </label>

          <div className="space-y-1.5">
            <span className="block text-xs">Floating Nameplate</span>
            <div className="grid grid-cols-3 gap-1.5">
              {(['always', 'hover', 'hidden'] as NameplateMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onUpdate({ nameplateMode: mode })}
                  className={`py-1.5 rounded-lg border text-xs font-medium capitalize transition-colors ${
                    profile.nameplateMode === mode
                      ? 'bg-rose-600 border-rose-600 text-white'
                      : isNight
                        ? 'bg-[#1D2230] border-slate-700 text-slate-300'
                        : 'bg-stone-50 border-stone-200 text-stone-700'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>
    </aside>
  );
};
