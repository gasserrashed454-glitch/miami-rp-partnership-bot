import { GuildMember, type ButtonInteraction } from 'discord.js';
import { ALLOWED_GUILD_IDS } from '../config.js';
import { createPartnershipTicket } from './ticketHandler.js';
import { runPartnershipFlow } from './questionFlow.js';

export async function handlePartnershipApplyButton(
  interaction: ButtonInteraction,
): Promise<void> {
  if (!interaction.guildId || !ALLOWED_GUILD_IDS.includes(interaction.guildId)) {
    await interaction.reply({
      content: '❌ This bot is not authorised to operate in this server.',
      ephemeral: true,
    });
    return;
  }

  if (!interaction.guild || !interaction.member) {
    await interaction.reply({ content: '❌ This can only be used in a server.', ephemeral: true });
    return;
  }

  // Acknowledge immediately — we'll delete it so nothing is visible to the user
  await interaction.deferReply({ ephemeral: true });

  try {
    const guild = interaction.guild;

    // Use the cached member from the interaction to avoid needing GuildMembers intent
    const member =
      interaction.member instanceof GuildMember
        ? interaction.member
        : await guild.members.fetch(interaction.user.id);

    const { channel, alreadyExists } = await createPartnershipTicket(guild, member);

    if (alreadyExists) {
      await interaction.editReply({
        content: `You already have an open ticket: ${channel}`,
      });
      return;
    }

    // Delete the ephemeral reply — the flow starts visibly inside the ticket channel
    await interaction.deleteReply().catch(() => {});

    runPartnershipFlow(channel, member, guild).catch((err) => {
      console.error('[questionFlow] error:', err);
    });
  } catch (err) {
    console.error('[handlePartnershipApplyButton] error:', err);
    // Edit reply with the actual error so it's easier to diagnose
    await interaction.editReply({
      content: `❌ Could not create ticket: ${err instanceof Error ? err.message : String(err)}`,
    }).catch(() => {});
  }
}
