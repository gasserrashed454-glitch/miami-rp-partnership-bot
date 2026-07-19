import 'dotenv/config';
import { createServer } from 'http';
import { Client, GatewayIntentBits, Partials } from 'discord.js';

// Render web-service health check — opens a port so the port scan passes
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
createServer((_, res) => { res.writeHead(200); res.end('OK'); }).listen(PORT, () => {
  console.log(`🌐 Health server listening on port ${PORT}`);
});
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
