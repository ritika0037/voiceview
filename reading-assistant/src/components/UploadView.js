import React, { useState } from "react";
import { analyzeText } from "../services/nluService";
import { saveArticle } from "../services/cloudantService";

export default function UploadView({ onAnalyzed }) {
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const content = await file.text();
    setText(content);
    if (!title) setTitle(file.name.replace(/\.[^.]+$/, ""));
  }

  async function handleAnalyze() {
    if (!text.trim() || text.trim().length < 100) {
      setError("Please paste at least 100 characters of text.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const { summary, topics } = await analyzeText(text);
      const article = await saveArticle({
        title: title || "Untitled article",
        text,
        summary,
        topics,
        progress: 0,
      });
      onAnalyzed(article);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="view upload-view">
      <h1 className="view-title">Add an article</h1>
      <p className="view-subtitle">Paste text or upload a file — we'll summarize it before you listen.</p>

      <label className="field-label" htmlFor="article-title">Title (optional)</label>
      <input
        id="article-title"
        type="text"
        className="text-input"
        placeholder="e.g. Why sleep matters"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        aria-label="Article title"
      />

      <label className="field-label" htmlFor="article-text">Article text</label>
      <textarea
        id="article-text"
        className="textarea"
        placeholder="Paste your article here…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        aria-label="Article text"
        rows={10}
      />

      <div className="upload-row">
        <label className="file-btn" htmlFor="file-upload" aria-label="Upload a text file">
          Upload .txt file
          <input
            id="file-upload"
            type="file"
            accept=".txt,.md"
            onChange={handleFile}
            style={{ display: "none" }}
          />
        </label>
        <span className="char-count" aria-live="polite">{text.length} chars</span>
      </div>

      {error && <p className="error-msg" role="alert">{error}</p>}

      <button
        className="primary-btn"
        onClick={handleAnalyze}
        disabled={loading}
        aria-busy={loading}
      >
        {loading ? "Analyzing…" : "Analyze & summarize"}
      </button>
    </div>
  );
}
