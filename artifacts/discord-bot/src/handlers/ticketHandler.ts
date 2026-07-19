import {
  type Guild,
  type GuildMember,
  ChannelType,
  PermissionFlagsBits,
  CategoryChannel,
  TextChannel,
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
  const safeUsername = member.user.username
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 40);
  const channelName = `partnership-${safeUsername}`;

  // Check for an existing open ticket
  const existing = guild.channels.cache.find(
    (ch) => ch.name === channelName,
  ) as TextChannel | undefined;
  if (existing) {
    return { channel: existing, alreadyExists: true };
  }

  const category = await getOrCreateTicketCategory(guild);
  const botMember = guild.members.cache.get(guild.client.user!.id);

  // Only requires ManageChannels — no ManageRoles needed for channel-level overwrites
  const channel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: category,
    permissionOverwrites: [
      {
        id: guild.roles.everyone.id,
        deny: [PermissionFlagsBits.ViewChannel],
      },
      {
        id: member.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.EmbedLinks,
          PermissionFlagsBits.ReadMessageHistory,
        ],
      },
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
