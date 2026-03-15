import { Client, REST, Routes, SlashCommandBuilder } from 'discord.js';
import * as dotenv from 'dotenv';
import chalk from 'chalk';
import { leaderboardCommand } from '../commands/leaderboard';
import { callerProfileCommand } from '../commands/callerProfile';
import { projectStatsCommand } from '../commands/projectStats';

dotenv.config();

const commandList = [
  leaderboardCommand,
  callerProfileCommand,
  projectStatsCommand,
];

const commands = commandList.map(cmd => cmd.data.toJSON());

export async function registerCommands(client: Client) {
  // Load commands into collection
  for (const cmd of commandList) {
    (client as any).commands.set(cmd.data.name, cmd);
  }

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN || '');

  try {
    console.log(chalk.yellow('🔄 Started refreshing application (/) commands.'));

    await rest.put(
      Routes.applicationCommands(process.env.DISCORD_CLIENT_ID || ''),
      { body: commands },
    );

    console.log(chalk.green('✅ Successfully reloaded application (/) commands.'));
  } catch (error) {
    console.error(chalk.red('Error registering commands:'), error);
  }
}
