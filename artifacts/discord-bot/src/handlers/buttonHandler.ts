import { GuildMember, TextChannel, type ButtonInteraction } from 'discord.js';
import { ALLOWED_GUILD_IDS } from '../config.js';
import { runPartnershipFlow, activeChannels } from './questionFlow.js';

export async function handlePartnershipApplyButton(
  interaction: ButtonInteraction,
): Promise<void> {
  if (!interaction.guildId || !ALLOWED_GUILD_IDS.includes(interaction.guildId)) return;
  if (!interaction.guild || !interaction.channel) return;

  // Prevent duplicate sessions in the same channel
  if (activeChannels.has(interaction.channelId)) {
    await interaction.reply({ content: 'A session is already running in this channel.', ephemeral: true });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    const guild  = interaction.guild;
    const member = interaction.member instanceof GuildMember
      ? interaction.member
      : await guild.members.fetch(interaction.user.id);
    const channel = interaction.channel as TextChannel;

    await interaction.deleteReply().catch(() => {});

    runPartnershipFlow(channel, member, guild).catch((err) => {
      console.error('[questionFlow] error:', err);
    });
  } catch (err) {
    console.error('[button] error:', err);
    await interaction.editReply({
      content: `Failed: ${err instanceof Error ? err.message : String(err)}`,
    }).catch(() => {});
  }
}
