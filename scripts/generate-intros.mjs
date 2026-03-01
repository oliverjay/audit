import OpenAI from "openai";
import { writeFileSync, readFileSync } from "fs";

const envFile = readFileSync(".env.local", "utf8");
const apiKey = envFile.match(/OPENAI_API_KEY=(.+)/)?.[1]?.trim();
const openai = new OpenAI({ apiKey });

const personas = {
  ux: {
    voice: "nova",
    instructions:
      "Speak in a warm, thoughtful, and measured tone — like a senior UX consultant giving a private critique. Be calm, articulate, and encouraging but direct. Pause briefly before key insights. Sound like a trusted advisor, not a lecturer.",
    script:
      "Hey there. I'm Ada — I'm a UX consultant, and I've just finished going through your site. I've got a few things I'd love to walk you through. Some quick wins, some bigger opportunities. Let's take a look together.",
  },
  cro: {
    voice: "ash",
    instructions:
      "Speak with confident energy and authority — like a top CRO consultant presenting findings to a boardroom. Be crisp, data-driven, and persuasive. Emphasise numbers and impact. Sound like someone who's seen hundreds of funnels and knows exactly what converts.",
    script:
      "Alright, I'm Marcus — CRO specialist. I've just run through your site with a conversion lens and I've found some things you'll want to hear. There's real revenue being left on the table here. Let me show you what I mean.",
  },
  roast: {
    voice: "onyx",
    instructions:
      "Speak with dry wit, sarcasm, and comedic timing — like a sharp stand-up comedian roasting a website. Be brutally honest but entertaining. Use dramatic pauses before punchlines. Sound amused and slightly incredulous at bad design choices.",
    script:
      "Okay... I'm Rex, and I've just been through your site. And... look, I'm going to be honest with you — I have notes. Quite a few notes actually. Don't worry though, we're going to fix this. Let's get into it.",
  },
};

for (const [key, p] of Object.entries(personas)) {
  console.log(`Generating intro for ${key}...`);
  const response = await openai.audio.speech.create({
    model: "gpt-4o-mini-tts",
    voice: p.voice,
    input: p.script,
    instructions: p.instructions,
    response_format: "mp3",
  });

  const buffer = Buffer.from(await response.arrayBuffer());
  const path = `public/audio/intro-${key}.mp3`;
  writeFileSync(path, buffer);
  console.log(`  → ${path} (${buffer.length} bytes)`);
}

console.log("Done!");
