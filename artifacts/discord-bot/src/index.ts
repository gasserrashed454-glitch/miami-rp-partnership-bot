import 'dotenv/config';
import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { name as readyName, once as readyOnce, execute as readyExecute } from './events/ready.js';
import { name as interactionName, execute as interactionExecute } from './events/interactionCreate.js';

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error('❌ DISCORD_TOKEN is not set.');
  process.exit(1);
}

// Minimal intents — no privileged intents required, no admin
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
  ],
  partials: [Partials.Channel],
});

// Register events
client.once(readyName, (...args) => readyExecute(...(args as [Client<true>])));
client.on(interactionName, (...args) => interactionExecute(...(args as [import('discord.js').Interaction])));

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down...');
  client.destroy();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Shutting down...');
  client.destroy();
  process.exit(0);
});

client.login(token);
