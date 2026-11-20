'use strict';

const { REST, Routes } = require('discord.js');
const { config } = require('./config');

const commands = [
  require('./commands/summarize').data.toJSON(),
  require('./commands/ask').data.toJSON(),
  require('./commands/status').data.toJSON(),
];

(async () => {
  if (!config.discord.token || !config.discord.clientId) {
    console.error('❌ Missing DISCORD_TOKEN or DISCORD_CLIENT_ID in .env');
    process.exit(1);
  }

  const rest = new REST({ version: '10' }).setToken(config.discord.token);

  try {
    console.log(`🔄 Registering ${commands.length} slash commands...`);
    if (config.discord.guildId) {
      await rest.put(
        Routes.applicationGuildCommands(config.discord.clientId, config.discord.guildId),
        { body: commands }
      );
      console.log(`✅ Commands registered instantly in guild ${config.discord.guildId}`);
    } else {
      await rest.put(Routes.applicationCommands(config.discord.clientId), { body: commands });
      console.log('✅ Commands registered globally (may take a few minutes to propagate).');
    }
  } catch (err) {
    console.error('❌ Failed to register commands:', err);
    process.exit(1);
  }
})();
