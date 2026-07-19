import {
  TextChannel,
  GuildMember,
  Guild,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { buildProofEmbed, buildAiVerdictEmbed, buildTicketWelcomeEmbed } from '../utils/embeds.js';
import { analyzePartnershipApplication } from '../utils/mistral.js';
import { GUILD_CHANNELS } from '../config.js';

const TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes per question

/** Sends a question and waits for the applicant to reply with text. */
async function askText(channel: TextChannel, userId: string, question: string): Promise<string> {
  await channel.send(question);
  const collected = await channel.awaitMessages({
    filter: (m) => m.author.id === userId && !m.author.bot,
    max: 1,
    time: TIMEOUT_MS,
    errors: ['time'],
  });
  return collected.first()!.content.trim();
}

/** Sends a question and waits for the applicant to reply with an image attachment or a URL. */
async function askProof(channel: TextChannel, userId: string, question: string): Promise<string | undefined> {
  await channel.send(question);
  const collected = await channel.awaitMessages({
    filter: (m) => m.author.id === userId && !m.author.bot,
    max: 1,
    time: TIMEOUT_MS,
    errors: ['time'],
  });
  const msg = collected.first()!;
  // Prefer an image attachment; fall back to a typed URL
  const attachment = msg.attachments.find((a) => /\.(png|jpg|jpeg|gif|webp)$/i.test(a.name ?? ''));
  if (attachment) return attachment.url;
  const content = msg.content.trim();
  if (content.startsWith('http')) return content;
  return undefined;
}

export async function runPartnershipQuestions(
  channel: TextChannel,
  member: GuildMember,
  guild: Guild,
): Promise<void> {
  // Welcome embed + close button
  const closeRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('close_ticket')
      .setLabel('Close Ticket')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('🔒'),
  );
  await channel.send({
    content: `${member}`,
    embeds: [buildTicketWelcomeEmbed(member)],
    components: [closeRow],
  });

  try {
    const serverName  = await askText(channel, member.id, '**1️⃣ What is your server name?**');
    const inviteLink  = await askText(channel, member.id, '**2️⃣ What is your server invite link?**');
    const memberCount = await askText(channel, member.id, '**3️⃣ How many real members does your server have? (excluding bots)**');
    const description = await askText(channel, member.id, '**4️⃣ Tell us about your server and community:**');
    const proofUrl    = await askProof(channel, member.id, '**5️⃣ Send your proof screenshot — attach the image directly here:**');

    // Proof embed inside the ticket
    const proofEmbed = buildProofEmbed({ member, serverName, inviteLink, memberCount, proofUrl });
    await channel.send({
      content: '✅ Application received! A staff member will review it shortly.',
      embeds: [proofEmbed],
    });

    // Post to configured partner / proof channels for this guild
    const guildChannels = GUILD_CHANNELS[guild.id];
    if (guildChannels) {
      const sendTo = async (channelId: string) => {
        try {
          const ch = await guild.channels.fetch(channelId) as TextChannel | null;
          if (ch?.isTextBased()) {
            await ch.send({
              content: `📋 New partnership application from ${member} — ticket: ${channel}`,
              embeds: [proofEmbed],
            });
          }
        } catch { /* channel not accessible — skip */ }
      };
      await sendTo(guildChannels.partnerChannelId);
      if (guildChannels.proofChannelId) await sendTo(guildChannels.proofChannelId);
    }

    // AI analysis
    try {
      const analysis = await analyzePartnershipApplication({ serverName, inviteLink, memberCount, description, proofUrl });
      await channel.send({ embeds: [buildAiVerdictEmbed(analysis)] });
    } catch {
      await channel.send({ content: '⚠️ AI pre-check unavailable — a staff member will review manually.' });
    }
  } catch {
    await channel.send(
      `⏰ Application timed out — no response received within 10 minutes. Feel free to start a new application anytime.`,
    );
  }
}
