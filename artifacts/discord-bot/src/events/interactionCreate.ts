import {
  type Interaction,
  type ModalSubmitInteraction,
  type ChatInputCommandInteraction,
  type TextChannel,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Events,
} from 'discord.js';
import { ALLOWED_GUILD_IDS, MRP_AD } from '../config.js';
import { handlePartnershipApplyButton } from '../handlers/buttonHandler.js';
import { createPartnershipTicket, closeTicket } from '../handlers/ticketHandler.js';
import {
  buildProofEmbed,
  buildAiVerdictEmbed,
  buildTicketWelcomeEmbed,
  buildPartnershipRequirementsEmbed,
  buildPartnershipButton,
} from '../utils/embeds.js';
import { analyzePartnershipApplication } from '../utils/mistral.js';

export const name = Events.InteractionCreate;

export async function execute(interaction: Interaction): Promise<void> {
  // Guild whitelist — silently ignore interactions from non-whitelisted guilds
  if (interaction.guildId && !ALLOWED_GUILD_IDS.includes(interaction.guildId)) {
    return;
  }

  if (interaction.isChatInputCommand()) {
    await handleSlashCommand(interaction);
    return;
  }

  if (interaction.isButton()) {
    if (interaction.customId === 'partnership_apply') {
      await handlePartnershipApplyButton(interaction);
    }
    if (interaction.customId === 'close_ticket') {
      await handleCloseTicket(interaction);
    }
    return;
  }

  if (interaction.isModalSubmit()) {
    if (interaction.customId === 'partnership_modal') {
      await handlePartnershipModal(interaction);
    }
    return;
  }
}

async function handleSlashCommand(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  if (interaction.commandName === 'postpartnership') {
    const embed = buildPartnershipRequirementsEmbed();
    const row = buildPartnershipButton();
    await interaction.reply({ embeds: [embed], components: [row] });
  }

  if (interaction.commandName === 'postad') {
    await interaction.reply({ content: MRP_AD });
  }
}

async function handlePartnershipModal(
  interaction: ModalSubmitInteraction,
): Promise<void> {
  if (!interaction.guild || !interaction.member) {
    await interaction.reply({ content: '❌ This can only be used in a server.', ephemeral: true });
    return;
  }

  const serverName   = interaction.fields.getTextInputValue('server_name');
  const inviteLink   = interaction.fields.getTextInputValue('invite_link');
  const memberCount  = interaction.fields.getTextInputValue('member_count');
  const description  = interaction.fields.getTextInputValue('description');
  const proofUrl     = interaction.fields.getTextInputValue('proof_url') || undefined;

  await interaction.deferReply({ ephemeral: true });

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

  const ticketChannel = channel as TextChannel;

  // Welcome message with close button
  const closeRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('close_ticket')
      .setLabel('Close Ticket')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('🔒'),
  );

  await ticketChannel.send({
    content: `${member}`,
    embeds: [buildTicketWelcomeEmbed(member)],
    components: [closeRow],
  });

  // Proof embed
  await ticketChannel.send({
    embeds: [buildProofEmbed({ member, serverName, inviteLink, memberCount, proofUrl })],
  });

  // AI analysis
  try {
    const analysis = await analyzePartnershipApplication({
      serverName,
      inviteLink,
      memberCount,
      description,
      proofUrl,
    });
    await ticketChannel.send({ embeds: [buildAiVerdictEmbed(analysis)] });
  } catch {
    await ticketChannel.send({
      content: '⚠️ AI pre-check unavailable — please review this application manually.',
    });
  }
}

async function handleCloseTicket(
  interaction: import('discord.js').ButtonInteraction,
): Promise<void> {
  if (!interaction.guild) return;
  await interaction.reply({ content: '🔒 Closing ticket...', ephemeral: true });
  await closeTicket(interaction.channelId, interaction.guild);
}
