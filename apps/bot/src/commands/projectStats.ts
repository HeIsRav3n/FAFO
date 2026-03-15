import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { prisma } from '@vibe/database';

export const projectStatsCommand = {
  data: new SlashCommandBuilder()
    .setName('project-stats')
    .setDescription('Show stats for a project')
    .addStringOption(option =>
      option.setName('handle')
        .setDescription('The Twitter handle of the project')
        .setRequired(true)),
  async execute(interaction: ChatInputCommandInteraction) {
    const handle = interaction.options.getString('handle')?.replace('@', '').toLowerCase();
    await interaction.deferReply();

    const project = await prisma.project.findUnique({
      where: { handle },
      include: {
        calls: {
          orderBy: { timestamp: 'desc' },
          take: 5,
          include: { caller: true }
        },
        snapshots: {
          orderBy: { timestamp: 'desc' },
          take: 10
        }
      }
    });

    if (!project) {
      return interaction.editReply({ content: `No data found for @${handle}. It might not have been called yet.` });
    }

    const embed = new EmbedBuilder()
      .setColor(0x1DA1F2)
      .setTitle(`📊 Project Stats: @${project.handle}`)
      .setThumbnail(project.profileImageUrl || null)
      .addFields(
        { name: 'Followers', value: project.followersCount.toLocaleString(), inline: true },
        { name: 'Verified', value: project.verified ? '✅ Yes' : '❌ No', inline: true },
        { name: 'Last Updated', value: `<t:${Math.floor(project.lastUpdated.getTime() / 1000)}:R>`, inline: true }
      )
      .addFields({ name: 'Recent Calls', value: project.calls.length > 0
        ? project.calls.map((c: typeof project.calls[0]) => `• Called by **${c.caller.username}** (<t:${Math.floor(c.timestamp.getTime() / 1000)}:R>)`).join('\n')
        : 'No calls registered yet.'
      })
      .setTimestamp()
      .setFooter({ text: 'Vibe Calls • Project Intelligence' });

    await interaction.editReply({ embeds: [embed] });
  },
};
