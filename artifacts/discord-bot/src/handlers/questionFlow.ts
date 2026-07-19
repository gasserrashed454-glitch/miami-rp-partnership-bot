import { createHash } from 'node:crypto';
import {
  TextChannel,
  GuildMember,
  Guild,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type Message,
} from 'discord.js';
import { buildTicketWelcomeEmbed } from '../utils/embeds.js';
import { GUILD_CHANNELS, MRP_AD } from '../config.js';
import { validateAd, scanProofImage } from '../utils/mistral.js';

const USER_COOLDOWN_MS   = 15 * 60 * 1000;
const SERVER_COOLDOWN_MS = 60 * 60 * 1000;
const TIMEOUT_MS         = 10 * 60 * 1000;

export const activeChannels = new Set<string>();
export const adminBypass    = new Set<string>(); // userIds that skip cooldowns
const userCooldowns         = new Map<string, number>();
const serverCooldowns       = new Map<string, number>();
const usedHashes            = new Set<string>();

function extractInviteCode(text: string): string | null {
  const m = text.match(/discord(?:\.gg|app\.com\/invite)\/([A-Za-z0-9-]+)/i);
  return m ? m[1] : null;
}

async function downloadImageHash(url: string): Promise<string> {
  const res = await fetch(url);
  const buf = await res.arrayBuffer();
  return createHash('sha256').update(Buffer.from(buf)).digest('hex');
}

async function next(channel: TextChannel, memberId: string): Promise<Message> {
  const collected = await channel.awaitMessages({
    filter: (m) => m.author.id === memberId && !m.author.bot,
    max: 1,
    time: TIMEOUT_MS,
    errors: ['time'],
  });
  return collected.first()!;
}

export async function runPartnershipFlow(
  channel: TextChannel,
  member: GuildMember,
  guild: Guild,
): Promise<void> {
  activeChannels.add(channel.id);

  try {
    await _run(channel, member, guild);
  } finally {
    activeChannels.delete(channel.id);
  }
}

async function _run(
  channel: TextChannel,
  member: GuildMember,
  guild: Guild,
): Promise<void> {
  const bypass = adminBypass.has(member.id);

  // User cooldown
  if (!bypass) {
    const exp = userCooldowns.get(member.id);
    if (exp && Date.now() < exp) {
      const mins = Math.ceil((exp - Date.now()) / 60_000);
      await channel.send(`${member} wait ${mins} more minute(s) before applying again.`);
      return;
    }
  }

  // Welcome
  const closeRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('close_ticket')
      .setLabel('Close')
      .setStyle(ButtonStyle.Danger),
  );
  await channel.send({
    content: `${member}`,
    embeds: [buildTicketWelcomeEmbed(member)],
    components: [closeRow],
  });

  // Step 1
  await channel.send('Step 1 — send your ad. must include a discord.gg invite. text only.');

  let ad = '';
  let inviteCode = '';
  let partnerGuildId: string | null = null;
  let partnerGuildName = 'Unknown';
  let memberCount = 0;

  while (true) {
    let msg: Message;
    try { msg = await next(channel, member.id); }
    catch { await channel.send('Timed out. Open a new ticket.'); return; }

    const text = msg.content.trim();

    if (msg.attachments.some((a) => a.contentType?.startsWith('image/'))) {
      await channel.send('Text only, no images.'); continue;
    }
    if (!text) { await channel.send('Send text.'); continue; }
    if (text.length > 2000) {
      await channel.send(`Too long (${text.length}/2000). Shorten and resend.`); continue;
    }

    const code = extractInviteCode(text);
    if (!code) {
      await channel.send('No invite link found. Include discord.gg/... and resend.'); continue;
    }

    await channel.send('Checking ad...');
    try {
      const ok = await validateAd(text);
      if (!ok) {
        await channel.send('Ad declined. Open a new ticket if you think this is wrong.');
        return;
      }
    } catch { /* allow on error */ }

    await channel.send('Verifying invite...');
    try {
      const invite = await guild.client.fetchInvite(code);
      partnerGuildId   = invite.guild?.id   ?? null;
      partnerGuildName = invite.guild?.name ?? 'Unknown';
      memberCount      = invite.memberCount ?? 0;
    } catch {
      await channel.send('Could not verify invite. Make sure it is valid and resend.'); continue;
    }

    if (!bypass && partnerGuildId) {
      const exp = serverCooldowns.get(partnerGuildId);
      if (exp && Date.now() < exp) {
        const h = Math.ceil((exp - Date.now()) / 3_600_000);
        await channel.send(`This server is on cooldown. Try again in ${h}h.`);
        return;
      }
    }

    ad = text;
    inviteCode = code;
    break;
  }

  // Step 2
  await channel.send(
    `${partnerGuildName} verified (${memberCount} online).\n\nStep 2 — post the ad below in ${partnerGuildName}, then send one screenshot here.`,
  );
  await channel.send(MRP_AD);

  while (true) {
    let msg: Message;
    try { msg = await next(channel, member.id); }
    catch { await channel.send('Timed out. Open a new ticket.'); return; }

    const images = [...msg.attachments.values()].filter((a) => {
      const ct = a.contentType ?? '';
      return ct.startsWith('image/') || /\.(png|jpg|jpeg|gif|webp)$/i.test(a.name ?? '');
    });

    if (images.length === 0) { await channel.send('Send a screenshot.'); continue; }
    if (images.length > 1)  { await channel.send('One screenshot only.'); continue; }

    const proofUrl = images[0].url;

    let hash = '';
    try { hash = await downloadImageHash(proofUrl); } catch { /* skip */ }
    if (hash && usedHashes.has(hash)) {
      await channel.send('This screenshot was already used.');
      return;
    }

    await channel.send('Scanning...');
    try {
      const scan = await scanProofImage(proofUrl, partnerGuildName);
      if (!scan._failed) {
        if (!scan.hasOurAd) {
          await channel.send('Our ad not found in screenshot. Make sure it is visible and resend.'); continue;
        }
        if (!scan.serverNameMatch) {
          await channel.send(`Server name does not match ${partnerGuildName}. Resend the correct screenshot.`); continue;
        }
      }
    } catch { /* allow on error */ }

    // Record
    if (!bypass) {
      userCooldowns.set(member.id, Date.now() + USER_COOLDOWN_MS);
      if (partnerGuildId) serverCooldowns.set(partnerGuildId, Date.now() + SERVER_COOLDOWN_MS);
    }
    if (hash) usedHashes.add(hash);

    await channel.send('Accepted. Staff will confirm shortly.');

    const guildChannels = GUILD_CHANNELS[guild.id];
    if (guildChannels) {
      const sendTo = async (channelId: string, content: string) => {
        try {
          const ch = (await guild.channels.fetch(channelId)) as TextChannel | null;
          if (ch?.isTextBased()) await ch.send({ content });
        } catch { /* skip */ }
      };
      await sendTo(guildChannels.partnerChannelId, ad);
      await sendTo(guildChannels.partnerChannelId, `Proof from ${member} — ${channel}\n${proofUrl}`);
      if (guildChannels.proofChannelId)
        await sendTo(guildChannels.proofChannelId, `Proof from ${member} — ${channel}\n${proofUrl}`);
    }
  }
}
