const TTS_API_KEY = process.env.REACT_APP_TTS_API_KEY;
const TTS_URL = process.env.REACT_APP_TTS_URL;

/**
 * Converts text to speech using IBM Watson TTS.
 * Returns a Blob URL suitable for an <audio> element.
 *
 * @param {string} text - Text to synthesize
 * @param {string} voice - Watson TTS voice name
 * @returns {string} Object URL for the audio blob
 */
export async function synthesizeSpeech(
  text,
  voice = "en-US_AllisonV3Voice"
) {
  const endpoint = `${TTS_URL}/v1/synthesize?voice=${voice}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "audio/mp3",
      Authorization: "Basic " + btoa("apikey:" + TTS_API_KEY),
    },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || "Watson TTS request failed");
  }

  const audioBlob = await response.blob();
  return URL.createObjectURL(audioBlob);
}

/**
 * Available voices for the voice selector UI.
 */
export const VOICES = [
  { id: "en-US_AllisonV3Voice", label: "Allison (US English)" },
  { id: "en-US_MichaelV3Voice", label: "Michael (US English)" },
  { id: "en-US_EmilyV3Voice", label: "Emily (US English)" },
  { id: "en-GB_CharlotteV3Voice", label: "Charlotte (UK English)" },
  { id: "en-GB_JamesV3Voice", label: "James (UK English)" },
];
