import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { prisma } from '@vibe/database';

export const callerProfileCommand = {
  data: new SlashCommandBuilder()
    .setName('caller-profile')
    .setDescription('Show the profile of a caller')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to show the profile for')
        .setRequired(false)),
  async execute(interaction: ChatInputCommandInteraction) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    await interaction.deferReply();

    const caller = await prisma.caller.findUnique({
      where: { discordId: targetUser.id },
      include: {
        calls: {
          orderBy: { timestamp: 'desc' },
          take: 5,
          include: { project: true }
        }
      }
    });

    if (!caller) {
      return interaction.editReply({ content: 'This user has not made any calls yet.' });
    }

    const embed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle(`👤 Caller Profile: ${targetUser.username}`)
      .setThumbnail(targetUser.displayAvatarURL())
      .addFields(
        { name: 'Reputation', value: caller.reputation.toString(), inline: true },
        { name: 'Total Calls', value: caller.totalCalls.toString(), inline: true },
        { name: 'Accuracy', value: `${(caller.accuracyScore * 100).toFixed(1)}%`, inline: true }
      )
      .addFields({ name: 'Recent Calls', value: caller.calls.length > 0
        ? caller.calls.map((c: typeof caller.calls[0]) => `• **@${c.project.handle}** (<t:${Math.floor(c.timestamp.getTime() / 1000)}:R>)`).join('\n')
        : 'No calls yet.'
      })
      .setTimestamp()
      .setFooter({ text: 'Vibe Calls • Reputation System' });

    await interaction.editReply({ embeds: [embed] });
  },
};
