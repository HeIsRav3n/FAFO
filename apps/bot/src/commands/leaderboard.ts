import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { prisma } from '@vibe/database';

export const leaderboardCommand = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Show the top callers or projects')
    .addStringOption(option =>
      option.setName('type')
        .setDescription('The type of leaderboard to show')
        .setRequired(true)
        .addChoices(
          { name: 'Callers', value: 'callers' },
          { name: 'Projects', value: 'projects' },
          { name: 'Growth', value: 'growth' }
        )),
  async execute(interaction: ChatInputCommandInteraction) {
    const type = interaction.options.getString('type');
    await interaction.deferReply();

    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTimestamp()
      .setFooter({ text: 'Vibe Calls Leaderboard' });

    if (type === 'callers') {
      const topCallers = await prisma.caller.findMany({
        orderBy: { reputation: 'desc' },
        take: 10,
      });

      embed.setTitle('🏆 Top Callers by Reputation');
      embed.setDescription(
        topCallers.length > 0 
          ? topCallers.map((c, i) => `${i + 1}. **${c.username}** - ${c.reputation} pts (${c.totalCalls} calls)`).join('\n')
          : 'No callers found yet.'
      );
    } else if (type === 'projects') {
      const topProjects = await prisma.project.findMany({
        orderBy: { followersCount: 'desc' },
        take: 10,
      });

      embed.setTitle('🚀 Top Projects by Followers');
      embed.setDescription(
        topProjects.length > 0 
          ? topProjects.map((p, i) => `${i + 1}. **@${p.handle}** - ${p.followersCount.toLocaleString()} followers`).join('\n')
          : 'No projects found yet.'
      );
    } else {
      embed.setTitle('📈 Highest Growth Calls (Coming Soon)');
      embed.setDescription('Performance tracking is being initialized...');
    }

    await interaction.editReply({ embeds: [embed] });
  },
};
