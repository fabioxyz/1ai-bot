'use strict';

const { config } = require('../config');

/** fetch with an explicit upper bound so a hung provider never blocks a handler. */
async function fetchWithTimeout(url, options) {
  try {
    return await fetch(url, { ...options, signal: AbortSignal.timeout(config.ai.timeoutMs) });
  } catch (err) {
    if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
      throw new Error(`AI provider timed out after ${config.ai.timeoutMs}ms`);
    }
    throw err;
  }
}

/**
 * Unified free-tier AI completion client.
 * Supports Google Gemini API (free tier), Groq API (free tier), and local Ollama.
 * Uses Node.js 18+ native fetch with zero extra SDK dependencies.
 */
async function generateCompletion({ systemPrompt, userPrompt, temperature = 0.4, maxTokens = 700 }) {
  const provider = config.ai.provider;

  if (provider === 'gemini') {
    return callGemini({ systemPrompt, userPrompt, temperature, maxTokens });
  }
  if (provider === 'groq') {
    return callGroq({ systemPrompt, userPrompt, temperature, maxTokens });
  }
  if (provider === 'ollama') {
    return callOllama({ systemPrompt, userPrompt, temperature });
  }

  throw new Error(`Unsupported AI_PROVIDER "${provider}". Use "gemini", "groq", or "ollama".`);
}

async function callGemini({ systemPrompt, userPrompt, temperature, maxTokens }) {
  const apiKey = config.ai.geminiApiKey;
  if (!apiKey) throw new Error('Missing GEMINI_API_KEY in .env');

  const model = config.ai.geminiModel;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${errText.slice(0, 300)}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('').trim();
  if (!text) throw new Error('Gemini returned an empty response.');
  return text;
}

async function callGroq({ systemPrompt, userPrompt, temperature, maxTokens }) {
  const apiKey = config.ai.groqApiKey;
  if (!apiKey) throw new Error('Missing GROQ_API_KEY in .env');

  const res = await fetchWithTimeout('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: config.ai.groqModel,
      temperature,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq API error (${res.status}): ${errText.slice(0, 300)}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('Groq returned an empty response.');
  return text;
}

async function callOllama({ systemPrompt, userPrompt, temperature }) {
  const url = `${config.ai.ollamaUrl}/api/chat`;
  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: config.ai.ollamaModel,
      stream: false,
      options: { temperature },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Ollama API error (${res.status}): ${errText.slice(0, 300)}`);
  }

  const data = await res.json();
  const text = data?.message?.content?.trim();
  if (!text) throw new Error('Ollama returned an empty response.');
  return text;
}

module.exports = { generateCompletion };
