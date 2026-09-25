/** Made-up posts covering the main genres. Used by the live smoke test to sanity-check the rubric. */
export const SAMPLE_POSTS = {
  cliche: `I got rejected from 47 jobs.

Then a janitor told me something I will never forget.

"Success is a journey, not a destination."

That day I decided to grind harder than ever.

5am wake-ups. No weekends. No excuses.

Today I am humbled to announce I am the CEO of my own company.

Your network is your net worth.

Agree? 👇 Repost to inspire someone ♻️

#leadership #mindset #grind #success #motivation`,

  technical: `We cut our CI time from 18 to 6 minutes. What actually helped:

1. Replaced webpack with Vite for the frontend build (-7 min).
2. Cached node_modules keyed on the lockfile hash (-3 min).
3. Split the 1,400 Jest tests into 4 shards by historical duration (-2 min).

What didn't help: bigger runners. CPU was never the bottleneck, network I/O to the registry was.

Config snippets are in the repo README.`,

  hiring: `We're hiring two backend engineers in Warsaw (hybrid, 2 days in office).

Stack: Go, PostgreSQL, Kafka, Kubernetes on GCP.
Salary: 25-32k PLN net B2B.
You'll own the payments reconciliation service.

Apply through the link in the comments or email jobs@example.com.`,

  event: `Great evening at the Kraków JS meetup yesterday! Thanks to everyone who came to my talk on React Server Components. Slides are on my profile. Next meetup is on October 14, see you there.`,

  corporate: `In today's fast-paced world, leveraging synergies across our ecosystem is a game-changer.

We are thrilled to unlock unprecedented value by empowering stakeholders to drive holistic transformation at scale.

The future is now. Let's dive in. 🚀`,

  aiWritten: `𝗔𝗜 𝘄𝗼𝗻'𝘁 𝗿𝗲𝗽𝗹𝗮𝗰𝗲 𝘆𝗼𝘂. But someone using AI will.

Here's the thing — in today's fast-paced landscape, adaptability isn't just a skill. It's a superpower.

🚀 Embrace change
💡 Foster curiosity
🤝 Elevate your team

It's not about working harder — it's about working smarter.

The future belongs to those who navigate uncertainty with clarity, courage, and conviction.

→ Start small.
→ Stay consistent.
→ Unlock your potential.

What's your take? 👇`,

  human: `ok so the coffee machine on our floor has been broken for 3 weeks and facilities keeps telling us "next tuesday". anyway, I finally shipped the invoice export thing Marta asked for back in march. it's slower than I wanted (about 40s for the big accounts, don't @ me) but it works and nobody has to copy-paste from the admin panel anymore. mixed feelings honestly, would rather have done it properly with the queue but here we are`,

  routineJob: `I'm happy to share that I'm starting a new position as Senior QA Engineer at Globex! Huge thanks to everyone at Initech for 4 amazing years. Excited for this new chapter!`,

  notableJob: `Personal news: after nine years at Google DeepMind, where I led the AlphaFold 3 team, I'm joining Anthropic to build a new lab for AI-driven drug discovery. We're starting with protein design for rare diseases and will publish our first results openly.`,

  b2bLesson: `Last weekend I proposed to my girlfriend.

She said yes.

Here's what it taught me about B2B sales:

1. Timing is everything.
2. Know your customer.
3. Always ask for the close.

What's your biggest lesson from a personal milestone? 👇`,

  leadMagnet: `I spent 200 hours building the ultimate LinkedIn growth playbook.

It's 47 pages. It's free.

Comment "GROWTH" and I'll send it to you.

(Must be connected so I can DM you.)`,

  loss: `Last week we lost our colleague Tomasz. He built the first version of our billing system in 2016 and spent the next eight years answering everyone's questions about it with endless patience. We will miss him. If you worked with him, his family would be glad to read your memories.`,

  thanks: `What a night! Huge thanks to Anna Kowalska, Piotr Zieliński and Marta Nowak for organising the Warsaw Product Meetup, and to everyone who came. Special shout-out to the Northwind team for the venue and the pizza. See you all next month!`,
} as const;
