import Database from 'better-sqlite3';
import path from 'node:path';
import type {
  AccessoryId,
  ConversationTurn,
  EyeStyle,
  MemoryCategory,
  NameplateMode,
  PersonalityArchetype,
  PetMemory,
  PetMood,
  PetProfile,
  PetReminder,
  ReminderType,
} from '../src/types.ts';

const dbPath = path.resolve(process.cwd(), 'mochi_memory.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS pet_profile (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    name TEXT NOT NULL DEFAULT 'Mochi',
    nickname TEXT NOT NULL DEFAULT 'Little Cloud',
    owner_name TEXT NOT NULL DEFAULT 'Friend',
    archetype TEXT NOT NULL DEFAULT 'playful',
    adopted_at TEXT NOT NULL,
    primary_color TEXT NOT NULL DEFAULT '#FAF5F0',
    secondary_color TEXT NOT NULL DEFAULT '#F6C2D0',
    eye_color TEXT NOT NULL DEFAULT '#2F2638',
    eye_style TEXT NOT NULL DEFAULT 'anime',
    blush_intensity REAL NOT NULL DEFAULT 0.65,
    accessories_json TEXT NOT NULL DEFAULT '["cat_ears","halo"]',
    aura_intensity REAL NOT NULL DEFAULT 0.45,
    aura_color TEXT NOT NULL DEFAULT '#F9A8D4',
    scale REAL NOT NULL DEFAULT 1.0,
    mood TEXT NOT NULL DEFAULT 'happy',
    affection INTEGER NOT NULL DEFAULT 78,
    energy INTEGER NOT NULL DEFAULT 88,
    interaction_count INTEGER NOT NULL DEFAULT 0,
    nameplate_mode TEXT NOT NULL DEFAULT 'always',
    voice_enabled INTEGER NOT NULL DEFAULT 1,
    sfx_enabled INTEGER NOT NULL DEFAULT 1,
    auto_save_memories INTEGER NOT NULL DEFAULT 0,
    always_on_top_hud INTEGER NOT NULL DEFAULT 1,
    studio_theme TEXT NOT NULL DEFAULT 'day',
    onboarding_complete INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS memories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL DEFAULT 'fact',
    content TEXT NOT NULL,
    importance INTEGER NOT NULL DEFAULT 2,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role TEXT NOT NULL,
    message TEXT NOT NULL,
    mood_at_time TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS reminders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'hydration',
    interval_minutes INTEGER NOT NULL DEFAULT 45,
    enabled INTEGER NOT NULL DEFAULT 1,
    last_triggered_at TEXT,
    created_at TEXT NOT NULL
  );
`);

interface PetProfileRow {
  id: number;
  name: string;
  nickname: string;
  owner_name: string;
  archetype: string;
  adopted_at: string;
  primary_color: string;
  secondary_color: string;
  eye_color: string;
  eye_style: string;
  blush_intensity: number;
  accessories_json: string;
  aura_intensity: number;
  aura_color: string;
  scale: number;
  mood: string;
  affection: number;
  energy: number;
  interaction_count: number;
  nameplate_mode: string;
  voice_enabled: number;
  sfx_enabled: number;
  auto_save_memories: number;
  always_on_top_hud: number;
  studio_theme: string;
  onboarding_complete: number;
}

interface MemoryRow {
  id: number;
  category: string;
  content: string;
  importance: number;
  created_at: string;
}

interface ConversationRow {
  id: number;
  role: string;
  message: string;
  mood_at_time: string;
  created_at: string;
}

interface ReminderRow {
  id: number;
  title: string;
  type: string;
  interval_minutes: number;
  enabled: number;
  last_triggered_at: string | null;
  created_at: string;
}

function seedDefaultsIfNeeded() {
  const existing = db.prepare('SELECT id FROM pet_profile WHERE id = 1').get();
  const now = new Date().toISOString();

  if (!existing) {
    db.prepare(`
      INSERT INTO pet_profile (id, adopted_at)
      VALUES (1, ?)
    `).run(now);
  }

  const reminderCount = db.prepare('SELECT COUNT(*) as cnt FROM reminders').get() as { cnt: number };
  if (reminderCount.cnt === 0) {
    const insertReminder = db.prepare(`
      INSERT INTO reminders (title, type, interval_minutes, enabled, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    insertReminder.run('Sip some water and stretch your shoulders', 'hydration', 45, 1, now);
    insertReminder.run('Rest your eyes for 20 seconds', 'break', 30, 1, now);
    insertReminder.run('Check afternoon focus block', 'calendar', 120, 0, now);
  }

  const memCount = db.prepare('SELECT COUNT(*) as cnt FROM memories').get() as { cnt: number };
  if (memCount.cnt === 0) {
    db.prepare(`
      INSERT INTO memories (category, content, importance, created_at)
      VALUES (?, ?, ?, ?)
    `).run('milestone', 'Arrived on the studio desk ready for adoption and customization.', 3, now);
  }
}

seedDefaultsIfNeeded();

function mapProfileRow(row: PetProfileRow): PetProfile {
  let accessories: AccessoryId[] = ['cat_ears', 'halo'];
  try {
    const parsed = JSON.parse(row.accessories_json);
    if (Array.isArray(parsed)) {
      accessories = parsed as AccessoryId[];
    }
  } catch {
    accessories = ['cat_ears'];
  }

  return {
    id: row.id,
    name: row.name,
    nickname: row.nickname,
    ownerName: row.owner_name,
    archetype: row.archetype as PersonalityArchetype,
    adoptedAt: row.adopted_at,
    primaryColor: row.primary_color,
    secondaryColor: row.secondary_color,
    eyeColor: row.eye_color,
    eyeStyle: row.eye_style as EyeStyle,
    blushIntensity: row.blush_intensity,
    accessories,
    auraIntensity: row.aura_intensity,
    auraColor: row.aura_color,
    scale: row.scale,
    mood: row.mood as PetMood,
    affection: row.affection,
    energy: row.energy,
    interactionCount: row.interaction_count,
    nameplateMode: row.nameplate_mode as NameplateMode,
    voiceEnabled: Boolean(row.voice_enabled),
    sfxEnabled: Boolean(row.sfx_enabled),
    autoSaveMemories: Boolean(row.auto_save_memories),
    alwaysOnTopHud: Boolean(row.always_on_top_hud),
    studioTheme: row.studio_theme === 'night' ? 'night' : 'day',
    onboardingComplete: Boolean(row.onboarding_complete),
  };
}

export function getPetProfile(): PetProfile {
  const row = db.prepare('SELECT * FROM pet_profile WHERE id = 1').get() as PetProfileRow;
  return mapProfileRow(row);
}

export function updatePetProfile(patch: Partial<PetProfile>): PetProfile {
  const current = getPetProfile();
  const next: PetProfile = {
    ...current,
    ...patch,
    id: 1,
    affection: Math.max(0, Math.min(100, Math.round(patch.affection ?? current.affection))),
    energy: Math.max(0, Math.min(100, Math.round(patch.energy ?? current.energy))),
    scale: Math.max(0.6, Math.min(1.5, Number((patch.scale ?? current.scale).toFixed(2)))),
    blushIntensity: Math.max(0, Math.min(1, Number((patch.blushIntensity ?? current.blushIntensity).toFixed(2)))),
    auraIntensity: Math.max(0, Math.min(1, Number((patch.auraIntensity ?? current.auraIntensity).toFixed(2)))),
  };

  db.prepare(`
    UPDATE pet_profile SET
      name = ?,
      nickname = ?,
      owner_name = ?,
      archetype = ?,
      adopted_at = ?,
      primary_color = ?,
      secondary_color = ?,
      eye_color = ?,
      eye_style = ?,
      blush_intensity = ?,
      accessories_json = ?,
      aura_intensity = ?,
      aura_color = ?,
      scale = ?,
      mood = ?,
      affection = ?,
      energy = ?,
      interaction_count = ?,
      nameplate_mode = ?,
      voice_enabled = ?,
      sfx_enabled = ?,
      auto_save_memories = ?,
      always_on_top_hud = ?,
      studio_theme = ?,
      onboarding_complete = ?
    WHERE id = 1
  `).run(
    next.name.trim() || 'Mochi',
    next.nickname.trim() || 'Little Cloud',
    next.ownerName.trim() || 'Friend',
    next.archetype,
    next.adoptedAt,
    next.primaryColor,
    next.secondaryColor,
    next.eyeColor,
    next.eyeStyle,
    next.blushIntensity,
    JSON.stringify(next.accessories),
    next.auraIntensity,
    next.auraColor,
    next.scale,
    next.mood,
    next.affection,
    next.energy,
    next.interactionCount,
    next.nameplateMode,
    next.voiceEnabled ? 1 : 0,
    next.sfxEnabled ? 1 : 0,
    next.autoSaveMemories ? 1 : 0,
    next.alwaysOnTopHud ? 1 : 0,
    next.studioTheme,
    next.onboardingComplete ? 1 : 0,
  );

  return getPetProfile();
}

export function recordPetInteraction(kind: 'pat' | 'drag' | 'dance' | 'jump' | 'sleep' | 'feed'): PetProfile {
  const current = getPetProfile();
  let affectionDelta = 2;
  let energyDelta = 0;
  let nextMood: PetMood = current.mood;

  if (kind === 'pat') {
    affectionDelta = 3;
    energyDelta = 1;
    nextMood = current.affection > 85 ? 'excited' : 'happy';
  } else if (kind === 'dance') {
    affectionDelta = 2;
    energyDelta = -4;
    nextMood = 'excited';
  } else if (kind === 'jump') {
    affectionDelta = 1;
    energyDelta = -2;
    nextMood = 'happy';
  } else if (kind === 'sleep') {
    affectionDelta = 1;
    energyDelta = 12;
    nextMood = 'sleepy';
  } else if (kind === 'drag') {
    affectionDelta = 1;
    energyDelta = -1;
    nextMood = 'curious';
  } else if (kind === 'feed') {
    affectionDelta = 4;
    energyDelta = 10;
    nextMood = 'happy';
  }

  return updatePetProfile({
    interactionCount: current.interactionCount + 1,
    affection: current.affection + affectionDelta,
    energy: current.energy + energyDelta,
    mood: nextMood,
  });
}

export function listMemories(limit = 50): PetMemory[] {
  const rows = db
    .prepare('SELECT * FROM memories ORDER BY id DESC LIMIT ?')
    .all(limit) as MemoryRow[];
  return rows.map((r) => ({
    id: r.id,
    category: r.category as MemoryCategory,
    content: r.content,
    importance: r.importance,
    createdAt: r.created_at,
  }));
}

export function addMemory(content: string, category: MemoryCategory = 'fact', importance = 2): PetMemory {
  const now = new Date().toISOString();
  const result = db
    .prepare('INSERT INTO memories (category, content, importance, created_at) VALUES (?, ?, ?, ?)')
    .run(category, content.trim(), importance, now);

  const row = db
    .prepare('SELECT * FROM memories WHERE id = ?')
    .get(result.lastInsertRowid) as MemoryRow;

  return {
    id: row.id,
    category: row.category as MemoryCategory,
    content: row.content,
    importance: row.importance,
    createdAt: row.created_at,
  };
}

export function deleteMemory(id: number): boolean {
  const res = db.prepare('DELETE FROM memories WHERE id = ?').run(id);
  return res.changes > 0;
}

export function clearMemories(): void {
  db.prepare('DELETE FROM memories').run();
}

export function listConversations(limit = 20): ConversationTurn[] {
  const rows = db
    .prepare('SELECT * FROM conversations ORDER BY id DESC LIMIT ?')
    .all(limit) as ConversationRow[];
  return rows.reverse().map((r) => ({
    id: r.id,
    role: r.role === 'user' ? 'user' : 'pet',
    message: r.message,
    moodAtTime: r.mood_at_time as PetMood,
    createdAt: r.created_at,
  }));
}

export function addConversationTurn(role: 'user' | 'pet', message: string, moodAtTime: PetMood): ConversationTurn {
  const now = new Date().toISOString();
  const result = db
    .prepare('INSERT INTO conversations (role, message, mood_at_time, created_at) VALUES (?, ?, ?, ?)')
    .run(role, message, moodAtTime, now);

  const row = db
    .prepare('SELECT * FROM conversations WHERE id = ?')
    .get(result.lastInsertRowid) as ConversationRow;

  return {
    id: row.id,
    role: row.role === 'user' ? 'user' : 'pet',
    message: row.message,
    moodAtTime: row.mood_at_time as PetMood,
    createdAt: row.created_at,
  };
}

export function listReminders(): PetReminder[] {
  const rows = db
    .prepare('SELECT * FROM reminders ORDER BY id ASC')
    .all() as ReminderRow[];
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    type: r.type as ReminderType,
    intervalMinutes: r.interval_minutes,
    enabled: Boolean(r.enabled),
    lastTriggeredAt: r.last_triggered_at,
    createdAt: r.created_at,
  }));
}

export function addReminder(title: string, type: ReminderType, intervalMinutes: number): PetReminder {
  const now = new Date().toISOString();
  const result = db
    .prepare(
      'INSERT INTO reminders (title, type, interval_minutes, enabled, created_at) VALUES (?, ?, ?, 1, ?)',
    )
    .run(title.trim(), type, Math.max(1, Math.round(intervalMinutes)), now);

  const row = db
    .prepare('SELECT * FROM reminders WHERE id = ?')
    .get(result.lastInsertRowid) as ReminderRow;

  return {
    id: row.id,
    title: row.title,
    type: row.type as ReminderType,
    intervalMinutes: row.interval_minutes,
    enabled: Boolean(row.enabled),
    lastTriggeredAt: row.last_triggered_at,
    createdAt: row.created_at,
  };
}

export function updateReminder(
  id: number,
  patch: { enabled?: boolean; intervalMinutes?: number; lastTriggeredAt?: string | null; title?: string },
): PetReminder | null {
  const existing = db.prepare('SELECT * FROM reminders WHERE id = ?').get(id) as ReminderRow | undefined;
  if (!existing) return null;

  db.prepare(`
    UPDATE reminders SET
      title = ?,
      interval_minutes = ?,
      enabled = ?,
      last_triggered_at = ?
    WHERE id = ?
  `).run(
    patch.title !== undefined ? patch.title : existing.title,
    patch.intervalMinutes !== undefined ? Math.max(1, Math.round(patch.intervalMinutes)) : existing.interval_minutes,
    patch.enabled !== undefined ? (patch.enabled ? 1 : 0) : existing.enabled,
    patch.lastTriggeredAt !== undefined ? patch.lastTriggeredAt : existing.last_triggered_at,
    id,
  );

  const updated = db.prepare('SELECT * FROM reminders WHERE id = ?').get(id) as ReminderRow;
  return {
    id: updated.id,
    title: updated.title,
    type: updated.type as ReminderType,
    intervalMinutes: updated.interval_minutes,
    enabled: Boolean(updated.enabled),
    lastTriggeredAt: updated.last_triggered_at,
    createdAt: updated.created_at,
  };
}

export function deleteReminder(id: number): boolean {
  const res = db.prepare('DELETE FROM reminders WHERE id = ?').run(id);
  return res.changes > 0;
}
