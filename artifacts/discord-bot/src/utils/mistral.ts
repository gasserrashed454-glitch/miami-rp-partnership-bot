import { Mistral } from '@mistralai/mistralai';
import { PARTNERSHIP_REQUIREMENTS_LIST, MRP_AD } from '../config.js';

const API_KEYS = [
  process.env.MISTRAL_API_KEY_1,
  process.env.MISTRAL_API_KEY_2,
  process.env.MISTRAL_API_KEY_3,
  process.env.MISTRAL_API_KEY_4,
  process.env.MISTRAL_API_KEY_5,
].filter((k): k is string => typeof k === 'string' && k.length > 0);

let keyIndex = 0;

function getClient(): Mistral {
  if (API_KEYS.length === 0) throw new Error('No Mistral API keys configured.');
  const key = API_KEYS[keyIndex % API_KEYS.length];
  keyIndex = (keyIndex + 1) % API_KEYS.length;
  return new Mistral({ apiKey: key });
}

function extractText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content))
    return content.map((c: any) => (c.type === 'text' ? c.text : '')).join('').trim();
  return '';
}

// ── Full application analysis (for AI pre-check embed) ────────────────────────
export interface PartnershipApplicationData {
  serverName: string;
  inviteLink: string;
  memberCount: string;
  description: string;
  proofUrl?: string;
}

export async function analyzePartnershipApplication(
  data: PartnershipApplicationData,
): Promise<string> {
  const client = getClient();
  const req = PARTNERSHIP_REQUIREMENTS_LIST.map((r, i) => `${i + 1}. ${r}`).join('\n');
  const response = await client.chat.complete({
    model: 'mistral-large-latest',
    messages: [{
      role: 'user',
      content:
        `You are a partnership manager for Miami Roleplay (MRP).\n\nRequirements:\n${req}\n\n` +
        `Application:\n- Server: ${data.serverName}\n- Invite: ${data.inviteLink}\n` +
        `- Members: ${data.memberCount}\n- Description: ${data.description}` +
        (data.proofUrl ? `\n- Proof: ${data.proofUrl}` : '') +
        `\n\nBriefly analyse (3-5 sentences). Do not make a final decision — that is for staff.`,
    }],
    maxTokens: 300,
  });
  return extractText(response.choices?.[0]?.message?.content) || 'Unable to analyse at this time.';
}

// ── Ad text validation ────────────────────────────────────────────────────────
export async function validateAd(adText: string): Promise<boolean> {
  const client = getClient();
  const response = await client.chat.complete({
    model: 'mistral-large-latest',
    messages: [{
      role: 'user',
      content:
        'Is this text appropriate as a Discord server partnership ad? ' +
        'Not spam, not NSFW, not hate speech. Reply YES or NO only.\n' +
        `Text: ${adText.slice(0, 800)}`,
    }],
    maxTokens: 5,
  });
  return extractText(response.choices?.[0]?.message?.content).toUpperCase().startsWith('YES');
}

// ── Proof image scan ──────────────────────────────────────────────────────────
export interface ProofScanResult {
  hasOurAd: boolean;
  serverNameMatch: boolean;
  _failed?: boolean;
}

export async function scanProofImage(
  imageUrl: string,
  expectedServerName: string,
): Promise<ProofScanResult> {
  const client = getClient();
  const adSnippet = MRP_AD.slice(0, 300);
  try {
    const response = await client.chat.complete({
      model: 'pixtral-12b-2409',
      messages: [{
        role: 'user',
        content: [
          {
            type: 'text',
            text:
              'You are verifying a Discord partnership proof screenshot.\n\n' +
              `1. Does this screenshot show our ad posted? Our ad starts with: "${adSnippet}"\n` +
              `2. Does the server name visible in the screenshot match "${expectedServerName}"?\n\n` +
              'Reply with ONLY valid JSON, no extra text: {"hasOurAd": true/false, "serverNameMatch": true/false}',
          },
          { type: 'image_url', imageUrl },
        ] as any,
      }],
      maxTokens: 60,
    });
    const text = extractText(response.choices?.[0]?.message?.content);
    const m = text.match(/\{[^}]+\}/);
    if (!m) return { hasOurAd: false, serverNameMatch: false, _failed: true };
    const parsed = JSON.parse(m[0]);
    return { hasOurAd: Boolean(parsed.hasOurAd), serverNameMatch: Boolean(parsed.serverNameMatch) };
  } catch {
    return { hasOurAd: false, serverNameMatch: false, _failed: true };
  }
}
