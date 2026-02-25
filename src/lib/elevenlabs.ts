import { config, type Persona } from "./config";

export async function streamVoice(
  text: string,
  persona: Persona
): Promise<ReadableStream<Uint8Array>> {
  const voiceId = config.voices[persona];

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
    {
      method: "POST",
      headers: {
        "xi-api-key": config.env.elevenlabs,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_turbo_v2_5",
        voice_settings: {
          stability: persona === "roast" ? 0.3 : 0.5,
          similarity_boost: 0.75,
          style: persona === "cro" ? 0.4 : 0.2,
          use_speaker_boost: true,
        },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`ElevenLabs TTS failed: ${response.status} ${err}`);
  }

  return response.body as ReadableStream<Uint8Array>;
}
