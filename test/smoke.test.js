'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { isPotentiallySuspicious } = require('../src/features/antiScam');
const { loadKnowledgeBase } = require('../src/features/autoSupport');
const summarizeCmd = require('../src/commands/summarize');
const askCmd = require('../src/commands/ask');
const statusCmd = require('../src/commands/status');

test('Anti-scam pre-filter flags known phishing patterns', () => {
  assert.equal(isPotentiallySuspicious('CLAIM FREE DISCORD NITRO NOW at http://dlscord-gift.xyz/claim'), true);
  assert.equal(isPotentiallySuspicious('@everyone claim your free crypto airdrop https://bonus-wallet.site'), true);
  assert.equal(isPotentiallySuspicious('Hey everyone, how do I open a support ticket?'), false);
});

test('Knowledge base loads knowledge/faq.md', () => {
  const kb = loadKnowledgeBase();
  assert.ok(kb.includes('Frequently Asked Questions'));
});

test('Slash commands export valid builders', () => {
  assert.equal(summarizeCmd.data.name, 'summarize');
  assert.equal(askCmd.data.name, 'ask');
  assert.equal(statusCmd.data.name, 'ai-status');
});
