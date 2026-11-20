'use strict';

require('dotenv').config();

const parseList = (val) =>
  (val || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

const parseIntSafe = (val, def, min, max = Number.MAX_SAFE_INTEGER) => {
  const n = parseInt(val, 10);
  if (!Number.isFinite(n)) return def;
  return Math.min(max, Math.max(min, n));
};

const mode = (process.env.ANTI_SCAM_MODE || 'review').toLowerCase();

const config = {
  discord: {
    token: process.env.DISCORD_TOKEN || '',
    clientId: process.env.DISCORD_CLIENT_ID || '',
    guildId: process.env.DISCORD_GUILD_ID || '',
  },
  ai: {
    provider: (process.env.AI_PROVIDER || 'gemini').toLowerCase(),
    timeoutMs: parseIntSafe(process.env.AI_TIMEOUT_MS, 20000, 2000, 120000),
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    geminiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    groqApiKey: process.env.GROQ_API_KEY || '',
    groqModel: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    ollamaUrl: (process.env.OLLAMA_URL || 'http://localhost:11434').replace(/\/$/, ''),
    ollamaModel: process.env.OLLAMA_MODEL || 'llama3.2',
  },
  commands: {
    // Per-user cooldown shared by /ask and /summarize
    cooldownSeconds: parseIntSafe(process.env.COMMAND_COOLDOWN_SECONDS, 30, 0),
  },
  summarize: {
    // Empty = disabled everywhere (opt-in). Use "*" to allow every channel.
    channelIds: parseList(process.env.SUMMARIZE_CHANNEL_IDS),
    maxTranscriptChars: parseIntSafe(process.env.SUMMARIZE_MAX_CHARS, 12000, 1000, 100000),
  },
  support: {
    channelIds: parseList(process.env.SUPPORT_CHANNEL_IDS),
    cooldownSeconds: parseIntSafe(process.env.SUPPORT_COOLDOWN_SECONDS, 8, 2),
  },
  antiScam: {
    enabled: (process.env.ANTI_SCAM_ENABLED || 'true').toLowerCase() !== 'false',
    // "review" (default): only report to mod-logs. "enforce": delete + optional timeout.
    mode: mode === 'enforce' ? 'enforce' : 'review',
    minConfidence: parseIntSafe(process.env.ANTI_SCAM_MIN_CONFIDENCE, 85, 50, 100),
    modLogChannelId: process.env.MOD_LOG_CHANNEL_ID || '',
    timeoutMinutes: parseIntSafe(process.env.ANTI_SCAM_TIMEOUT_MINUTES, 10, 0, 60 * 24),
  },
};

function getActiveModel() {
  if (config.ai.provider === 'groq') return config.ai.groqModel;
  if (config.ai.provider === 'ollama') return config.ai.ollamaModel;
  return config.ai.geminiModel;
}

module.exports = { config, getActiveModel };
