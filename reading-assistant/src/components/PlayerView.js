import React, { useRef, useEffect, useState } from "react";
import { updateProgress } from "../services/cloudantService";

export default function PlayerView({ article, audioUrl, onBack }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(article.progress || 0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const revRef = useRef(article._rev);
  const saveTimer = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = article.progress || 0;

    function onTimeUpdate() {
      setCurrentTime(audio.currentTime);
    }
    function onLoaded() {
      setDuration(audio.duration);
    }
    function onPlay() { setPlaying(true); }
    function onPause() { setPlaying(false); }

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);

    saveTimer.current = setInterval(async () => {
      if (!audio.paused) {
        try {
          const newRev = await updateProgress(article._id, revRef.current, audio.currentTime);
          revRef.current = newRev;
        } catch (_) {}
      }
    }, 5000);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      clearInterval(saveTimer.current);
    };
  }, [article]);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    playing ? audio.pause() : audio.play();
  }

  function skip(seconds) {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(audio.duration, audio.currentTime + seconds));
  }

  function changeSpeed(s) {
    setSpeed(s);
    if (audioRef.current) audioRef.current.playbackRate = s;
  }

  function formatTime(s) {
    if (!s || isNaN(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  }

  const progress = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className="view player-view">
      <button className="back-btn" onClick={onBack} aria-label="Go back">
        ← Back
      </button>

      <h1 className="view-title">{article.title}</h1>

      <audio ref={audioRef} src={audioUrl} aria-label="Article audio" />

      <div className="player-card" role="region" aria-label="Audio player">
        <div className="progress-bar-wrap" aria-label={`Playback progress: ${Math.round(progress)}%`}>
          <div className="progress-bar-track">
            <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="progress-times">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <div className="player-controls" role="group" aria-label="Playback controls">
          <button className="ctrl-btn" onClick={() => skip(-15)} aria-label="Rewind 15 seconds">
            ↺ 15s
          </button>
          <button
            className="play-btn"
            onClick={togglePlay}
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? "⏸" : "▶"}
          </button>
          <button className="ctrl-btn" onClick={() => skip(15)} aria-label="Forward 15 seconds">
            15s ↻
          </button>
        </div>

        <div className="speed-controls" role="group" aria-label="Playback speed">
          {[0.75, 1, 1.25, 1.5, 2].map((s) => (
            <button
              key={s}
              className={speed === s ? "speed-btn active" : "speed-btn"}
              onClick={() => changeSpeed(s)}
              aria-pressed={speed === s}
              aria-label={`${s}x speed`}
            >
              {s}×
            </button>
          ))}
        </div>
      </div>

      <p className="sync-note" aria-live="polite">
        Progress saves automatically every 5 seconds across all your devices.
      </p>
    </div>
  );
}
