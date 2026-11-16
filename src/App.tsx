import { useCallback, useEffect, useRef, useState } from 'react';
import { MochiScene } from './engine/MochiScene.ts';
import { soundFx } from './engine/audio.ts';
import {
  isSpeechRecognitionSupported,
  speakCompanionText,
  startVoiceCapture,
  stopCompanionSpeech,
} from './engine/speech.ts';
import { TopBar, type ActiveTab } from './components/TopBar.tsx';
import { CompanionOverlays } from './components/CompanionOverlays.tsx';
import { BottomDock } from './components/BottomDock.tsx';
import { DesignerPanel } from './components/DesignerPanel.tsx';
import { MemoryPanel } from './components/MemoryPanel.tsx';
import { RemindersPanel } from './components/RemindersPanel.tsx';
import { PythonExportPanel } from './components/PythonExportPanel.tsx';
import { AdoptionModal } from './components/AdoptionModal.tsx';
import type {
  AnimationState,
  ChatResponsePayload,
  ConversationTurn,
  MemoryCategory,
  PetMemory,
  PetMood,
  PetProfile,
  PetReminder,
  ReminderType,
} from './types.ts';

const DEFAULT_PROFILE: PetProfile = {
  id: 1,
  name: 'Mochi',
  nickname: 'Little Cloud',
  ownerName: 'Friend',
  archetype: 'playful',
  adoptedAt: new Date().toISOString(),
  primaryColor: '#FAF5F0',
  secondaryColor: '#F6C2D0',
  eyeColor: '#2F2638',
  eyeStyle: 'anime',
  blushIntensity: 0.65,
  accessories: ['cat_ears', 'halo'],
  auraIntensity: 0.45,
  auraColor: '#F9A8D4',
  scale: 1.0,
  mood: 'happy',
  affection: 78,
  energy: 88,
  interactionCount: 0,
  nameplateMode: 'always',
  voiceEnabled: true,
  sfxEnabled: true,
  autoSaveMemories: false,
  alwaysOnTopHud: true,
  studioTheme: 'day',
  onboardingComplete: false,
};

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<MochiScene | null>(null);
  const saveTimerRef = useRef<number | null>(null);
  const stopListeningRef = useRef<(() => void) | null>(null);

  const [profile, setProfile] = useState<PetProfile>(DEFAULT_PROFILE);
  const [memories, setMemories] = useState<PetMemory[]>([]);
  const [conversations, setConversations] = useState<ConversationTurn[]>([]);
  const [reminders, setReminders] = useState<PetReminder[]>([]);
  const [loaded, setLoaded] = useState(false);

  const [activeTab, setActiveTab] = useState<ActiveTab>('companion');
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [adoptionOpen, setAdoptionOpen] = useState(false);

  const [animState, setAnimState] = useState<AnimationState>('idle');
  const [isHoveringPet, setIsHoveringPet] = useState(false);
  const [contextLost, setContextLost] = useState(false);
  const [anchor, setAnchor] = useState({ x: 500, y: 260, visible: true });

  const [speech, setSpeech] = useState<{
    text: string;
    offlineFallback: boolean;
    suggestedMemory: string | null;
  } | null>(null);
  const [radialMenu, setRadialMenu] = useState({ open: false, x: 0, y: 0 });
  const [isSending, setIsSending] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const micSupported = isSpeechRecognitionSupported();
  const isNight = profile.studioTheme === 'night';

  // Keep latest handlers in refs so Three.js scene mounts once without re-creating WebGLRenderer
  const profileRef = useRef(profile);
  profileRef.current = profile;

  const persistProfilePatch = useCallback((patch: Partial<PetProfile>, immediate = false) => {
    setProfile((prev) => {
      const next = { ...prev, ...patch };
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
      const runSave = () => {
        void fetch('/api/pet', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        });
      };
      if (immediate) {
        runSave();
      } else {
        saveTimerRef.current = window.setTimeout(runSave, 220);
      }
      return next;
    });
  }, []);

  const showPetBubble = useCallback(
    (text: string, offlineFallback = false, suggestedMemory: string | null = null) => {
      setSpeech({ text, offlineFallback, suggestedMemory });
      soundFx.playBubbleSfx();
      const current = profileRef.current;
      speakCompanionText(text, current.archetype, current.voiceEnabled, (speaking) => {
        sceneRef.current?.setSpeaking(speaking);
      });
    },
    [],
  );

  const handlePatPet = useCallback(() => {
    soundFx.playPatSfx();
    sceneRef.current?.triggerSquashBounce(0.32);
    setAnimState('happy');
    sceneRef.current?.setAnimationState('happy');
    window.setTimeout(() => {
      setAnimState((curr) => {
        if (curr === 'happy') {
          sceneRef.current?.setAnimationState('idle');
          return 'idle';
        }
        return curr;
      });
    }, 2200);

    void fetch('/api/pet/interact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'pat' }),
    })
      .then((res) => res.json())
      .then((data: { profile?: PetProfile }) => {
        if (data.profile) setProfile(data.profile);
      });
  }, []);

  const handleDragDrop = useCallback(() => {
    soundFx.playBubbleSfx();
    void fetch('/api/pet/interact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'drag' }),
    })
      .then((res) => res.json())
      .then((data: { profile?: PetProfile }) => {
        if (data.profile) setProfile(data.profile);
      });
  }, []);

  const patRef = useRef(handlePatPet);
  patRef.current = handlePatPet;
  const dragRef = useRef(handleDragDrop);
  dragRef.current = handleDragDrop;

  // Load initial SQLite state
  useEffect(() => {
    let active = true;
    fetch('/api/pet')
      .then((res) => res.json())
      .then(
        (data: {
          profile?: PetProfile;
          memories?: PetMemory[];
          conversations?: ConversationTurn[];
          reminders?: PetReminder[];
        }) => {
          if (!active) return;
          if (data.profile) setProfile(data.profile);
          if (data.memories) setMemories(data.memories);
          if (data.conversations) setConversations(data.conversations);
          if (data.reminders) setReminders(data.reminders);
          setLoaded(true);
        },
      )
      .catch(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  // Mount Three.js scene once
  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    const mochiScene = new MochiScene(mount, profileRef.current, {
      onPetClick: () => patRef.current(),
      onDragDrop: () => dragRef.current(),
      onHoverChange: (hovering) => setIsHoveringPet(hovering),
      onContextMenu: (screenX, screenY) => setRadialMenu({ open: true, x: screenX, y: screenY }),
      onAnchorUpdate: (nextAnchor) => setAnchor(nextAnchor),
      onContextLost: (lost) => setContextLost(lost),
    });

    sceneRef.current = mochiScene;

    return () => {
      stopCompanionSpeech();
      mochiScene.dispose();
      sceneRef.current = null;
    };
  }, []);

  // Sync profile changes to Three.js, audio, and dark theme class
  useEffect(() => {
    soundFx.setEnabled(profile.sfxEnabled);
    sceneRef.current?.applyProfile(profile);
    if (profile.studioTheme === 'night') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [profile]);

  // Smooth camera shift when a side studio drawer is open
  useEffect(() => {
    const shift = activeTab === 'companion' ? 0 : 0.72;
    sceneRef.current?.setCameraShiftX(shift);
  }, [activeTab]);

  // Keyboard shortcut 'H' to toggle Zen Mode / Hide Controls
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'h' || e.key === 'H') {
        setDockCollapsed((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Periodic reminder checker
  useEffect(() => {
    if (!loaded) return;
    const interval = window.setInterval(() => {
      const now = Date.now();
      for (const rem of reminders) {
        if (!rem.enabled) continue;
        const baseline = rem.lastTriggeredAt
          ? new Date(rem.lastTriggeredAt).getTime()
          : new Date(rem.createdAt).getTime();
        if (now - baseline >= rem.intervalMinutes * 60_000) {
          const stamped = new Date().toISOString();
          setReminders((prev) =>
            prev.map((r) => (r.id === rem.id ? { ...r, lastTriggeredAt: stamped } : r)),
          );
          void fetch(`/api/reminders/${rem.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lastTriggeredAt: stamped }),
          });
          soundFx.playChimeSfx();
          sceneRef.current?.triggerSquashBounce(0.28);
          showPetBubble(`Reminder: ${rem.title}`, false, null);
          break;
        }
      }
    }, 15_000);
    return () => window.clearInterval(interval);
  }, [loaded, reminders, showPetBubble]);

  const handleSelectAnim = useCallback((nextAnim: AnimationState) => {
    setAnimState(nextAnim);
    sceneRef.current?.setAnimationState(nextAnim);
    if (nextAnim === 'jumping') {
      soundFx.playJumpSfx();
    } else if (nextAnim === 'dancing' || nextAnim === 'happy') {
      soundFx.playSparkleSfx();
    }
  }, []);

  const handleSendMessage = useCallback(
    async (msg: string) => {
      setIsSending(true);
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: msg }),
        });
        const data = (await res.json()) as ChatResponsePayload;

        if (data.profile) {
          setProfile(data.profile);
        }
        if (data.savedMemory) {
          setMemories((prev) => [data.savedMemory!, ...prev]);
        }
        setConversations((prev) => [
          ...prev,
          { id: Date.now(), role: 'user', message: msg, moodAtTime: profile.mood, createdAt: new Date().toISOString() },
          { id: Date.now() + 1, role: 'pet', message: data.reply, moodAtTime: data.nextMood, createdAt: new Date().toISOString() },
        ]);

        if (data.animationCue) {
          handleSelectAnim(data.animationCue);
        }
        showPetBubble(data.reply, data.offlineFallback, data.suggestedMemory);
      } catch {
        showPetBubble(
          `Chirp! Couldn't reach the server right now, ${profile.ownerName}.`,
          true,
          null,
        );
      } finally {
        setIsSending(false);
      }
    },
    [handleSelectAnim, profile.mood, profile.ownerName, showPetBubble],
  );

  const handleToggleListen = useCallback(() => {
    if (isListening) {
      stopListeningRef.current?.();
      setIsListening(false);
      return;
    }
    setIsListening(true);
    stopListeningRef.current = startVoiceCapture(
      (transcript) => {
        void handleSendMessage(transcript);
      },
      (errMsg) => {
        showPetBubble(errMsg, true, null);
      },
      () => {
        setIsListening(false);
      },
    );
  }, [handleSendMessage, isListening, showPetBubble]);

  const handleApproveMemory = async (memoryText: string) => {
    const res = await fetch('/api/memories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: memoryText, category: 'fact', importance: 2 }),
    });
    const data = (await res.json()) as { memory?: PetMemory };
    if (data.memory) {
      setMemories((prev) => [data.memory!, ...prev]);
    }
    setSpeech((prev) => (prev ? { ...prev, suggestedMemory: null } : null));
    soundFx.playSparkleSfx();
  };

  const handleAddMemory = async (content: string, category: MemoryCategory) => {
    const res = await fetch('/api/memories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, category, importance: 2 }),
    });
    const data = (await res.json()) as { memory?: PetMemory };
    if (data.memory) {
      setMemories((prev) => [data.memory!, ...prev]);
      soundFx.playSparkleSfx();
    }
  };

  const handleDeleteMemory = async (id: number) => {
    await fetch(`/api/memories/${id}`, { method: 'DELETE' });
    setMemories((prev) => prev.filter((m) => m.id !== id));
  };

  const handleClearMemories = async () => {
    await fetch('/api/memories', { method: 'DELETE' });
    setMemories([]);
  };

  const handleAddReminder = async (title: string, type: ReminderType, intervalMinutes: number) => {
    const res = await fetch('/api/reminders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, type, intervalMinutes }),
    });
    const data = (await res.json()) as { reminder?: PetReminder };
    if (data.reminder) {
      setReminders((prev) => [...prev, data.reminder!]);
    }
  };

  const handleToggleReminder = async (id: number, enabled: boolean) => {
    setReminders((prev) => prev.map((r) => (r.id === id ? { ...r, enabled } : r)));
    await fetch(`/api/reminders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    });
  };

  const handleDeleteReminder = async (id: number) => {
    setReminders((prev) => prev.filter((r) => r.id !== id));
    await fetch(`/api/reminders/${id}`, { method: 'DELETE' });
  };

  const handleTriggerReminderNow = (rem: PetReminder) => {
    soundFx.playChimeSfx();
    sceneRef.current?.triggerSquashBounce(0.3);
    handleSelectAnim('happy');
    showPetBubble(`Reminder: ${rem.title}`, false, null);
  };

  const handleRadialAction = (action: 'pat' | AnimationState | 'designer') => {
    if (action === 'pat') {
      handlePatPet();
    } else if (action === 'designer') {
      setActiveTab('designer');
    } else {
      handleSelectAnim(action);
    }
  };

  const handleCompleteAdoption = (patch: Partial<PetProfile>) => {
    persistProfilePatch(patch, true);
    setAdoptionOpen(false);
    soundFx.playSparkleSfx();
    handleSelectAnim('jumping');
    sceneRef.current?.triggerSquashBounce(0.35);
    const chosenName = patch.name || profile.name;
    const chosenOwner = patch.ownerName || profile.ownerName;
    showPetBubble(
      `Yay! Nice to meet you officially, ${chosenOwner}! I'm ${chosenName} and I'm so excited to hang out on your desk!`,
      false,
      null,
    );
  };

  return (
    <div
      className={`relative w-screen h-screen overflow-hidden select-none ${
        isNight ? 'bg-[#12151E] text-slate-100' : 'bg-[#F3F0EB] text-stone-900'
      }`}
    >
      {/* Isolated WebGL Canvas Container */}
      <div ref={canvasMountRef} className="fixed inset-0 z-0" />

      {/* Graceful WebGL Context Loss Fallback */}
      {contextLost && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#F3F0EB] dark:bg-[#12151E] p-6">
          <div className="max-w-sm text-center space-y-2">
            <h2 className="font-display text-lg font-semibold">{profile.name} is resting</h2>
            <p className="text-sm text-stone-600 dark:text-slate-400">
              3D graphics context paused. Reload the page to restore the live 3D viewport.
            </p>
          </div>
        </div>
      )}

      {/* Top Navigation Contract */}
      <TopBar
        petName={profile.name}
        activeTab={activeTab}
        isNight={isNight}
        onSelectTab={(tab) => setActiveTab((prev) => (prev === tab && tab !== 'companion' ? 'companion' : tab))}
        onOpenAdoption={() => setAdoptionOpen(true)}
      />

      {/* Mobile Nav Strip (below TopBar on small screens) */}
      <div
        className={`md:hidden fixed top-14 left-0 right-0 z-20 flex items-center justify-center gap-4 px-4 py-2 border-b text-xs font-medium overflow-x-auto ${
          isNight
            ? 'bg-[#141720]/95 border-slate-800 text-slate-300'
            : 'bg-[#FAF8F5]/95 border-stone-200 text-stone-700'
        }`}
      >
        {(['companion', 'designer', 'memory', 'reminders', 'python'] as ActiveTab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`capitalize whitespace-nowrap shrink-0 ${
              activeTab === tab ? 'text-rose-600 font-semibold' : ''
            }`}
          >
            {tab === 'python' ? 'Desktop Code' : tab}
          </button>
        ))}
      </div>

      {/* Floating Semantic Overlays (Nameplate, Speech Bubble, Radial Menu) */}
      <CompanionOverlays
        profile={profile}
        anchor={anchor}
        isHoveringPet={isHoveringPet}
        speech={speech}
        radialMenu={radialMenu}
        isNight={isNight}
        onDismissSpeech={() => {
          stopCompanionSpeech();
          sceneRef.current?.setSpeaking(false);
          setSpeech(null);
        }}
        onApproveMemory={(txt) => void handleApproveMemory(txt)}
        onDismissMemorySuggestion={() =>
          setSpeech((prev) => (prev ? { ...prev, suggestedMemory: null } : null))
        }
        onCloseRadial={() => setRadialMenu((prev) => ({ ...prev, open: false }))}
        onRadialAction={handleRadialAction}
      />

      {/* Side Studio Drawers */}
      {activeTab === 'designer' && (
        <DesignerPanel
          profile={profile}
          onUpdate={(patch) => persistProfilePatch(patch)}
          onClose={() => setActiveTab('companion')}
        />
      )}

      {activeTab === 'memory' && (
        <MemoryPanel
          profile={profile}
          memories={memories}
          conversations={conversations}
          onAddMemory={(c, cat) => void handleAddMemory(c, cat)}
          onDeleteMemory={(id) => void handleDeleteMemory(id)}
          onClearMemories={() => void handleClearMemories()}
          onToggleAutoSave={(val) => persistProfilePatch({ autoSaveMemories: val }, true)}
          onClose={() => setActiveTab('companion')}
        />
      )}

      {activeTab === 'reminders' && (
        <RemindersPanel
          profile={profile}
          reminders={reminders}
          onAddReminder={(t, ty, mins) => void handleAddReminder(t, ty, mins)}
          onToggleReminder={(id, en) => void handleToggleReminder(id, en)}
          onDeleteReminder={(id) => void handleDeleteReminder(id)}
          onTriggerTestAlert={handleTriggerReminderNow}
          onClose={() => setActiveTab('companion')}
        />
      )}

      {activeTab === 'python' && (
        <PythonExportPanel
          profile={profile}
          onClose={() => setActiveTab('companion')}
        />
      )}

      {/* Unified Collapsible Bottom Control Dock */}
      <BottomDock
        profile={profile}
        animState={animState}
        collapsed={dockCollapsed}
        isSending={isSending}
        isListening={isListening}
        micSupported={micSupported}
        onToggleCollapsed={() => setDockCollapsed((prev) => !prev)}
        onSendMessage={(msg) => void handleSendMessage(msg)}
        onToggleListen={handleToggleListen}
        onSelectAnim={handleSelectAnim}
        onSelectMood={(mood: PetMood) => persistProfilePatch({ mood }, true)}
        onToggleVoice={() => {
          const next = !profile.voiceEnabled;
          if (!next) stopCompanionSpeech();
          persistProfilePatch({ voiceEnabled: next }, true);
        }}
        onToggleSfx={() => persistProfilePatch({ sfxEnabled: !profile.sfxEnabled }, true)}
        onToggleTheme={() =>
          persistProfilePatch(
            { studioTheme: profile.studioTheme === 'day' ? 'night' : 'day' },
            true,
          )
        }
        onResetPosition={() => sceneRef.current?.resetPosition()}
        onPatPet={handlePatPet}
      />

      {/* Adoption & Naming Ceremony Modal */}
      {adoptionOpen && (
        <AdoptionModal
          profile={profile}
          onComplete={handleCompleteAdoption}
          onClose={() => setAdoptionOpen(false)}
        />
      )}
    </div>
  );
}
