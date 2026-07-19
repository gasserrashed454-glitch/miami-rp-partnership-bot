import { type Client, Events, REST, Routes, SlashCommandBuilder } from 'discord.js';
import { ALLOWED_GUILD_IDS } from '../config.js';

export const name = Events.ClientReady;
export const once = true;

export async function execute(client: Client<true>): Promise<void> {
  console.log(`Logged in as ${client.user.tag}`);

  const commands = [
    new SlashCommandBuilder()
      .setName('postpartnership')
      .setDescription('Post the partnership embed')
      .setDefaultMemberPermissions('0')
      .toJSON(),

    new SlashCommandBuilder()
      .setName('postad')
      .setDescription('Post the MRP ad')
      .setDefaultMemberPermissions('0')
      .toJSON(),

    new SlashCommandBuilder()
      .setName('admin')
      .setDescription('Bypass cooldowns for a user')
      .setDefaultMemberPermissions('0')
      .addSubcommand((sub) =>
        sub
          .setName('bypass')
          .setDescription('Let a user skip cooldowns on their next application')
          .addUserOption((o) => o.setName('user').setDescription('User').setRequired(true)),
      )
      .addSubcommand((sub) =>
        sub
          .setName('remove')
          .setDescription('Remove bypass from a user')
          .addUserOption((o) => o.setName('user').setDescription('User').setRequired(true)),
      )
      .toJSON(),
  ];

  const rest = new REST().setToken(process.env.DISCORD_TOKEN!);

  for (const guildId of ALLOWED_GUILD_IDS) {
    try {
      await rest.put(Routes.applicationGuildCommands(client.user.id, guildId), { body: commands });
      console.log(`Commands registered in ${guildId}`);
    } catch (err) {
      console.error(`Failed to register commands in ${guildId}:`, err);
    }
  }
}
