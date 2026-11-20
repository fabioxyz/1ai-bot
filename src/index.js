'use strict';

const { Client, Collection, Events, GatewayIntentBits, ActivityType, MessageFlags } = require('discord.js');
const { config, getActiveModel } = require('./config');
const { handleAntiScam } = require('./features/antiScam');
const { handleAutoSupport } = require('./features/autoSupport');

if (!config.discord.token) {
  console.error('❌ Missing DISCORD_TOKEN in .env — copy .env.example to .env and fill in your credentials.');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.commands = new Collection();
for (const cmd of [
  require('./commands/summarize'),
  require('./commands/ask'),
  require('./commands/status'),
]) {
  client.commands.set(cmd.data.name, cmd);
}

client.once(Events.ClientReady, (c) => {
  console.log(`🚀 +1AI is online as ${c.user.tag}`);
  console.log(`🧠 Provider: ${config.ai.provider.toUpperCase()} (${getActiveModel()})`);
  console.log(`🛡️ Anti-Scam Shield: ${config.antiScam.enabled ? `ENABLED (mode: ${config.antiScam.mode})` : 'DISABLED'}`);
  console.log(`✨ /summarize channels: ${config.summarize.channelIds.length ? config.summarize.channelIds.join(', ') : 'none (set SUMMARIZE_CHANNEL_IDS)'}`);

  c.user.setPresence({
    activities: [{ name: '/summarize & Auto-Support', type: ActivityType.Watching }],
    status: 'online',
  });
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (err) {
    console.error(`[Command /${interaction.commandName}]`, err);
    const msg = { content: 'Something went wrong while executing this command.', flags: MessageFlags.Ephemeral };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(msg).catch(() => {});
    } else {
      await interaction.reply(msg).catch(() => {});
    }
  }
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot || !message.guild) return;

  // 1. Run AI Anti-Scam Shield first
  const wasBlocked = await handleAntiScam(message);
  if (wasBlocked) return;

  // 2. Run Auto-Support (FAQ) if mentioned or inside a support channel
  await handleAutoSupport(message, client);
});

client.login(config.discord.token);
