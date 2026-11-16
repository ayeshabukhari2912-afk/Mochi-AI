import express from 'express';
import path from 'node:path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import {
  addConversationTurn,
  addMemory,
  addReminder,
  clearMemories,
  deleteMemory,
  deleteReminder,
  getPetProfile,
  listConversations,
  listMemories,
  listReminders,
  recordPetInteraction,
  updatePetProfile,
  updateReminder,
} from './server/db.ts';
import { generateCompanionReply } from './server/gemini.ts';
import { buildPythonDesktopBundle } from './server/pythonExport.ts';
import type { MemoryCategory, PetProfile, ReminderType } from './src/types.ts';

dotenv.config();

const PORT = 3000;

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/api/pet', (_req, res) => {
    try {
      res.json({
        profile: getPetProfile(),
        memories: listMemories(50),
        conversations: listConversations(24),
        reminders: listReminders(),
      });
    } catch (err) {
      console.error('Failed to load pet state:', err);
      res.status(500).json({ error: 'Failed to load companion state' });
    }
  });

  app.put('/api/pet', (req, res) => {
    try {
      const patch = req.body as Partial<PetProfile>;
      const updated = updatePetProfile(patch);
      res.json({ profile: updated });
    } catch (err) {
      console.error('Failed to update pet profile:', err);
      res.status(500).json({ error: 'Failed to update companion profile' });
    }
  });

  app.post('/api/pet/interact', (req, res) => {
    try {
      const kind = (req.body?.kind ?? 'pat') as 'pat' | 'drag' | 'dance' | 'jump' | 'sleep' | 'feed';
      const updated = recordPetInteraction(kind);
      res.json({ profile: updated });
    } catch (err) {
      console.error('Failed to record interaction:', err);
      res.status(500).json({ error: 'Failed to record interaction' });
    }
  });

  app.post('/api/chat', async (req, res) => {
    try {
      const userMessage = String(req.body?.message ?? '').trim();
      if (!userMessage) {
        res.status(400).json({ error: 'Message cannot be empty' });
        return;
      }

      const profile = getPetProfile();
      const memories = listMemories(20);
      const recentConversations = listConversations(12);

      addConversationTurn('user', userMessage, profile.mood);

      const brainResult = await generateCompanionReply(
        profile,
        memories,
        recentConversations,
        userMessage,
      );

      let savedMemory = null;
      if (brainResult.suggestedMemory && profile.autoSaveMemories) {
        savedMemory = addMemory(brainResult.suggestedMemory, 'fact', 2);
      }

      const updatedProfile = updatePetProfile({
        mood: brainResult.nextMood,
        interactionCount: profile.interactionCount + 1,
        affection: Math.min(100, profile.affection + 2),
      });

      addConversationTurn('pet', brainResult.reply, brainResult.nextMood);

      res.json({
        reply: brainResult.reply,
        nextMood: brainResult.nextMood,
        animationCue: brainResult.animationCue,
        suggestedMemory: profile.autoSaveMemories ? null : brainResult.suggestedMemory,
        savedMemory,
        offlineFallback: brainResult.offlineFallback,
        profile: updatedProfile,
      });
    } catch (err) {
      console.error('Chat endpoint error:', err);
      res.status(500).json({ error: 'Companion brain encountered an error' });
    }
  });

  app.get('/api/memories', (_req, res) => {
    res.json({ memories: listMemories(100) });
  });

  app.post('/api/memories', (req, res) => {
    const content = String(req.body?.content ?? '').trim();
    const category = (req.body?.category ?? 'fact') as MemoryCategory;
    const importance = Number(req.body?.importance ?? 2);
    if (!content) {
      res.status(400).json({ error: 'Memory content is required' });
      return;
    }
    const created = addMemory(content, category, importance);
    res.status(201).json({ memory: created });
  });

  app.delete('/api/memories/:id', (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: 'Invalid memory ID' });
      return;
    }
    const removed = deleteMemory(id);
    res.json({ removed });
  });

  app.delete('/api/memories', (_req, res) => {
    clearMemories();
    res.json({ cleared: true });
  });

  app.get('/api/reminders', (_req, res) => {
    res.json({ reminders: listReminders() });
  });

  app.post('/api/reminders', (req, res) => {
    const title = String(req.body?.title ?? '').trim();
    const type = (req.body?.type ?? 'custom') as ReminderType;
    const intervalMinutes = Number(req.body?.intervalMinutes ?? 30);
    if (!title) {
      res.status(400).json({ error: 'Reminder title is required' });
      return;
    }
    const created = addReminder(title, type, intervalMinutes);
    res.status(201).json({ reminder: created });
  });

  app.patch('/api/reminders/:id', (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: 'Invalid reminder ID' });
      return;
    }
    const updated = updateReminder(id, req.body ?? {});
    if (!updated) {
      res.status(404).json({ error: 'Reminder not found' });
      return;
    }
    res.json({ reminder: updated });
  });

  app.delete('/api/reminders/:id', (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: 'Invalid reminder ID' });
      return;
    }
    const removed = deleteReminder(id);
    res.json({ removed });
  });

  app.get('/api/export/python-bundle', (_req, res) => {
    const profile = getPetProfile();
    const files = buildPythonDesktopBundle(profile);
    res.json({ files });
  });

  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Mochi AI Companion server listening on http://localhost:${PORT}`);
  });
}

startServer();
