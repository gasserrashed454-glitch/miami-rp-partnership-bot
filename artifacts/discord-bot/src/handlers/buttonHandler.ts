import {
  type ButtonInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} from 'discord.js';
import { ALLOWED_GUILD_IDS } from '../config.js';

export async function handlePartnershipApplyButton(
  interaction: ButtonInteraction,
): Promise<void> {
  // Guild whitelist check
  if (!interaction.guildId || !ALLOWED_GUILD_IDS.includes(interaction.guildId)) {
    await interaction.reply({
      content: '❌ This bot is not authorised to operate in this server.',
      ephemeral: true,
    });
    return;
  }

  const modal = new ModalBuilder()
    .setCustomId('partnership_modal')
    .setTitle('Partnership Application');

  const serverNameInput = new TextInputBuilder()
    .setCustomId('server_name')
    .setLabel('Server Name')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('e.g. Miami Roleplay')
    .setRequired(true)
    .setMaxLength(100);

  const inviteInput = new TextInputBuilder()
    .setCustomId('invite_link')
    .setLabel('Server Invite Link')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('e.g. https://discord.gg/example')
    .setRequired(true)
    .setMaxLength(100);

  const memberCountInput = new TextInputBuilder()
    .setCustomId('member_count')
    .setLabel('Member Count (Real members, no bots)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('e.g. 150')
    .setRequired(true)
    .setMaxLength(20);

  const descriptionInput = new TextInputBuilder()
    .setCustomId('description')
    .setLabel('Tell us about your server & community')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Describe your server, what you do, and why you want to partner with us.')
    .setRequired(true)
    .setMaxLength(500);

  const proofUrlInput = new TextInputBuilder()
    .setCustomId('proof_url')
    .setLabel('Proof Image URL (optional — imgur, cdn, etc.)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('https://i.imgur.com/...')
    .setRequired(false)
    .setMaxLength(300);

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(serverNameInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(inviteInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(memberCountInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(descriptionInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(proofUrlInput),
  );

  await interaction.showModal(modal);
}
