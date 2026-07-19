import { type Client, Events, REST, Routes, SlashCommandBuilder } from 'discord.js';
import { ALLOWED_GUILD_IDS } from '../config.js';

export const name = Events.ClientReady;
export const once = true;

export async function execute(client: Client<true>): Promise<void> {
  console.log(`✅ Logged in as ${client.user.tag}`);

  const commands = [
    new SlashCommandBuilder()
      .setName('postpartnership')
      .setDescription('Post the partnership requirements embed in this channel')
      .setDefaultMemberPermissions('0') // Staff/manage server only
      .toJSON(),

    new SlashCommandBuilder()
      .setName('postad')
      .setDescription('Post the MRP server advertisement')
      .setDefaultMemberPermissions('0')
      .toJSON(),
  ];

  const rest = new REST().setToken(process.env.DISCORD_TOKEN!);

  // Register commands only for the two allowed guilds
  for (const guildId of ALLOWED_GUILD_IDS) {
    try {
      await rest.put(Routes.applicationGuildCommands(client.user.id, guildId), {
        body: commands,
      });
      console.log(`✅ Registered slash commands in guild ${guildId}`);
    } catch (err) {
      console.error(`❌ Failed to register commands in guild ${guildId}:`, err);
    }
  }
}
