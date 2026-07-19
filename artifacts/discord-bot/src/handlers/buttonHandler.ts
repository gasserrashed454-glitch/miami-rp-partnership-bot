import { type ButtonInteraction } from 'discord.js';
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

  await interaction.deferReply({ ephemeral: true });

  try {
    const guild  = interaction.guild;
    const member = await guild.members.fetch(interaction.user.id);

    const { channel, alreadyExists } = await createPartnershipTicket(guild, member);

    if (alreadyExists) {
      await interaction.editReply({
        content: `❌ You already have an open partnership ticket: ${channel}`,
      });
      return;
    }

    await interaction.editReply({
      content: `✅ Your partnership ticket has been created: ${channel}`,
    });

    runPartnershipFlow(channel, member, guild).catch((err) => {
      console.error('[questionFlow] error:', err);
    });
  } catch (err) {
    console.error('[handlePartnershipApplyButton] error:', err);
    await interaction.editReply({
      content: '❌ Something went wrong creating your ticket. Please try again or contact staff.',
    }).catch(() => {});
  }
}
