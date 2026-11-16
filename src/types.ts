export type PersonalityArchetype =
  | 'playful'
  | 'calm'
  | 'tsundere'
  | 'scholarly'
  | 'energetic';

export type EyeStyle = 'anime' | 'sleepy' | 'star' | 'sparkle';

export type AccessoryId =
  | 'cat_ears'
  | 'bunny_ears'
  | 'antenna'
  | 'wings'
  | 'halo'
  | 'beret';

export type PetMood =
  | 'happy'
  | 'sleepy'
  | 'curious'
  | 'mischievous'
  | 'lonely'
  | 'excited';

export type AnimationState =
  | 'idle'
  | 'happy'
  | 'chasing'
  | 'walking'
  | 'jumping'
  | 'sleeping'
  | 'dancing';

export type NameplateMode = 'always' | 'hover' | 'hidden';

export interface PetProfile {
  id: number;
  name: string;
  nickname: string;
  ownerName: string;
  archetype: PersonalityArchetype;
  adoptedAt: string;
  primaryColor: string;
  secondaryColor: string;
  eyeColor: string;
  eyeStyle: EyeStyle;
  blushIntensity: number;
  accessories: AccessoryId[];
  auraIntensity: number;
  auraColor: string;
  scale: number;
  mood: PetMood;
  affection: number;
  energy: number;
  interactionCount: number;
  nameplateMode: NameplateMode;
  voiceEnabled: boolean;
  sfxEnabled: boolean;
  autoSaveMemories: boolean;
  alwaysOnTopHud: boolean;
  studioTheme: 'day' | 'night';
  onboardingComplete: boolean;
}

export type MemoryCategory = 'preference' | 'fact' | 'milestone' | 'conversation';

export interface PetMemory {
  id: number;
  category: MemoryCategory;
  content: string;
  importance: number;
  createdAt: string;
}

export interface ConversationTurn {
  id: number;
  role: 'user' | 'pet';
  message: string;
  moodAtTime: PetMood;
  createdAt: string;
}

export type ReminderType = 'hydration' | 'break' | 'calendar' | 'custom';

export interface PetReminder {
  id: number;
  title: string;
  type: ReminderType;
  intervalMinutes: number;
  enabled: boolean;
  lastTriggeredAt: string | null;
  createdAt: string;
}

export interface ChatResponsePayload {
  reply: string;
  nextMood: PetMood;
  animationCue: AnimationState;
  suggestedMemory: string | null;
  savedMemory: PetMemory | null;
  offlineFallback: boolean;
  profile: PetProfile;
}

export interface PythonBundleFile {
  path: string;
  language: string;
  content: string;
}
