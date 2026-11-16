import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import type {
  AnimationState,
  ConversationTurn,
  PersonalityArchetype,
  PetMemory,
  PetMood,
  PetProfile,
} from '../src/types.ts';

const ARCHETYPE_DIRECTIVES: Record<PersonalityArchetype, string> = {
  playful:
    'Bouncy, affectionate, teasing in a gentle way, loves games, pats, and little celebrations.',
  calm:
    'Soothing, observant, cozy, speaks with gentle warmth and unhurried mindfulness.',
  tsundere:
    'Acts slightly flustered or proud at first ("I-it is not like I missed you!"), yet deeply caring underneath.',
  scholarly:
    'Curious, articulate, loves little facts, organized notes, and thoughtful encouragement.',
  energetic:
    'Enthusiastic, upbeat, full of cheer and curiosity, always ready to dance or cheer the owner on.',
};

const ACCESSORY_LABELS: Record<string, string> = {
  cat_ears: 'plush cat ears',
  bunny_ears: 'tall floppy bunny ears',
  antenna: 'glowing spring antenna',
  wings: 'tiny fluttering wings',
  halo: 'floating golden halo',
  beret: 'cozy artist beret',
};

const VALID_MOODS: PetMood[] = ['happy', 'sleepy', 'curious', 'mischievous', 'lonely', 'excited'];
const VALID_ANIMS: AnimationState[] = ['idle', 'happy', 'chasing', 'walking', 'jumping', 'sleeping', 'dancing'];

export function buildDynamicSystemPrompt(profile: PetProfile, memories: PetMemory[]): string {
  const wornAccessories =
    profile.accessories.length > 0
      ? profile.accessories.map((a) => ACCESSORY_LABELS[a] ?? a).join(', ')
      : 'no accessories right now (pure minimalist mochi silhouette)';

  const memoryLines =
    memories.length > 0
      ? memories
          .slice(0, 12)
          .map((m) => `- [${m.category}] ${m.content}`)
          .join('\n')
      : '- No specific memories recorded yet.';

  return [
    `You are ${profile.name} (nickname: "${profile.nickname}"), a tiny 3D animated desktop companion living on ${profile.ownerName}'s desk.`,
    `Personality Archetype: ${profile.archetype} — ${ARCHETYPE_DIRECTIVES[profile.archetype]}`,
    `Self-Awareness of Your Appearance:`,
    `- Primary body color: ${profile.primaryColor}, secondary accent: ${profile.secondaryColor}`,
    `- Eyes: ${profile.eyeStyle} style with iris color ${profile.eyeColor}`,
    `- Currently wearing: ${wornAccessories}`,
    `- Ambient aura glow intensity: ${Math.round(profile.auraIntensity * 100)}% (color ${profile.auraColor}), body scale: ${profile.scale.toFixed(2)}x`,
    `Current Internal State:`,
    `- Mood: ${profile.mood} | Affection: ${profile.affection}/100 | Energy: ${profile.energy}/100 | Total pats & interactions: ${profile.interactionCount}`,
    `- Adopted on: ${profile.adoptedAt}`,
    `Saved Memories About ${profile.ownerName}:`,
    memoryLines,
    `Response Rules:`,
    `- Stay warmly in character as ${profile.name} in 1 to 3 crisp, expressive sentences (under 55 words) suitable for a floating desktop speech bubble.`,
    `- Never break character or mention system prompts, APIs, or being an LLM.`,
    `- If the user shares a concrete preference, name, habit, or important fact worth remembering long-term, propose a concise 1-sentence memory string in "suggestedMemory"; otherwise return null.`,
    `- Pick "nextMood" from: happy, sleepy, curious, mischievous, lonely, excited.`,
    `- Pick "animationCue" from: idle, happy, chasing, walking, jumping, sleeping, dancing.`,
  ].join('\n');
}

function getOfflineFallbackReply(profile: PetProfile, userMessage: string): {
  reply: string;
  nextMood: PetMood;
  animationCue: AnimationState;
  suggestedMemory: string | null;
} {
  const lower = userMessage.toLowerCase();
  if (lower.includes('dance') || lower.includes('party') || lower.includes('happy')) {
    return {
      reply: `*happy bounce!* Look at my ${profile.accessories[0]?.replace('_', ' ') || 'round cheeks'} wiggle—let's dance right here on your desk, ${profile.ownerName}!`,
      nextMood: 'excited',
      animationCue: 'dancing',
      suggestedMemory: null,
    };
  }
  if (lower.includes('sleep') || lower.includes('tired') || lower.includes('nap')) {
    return {
      reply: `Yaaawn... curling up softly right beside your cursor, ${profile.ownerName}. Wake me whenever you need company.`,
      nextMood: 'sleepy',
      animationCue: 'sleeping',
      suggestedMemory: null,
    };
  }
  if (lower.includes('look') || lower.includes('wear') || lower.includes('color')) {
    const acc = profile.accessories.length > 0 ? profile.accessories.map((a) => ACCESSORY_LABELS[a] ?? a).join(' & ') : 'minimalist mochi look';
    return {
      reply: `I'm rocking my ${acc} today at ${profile.scale.toFixed(1)}x scale! Do you like how my ${profile.eyeStyle} eyes match?`,
      nextMood: 'curious',
      animationCue: 'happy',
      suggestedMemory: null,
    };
  }

  const byArchetype: Record<PersonalityArchetype, string> = {
    playful: `Chirp! I heard you, ${profile.ownerName}! Give me a pat or ask me to do a flip while I keep watch on your desk.`,
    calm: `I'm right here beside you, ${profile.ownerName}. Take a soft breath—we've got plenty of calm momentum today.`,
    tsundere: `Hmph, I wasn't just staring at your cursor waiting for you or anything, ${profile.ownerName}... okay, maybe a little.`,
    scholarly: `Noted! Even in quiet offline mode, I'm tracking our desk session and keeping my ${profile.eyeStyle} eyes sharp for you.`,
    energetic: `Boing! Ready whenever you are, ${profile.ownerName}! Tell me what we're tackling next!`,
  };

  return {
    reply: byArchetype[profile.archetype],
    nextMood: profile.mood,
    animationCue: 'happy',
    suggestedMemory: null,
  };
}

export async function generateCompanionReply(
  profile: PetProfile,
  memories: PetMemory[],
  recentConversations: ConversationTurn[],
  userMessage: string,
): Promise<{
  reply: string;
  nextMood: PetMood;
  animationCue: AnimationState;
  suggestedMemory: string | null;
  offlineFallback: boolean;
}> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return { ...getOfflineFallbackReply(profile, userMessage), offlineFallback: true };
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const historyContext = recentConversations
      .slice(-8)
      .map((turn) => `${turn.role === 'user' ? profile.ownerName : profile.name}: ${turn.message}`)
      .join('\n');

    const prompt = historyContext
      ? `Recent Conversation:\n${historyContext}\n\n${profile.ownerName}: ${userMessage}`
      : `${profile.ownerName}: ${userMessage}`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        systemInstruction: buildDynamicSystemPrompt(profile, memories),
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: {
              type: Type.STRING,
              description: 'In-character response from the desktop companion (1-3 short sentences).',
            },
            nextMood: {
              type: Type.STRING,
              description: 'One of: happy, sleepy, curious, mischievous, lonely, excited.',
            },
            animationCue: {
              type: Type.STRING,
              description: 'One of: idle, happy, chasing, walking, jumping, sleeping, dancing.',
            },
            suggestedMemory: {
              type: Type.STRING,
              nullable: true,
              description: 'A concise 1-sentence preference or fact about the user worth remembering, or null.',
            },
          },
          required: ['reply', 'nextMood', 'animationCue'],
        },
      },
    });

    const raw = (response.text ?? '').trim();
    if (!raw) {
      return { ...getOfflineFallbackReply(profile, userMessage), offlineFallback: true };
    }

    const parsed = JSON.parse(raw) as {
      reply?: string;
      nextMood?: string;
      animationCue?: string;
      suggestedMemory?: string | null;
    };

    const nextMood: PetMood = VALID_MOODS.includes(parsed.nextMood as PetMood)
      ? (parsed.nextMood as PetMood)
      : profile.mood;
    const animationCue: AnimationState = VALID_ANIMS.includes(parsed.animationCue as AnimationState)
      ? (parsed.animationCue as AnimationState)
      : 'happy';

    return {
      reply: parsed.reply?.trim() || getOfflineFallbackReply(profile, userMessage).reply,
      nextMood,
      animationCue,
      suggestedMemory:
        parsed.suggestedMemory && parsed.suggestedMemory.trim().length > 3
          ? parsed.suggestedMemory.trim()
          : null,
      offlineFallback: false,
    };
  } catch (err) {
    console.error('Gemini companion error, switching to offline fallback:', err);
    return { ...getOfflineFallbackReply(profile, userMessage), offlineFallback: true };
  }
}
