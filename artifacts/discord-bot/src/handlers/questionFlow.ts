import https from 'https';
import crypto from 'crypto';
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

const COOLDOWN_MS = 6 * 60 * 60 * 1000; // 6 hours
const TIMEOUT_MS  = 10 * 60 * 1000;      // 10 min inactivity

// In-memory — resets on bot restart
const cooldowns  = new Map<string, number>(); // guildId → expiry timestamp
const usedHashes = new Set<string>();         // SHA-256 of used proof images

function extractInviteCode(text: string): string | null {
  const m = text.match(/discord(?:\.gg|app\.com\/invite)\/([A-Za-z0-9-]+)/i);
  return m ? m[1] : null;
}

function downloadImageHash(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (c: Buffer) => chunks.push(c));
      res.on('end', () =>
        resolve(crypto.createHash('sha256').update(Buffer.concat(chunks)).digest('hex')),
      );
      res.on('error', reject);
    }).on('error', reject);
  });
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

async function closeIn(channel: TextChannel, reason: string, delay = 5000): Promise<void> {
  await new Promise((r) => setTimeout(r, delay));
  await channel.delete(reason).catch(() => {});
}

export async function runPartnershipFlow(
  channel: TextChannel,
  member: GuildMember,
  guild: Guild,
): Promise<void> {
  // ── Welcome ──────────────────────────────────────────────────────────────────
  const closeRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('close_ticket')
      .setLabel('Close Ticket')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('🔒'),
  );
  await channel.send({
    content: `${member}`,
    embeds: [buildTicketWelcomeEmbed(member)],
    components: [closeRow],
  });

  // ── Step 1: Collect ad ───────────────────────────────────────────────────────
  await channel.send(
    '**Step 1 —** Send your partnership ad.\n' +
    "It must include your server's Discord invite link (`discord.gg/...`). **Text only — no images.**",
  );

  let ad = '';
  let inviteCode = '';
  let partnerGuildId: string | null = null;
  let partnerGuildName = 'Unknown Server';
  let memberCount = 0;

  while (true) {
    let msg: Message;
    try {
      msg = await next(channel, member.id);
    } catch {
      await channel.send('⏰ Session timed out. Please open a new ticket to apply.');
      return;
    }

    const text = msg.content.trim();

    if (msg.attachments.some((a) => a.contentType?.startsWith('image/'))) {
      await channel.send('Send your ad as **text only** — no images at this step.');
      continue;
    }
    if (!text) {
      await channel.send('Please send your ad as text.');
      continue;
    }
    if (text.length > 2000) {
      await channel.send(
        `Your ad is ${text.length} characters — must be under 2000. Shorten it and resend.`,
      );
      continue;
    }

    const code = extractInviteCode(text);
    if (!code) {
      await channel.send(
        'Your ad must include a Discord invite link (e.g. `discord.gg/yourserver`). Please resend with the invite included.',
      );
      continue;
    }

    // AI ad validation
    await channel.send('Checking your ad...');
    try {
      const ok = await validateAd(text);
      if (!ok) {
        await channel.send(
          'Declined. Your ad was flagged as inappropriate. Open a new ticket if you believe this is a mistake.',
        );
        await closeIn(channel, 'Ad flagged');
        return;
      }
    } catch { /* allow on AI error */ }

    // Verify invite
    await channel.send('Verifying your invite link...');
    try {
      const invite = await guild.client.fetchInvite(code);
      partnerGuildId   = invite.guild?.id   ?? null;
      partnerGuildName = invite.guild?.name ?? 'Unknown Server';
      memberCount      = invite.memberCount ?? 0;
    } catch {
      await channel.send(
        'Could not verify that invite — make sure it is valid and not expired, then resend your ad.',
      );
      continue;
    }

    // Cooldown check
    if (partnerGuildId) {
      const expires = cooldowns.get(partnerGuildId);
      if (expires && Date.now() < expires) {
        const h = Math.ceil((expires - Date.now()) / 3_600_000);
        await channel.send(
          `Declined. This server is on a partnership cooldown — try again in **${h} hour(s)**.`,
        );
        await closeIn(channel, 'Cooldown');
        return;
      }
    }

    ad = text;
    inviteCode = code;
    break;
  }

  // ── Step 2: Post our ad, ask for proof ───────────────────────────────────────
  await channel.send(
    `✅ **${partnerGuildName}** verified (${memberCount} members online).\n\n` +
    `**Step 2 —** Post the ad below in **${partnerGuildName}**, then send **one screenshot** ` +
    `here showing it posted there.`,
  );
  await channel.send(MRP_AD);

  // ── Collect proof screenshot ──────────────────────────────────────────────────
  while (true) {
    let msg: Message;
    try {
      msg = await next(channel, member.id);
    } catch {
      await channel.send('⏰ Session timed out. Please open a new ticket to apply.');
      return;
    }

    const images = [...msg.attachments.values()].filter((a) => {
      const ct = a.contentType ?? '';
      return ct.startsWith('image/') || /\.(png|jpg|jpeg|gif|webp)$/i.test(a.name ?? '');
    });

    if (images.length === 0) {
      await channel.send('Send a **screenshot image** — text is not accepted at this step.');
      continue;
    }
    if (images.length > 1) {
      await channel.send('Send **one screenshot only** — resend with a single image.');
      continue;
    }

    const proofUrl = images[0].url;

    // Duplicate screenshot check
    let hash = '';
    try { hash = await downloadImageHash(proofUrl); } catch { /* skip on error */ }
    if (hash && usedHashes.has(hash)) {
      await channel.send('Declined. This screenshot has already been used in a previous application.');
      await closeIn(channel, 'Duplicate proof');
      return;
    }

    // AI image scan
    await channel.send('Scanning screenshot...');
    try {
      const scan = await scanProofImage(proofUrl, partnerGuildName);
      if (!scan._failed) {
        if (!scan.hasOurAd) {
          await channel.send(
            'Declined. Our ad was not found in the screenshot. Make sure the MRP ad is clearly visible, then try again.',
          );
          continue;
        }
        if (!scan.serverNameMatch) {
          await channel.send(
            `Declined. The server name in the screenshot does not match **${partnerGuildName}**. ` +
            'Make sure you are screenshotting the correct server.',
          );
          continue;
        }
      }
      // AI error → allow through, staff will review
    } catch { /* allow on error */ }

    // All good — record cooldown and hash
    if (partnerGuildId) cooldowns.set(partnerGuildId, Date.now() + COOLDOWN_MS);
    if (hash) usedHashes.add(hash);

    await channel.send(
      '✅ Screenshot accepted! Partnership confirmed. A staff member will follow up shortly.',
    );

    // Post ad + proof to configured channels
    const guildChannels = GUILD_CHANNELS[guild.id];
    if (guildChannels) {
      const sendTo = async (channelId: string, content: string) => {
        try {
          const ch = (await guild.channels.fetch(channelId)) as TextChannel | null;
          if (!ch?.isTextBased()) return;
          await ch.send({ content });
        } catch { /* not accessible */ }
      };

      await sendTo(guildChannels.partnerChannelId, ad);
      await sendTo(
        guildChannels.partnerChannelId,
        `📋 Proof from ${member} — ticket: ${channel}\n${proofUrl}`,
      );
      if (guildChannels.proofChannelId) {
        await sendTo(
          guildChannels.proofChannelId,
          `📋 Partnership proof from ${member} — ticket: ${channel}\n${proofUrl}`,
        );
      }
    }

    return;
  }
}
