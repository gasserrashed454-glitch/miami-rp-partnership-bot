export const ALLOWED_GUILD_IDS = [
  '1474754371953627226',
  '1528332540518203524',
];

// Per-guild channel configuration
// partnerChannelId: where the proof embed is posted when a ticket is opened
// proofChannelId:   where the proof embed is also logged (null = not configured)
export const GUILD_CHANNELS: Record<string, { partnerChannelId: string; proofChannelId: string | null }> = {
  '1528332540518203524': {
    partnerChannelId: '1528332650266361987',
    proofChannelId:   '1528332597036322907',
  },
  '1474754371953627226': {
    partnerChannelId: '1474754378069049440',
    proofChannelId:   null,
  },
};

export const PARTNERSHIP_THUMBNAIL_URL =
  'https://cdn.discordapp.com/attachments/1467571191223943389/1525043047350407218/Gemini_Generated_Image_crjux7crjux7crju-removebg-preview.png';

export const PROOF_BOT_AVATAR_URL =
  'https://cdn.discordapp.com/attachments/1467807300579496048/1525438359713878066/Screenshot_20260711_120508-removebg-preview.png';

export const PARTNERSHIP_REQUIREMENTS_TEXT = `> • ** Your Server Must Provide 2 Representatives
> •  A Member Of Your Ownership Must Join The Our Server
> •  You Must Have A Positive And Active Community
> •  You Must Post Our Ad In Your Server 
> •  Your Server Must Have 50+ Real members (Not Including Bots)**`;

export const PARTNERSHIP_REQUIREMENTS_LIST = [
  'Your Server Must Provide 2 Representatives',
  'A Member Of Your Ownership Must Join Our Server',
  'You Must Have A Positive And Active Community',
  'You Must Post Our Ad In Your Server',
  'Your Server Must Have 50+ Real members (Not Including Bots)',
];

export const MRP_AD = `# 🌴 MRP — MIAMI ROLEPLAY 🌴

Welcome to Miami… where the sirens are loud, the cars are fast and the scenes get crazy 👀🔥 

If you play Emergency Hamburg this is where the real fun starts.

⸻

#   🚨 What You Can Do

👮 Be a cop and chase down suspects
🚒 Fight huge fires with your team
🏥 Save lives as Medics
🚧 Clear crazy crash scenes
🏎️ Be a civilian and start your own story

Cop? Criminal? Business owner? Street racer?
You decide your own path.

⸻

# 🔥 Why Join MRP?

• Active and fun community
• Chill but organized staff
• Big scenes
• Fun events
• No boring RP rules 24/7

We keep it realistic enough to be fun. But not so strict that it feels like a job 💀

⸻

# 🎉 Events We Do

• Car meets
• Drag races
• Border
• President
• Realistic

⸻

New to RP?
We'll help you out. No experience needed.

Miami is waiting 🌊🌴
Are you joining the good side… or causing the problems?

***Founder: <@1476753599018172506>*** 
╾╼╾╼╾╼╾╼╾╼╾╼╾╼╾╼╾╼
-# https://discord.gg/mrpeh`;

// Ticket category name — bot will create it if it doesn't exist
export const TICKET_CATEGORY_NAME = 'Partnership Tickets';
