import { Mistral } from '@mistralai/mistralai';
import { PARTNERSHIP_REQUIREMENTS_LIST } from '../config.js';

const API_KEYS = [
  process.env.MISTRAL_API_KEY_1,
  process.env.MISTRAL_API_KEY_2,
  process.env.MISTRAL_API_KEY_3,
  process.env.MISTRAL_API_KEY_4,
  process.env.MISTRAL_API_KEY_5,
].filter((k): k is string => typeof k === 'string' && k.length > 0);

let keyIndex = 0;

function getClient(): Mistral {
  if (API_KEYS.length === 0) {
    throw new Error('No Mistral API keys configured.');
  }
  const key = API_KEYS[keyIndex % API_KEYS.length];
  keyIndex = (keyIndex + 1) % API_KEYS.length;
  return new Mistral({ apiKey: key });
}

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

  const requirementsList = PARTNERSHIP_REQUIREMENTS_LIST.map(
    (r, i) => `${i + 1}. ${r}`,
  ).join('\n');

  const prompt = `You are a partnership manager for Miami Roleplay (MRP), a Discord roleplay server.

Our partnership requirements:
${requirementsList}

A server has applied for partnership with the following information:
- Server Name: ${data.serverName}
- Invite Link: ${data.inviteLink}
- Member Count: ${data.memberCount}
- Description / Notes: ${data.description}
${data.proofUrl ? `- Proof URL: ${data.proofUrl}` : ''}

Analyze this application briefly (3-5 sentences). Assess:
1. Do they appear to meet the 50+ members requirement based on the stated count?
2. Do they seem like a positive and active community?
3. Any red flags or things staff should verify?

Be direct, professional, and objective. Do not make a final approval decision — that is for staff.`;

  const response = await client.chat.complete({
    model: 'mistral-large-latest',
    messages: [{ role: 'user', content: prompt }],
    maxTokens: 300,
  });

  const content = response.choices?.[0]?.message?.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((c) => (c.type === 'text' ? c.text : ''))
      .join('')
      .trim();
  }
  return 'Unable to analyze application at this time.';
}
