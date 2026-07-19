import 'dotenv/config';
import { createServer } from 'http';
import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { name as readyName, execute as readyExecute } from './events/ready.js';
import { name as interactionName, execute as interactionExecute } from './events/interactionCreate.js';
import { name as channelCreateName, execute as channelCreateExecute } from './events/channelCreate.js';

// Render web-service health check — must bind to 0.0.0.0 for Render's port scanner
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('OK');
}).listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 Health server listening on 0.0.0.0:${PORT}`);
});

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error('❌ DISCORD_TOKEN is not set.');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
  ],
  partials: [Partials.Channel],
});

client.once(readyName, (...args) => readyExecute(...(args as [Client<true>])));
client.on(interactionName, (...args) => interactionExecute(...(args as [import('discord.js').Interaction])));
client.on(channelCreateName, (...args) => channelCreateExecute(...(args as [import('discord.js').TextChannel])));

process.on('SIGTERM', () => { client.destroy(); process.exit(0); });
process.on('SIGINT',  () => { client.destroy(); process.exit(0); });

client.login(token);
