import {
  TextChannel,
  GuildMember,
  Guild,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type Message,
} from 'discord.js';
import { buildTicketWelcomeEmbed } from '../utils/embeds.js';
import { GUILD_CHANNELS, MRP_AD } from '../config.js';

const TIMEOUT_MS = 10 * 60 * 1000; // 10 min inactivity

function extractInviteCode(text: string): string | null {
  const m = text.match(/discord(?:\.gg|app\.com\/invite)\/([A-Za-z0-9-]+)/i);
  return m ? m[1] : null;
}

/** Waits for a single message from the applicant in the ticket channel. */
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

  // ── Step 0: collect their ad ─────────────────────────────────────────────────
  await channel.send(
    '**Step 1 —** Send your partnership ad.\n' +
    'It must include your server\'s Discord invite link (`discord.gg/...`). **Text only — no images.**',
  );

  let ad = '';
  let inviteCode = '';
  let partnerGuildId: string | null = null;
  let partnerGuildName = 'Unknown Server';
  let memberCount = 0;

  while (true) {
    let msg: Message;
    try { msg = await next(channel, member.id); }
    catch { await channel.send('⏰ Session timed out — please open a new ticket to apply.'); return; }

    const text = msg.content.trim();

    if (msg.attachments.some((a) => a.contentType?.startsWith('image/'))) {
      await channel.send('Send your ad as **text only** — no images at this step.'); continue;
    }
    if (!text) {
      await channel.send('Please send your ad as text.'); continue;
    }
    if (text.length > 2000) {
      await channel.send(`Your ad is ${text.length} characters — must be under 2000. Shorten it and resend.`); continue;
    }

    const code = extractInviteCode(text);
    if (!code) {
      await channel.send(
        'Your ad must include a Discord invite link (e.g. `discord.gg/yourserver`). ' +
        'Please resend with the invite included.',
      ); continue;
    }

    await channel.send('Verifying your invite link...');
    try {
      const invite = await guild.client.fetchInvite(code);
      partnerGuildId  = invite.guild?.id   ?? null;
      partnerGuildName = invite.guild?.name ?? 'Unknown Server';
      memberCount      = invite.memberCount ?? 0;
    } catch {
      await channel.send(
        'Could not verify that invite — make sure it is valid and not expired, then resend your ad.',
      ); continue;
    }

    ad = text;
    inviteCode = code;
    break;
  }

  // ── Send MRP's ad, ask for screenshot ────────────────────────────────────────
  await channel.send(
    `✅ **${partnerGuildName}** verified (${memberCount} members online).\n\n` +
    `**Step 2 —** Post the ad below in **${partnerGuildName}**, then send **one screenshot** ` +
    `here showing it posted in their server.`,
  );
  await channel.send(MRP_AD);

  // ── Step 2: collect proof screenshot ─────────────────────────────────────────
  while (true) {
    let msg: Message;
    try { msg = await next(channel, member.id); }
    catch { await channel.send('⏰ Session timed out — please open a new ticket to apply.'); return; }

    const images = [...msg.attachments.values()].filter((a) => {
      const ct = a.contentType ?? '';
      return ct.startsWith('image/') || /\.(png|jpg|jpeg|gif|webp)$/i.test(a.name ?? '');
    });

    if (images.length === 0) {
      await channel.send('Send a **screenshot image** — text is not accepted at this step.'); continue;
    }
    if (images.length > 1) {
      await channel.send('Send **one screenshot only** — resend with a single image.'); continue;
    }

    const proofUrl = images[0].url;

    // Build proof embed
    const proofEmbed = new EmbedBuilder()
      .setTitle('Partnership Proof')
      .setDescription(
        `**User:** ${member.user.tag} (${member.user.id})\n` +
        `**Server:** ${partnerGuildName} | discord.gg/${inviteCode}\n` +
        `**Members Online:** ${memberCount}`,
      )
      .setImage(proofUrl)
      .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
      .setColor(0xffffff);

    await channel.send({
      content: '✅ Screenshot received! A staff member will review and confirm shortly.',
      embeds: [proofEmbed],
    });

    // Post their ad + proof to configured channels
    const guildChannels = GUILD_CHANNELS[guild.id];
    if (guildChannels) {
      const sendTo = async (channelId: string, content: string, embed?: EmbedBuilder) => {
        try {
          const ch = await guild.channels.fetch(channelId) as TextChannel | null;
          if (!ch?.isTextBased()) return;
          await ch.send(embed ? { content, embeds: [embed] } : { content });
        } catch { /* not accessible — skip */ }
      };

      // Post their ad text to the partner channel, then the proof embed
      await sendTo(guildChannels.partnerChannelId, ad);
      await sendTo(guildChannels.partnerChannelId, `📋 Proof from ${member} — ticket: ${channel}`, proofEmbed);

      if (guildChannels.proofChannelId) {
        await sendTo(guildChannels.proofChannelId, `📋 Partnership proof from ${member} — ticket: ${channel}`, proofEmbed);
      }
    }

    return;
  }
}
