'use strict';

// Configure BEFORE loading any project module (config is read at require time).
process.env.ANTI_SCAM_MODE = 'enforce';
process.env.ANTI_SCAM_ENABLED = 'true';
process.env.ANTI_SCAM_MIN_CONFIDENCE = '85';
process.env.ANTI_SCAM_TIMEOUT_MINUTES = '10';
process.env.MOD_LOG_CHANNEL_ID = 'modlog';
process.env.SUMMARIZE_CHANNEL_IDS = 'allowed-1';

const test = require('node:test');
const assert = require('node:assert/strict');

// Stub AI + stats so no network / disk is used.
const provider = require('../src/ai/provider');
let nextAiResponse = '';
provider.generateCompletion = async () => nextAiResponse;

const stats = require('../src/store/stats');
const counted = [];
stats.incrementStat = (k) => counted.push(k);

const { handleAntiScam, parseVerdict } = require('../src/features/antiScam');
const { buildTranscript, isChannelAllowed } = require('../src/commands/summarize');
const { isDirectMention } = require('../src/features/autoSupport');
const { createCooldown } = require('../src/util/cooldown');

function fakeScamMessage({ deleteFails = false, moderatable = true } = {}) {
  const channelSends = [];
  const logSends = [];
  const msg = {
    content: '@everyone CLAIM FREE DISCORD NITRO http://dlscord-gift.xyz/claim',
    url: 'https://discord.com/channels/g/c/m',
    author: { id: 'u1', tag: 'scammer#0001', bot: false },
    channel: { id: 'c1', send: async (p) => { channelSends.push(p); return { delete: async () => {} }; } },
    member: {
      moderatable,
      permissions: { has: () => false },
      timeout: async () => {},
    },
    guild: {
      channels: { fetch: async () => ({ isTextBased: () => true, send: async (p) => { logSends.push(p); return {}; } }) },
    },
    delete: async () => { if (deleteFails) throw new Error('Missing Permissions'); },
  };
  return { msg, channelSends, logSends };
}

const SCAM_JSON = JSON.stringify({ isScam: true, confidence: 99, category: 'Nitro Phishing', reason: 'lookalike domain' });

// ---------------------------------------------------------------- Anti-scam
test('anti-scam: failed delete is NOT counted nor announced, and mod-log reports the failure', async () => {
  counted.length = 0;
  nextAiResponse = SCAM_JSON;
  const { msg, channelSends, logSends } = fakeScamMessage({ deleteFails: true });

  const removed = await handleAntiScam(msg);

  assert.equal(removed, false);
  assert.deepEqual(counted, []);
  assert.equal(channelSends.length, 0, 'no public "Scam Message Removed" embed');
  assert.equal(logSends.length, 1);
  const actions = logSends[0].embeds[0].data.fields.find((f) => f.name === 'Actions').value;
  assert.match(actions, /Delete FAILED: Missing Permissions/);
});

test('anti-scam: successful delete is counted and announced', async () => {
  counted.length = 0;
  nextAiResponse = SCAM_JSON;
  const { msg, channelSends } = fakeScamMessage();
  assert.equal(await handleAntiScam(msg), true);
  assert.deepEqual(counted, ['scamsBlocked']);
  assert.equal(channelSends.length, 1);
  assert.deepEqual(channelSends[0].allowedMentions.parse, []);
});

test('anti-scam: malformed or out-of-range AI verdicts never trigger actions', async () => {
  const bad = [
    '{"isScam":"yes","confidence":99,"category":"Nitro Phishing"}',
    '{"isScam":true,"confidence":"99","category":"Nitro Phishing"}',
    '{"isScam":true,"confidence":500,"category":"Nitro Phishing"}',
    '{"isScam":true,"confidence":99,"category":"Ban everyone"}',
    '{"isScam":true,"confidence":99,"category":"Safe"}',
    'not json at all',
    '[1,2,3]',
  ];
  for (const raw of bad) {
    assert.equal(parseVerdict(raw).isScam, false, raw);
    nextAiResponse = raw;
    let deleted = false;
    const { msg } = fakeScamMessage();
    msg.delete = async () => { deleted = true; };
    assert.equal(await handleAntiScam(msg), false, raw);
    assert.equal(deleted, false, raw);
  }
});

test('anti-scam: confidence below threshold takes no action', async () => {
  nextAiResponse = JSON.stringify({ isScam: true, confidence: 80, category: 'Nitro Phishing', reason: 'x' });
  let deleted = false;
  const { msg } = fakeScamMessage();
  msg.delete = async () => { deleted = true; };
  assert.equal(await handleAntiScam(msg), false);
  assert.equal(deleted, false);
});

// ---------------------------------------------------------------- /summarize
test('summarize: transcript keeps the MOST RECENT messages when over budget', () => {
  // newest-first, 100 messages, each ~200 chars
  const newestFirst = Array.from({ length: 100 }, (_, i) => ({
    author: { username: `user${i}`, bot: false },
    content: `msg-${100 - i} ` + 'x'.repeat(190),
  }));
  const { text, used, eligible } = buildTranscript(newestFirst, 12000);

  assert.equal(eligible, 100);
  assert.ok(used < 100);
  assert.ok(text.length <= 12000);
  const lines = text.split('\n');
  assert.match(lines[lines.length - 1], /msg-100 /, 'newest message is last (chronological) and included');
  assert.ok(!text.includes('msg-1 '), 'oldest message is the one dropped');
});

test('summarize: only allow-listed channels (opt-in)', () => {
  assert.equal(isChannelAllowed('allowed-1'), true);
  assert.equal(isChannelAllowed('other'), false);
  assert.equal(isChannelAllowed('x', []), false);
  assert.equal(isChannelAllowed('x', ['*']), true);
});

test('summarize: requester without Read Message History is refused privately', async () => {
  const cmd = require('../src/commands/summarize');
  let reply;
  let fetched = false;
  const interaction = {
    inGuild: () => true,
    channelId: 'allowed-1',
    channel: { messages: { fetch: async () => { fetched = true; return new Map(); } } },
    memberPermissions: { has: () => false },
    user: { id: 'u-noperm' },
    reply: async (p) => { reply = p; },
  };
  await cmd.execute(interaction);
  assert.equal(fetched, false, 'history must not be fetched');
  assert.match(reply.content, /Read Message History/);
  assert.ok(reply.flags, 'reply is ephemeral');
});

// ---------------------------------------------------------------- Limits
test('auto-support: @everyone / @here does not count as a mention of the bot (real MessageMentions)', () => {
  const { Client, MessageMentions } = require('discord.js');
  const client = new Client({ intents: [] });
  const botUser = client.users._add({ id: '111111111111111111', username: 'plus1ai', discriminator: '0', bot: true });
  const msgEveryone = { client, guild: null, channel: null, content: '@everyone how do I open a ticket?' };
  const msgDirect = { client, guild: null, channel: null, content: `<@${botUser.id}> how do I open a ticket?` };

  const everyoneOnly = { mentions: new MessageMentions(msgEveryone, [], [], true, [], null) };
  const direct = { mentions: new MessageMentions(msgDirect, [{ id: botUser.id, username: 'plus1ai', discriminator: '0', bot: true }], [], false, [], null) };

  // Old check (mentions.has(id)) was true for @everyone:
  assert.equal(everyoneOnly.mentions.has(botUser), true, 'sanity: default has() counts @everyone');
  assert.equal(isDirectMention(everyoneOnly, botUser), false);
  assert.equal(isDirectMention(direct, botUser), true);
  client.destroy();
});

test('cooldown: blocks repeated calls within the window', () => {
  let now = 0;
  const cd = createCooldown(30, () => now);
  assert.equal(cd.check('u'), 0);
  now = 10_000;
  assert.equal(cd.check('u'), 20);
  now = 31_000;
  assert.equal(cd.check('u'), 0);
});
