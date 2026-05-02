import React, { useState, useEffect } from "react";
import UploadView from "./components/UploadView";
import SummaryView from "./components/SummaryView";
import PlayerView from "./components/PlayerView";
import LibraryView from "./components/LibraryView";
import "./styles/app.css";

export default function App() {
  const [view, setView] = useState("upload"); // upload | summary | player | library
  const [currentArticle, setCurrentArticle] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);

  function openSummary(article) {
    setCurrentArticle(article);
    setView("summary");
  }

  function openPlayer(article, url) {
    setCurrentArticle(article);
    setAudioUrl(url);
    setView("player");
  }

  return (
    <div className="app">
      <nav className="topnav" role="navigation" aria-label="Main navigation">
        <span className="brand">ReadAloud</span>
        <div className="nav-links">
          <button
            className={view === "upload" || view === "summary" || view === "player" ? "nav-btn active" : "nav-btn"}
            onClick={() => setView("upload")}
            aria-label="New article"
          >
            New
          </button>
          <button
            className={view === "library" ? "nav-btn active" : "nav-btn"}
            onClick={() => setView("library")}
            aria-label="My library"
          >
            Library
          </button>
        </div>
      </nav>

      <main className="main-content" role="main">
        {view === "upload" && (
          <UploadView onAnalyzed={openSummary} />
        )}
        {view === "summary" && currentArticle && (
          <SummaryView
            article={currentArticle}
            onListen={openPlayer}
            onBack={() => setView("upload")}
          />
        )}
        {view === "player" && currentArticle && audioUrl && (
          <PlayerView
            article={currentArticle}
            audioUrl={audioUrl}
            onBack={() => setView("summary")}
          />
        )}
        {view === "library" && (
          <LibraryView onResume={openPlayer} />
        )}
      </main>
    </div>
  );
}
