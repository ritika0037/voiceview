import React, { useState } from "react";
import { synthesizeSpeech, VOICES } from "../services/ttsService";

export default function SummaryView({ article, onListen, onBack }) {
  const [voice, setVoice] = useState(VOICES[0].id);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleListen(textToRead) {
    setError(null);
    setLoading(true);
    try {
      const url = await synthesizeSpeech(textToRead, voice);
      onListen({ ...article, selectedText: textToRead }, url);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="view summary-view">
      <button className="back-btn" onClick={onBack} aria-label="Go back">
        ← Back
      </button>

      <h1 className="view-title">{article.title}</h1>

      <section className="summary-card" aria-labelledby="summary-heading">
        <h2 id="summary-heading" className="card-label">Smart summary</h2>
        <p className="summary-text">{article.summary}</p>
      </section>

      {article.topics && article.topics.length > 0 && (
        <section className="topics-section" aria-label="Key topics">
          <h2 className="card-label">Key topics</h2>
          <div className="topic-tags" role="list">
            {article.topics.map((t) => (
              <span key={t} className="topic-tag" role="listitem">{t}</span>
            ))}
          </div>
        </section>
      )}

      <section className="voice-section" aria-labelledby="voice-heading">
        <h2 id="voice-heading" className="card-label">Choose a voice</h2>
        <select
          className="select-input"
          value={voice}
          onChange={(e) => setVoice(e.target.value)}
          aria-label="Select voice"
        >
          {VOICES.map((v) => (
            <option key={v.id} value={v.id}>{v.label}</option>
          ))}
        </select>
      </section>

      {error && <p className="error-msg" role="alert">{error}</p>}

      <div className="listen-actions">
        <button
          className="primary-btn"
          onClick={() => handleListen(article.text)}
          disabled={loading}
          aria-busy={loading}
        >
          {loading ? "Generating audio…" : "Listen to full article"}
        </button>
        <button
          className="secondary-btn"
          onClick={() => handleListen(article.summary)}
          disabled={loading}
          aria-busy={loading}
        >
          Listen to summary only
        </button>
      </div>
    </div>
  );
}
