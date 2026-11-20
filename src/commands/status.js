'use strict';

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { config, getActiveModel } = require('../config');
const { getStats } = require('../store/stats');

function formatUptime(ms) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}h ${m}m ${s % 60}s`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ai-status')
    .setDescription('Show +1AI active provider, protection status, and usage stats'),

  async execute(interaction) {
    const stats = getStats();
    const uptime = formatUptime(Date.now() - stats.startedAt);

    const embed = new EmbedBuilder()
      .setColor(0x00d4ff)
      .setTitle('⚡ +1AI System Status')
      .addFields(
        { name: 'AI Provider', value: `\`${config.ai.provider.toUpperCase()}\``, inline: true },
        { name: 'Model', value: `\`${getActiveModel()}\``, inline: true },
        { name: 'Uptime', value: `\`${uptime}\``, inline: true },
        { name: 'Anti-Scam Shield', value: config.antiScam.enabled ? `🟢 Active (${config.antiScam.mode})` : '🔴 Disabled', inline: true },
        { name: 'Questions Answered', value: `**${stats.questionsAnswered}**`, inline: true },
        { name: 'Summaries Generated', value: `**${stats.summariesGenerated}**`, inline: true },
        { name: 'Scams Blocked', value: `**${stats.scamsBlocked}**`, inline: true }
      )
      .setFooter({ text: '+1AI Open-Source Discord Bot • MIT License' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
