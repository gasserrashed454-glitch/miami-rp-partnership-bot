import { Events, TextChannel, ChannelType } from 'discord.js';
import { ALLOWED_GUILD_IDS } from '../config.js';
import { buildPartnershipRequirementsEmbed, buildPartnershipButton } from '../utils/embeds.js';

export const name = Events.ChannelCreate;

export async function execute(channel: TextChannel): Promise<void> {
  // Only text channels in whitelisted guilds
  if (channel.type !== ChannelType.GuildText) return;
  if (!channel.guild) return;
  if (!ALLOWED_GUILD_IDS.includes(channel.guild.id)) return;
  if (!channel.name.toLowerCase().includes('partner')) return;

  try {
    await channel.send({
      embeds: [buildPartnershipRequirementsEmbed()],
      components: [buildPartnershipButton()],
    });
    console.log(`✅ Sent partnership embed to #${channel.name} in ${channel.guild.name}`);
  } catch (err) {
    console.error(`❌ Failed to send to #${channel.name}:`, err);
  }
}
