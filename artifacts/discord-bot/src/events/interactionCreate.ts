import {
  type Interaction,
  type ChatInputCommandInteraction,
  Events,
} from 'discord.js';
import { ALLOWED_GUILD_IDS, MRP_AD } from '../config.js';
import { handlePartnershipApplyButton } from '../handlers/buttonHandler.js';
import { closeTicket } from '../handlers/ticketHandler.js';
import {
  buildPartnershipRequirementsEmbed,
  buildPartnershipButton,
} from '../utils/embeds.js';

export const name = Events.InteractionCreate;

export async function execute(interaction: Interaction): Promise<void> {
  // Guild whitelist — silently ignore interactions from non-whitelisted guilds
  if (interaction.guildId && !ALLOWED_GUILD_IDS.includes(interaction.guildId)) return;

  if (interaction.isChatInputCommand()) {
    await handleSlashCommand(interaction);
    return;
  }

  if (interaction.isButton()) {
    if (interaction.customId === 'partnership_apply') {
      await handlePartnershipApplyButton(interaction);
    }
    if (interaction.customId === 'close_ticket') {
      if (!interaction.guild) return;
      await interaction.reply({ content: '🔒 Closing ticket...', ephemeral: true });
      await closeTicket(interaction.channelId, interaction.guild);
    }
    return;
  }
}

async function handleSlashCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  if (interaction.commandName === 'postpartnership') {
    await interaction.reply({
      embeds: [buildPartnershipRequirementsEmbed()],
      components: [buildPartnershipButton()],
    });
  }

  if (interaction.commandName === 'postad') {
    await interaction.reply({ content: MRP_AD });
  }
}
