import {
  type Guild,
  type GuildMember,
  ChannelType,
  PermissionFlagsBits,
  CategoryChannel,
} from 'discord.js';
import { TICKET_CATEGORY_NAME } from '../config.js';

export async function getOrCreateTicketCategory(
  guild: Guild,
): Promise<CategoryChannel> {
  const existing = guild.channels.cache.find(
    (ch) =>
      ch.type === ChannelType.GuildCategory &&
      ch.name === TICKET_CATEGORY_NAME,
  ) as CategoryChannel | undefined;

  if (existing) return existing;

  return guild.channels.create({
    name: TICKET_CATEGORY_NAME,
    type: ChannelType.GuildCategory,
  });
}

export async function createPartnershipTicket(
  guild: Guild,
  member: GuildMember,
) {
  // Check if user already has an open ticket
  const existingName = `partnership-${member.user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
  const existingChannel = guild.channels.cache.find(
    (ch) => ch.name === existingName,
  );
  if (existingChannel) {
    return { channel: existingChannel, alreadyExists: true };
  }

  const category = await getOrCreateTicketCategory(guild);

  const botMember = guild.members.cache.get(guild.client.user!.id);

  const channel = await guild.channels.create({
    name: existingName,
    type: ChannelType.GuildText,
    parent: category,
    permissionOverwrites: [
      {
        // Deny everyone
        id: guild.roles.everyone.id,
        deny: [PermissionFlagsBits.ViewChannel],
      },
      {
        // Allow the applicant
        id: member.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.EmbedLinks,
          PermissionFlagsBits.ReadMessageHistory,
        ],
      },
      // Allow the bot itself
      ...(botMember
        ? [
            {
              id: botMember.id,
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.EmbedLinks,
                PermissionFlagsBits.ManageMessages,
                PermissionFlagsBits.ReadMessageHistory,
              ],
            },
          ]
        : []),
    ],
  });

  return { channel, alreadyExists: false };
}

export async function closeTicket(channelId: string, guild: Guild) {
  const channel = guild.channels.cache.get(channelId);
  if (channel) {
    await channel.delete('Partnership ticket closed');
  }
}
