import type { ElevenLabsVoice } from "@video-generator/shared";

const BASE_URL = "https://api.elevenlabs.io";
const API_KEY = process.env.ELEVENLABS_API_KEY;

function getHeaders(): Record<string, string> {
  if (!API_KEY) {
    throw new Error("ELEVENLABS_API_KEY is not set");
  }
  return {
    "xi-api-key": API_KEY,
    "Content-Type": "application/json",
  };
}

export async function listVoices(): Promise<ElevenLabsVoice[]> {
  try {
    const response = await fetch(`${BASE_URL}/v1/voices`, {
      method: "GET",
      headers: getHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Failed to fetch voices: ${response.status} ${
          errorData.error?.message || response.statusText
        }`
      );
    }

    const data = (await response.json()) as { voices: ElevenLabsVoice[] };
    return data.voices;
  } catch (error) {
    console.error("Error listing voices:", error);
    throw error;
  }
}

export async function generateSpeech(
  voiceId: string,
  text: string,
  ttsModel: string
): Promise<Buffer> {
  try {
    const response = await fetch(
      `${BASE_URL}/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          text,
          model_id: ttsModel,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.text().catch(() => "");
      throw new Error(
        `Failed to generate speech: ${response.status} ${response.statusText} ${errorData}`
      );
    }

    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer);
  } catch (error) {
    console.error("Error generating speech:", error);
    throw error;
  }
}
