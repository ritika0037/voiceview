 // ============================================================
//  ReadEasy – Accessible Reading Assistant
//  All IBM Cloud integrations live here:
//   - Watson NLU  (summarization + topics)
//   - Text to Speech (audio playback)
//   - Cloudant  (library storage)
// ============================================================

// -------- State --------
const state = {
  rawText: '',
  summaryText: '',
  articleTitle: '',
  selectedVoice: 'en-US_AllisonV3Voice',
  isPlaying: false,
  currentAudioUrl: null,
  saveInterval: null,
  currentDocId: null,
  currentRev: null,
  allLibraryItems: [],
  config: null,
};

// -------- Hardcoded Config --------
const APP_CONFIG = {
  nluKey: 'L8juJoRV4QTL7vVUQrHmVpJaOvizFqkees6S0A2hCSV_',
  nluUrl: 'https://api.au-syd.natural-language-understanding.watson.cloud.ibm.com/instances/90fd6309-d287-4dac-a2bb-11a20bc64382',
  ttsKey: 'ABx0OWKgj96MpItuRvQyUFSl9hGPCrh4e1m8g2hOwTup',
  ttsUrl: 'https://api.au-syd.text-to-speech.watson.cloud.ibm.com/instances/b486fc8d-e3cf-4ef9-b598-ecd81533f74f',
  cloudantKey: 'yLGsodAWC_skYvyPSqOqLWaD7p_gfmYfSckBdcC6ThS8',
  cloudantUrl: 'https://265de2bd-7d50-422d-92b9-5e9e998cef72-bluemix.cloudantnosqldb.appdomain.cloud',
  cloudantDb: 'reading-library'
};

// -------- Init --------
window.addEventListener('DOMContentLoaded', () => {
  state.config = APP_CONFIG;
  loadLibrary();
  setupPasteCounter();
  
  if (localStorage.getItem('highContrast') === 'true') {
    document.body.classList.add('high-contrast');
  }
});

function getConfig() {
  return state.config || APP_CONFIG;
}


// ============================================================
//  NAVIGATION
// ============================================================

function showView(name, el) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  document.getElementById('view-' + name).classList.add('active');
  if (el) el.classList.add('active');

  if (name === 'library') loadLibrary();

  document.getElementById('sidebar').classList.remove('open');
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

function toggleContrast() {
  document.body.classList.toggle('high-contrast');
  localStorage.setItem('highContrast', document.body.classList.contains('high-contrast'));
}


// ============================================================
//  TABS
// ============================================================

function switchTab(name, el) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));

  el.classList.add('active');
  document.getElementById('tab-' + name).classList.add('active');
}


// ============================================================
//  CHARACTER COUNTER
// ============================================================

function setupPasteCounter() {
  const textarea = document.getElementById('pasteInput');
  const counter = document.getElementById('charCount');

  textarea.addEventListener('input', () => {
    const len = textarea.value.length;
    counter.textContent = len.toLocaleString() + ' characters';
    counter.style.color = len > 50000 ? 'var(--danger)' : 'var(--text-muted)';
  });
}


// ============================================================
//  FILE UPLOAD
// ============================================================

function handleDragOver(e) {
  e.preventDefault();
  document.getElementById('dropZone').classList.add('dragging');
}

function handleDragLeave() {
  document.getElementById('dropZone').classList.remove('dragging');
}

function handleDrop(e) {
  e.preventDefault();
  document.getElementById('dropZone').classList.remove('dragging');
  const file = e.dataTransfer.files[0];
  if (file) processFile(file);
}

function handleFileUpload(e) {
  const file = e.target.files[0];
  if (file) processFile(file);
}

function processFile(file) {
  const statusEl = document.getElementById('fileStatus');
  statusEl.classList.remove('hidden');

  if (file.name.endsWith('.txt')) {
    const reader = new FileReader();
    reader.onload = (e) => {
      state.rawText = e.target.result;
      statusEl.textContent = `✅ Loaded "${file.name}" — ${state.rawText.length.toLocaleString()} characters`;

      const titleField = document.getElementById('articleTitle');
      if (!titleField.value) {
        titleField.value = file.name.replace('.txt', '');
      }
    };
    reader.readAsText(file);

  } else if (file.name.endsWith('.pdf')) {
    statusEl.textContent = '⏳ Loading PDF parser...';
    loadPdfJs().then(() => {
      extractPdfText(file).then(text => {
        state.rawText = text;
        statusEl.textContent = `✅ Loaded "${file.name}" — ${text.length.toLocaleString()} characters`;

        const titleField = document.getElementById('articleTitle');
        if (!titleField.value) {
          titleField.value = file.name.replace('.pdf', '');
        }
      }).catch(() => {
        statusEl.textContent = '❌ Could not read this PDF. Try a different file.';
        statusEl.style.background = 'var(--danger)';
      });
    });

  } else {
    statusEl.textContent = '❌ Please upload a .txt or .pdf file.';
    statusEl.style.background = 'var(--danger)';
  }
}

function loadPdfJs() {
  return new Promise((resolve) => {
    if (window.pdfjsLib) { resolve(); return; }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      resolve();
    };
    document.head.appendChild(script);
  });
}

async function extractPdfText(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    fullText += content.items.map(s => s.str).join(' ') + '\n';
  }

  return fullText;
}


// ============================================================
//  MAIN ANALYZE FLOW
// ============================================================

async function analyzeText() {
  const pasteVal = document.getElementById('pasteInput').value.trim();
  if (pasteVal) state.rawText = pasteVal;

  if (!state.rawText || state.rawText.length < 50) {
    showToast('⚠️ Please paste some text or upload a file first.');
    return;
  }

  const cfg = getConfig();

  state.articleTitle = document.getElementById('articleTitle').value.trim()
    || 'Untitled Article';

  showLoading('Analyzing your text with Watson NLU...');

  try {
    const result = await callWatsonNLU(state.rawText, cfg);
    state.summaryText = result.summary;

    document.getElementById('summaryText').textContent = result.summary;
    document.getElementById('readTimeLabel').textContent = estimateReadTime(state.rawText);
    renderTopics(result.topics);

    document.getElementById('summaryCard').classList.remove('hidden');
    document.getElementById('summaryCard').scrollIntoView({ behavior: 'smooth', block: 'start' });

    showToast('✅ Done! Here\'s your summary.');
  } catch (err) {
    console.error(err);
    showToast('❌ NLU failed: ' + err.message);
  } finally {
    hideLoading();
  }
}

function renderTopics(topics) {
  const container = document.getElementById('topicTags');
  container.innerHTML = '';

  if (!topics.length) {
    container.innerHTML = '<span class="topic-tag">No topics found</span>';
    return;
  }

  topics.forEach(topic => {
    const tag = document.createElement('span');
    tag.className = 'topic-tag';
    tag.textContent = topic;
    container.appendChild(tag);
  });
}

function estimateReadTime(text) {
  const words = text.split(/\s+/).length;
  const minutes = Math.ceil(words / 200);
  return `~${minutes} min read`;
}


// ============================================================
//  IBM WATSON NLU
// ============================================================

async function callWatsonNLU(text, cfg) {
  const trimmed = text.slice(0, 50000);

  const body = {
    text: trimmed,
    features: {
      concepts: { limit: 8 },
      categories: { limit: 5 },
      keywords: { limit: 10, sentiment: false },
      summarization: { limit: 3 },
    },
    language: 'en',
  };

  const base = cfg.nluUrl.replace(/\/$/, '');
  const url = `${base}/v1/analyze?version=2022-04-07`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Basic ' + btoa('apikey:' + cfg.nluKey),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `NLU returned ${response.status}`);
  }

  const data = await response.json();

  let summary = '';
  if (data.summarization && data.summarization.text) {
    summary = data.summarization.text;
  } else {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    summary = sentences.slice(0, 3).join(' ').trim() || text.slice(0, 400) + '…';
  }

  const topics = new Set();
  (data.concepts || []).forEach(c => topics.add(c.text));
  (data.keywords || []).forEach(k => topics.add(k.text));
  (data.categories || []).forEach(c => {
    const parts = c.label.split('/').filter(Boolean);
    if (parts.length) topics.add(parts[parts.length - 1]);
  });

  return {
    summary,
    topics: [...topics].slice(0, 8),
  };
}


// ============================================================
//  VOICE SELECTION
// ============================================================

function selectVoice(el) {
  document.querySelectorAll('.voice-card').forEach(v => v.classList.remove('active'));
  el.classList.add('active');
  state.selectedVoice = el.dataset.voice;
}


// ============================================================
//  LISTEN BUTTONS
// ============================================================

async function listenToSummary() {
  if (!state.summaryText) { showToast('No summary yet. Analyze first!'); return; }
  await startPlayback(state.summaryText, 'Summary');
}

async function listenToFull() {
  if (!state.rawText) { showToast('No text loaded. Paste or upload something first!'); return; }
  await startPlayback(state.rawText, state.articleTitle);
}

async function startPlayback(text, label) {
  const cfg = getConfig();

  showLoading('Generating audio… hang tight!');

  try {
    const audioBlob = await callWatsonTTS(text, state.selectedVoice, cfg);
    const audioUrl = URL.createObjectURL(audioBlob);

    if (state.currentAudioUrl) URL.revokeObjectURL(state.currentAudioUrl);
    state.currentAudioUrl = audioUrl;

    const player = document.getElementById('audioPlayer');
    player.src = audioUrl;
    player.load();

    document.getElementById('nowPlayingTitle').textContent = label;
    document.getElementById('playerCard').classList.remove('hidden');
    document.getElementById('playerCard').scrollIntoView({ behavior: 'smooth' });

    await player.play();
    state.isPlaying = true;
    document.getElementById('playPauseBtn').textContent = '⏸️';

    showToast('🎧 Playing now!');
  } catch (err) {
    console.error(err);
    showToast('❌ TTS error: ' + err.message);
  } finally {
    hideLoading();
  }
}


// ============================================================
//  IBM TEXT TO SPEECH
// ============================================================

async function callWatsonTTS(text, voice, cfg) {
  const chunk = text.slice(0, 5000);

  const base = cfg.ttsUrl.replace(/\/$/, '');
  const url = `${base}/v1/synthesize?voice=${voice}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'audio/mp3',
      Authorization: 'Basic ' + btoa('apikey:' + cfg.ttsKey),
    },
    body: JSON.stringify({ text: chunk }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `TTS returned ${response.status}`);
  }

  return response.blob();
}


// ============================================================
//  AUDIO PLAYER CONTROLS
// ============================================================

function togglePlay() {
  const player = document.getElementById('audioPlayer');
  if (state.isPlaying) {
    player.pause();
    state.isPlaying = false;
    document.getElementById('playPauseBtn').textContent = '▶️';
  } else {
    player.play();
    state.isPlaying = true;
    document.getElementById('playPauseBtn').textContent = '⏸️';
  }
}

function skipBack() {
  const player = document.getElementById('audioPlayer');
  player.currentTime = Math.max(0, player.currentTime - 15);
}

function skipForward() {
  const player = document.getElementById('audioPlayer');
  player.currentTime = Math.min(player.duration, player.currentTime + 15);
}

function setSpeed(speed) {
  document.getElementById('audioPlayer').playbackRate = speed;
  document.querySelectorAll('.speed-btn').forEach(b => {
    b.classList.toggle('active', parseFloat(b.textContent) === speed);
  });
}

function seekAudio(e) {
  const track = document.getElementById('progressTrack');
  const player = document.getElementById('audioPlayer');
  if (!player.duration) return;

  const rect = track.getBoundingClientRect();
  const ratio = (e.clientX - rect.left) / rect.width;
  player.currentTime = ratio * player.duration;
}

function updateProgress() {
  const player = document.getElementById('audioPlayer');
  if (!player.duration) return;

  const pct = (player.currentTime / player.duration) * 100;

  document.getElementById('progressFill').style.width = pct + '%';
  document.getElementById('progressThumb').style.left = pct + '%';
  document.getElementById('currentTime').textContent = formatTime(player.currentTime);
  document.getElementById('totalTime').textContent = formatTime(player.duration);

  if (state.currentDocId && Math.floor(player.currentTime) % 5 === 0) {
    updatePlaybackPosition(player.currentTime, player.duration);
  }
}

function onAudioEnd() {
  state.isPlaying = false;
  document.getElementById('playPauseBtn').textContent = '▶️';
  showToast('✅ Done listening!');
}

function formatTime(sec) {
  if (isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}


// ============================================================
//  LOCAL STORAGE – LIBRARY
// ============================================================

async function saveToLibrary() {
  if (!state.rawText) {
    showToast('Nothing to save yet!');
    return;
  }

  try {
    const library = JSON.parse(localStorage.getItem('readEasyLibrary') || '[]');
    
    const article = {
      id: Date.now().toString(),
      title: state.articleTitle,
      summary: state.summaryText,
      text: state.rawText,
      voice: state.selectedVoice,
      playbackPosition: document.getElementById('audioPlayer').currentTime || 0,
      duration: document.getElementById('audioPlayer').duration || 0,
      savedAt: new Date().toISOString(),
      wordCount: state.rawText.split(/\s+/).length,
    };
    
    library.push(article);
    localStorage.setItem('readEasyLibrary', JSON.stringify(library));
    state.currentDocId = article.id;
    
    document.getElementById('saveBtn').textContent = '✅ Saved!';
    showToast('📚 Saved to your library!');
    updateLibraryCount();
  } catch (err) {
    showToast('❌ Could not save: ' + err.message);
  }
}

async function updatePlaybackPosition(currentTime, duration) {
  if (!state.currentDocId) return;
  
  try {
    const library = JSON.parse(localStorage.getItem('readEasyLibrary') || '[]');
    const index = library.findIndex(a => a.id === state.currentDocId);
    if (index !== -1) {
      library[index].playbackPosition = currentTime;
      library[index].duration = duration;
      localStorage.setItem('readEasyLibrary', JSON.stringify(library));
    }
  } catch (e) {
    console.warn('Position sync failed:', e.message);
  }
}

async function loadLibrary() {
  try {
    const library = JSON.parse(localStorage.getItem('readEasyLibrary') || '[]');
    library.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
    state.allLibraryItems = library;
    renderLibrary(library);
  } catch (err) {
    console.warn('Library load failed:', err.message);
  }
}

function renderLibrary(articles) {
  const grid = document.getElementById('libraryGrid');
  const empty = document.getElementById('libraryEmpty');

  grid.querySelectorAll('.library-item').forEach(el => el.remove());

  if (!articles.length) {
    empty.classList.remove('hidden');
    return;
  }

  empty.classList.add('hidden');

  articles.forEach(doc => {
    const progress = doc.duration ? Math.min(100, (doc.playbackPosition / doc.duration) * 100) : 0;
    const date = new Date(doc.savedAt).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });

    const item = document.createElement('div');
    item.className = 'library-item';
    item.dataset.docId = doc.id;

    item.innerHTML = `
      <div class="lib-info">
        <div class="lib-title">${escapeHtml(doc.title)}</div>
        <div class="lib-meta">Saved ${date} · ${(doc.wordCount || 0).toLocaleString()} words · ${Math.round(progress)}% listened</div>
        <div class="lib-progress-bar">
          <div class="lib-progress-fill" style="width: ${progress}%"></div>
        </div>
      </div>
      <div class="lib-actions">
        <button class="btn btn-secondary btn-sm" onclick="resumeFromLibrary('${doc.id}')">
          ${progress > 0 ? '▶ Resume' : '▶ Listen'}
        </button>
        <button class="btn btn-outline btn-sm" onclick="deleteFromLibrary('${doc.id}')" title="Delete">
          🗑️
        </button>
      </div>
    `;

    grid.appendChild(item);
  });
}

function filterLibrary(query) {
  const q = query.toLowerCase().trim();
  const filtered = state.allLibraryItems.filter(doc =>
    doc.title.toLowerCase().includes(q) ||
    (doc.summary || '').toLowerCase().includes(q)
  );
  renderLibrary(filtered);
}

async function resumeFromLibrary(docId) {
  const doc = state.allLibraryItems.find(d => d.id === docId);
  if (!doc) return;

  state.rawText = doc.text;
  state.summaryText = doc.summary;
  state.articleTitle = doc.title;
  state.selectedVoice = doc.voice || 'en-US_AllisonV3Voice';
  state.currentDocId = doc.id;

  document.getElementById('pasteInput').value = doc.text;
  document.getElementById('articleTitle').value = doc.title;
  document.getElementById('summaryText').textContent = doc.summary;

  showView('home', document.querySelector('[data-view="home"]'));

  document.getElementById('summaryCard').classList.remove('hidden');

  await startPlayback(doc.text, doc.title);

  const player = document.getElementById('audioPlayer');
  if (doc.playbackPosition > 0) {
    player.addEventListener('canplay', function seekOnce() {
      player.currentTime = doc.playbackPosition;
      player.removeEventListener('canplay', seekOnce);
    });
    showToast(`▶ Resuming from ${formatTime(doc.playbackPosition)}`);
  }
}

async function deleteFromLibrary(docId) {
  if (!confirm('Delete this article from your library?')) return;
  
  try {
    const library = JSON.parse(localStorage.getItem('readEasyLibrary') || '[]');
    const filtered = library.filter(a => a.id !== docId);
    localStorage.setItem('readEasyLibrary', JSON.stringify(filtered));
    state.allLibraryItems = filtered;
    renderLibrary(filtered);
    showToast('🗑️ Deleted.');
    updateLibraryCount();
  } catch (err) {
    showToast('❌ Could not delete: ' + err.message);
  }
}


// ============================================================
//  UI HELPERS
// ============================================================

function showToast(message, duration = 3500) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.remove('hidden');

  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => {
    toast.classList.add('hidden');
  }, duration);
}

function showLoading(message = 'Loading...') {
  document.getElementById('loadingText').textContent = message;
  document.getElementById('loadingOverlay').classList.remove('hidden');
}

function hideLoading() {
  document.getElementById('loadingOverlay').classList.add('hidden');
}

function escapeHtml(str) {
  return (str || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function updateLibraryCount() {
  const library = JSON.parse(localStorage.getItem('readEasyLibrary') || '[]');
  const navItem = document.querySelector('[data-view="library"]');
  if (navItem) {
    if (library.length > 0) {
      navItem.innerHTML = `<span class="nav-icon">📚</span> My Library (${library.length})`;
    } else {
      navItem.innerHTML = `<span class="nav-icon">📚</span> My Library`;
    }
  }
}