// Production Deployment Trigger - v1.0.1
import { Client, GatewayIntentBits, Collection, Events } from 'discord.js';
import * as dotenv from 'dotenv';
import { prisma } from '@vibe/database';
import { handleLinkDetection } from './lib/linkDetection';
import { registerCommands } from './lib/registerCommands';
import chalk from 'chalk';

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Store commands for easy access
(client as any).commands = new Collection();

client.once(Events.ClientReady, async (c) => {
  console.log(chalk.green(`\n🚀 Bot is online! Logged in as ${c.user.tag}`));
  
  // Register slash commands
  await registerCommands(client);
  
  console.log(chalk.blue('📡 Monitoring for Twitter/X links...'));
});

client.on(Events.MessageCreate, async (message) => {
  try {
    if (message.author.bot) return;

    // Link Detection Logic
    await handleLinkDetection(message);
  } catch (error) {
    console.error(chalk.red('Error processing message:'), error);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (!interaction.isChatInputCommand()) return;

    const command = (client as any).commands.get(interaction.commandName);

    if (!command) {
      console.error(chalk.red(`No command matching ${interaction.commandName} was found.`));
      return;
    }

    await command.execute(interaction);
  } catch (error) {
    console.error(chalk.red('Command execution error:'), error);
    const interactionAny = interaction as any;
    const isReplied = interactionAny.replied || interactionAny.deferred;
    try {
      if (isReplied) {
        await interactionAny.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
      } else {
        await interactionAny.reply({ content: 'There was an error while executing this command!', ephemeral: true });
      }
    } catch (replyError) {
      console.error(chalk.red('Failed to send error message:'), replyError);
    }
  }
});

client.on('error', (error) => {
  console.error(chalk.red('Discord client error:'), error);
});

process.on('unhandledRejection', (reason) => {
  console.error(chalk.red('Unhandled Promise Rejection:'), reason);
});

client.login(process.env.DISCORD_TOKEN);
