# Lakshyaved

A local-first, privacy-preserving career planning and skill gap analysis app for tech students and early-career engineers.

- **What does this career actually look like 5 years out?** Interactive salary projections, title progressions, and career transitions across optimistic, realistic, and conservative scenarios.
- **What skills am I missing right now?** In-browser resume parsing and target role skill gap analysis that pinpoints matched, adjacent, and missing skills.
- **How do I get from where I am to where I want to be?** Week-by-week personalized learning roadmaps with curated resources and task-level AI assistance.

## Features

- **Career Simulator:** Visualizes 5-year salary trajectories and title progressions based on current skill match, growth rates, and what-if upskilling or pivot scenarios.
- **Skill Gap Analyzer:** Parses uploaded resumes or entered skills in-browser and compares them against target role benchmarks to calculate a multi-factor readiness score.
- **Role Compare:** Provides side-by-side evaluation of any two technical career paths, contrasting required skills, compensation bands, and growth trajectories.
- **Career AI Assistant:** Delivers context-aware career guidance, interview prep, and resume feedback using Gemini 2.5 Flash with automatic model fallbacks and built-in offline advisory.
- **Roadmap Planner:** Generates structured, week-by-week learning milestones for target roles with task completion tracking, curated documentation links, and one-click AI prompts.
- **Data Manager:** Enables full control over local career data with one-click JSON backup export, data restoration, and complete client-side database reset.

## Tech Stack

### Frontend
- React 19 (`^19.2.0`)
- React DOM (`^19.2.0`)
- React Router DOM (`^7.13.0`)
- Tailwind CSS 3 (`^3.4.19`)
- Recharts (`^3.10.1`)
- Three.js (`^0.186.0`)
- Lucide React (`^0.575.0`)
- React Markdown (`^10.1.0`)

### State and Storage
- Dexie (`^4.3.0`) (IndexedDB wrapper)
- Browser `localStorage` (chat history and client preferences)

### Backend
- Express (`^5.2.1`)
- tsx (`^4.23.13`)

### AI
- Google Gen AI SDK (`@google/genai` `^2.22.0`)
- Model chain: Primary `gemini-2.5-flash` with fallbacks to `gemini-3.1-flash-lite`, `gemini-flash-lite-latest`, and local rule-based advisory

### Parsing
- pdfjs-dist (`^5.4.624`) (client-side PDF text extraction)
- jsPDF (`^4.2.0`) and html2canvas (`^1.4.1`) (client-side PDF document generation)

### Build and Tooling
- Vite 8 (`^8.0.0-beta.13`)
- vite-plugin-pwa (`^1.2.0`)
- esbuild (`^0.28.2`)
- ESLint 9 (`^9.39.1`)
- PostCSS (`^8.5.6`) and Autoprefixer (`^10.4.24`)

## Local-First Architecture

Lakshyaved is architected as a local-first application where user profiles, resumes, and career analysis run and persist entirely inside the browser using IndexedDB via Dexie. The Node.js Express server acts solely as a secure proxy to Google's Gemini API, ensuring API keys remain on the server without storing user records. There is no user account system, external database, or remote session state. All core features—including resume parsing, skill matching, salary projections, and roadmap tracking—work completely offline. Only live AI chat queries require internet access, and even then, the assistant gracefully falls back to a local offline advisory engine if network access or API quota is unavailable.

## Getting Started

### Prerequisites
- Node.js 20.6+ (supports native `.env` loading via `process.loadEnvFile`)
- npm 9+

### Install
```bash
npm install
```

### Configure
Create a `.env` file in the project root (optional):
```env
GEMINI_API_KEY=your_gemini_api_key_here
```
*Note: If `GEMINI_API_KEY` is omitted, the application runs normally and the Career AI Assistant automatically uses its built-in offline advisory engine.*

### Run
Start the development server with live reload:
```bash
npm run dev
```
Open `http://localhost:3000` in your browser.

### Build
Create a production build:
```bash
npm run build
```

### Other Scripts
- `npm run lint`: Runs ESLint across the codebase.
- `npm run validate:data`: Validates consistency across skills, roles, and interests JSON datasets.
- `npm run preview`: Previews the production Vite build locally on port 3000.
- `npm start`: Starts the compiled server (`dist/server.cjs`) in production.

## Project Structure

```
lakshyaved/
├── public/
│   ├── logo.svg                     # Brand favicon and PWA icon
│   └── vite.svg
├── scripts/
│   └── validate-datasets.js         # Dataset integrity and mapping validator
├── src/
│   ├── app/
│   │   ├── layout/                  # Shell, Sidebar, and App navigation
│   │   └── pages/                   # Route views (CareerSimulator, SkillGap, CareerAssistant, etc.)
│   ├── core/
│   │   ├── context/                 # AuthContext and ThemeContext providers
│   │   ├── data/                    # JSON datasets (roles, skills, interests, learningResources)
│   │   ├── db/                      # Dexie schema (db.js) and data repository access (repo.js)
│   │   ├── logic/                   # Career, skill, readiness, roadmap, and scenario engines
│   │   ├── parsing/                 # Client-side PDF extractor, resume parser, and skill normalizer
│   │   └── utils/                   # Formatters and PDF export utilities
│   ├── ui/
│   │   └── components/              # Reusable UI widgets, charts, meters, and modals
│   ├── App.jsx                      # App root component and route switch
│   ├── index.css                    # Tailwind CSS imports and custom component styles
│   └── main.jsx                     # Browser DOM mounting entry
├── index.html                       # Single-page application template
├── package.json                     # Project manifest, dependencies, and npm scripts
├── server.ts                        # Express server and Gemini AI proxy with offline fallbacks
└── vite.config.js                   # Vite and VitePWA service worker configuration
```

## Data Sources

All compensation figures, role requirements, skill mappings, and demand levels included in the project datasets are curated reference estimates designed for structured career modeling. Salary figures represent approximate Indian tech sector bands and should be treated as directional benchmarks rather than live market data. Users are encouraged to cross-reference current compensation, leveling criteria, and hiring trends with market sources including AmbitionBox, Glassdoor, Levels.fyi, and active job postings.

## Privacy

- **Local resume processing:** Resumes are extracted and parsed entirely in-browser via PDF.js; files are never uploaded to any remote server.
- **Local storage by default:** User profile details, target roles, and skill gap results are saved locally in browser IndexedDB via Dexie.
- **Controlled AI context:** Chat messages send only the user's prompt and a compact profile snapshot (target role, skill lists, readiness score) to Google Gemini via the local proxy.
- **Explicit resume sharing:** Resume text is only transmitted to the AI proxy if the user has uploaded a resume and interacts with the AI Assistant.
- **Local conversation history:** Chat transcripts are stored exclusively in browser `localStorage`.
- **Complete data ownership:** The Data Manager page allows users to export all stored data as a JSON file, restore previous backups, or wipe all local data immediately.

## Contributing

Pull requests and issues are welcome. Before submitting any changes, please ensure that all checks pass:

```bash
npm run lint
npm run validate:data
```

## License

Not yet specified.
