import { Message, EmbedBuilder } from 'discord.js';
import { prisma } from '@vibe/database';
import { fetchTwitterUser, analyzeTweet } from '@vibe/core';
import { addProjectToTracker } from '@vibe/jobs';
import chalk from 'chalk';

const TWITTER_X_REGEX = /(https?:\/\/)?(www\.)?(twitter\.com|x\.com)\/([a-zA-Z0-9_]{1,15})(\/status\/(\d+))?/;

export async function handleLinkDetection(message: Message) {
  const content = message.content;
  const match = content.match(TWITTER_X_REGEX);

  if (!match) return;

  const url = match[0];
  const handle = match[4];
  const tweetId = match[6];

  console.log(chalk.cyan(`\n🔗 Detected link: ${url}`));

  try {
    // 1. Fetch Twitter User Info using Core Package
    const twitterUser = await fetchTwitterUser(handle);

    if (!twitterUser) {
      console.error(chalk.red(`Could not find Twitter user: @${handle}`));
      return;
    }

    // 2. Perform AI Analysis Concurrent with DB Ops
    const aiAnalysis = await analyzeTweet(content);

    // 3. Register/Update Project in DB
    const project = await prisma.project.upsert({
      where: { handle: handle.toLowerCase() },
      update: {
        name: twitterUser.name,
        profileImageUrl: twitterUser.profileImageUrl,
        followersCount: twitterUser.followers,
        followingCount: twitterUser.following,
        verified: twitterUser.verified,
        lastUpdated: new Date(),
      },
      create: {
        handle: handle.toLowerCase(),
        name: twitterUser.name,
        profileImageUrl: twitterUser.profileImageUrl,
        followersCount: twitterUser.followers,
        followingCount: twitterUser.following,
        verified: twitterUser.verified,
        accountCreatedAt: twitterUser.createdAt,
      },
    });

    // 4. Register Caller in DB
    const caller = await prisma.caller.upsert({
      where: { discordId: message.author.id },
      update: {
        username: message.author.username,
        totalCalls: { increment: 1 },
      },
      create: {
        discordId: message.author.id,
        username: message.author.username,
        totalCalls: 1,
      },
    });

    // 5. Register Call in DB
    const call = await prisma.call.create({
      data: {
        callerId: caller.id,
        projectId: project.id,
        tweetUrl: url,
        tweetContent: content,
        followersAtCall: twitterUser.followers,
        serverId: message.guildId || 'DM',
        channelId: message.channelId,
        messageId: message.id,
      },
    });

    // 6. Add project to background tracking
    await addProjectToTracker(project.id);

    // 7. Create confirmation embed
    const embed = new EmbedBuilder()
      .setColor(0x1DA1F2)
      .setTitle('🚨 PROJECT CALL REGISTERED')
      .setThumbnail(twitterUser.profileImageUrl || null)
      .addFields(
        { name: 'Caller', value: `<@${message.author.id}>`, inline: true },
        { name: 'Project', value: `[@${handle}](https://x.com/${handle})`, inline: true },
        { name: 'Followers at Call', value: twitterUser.followers.toLocaleString(), inline: true },
        { name: 'Server', value: message.guild?.name || 'Private', inline: true },
        { name: 'Call Time', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
        { name: 'Call ID', value: `#${call.id.slice(-6).toUpperCase()}`, inline: true }
      );

    if (aiAnalysis) {
      embed.addFields(
        { name: 'Narrative', value: aiAnalysis.narrative, inline: true },
        { name: 'Sentiment', value: aiAnalysis.sentiment.toUpperCase(), inline: true },
        { name: 'Risk Score', value: `${aiAnalysis.riskScore}/100`, inline: true }
      );
      embed.setDescription(`**AI Summary:**\n${aiAnalysis.summary}\n\n**Tweet:**\n${content.length > 200 ? content.slice(0, 200) + '...' : content}`);
    } else {
      embed.setDescription(`**Tweet:**\n${content.length > 200 ? content.slice(0, 200) + '...' : content}`);
    }

    embed.setFooter({ text: 'Vibe Calls • Call Tracker Intelligence' })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
    console.log(chalk.green(`✅ Call registered with AI analysis for @${handle} by ${message.author.username}`));

  } catch (error) {
    console.error(chalk.red('Error handling link detection:'), error);
  }
}
