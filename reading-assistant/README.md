# ReadAloud — Accessible Reading Assistant

A web app for low-vision users that turns long articles into Smart Audio experiences using IBM Cloud services.

## IBM Cloud Services Used

| Service | Purpose |
|---|---|
| Watson NLU | Extracts 3-sentence summary + key topics |
| IBM Text to Speech | Converts text to natural audio (MP3) |
| IBM Cloudant | Saves library + playback progress, syncs across devices |

---

## Project Structure

```
reading-assistant/
├── src/
│   ├── App.js                    # Root component, view routing
│   ├── index.js                  # React entry point
│   ├── components/
│   │   ├── UploadView.js         # Paste/upload + NLU analysis
│   │   ├── SummaryView.js        # Summary card, topic tags, TTS trigger
│   │   ├── PlayerView.js         # Audio player + Cloudant progress sync
│   │   └── LibraryView.js        # Saved articles with progress bars
│   ├── services/
│   │   ├── nluService.js         # Watson NLU API calls
│   │   ├── ttsService.js         # IBM TTS API calls
│   │   └── cloudantService.js    # Cloudant CRUD operations
│   └── styles/
│       └── app.css               # Accessible, high-contrast styles
├── public/
│   └── index.html
├── .env.example                  # Environment variable template
└── package.json
```

---

## Setup Instructions

### 1. Provision IBM Cloud Services

Go to [cloud.ibm.com](https://cloud.ibm.com) and create:
- **Natural Language Understanding** (Lite plan is free)
- **Text to Speech** (Lite plan is free)
- **Cloudant** (Lite plan is free)

### 2. Create Cloudant Database

In the Cloudant dashboard:
1. Create a new database named `reading_assistant`
2. Go to **Service credentials** → New credential → copy the API key and URL

### 3. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` with your IBM Cloud credentials:
```
REACT_APP_NLU_API_KEY=...
REACT_APP_NLU_URL=https://api.us-south.natural-language-understanding...
REACT_APP_TTS_API_KEY=...
REACT_APP_TTS_URL=https://api.us-south.text-to-speech...
REACT_APP_CLOUDANT_URL=https://your-instance.cloudantnosqldb.appdomain.cloud
REACT_APP_CLOUDANT_API_KEY=...
REACT_APP_CLOUDANT_DB=reading_assistant
```

### 4. Install & Run

```bash
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000)

---

## How it Works

1. **Upload** — User pastes text or uploads a `.txt` file
2. **Analyze** — Watson NLU returns a 3-sentence summary + up to 5 key topics
3. **Preview** — User sees the summary card and topics before committing to listen
4. **Listen** — IBM TTS converts the chosen text (full or summary) to MP3 audio
5. **Save** — Article + NLU results saved to Cloudant
6. **Sync** — Playback position saved every 5 seconds; resume from any device

---

## Accessibility Features

- All interactive elements have ARIA labels and roles
- Font size uses `rem` — respects user's browser font size preference
- High-contrast mode via `@media (prefers-contrast: high)`
- Dark mode via `@media (prefers-color-scheme: dark)`
- Focus indicators on all interactive elements (3px outline)
- Screen reader announcements via `aria-live` regions
- Large, easy-to-tap play button (70px circle)
- Speed controls (0.75× to 2×) for different comprehension needs

---

## Suggested Next Steps (Phase 2+)

- Add user authentication (IBM App ID) for personal libraries
- PDF upload support (use pdf.js to extract text client-side)
- Highlighted text sync — show which sentence is being read
- Offline mode — cache audio with Service Worker
- Voice search for library
