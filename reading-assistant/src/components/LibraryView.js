import React, { useEffect, useState } from "react";
import { fetchLibrary, deleteArticle } from "../services/cloudantService";
import { synthesizeSpeech } from "../services/ttsService";

export default function LibraryView({ onResume }) {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [resuming, setResuming] = useState(null);

  useEffect(() => {
    loadLibrary();
  }, []);

  async function loadLibrary() {
    setLoading(true);
    try {
      const docs = await fetchLibrary();
      docs.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
      setArticles(docs);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleResume(article) {
    setResuming(article._id);
    try {
      const url = await synthesizeSpeech(article.text);
      onResume(article, url);
    } catch (err) {
      setError(err.message);
    } finally {
      setResuming(null);
    }
  }

  async function handleDelete(article) {
    if (!window.confirm(`Delete "${article.title}"?`)) return;
    try {
      await deleteArticle(article._id, article._rev);
      setArticles((prev) => prev.filter((a) => a._id !== article._id));
    } catch (err) {
      setError(err.message);
    }
  }

  function formatDate(iso) {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short", day: "numeric", year: "numeric",
    });
  }

  if (loading) return <div className="view"><p className="loading-text">Loading library…</p></div>;

  return (
    <div className="view library-view">
      <h1 className="view-title">My library</h1>

      {error && <p className="error-msg" role="alert">{error}</p>}

      {articles.length === 0 ? (
        <p className="empty-msg">No saved articles yet. Add one to get started.</p>
      ) : (
        <ul className="article-list" role="list">
          {articles.map((article) => {
            const progressPct = article.progress && article.estimatedDuration
              ? Math.min(100, Math.round((article.progress / article.estimatedDuration) * 100))
              : 0;

            return (
              <li key={article._id} className="article-item" role="listitem">
                <div className="article-meta">
                  <h2 className="article-title">{article.title}</h2>
                  <p className="article-date">{formatDate(article.savedAt)}</p>
                </div>

                {article.topics && article.topics.length > 0 && (
                  <div className="topic-tags mini" role="list" aria-label="Topics">
                    {article.topics.slice(0, 3).map((t) => (
                      <span key={t} className="topic-tag" role="listitem">{t}</span>
                    ))}
                  </div>
                )}

                {progressPct > 0 && (
                  <div className="mini-progress" aria-label={`${progressPct}% listened`}>
                    <div className="mini-progress-fill" style={{ width: `${progressPct}%` }} />
                    <span className="mini-progress-label">{progressPct}% listened</span>
                  </div>
                )}

                <div className="article-actions">
                  <button
                    className="primary-btn small"
                    onClick={() => handleResume(article)}
                    disabled={resuming === article._id}
                    aria-busy={resuming === article._id}
                  >
                    {resuming === article._id
                      ? "Loading audio…"
                      : article.progress > 0 ? "Resume" : "Listen"}
                  </button>
                  <button
                    className="danger-btn small"
                    onClick={() => handleDelete(article)}
                    aria-label={`Delete ${article.title}`}
                  >
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
