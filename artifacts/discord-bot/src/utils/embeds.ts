import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type GuildMember,
} from 'discord.js';
import {
  PARTNERSHIP_THUMBNAIL_URL,
  PARTNERSHIP_REQUIREMENTS_TEXT,
  PROOF_BOT_AVATAR_URL,
} from '../config.js';

export function buildPartnershipRequirementsEmbed(): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle('𝗣𝗔𝗥𝗧𝗡𝗘𝗥𝗦𝗛𝗜𝗣 𝗥𝗘𝗤𝗨𝗜𝗥𝗘𝗠𝗘𝗡𝗧𝗦:')
    .setDescription(PARTNERSHIP_REQUIREMENTS_TEXT)
    .setThumbnail(PARTNERSHIP_THUMBNAIL_URL)
    .setColor(0x2b2d31);
}

export function buildPartnershipButton(): ActionRowBuilder<ButtonBuilder> {
  const button = new ButtonBuilder()
    .setCustomId('partnership_apply')
    .setLabel('𝗖𝗟𝗜𝗖𝗞 - 𝗣𝗔𝗥𝗧𝗡𝗘𝗥𝗦𝗛𝗜𝗣')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('🎗️');

  return new ActionRowBuilder<ButtonBuilder>().addComponents(button);
}

export function buildProofEmbed(data: {
  member: GuildMember;
  serverName: string;
  inviteLink: string;
  memberCount: string;
  proofUrl?: string;
}): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle('𝗣𝗮𝗿𝘁𝗻𝗲𝗿𝘀𝗵𝗶𝗽 𝗣𝗿𝗼𝗼𝗳')
    .setDescription(
      `**𝗨𝘀𝗲𝗿:** ${data.member.user.tag} (${data.member.user.id})\n` +
        `**𝗦𝗲𝗿𝘃𝗲𝗿:** ${data.serverName} | ${data.inviteLink}\n` +
        `**𝗠𝗲𝗺𝗯𝗲𝗿 𝗖𝗼𝘂𝗻𝘁:** ${data.memberCount}\n` +
        `**𝗣𝗿𝗼𝗼𝗳:** ${data.proofUrl ?? 'Pending — see ticket'}`,
    )
    .setColor(0xffffff)
    .setThumbnail(data.member.user.displayAvatarURL({ size: 256 }));

  if (data.proofUrl && isImageUrl(data.proofUrl)) {
    embed.setImage(data.proofUrl);
  }

  return embed;
}

export function buildAiVerdictEmbed(analysis: string): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle('🤖 AI Pre-Check')
    .setDescription(analysis)
    .setColor(0x5865f2)
    .setFooter({ text: 'This is an automated analysis. Final decision is made by staff.' });
}

export function buildTicketWelcomeEmbed(member: GuildMember): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle('Partnership Application')
    .setDescription(
      `Hey ${member}! Your partnership application has been received.\n\n` +
        `A staff member will review your application shortly.\n\n` +
        `📋 **What happens next:**\n` +
        `• Staff will review your submission\n` +
        `• They may ask follow-up questions here\n` +
        `• You'll be notified of the decision in this ticket\n\n` +
        `*Please ensure a member of your ownership joins our server and that you're ready to post our ad.*`,
    )
    .setColor(0x57f287);
}

function isImageUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return /\.(png|jpg|jpeg|gif|webp)$/i.test(u.pathname);
  } catch {
    return false;
  }
}
