const NLU_API_KEY = process.env.REACT_APP_NLU_API_KEY;
const NLU_URL = process.env.REACT_APP_NLU_URL;

/**
 * Analyzes text using Watson NLU.
 * Returns a 3-sentence summary and top key concepts/categories.
 *
 * @param {string} text - The article or document text to analyze
 * @returns {{ summary: string, topics: string[] }}
 */
export async function analyzeText(text) {
  const endpoint = `${NLU_URL}/v1/analyze?version=2022-04-07`;

  const body = {
    text,
    features: {
      summarization: { limit: 3 },
      concepts: { limit: 5 },
      categories: { limit: 3 },
    },
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Basic " + btoa("apikey:" + NLU_API_KEY),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || "Watson NLU request failed");
  }

  const data = await response.json();

  const summary =
    data.summarization?.text ||
    "No summary available. Try a longer article.";

  const conceptTopics = (data.concepts || []).map((c) => c.text);
  const categoryTopics = (data.categories || []).map((c) =>
    c.label.split("/").filter(Boolean).pop()
  );
  const topics = [...new Set([...conceptTopics, ...categoryTopics])].slice(0, 5);

  return { summary, topics };
}
