'use strict';

const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');
const { config } = require('../config');
const { generateCompletion } = require('../ai/provider');
const { incrementStat } = require('../store/stats');
const { createCooldown } = require('../util/cooldown');
const { NO_MENTIONS } = require('../util/discord');

const FAQ_PATH = path.join(__dirname, '..', '..', 'knowledge', 'faq.md');
const cooldown = createCooldown(config.support.cooldownSeconds);

function loadKnowledgeBase() {
  try {
    if (fs.existsSync(FAQ_PATH)) {
      return fs.readFileSync(FAQ_PATH, 'utf8').trim();
    }
  } catch (err) {
    console.error('[Auto-Support] Could not read knowledge/faq.md:', err.message);
  }
  return 'No custom FAQ configured yet.';
}

async function answerQuestion(question, serverName = 'this Discord server') {
  const faq = loadKnowledgeBase();
  const systemPrompt = [
    `You are +1AI, a helpful, concise, and friendly AI support assistant for "${serverName}".`,
    'Answer user questions primarily using the Server Knowledge Base below.',
    'If the answer is not in the knowledge base, give a helpful general answer or advise opening a ticket with staff.',
    'Keep responses clear, well-formatted for Discord, and under 1200 characters.',
    '',
    '--- SERVER KNOWLEDGE BASE ---',
    faq,
  ].join('\n');

  return generateCompletion({
    systemPrompt,
    userPrompt: question,
    temperature: 0.35,
    maxTokens: 500,
  });
}

async function handleAutoSupport(message, client) {
  if (!message.guild || message.author.bot) return false;

  const isSupportChannel = config.support.channelIds.includes(message.channel.id);
  if (!isSupportChannel && !isDirectMention(message, client.user)) return false;

  const cleanedQuestion = message.content
    .replace(new RegExp(`<@!?${client.user.id}>`, 'g'), '')
    .trim();

  if (cleanedQuestion.length < 3) return false;

  if (cooldown.check(message.author.id) > 0) return false;

  await message.channel.sendTyping().catch(() => {});

  try {
    const reply = await answerQuestion(cleanedQuestion, message.guild.name);
    incrementStat('questionsAnswered');

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setAuthor({ name: '+1AI Auto-Support' })
      .setDescription(reply.slice(0, 4000))
      .setFooter({ text: `Answered using knowledge/faq.md • Provider: ${config.ai.provider.toUpperCase()}` });

    await message.reply({ embeds: [embed], allowedMentions: NO_MENTIONS });
    return true;
  } catch (err) {
    console.error('[Auto-Support] Error:', err.message);
    return false;
  }
}

/** True only for an explicit @bot mention — not @everyone/@here, roles, or reply pings. */
function isDirectMention(message, botUser) {
  return message.mentions.has(botUser, { ignoreEveryone: true, ignoreRoles: true, ignoreRepliedUser: true });
}

module.exports = { handleAutoSupport, answerQuestion, loadKnowledgeBase, isDirectMention };
