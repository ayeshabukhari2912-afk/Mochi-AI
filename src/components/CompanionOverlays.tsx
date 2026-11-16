import React from 'react';
import { X, Check, Sparkles, Music, ArrowUp, Compass, Moon, Palette, Heart } from 'lucide-react';
import type { AnimationState, PetProfile } from '../types.ts';

interface AnchorPoint {
  x: number;
  y: number;
  visible: boolean;
}

interface RadialMenuState {
  open: boolean;
  x: number;
  y: number;
}

interface SpeechBubbleState {
  text: string;
  offlineFallback: boolean;
  suggestedMemory: string | null;
}

interface CompanionOverlaysProps {
  profile: PetProfile;
  anchor: AnchorPoint;
  isHoveringPet: boolean;
  speech: SpeechBubbleState | null;
  radialMenu: RadialMenuState;
  isNight: boolean;
  onDismissSpeech: () => void;
  onApproveMemory: (memoryText: string) => void;
  onDismissMemorySuggestion: () => void;
  onCloseRadial: () => void;
  onRadialAction: (action: 'pat' | AnimationState | 'designer') => void;
}

export const CompanionOverlays: React.FC<CompanionOverlaysProps> = ({
  profile,
  anchor,
  isHoveringPet,
  speech,
  radialMenu,
  isNight,
  onDismissSpeech,
  onApproveMemory,
  onDismissMemorySuggestion,
  onCloseRadial,
  onRadialAction,
}) => {
  const showNameplate =
    anchor.visible &&
    (profile.nameplateMode === 'always' ||
      (profile.nameplateMode === 'hover' && isHoveringPet));

  const clampedX = Math.max(150, Math.min(typeof window !== 'undefined' ? window.innerWidth - 150 : 800, anchor.x));
  const clampedY = Math.max(95, Math.min(typeof window !== 'undefined' ? window.innerHeight - 160 : 500, anchor.y));

  const radialItems: Array<{
    id: 'pat' | AnimationState | 'designer';
    label: string;
    icon: React.ReactNode;
    angleDeg: number;
  }> = [
    { id: 'pat', label: 'Pat', icon: <Heart className="w-4 h-4" />, angleDeg: -90 },
    { id: 'jumping', label: 'Jump', icon: <ArrowUp className="w-4 h-4" />, angleDeg: -30 },
    { id: 'dancing', label: 'Dance', icon: <Music className="w-4 h-4" />, angleDeg: 30 },
    { id: 'chasing', label: 'Chase', icon: <Compass className="w-4 h-4" />, angleDeg: 90 },
    { id: 'sleeping', label: 'Sleep', icon: <Moon className="w-4 h-4" />, angleDeg: 150 },
    { id: 'designer', label: 'Design', icon: <Palette className="w-4 h-4" />, angleDeg: 210 },
  ];

  const radialCx = Math.max(120, Math.min(typeof window !== 'undefined' ? window.innerWidth - 120 : 800, radialMenu.x));
  const radialCy = Math.max(140, Math.min(typeof window !== 'undefined' ? window.innerHeight - 140 : 500, radialMenu.y));

  return (
    <div className="pointer-events-none fixed inset-0 z-10 overflow-hidden">
      {/* Floating Speech Bubble */}
      {speech && anchor.visible && (
        <div
          style={{
            left: `${clampedX}px`,
            top: `${Math.max(82, clampedY - 26)}px`,
            transform: 'translate(-50%, -100%)',
          }}
          className={`pointer-events-auto absolute max-w-xs w-[300px] rounded-2xl p-4 shadow-lg border transition-opacity duration-150 ${
            isNight
              ? 'bg-[#1B202C] border-slate-700 text-slate-100'
              : 'bg-white border-stone-200 text-stone-900'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm leading-relaxed">{speech.text}</p>
            <button
              type="button"
              onClick={onDismissSpeech}
              aria-label="Close speech bubble"
              className={`p-1 rounded-md shrink-0 transition-colors ${
                isNight ? 'text-slate-400 hover:text-slate-200' : 'text-stone-400 hover:text-stone-700'
              }`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {speech.offlineFallback && (
            <p className={`mt-2 text-xs ${isNight ? 'text-slate-400' : 'text-stone-500'}`}>
              Offline companion chirp · Connect Gemini key in Secrets for full AI dialogue
            </p>
          )}

          {speech.suggestedMemory && (
            <div
              className={`mt-3 pt-2.5 border-t text-xs ${
                isNight ? 'border-slate-700 text-slate-300' : 'border-stone-200 text-stone-700'
              }`}
            >
              <div className="flex items-center gap-1.5 font-medium mb-1.5">
                <Sparkles className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                <span>Save to SQLite memory?</span>
              </div>
              <p className={`mb-2 ${isNight ? 'text-slate-400' : 'text-stone-600'}`}>
                &ldquo;{speech.suggestedMemory}&rdquo;
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onApproveMemory(speech.suggestedMemory!)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-600 text-white font-medium hover:bg-rose-500 transition-colors"
                >
                  <Check className="w-3 h-3" />
                  Remember
                </button>
                <button
                  type="button"
                  onClick={onDismissMemorySuggestion}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    isNight ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Bubble pointer tail */}
          <div
            className={`absolute left-1/2 -bottom-2 -translate-x-1/2 w-3.5 h-3.5 rotate-45 border-r border-b ${
              isNight ? 'bg-[#1B202C] border-slate-700' : 'bg-white border-stone-200'
            }`}
          />
        </div>
      )}

      {/* Floating Pet Nameplate (clean unboxed metadata with dot separators) */}
      {showNameplate && !speech && (
        <div
          style={{
            left: `${clampedX}px`,
            top: `${clampedY - 6}px`,
            transform: 'translate(-50%, -100%)',
          }}
          className={`absolute px-3 py-1.5 rounded-lg border shadow-sm transition-opacity duration-150 ${
            isNight
              ? 'bg-[#191D28]/95 border-slate-700 text-slate-100'
              : 'bg-white/95 border-stone-200 text-stone-900'
          }`}
        >
          <div className="flex items-center gap-2 text-xs whitespace-nowrap">
            <span className="font-display font-semibold">{profile.name}</span>
            <span aria-hidden="true" className={isNight ? 'text-slate-500' : 'text-stone-400'}>·</span>
            <span className={`capitalize ${isNight ? 'text-slate-300' : 'text-stone-600'}`}>{profile.archetype}</span>
            <span aria-hidden="true" className={isNight ? 'text-slate-500' : 'text-stone-400'}>·</span>
            <span className={`capitalize ${isNight ? 'text-rose-300' : 'text-rose-600'}`}>{profile.mood}</span>
          </div>
        </div>
      )}

      {/* Right-click Quick Radial Action Menu */}
      {radialMenu.open && (
        <div
          className="pointer-events-auto fixed inset-0 z-30"
          onClick={onCloseRadial}
          onContextMenu={(e) => {
            e.preventDefault();
            onCloseRadial();
          }}
        >
          <div
            style={{ left: `${radialCx}px`, top: `${radialCy}px` }}
            className="absolute"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`-translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full border flex items-center justify-center shadow-md ${
                isNight ? 'bg-[#1D2230] border-slate-700 text-slate-200' : 'bg-white border-stone-200 text-stone-800'
              }`}
            >
              <button
                type="button"
                onClick={onCloseRadial}
                aria-label="Close radial menu"
                className="w-full h-full flex items-center justify-center rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {radialItems.map((item) => {
              const rad = (item.angleDeg * Math.PI) / 180;
              const radius = 82;
              const dx = Math.cos(rad) * radius;
              const dy = Math.sin(rad) * radius;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onRadialAction(item.id);
                    onCloseRadial();
                  }}
                  style={{
                    left: `${dx}px`,
                    top: `${dy}px`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  className={`absolute flex flex-col items-center justify-center w-14 h-14 rounded-full border shadow-md text-[11px] font-medium transition-transform hover:scale-105 ${
                    isNight
                      ? 'bg-[#1D2230] border-slate-700 text-slate-100 hover:border-rose-400'
                      : 'bg-white border-stone-200 text-stone-800 hover:border-rose-500'
                  }`}
                >
                  {item.icon}
                  <span className="mt-0.5">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
