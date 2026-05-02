const CLOUDANT_URL = process.env.REACT_APP_CLOUDANT_URL;
const CLOUDANT_API_KEY = process.env.REACT_APP_CLOUDANT_API_KEY;
const DB = process.env.REACT_APP_CLOUDANT_DB || "reading_assistant";

function headers() {
  return {
    "Content-Type": "application/json",
    Authorization: "Bearer " + CLOUDANT_API_KEY,
  };
}

/**
 * Saves or updates an article document in Cloudant.
 * Each article doc has: _id, title, text, summary, topics, progress (seconds), savedAt
 *
 * @param {object} article
 * @returns {object} Saved doc with _id and _rev
 */
export async function saveArticle(article) {
  const id = article._id || `article_${Date.now()}`;
  const url = `${CLOUDANT_URL}/${DB}/${id}`;

  const payload = {
    ...article,
    _id: id,
    savedAt: new Date().toISOString(),
  };

  const response = await fetch(url, {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.reason || "Failed to save article");
  }

  const result = await response.json();
  return { ...payload, _rev: result.rev };
}

/**
 * Fetches all articles for the user's library.
 * Uses Cloudant _all_docs with include_docs=true.
 *
 * @returns {object[]} Array of article documents
 */
export async function fetchLibrary() {
  const url = `${CLOUDANT_URL}/${DB}/_all_docs?include_docs=true`;

  const response = await fetch(url, { headers: headers() });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.reason || "Failed to fetch library");
  }

  const data = await response.json();
  return data.rows
    .map((r) => r.doc)
    .filter((doc) => doc && !doc._id.startsWith("_design"));
}

/**
 * Updates only the playback progress field of an article.
 * Called every 5 seconds during playback.
 *
 * @param {string} id - Article _id
 * @param {string} rev - Article _rev (required for Cloudant updates)
 * @param {number} progressSeconds
 * @returns {string} New _rev
 */
export async function updateProgress(id, rev, progressSeconds) {
  const getRes = await fetch(`${CLOUDANT_URL}/${DB}/${id}`, {
    headers: headers(),
  });
  const doc = await getRes.json();

  const updated = { ...doc, progress: Math.round(progressSeconds) };
  const putRes = await fetch(`${CLOUDANT_URL}/${DB}/${id}`, {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify(updated),
  });

  const result = await putRes.json();
  return result.rev;
}

/**
 * Deletes an article from the library.
 */
export async function deleteArticle(id, rev) {
  const url = `${CLOUDANT_URL}/${DB}/${id}?rev=${rev}`;
  await fetch(url, { method: "DELETE", headers: headers() });
}
