'use strict';

const { SlashCommandBuilder, EmbedBuilder, InteractionContextType, MessageFlags } = require('discord.js');
const { answerQuestion } = require('../features/autoSupport');
const { incrementStat } = require('../store/stats');
const { config } = require('../config');
const { createCooldown } = require('../util/cooldown');
const { NO_MENTIONS, sanitizeForDisplay } = require('../util/discord');

const cooldown = createCooldown(config.commands.cooldownSeconds);

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ask')
    .setDescription('Ask +1AI a question using the server FAQ and AI knowledge')
    .setContexts(InteractionContextType.Guild)
    .addStringOption((opt) =>
      opt
        .setName('question')
        .setDescription('What would you like to ask?')
        .setRequired(true)
        .setMaxLength(500)
    ),

  async execute(interaction) {
    const wait = cooldown.check(interaction.user.id);
    if (wait > 0) {
      return interaction.reply({
        content: `Please wait ${wait}s before using AI commands again.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const question = interaction.options.getString('question', true);
    await interaction.deferReply();

    try {
      const answer = await answerQuestion(question, interaction.guild?.name || 'Discord');
      incrementStat('questionsAnswered');

      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('🤖 +1AI Answer')
        .addFields({ name: 'Question', value: sanitizeForDisplay(question, 1000) })
        .setDescription(answer.slice(0, 3800))
        .setFooter({ text: `+1AI • Provider: ${config.ai.provider.toUpperCase()}` })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed], allowedMentions: NO_MENTIONS });
    } catch (err) {
      console.error('[/ask] Error:', err.message);
      await interaction.editReply('Could not get an answer right now. Please try again later.');
    }
  },
};
