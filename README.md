# LAKSHYAVED — AI-Powered Career Planning Platform

> An offline-first, privacy-centric career simulation and skill gap analysis tool that runs entirely in your browser.

---

## 🎯 What is LAKSHYAVED?

LAKSHYAVED is a **Progressive Web App (PWA)** that helps students and professionals plan their career trajectory using data-driven simulations. Unlike cloud-based alternatives, **everything runs 100% client-side** — your resume, skills, and career data never leave your browser.

### Core Problem Solved
Students and early-career professionals lack tools to:
- Understand which skills they need for their dream role
- Visualize realistic salary progression over time
- Get actionable, personalized career recommendations
- Compare multiple career paths quantitatively

LAKSHYAVED solves all of these **without requiring accounts, servers, or internet connectivity**.

---

## ✨ Features

### Core Features
| Feature | Description |
|---------|-------------|
| **Career Simulator** | 5-year salary projection with dynamic title progression based on skill match |
| **Skill Gap Analyzer** | Upload resume (PDF/text) → extract skills → compare against target role requirements |
| **Role Comparison** | Side-by-side comparison of two career paths with salary curves and skill overlap |
| **Resume Upload** | Client-side PDF parsing with OCR — no server uploads |

### Advanced Features
| Feature | Description |
|---------|-------------|
| **Scenario Simulation** | What-if analysis: Current Path vs Upskill Path vs Pivot Path |
| **Explainable Recommendations** | Rule-based, actionable career advice with impact ratings |
| **Enhanced Resume Analysis** | Action verb detection, bullet count, keyword density, experience estimation |
| **Readiness Scoring** | Multi-factor readiness score (Skill Coverage, Resume Quality, Interest Alignment) |
| **Personalized Roadmaps** | Week-by-week learning plans with task tracking |

### Product Quality
| Feature | Description |
|---------|-------------|
| **Onboarding Wizard** | First-run experience collecting name, education, target role, and skills |
| **Data Export/Import** | JSON backup and restore — never lose your data |
| **Error Boundaries** | Graceful crash handling with recovery |
| **PWA Support** | Installable as a native-like app on any device |
| **Offline-First** | Full functionality without internet using IndexedDB |

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19 |
| **Build** | Vite 8 |
| **Styling** | Tailwind CSS 3 |
| **Routing** | React Router DOM 7 |
| **Database** | Dexie (IndexedDB wrapper) |
| **PDF Parsing** | pdf.js (client-side) |
| **Charts** | Custom SVG (LineChartMini) |
| **Icons** | Lucide React |
| **PDF Export** | jsPDF + html2canvas |
| **PWA** | vite-plugin-pwa |

---

## 📁 Project Structure

```
lakshyaved/
├── src/
│   ├── App.jsx                      # Root: splash → onboarding → router
│   ├── main.jsx                     # Entry point
│   ├── index.css                    # Global styles
│   │
│   ├── app/
│   │   ├── layout/
│   │   │   ├── Shell.jsx            # Main layout (header + sidebar + outlet)
│   │   │   └── Sidebar.jsx          # Navigation sidebar
│   │   └── pages/
│   │       ├── CareerSimulator.jsx   # Career projection page
│   │       ├── SkillGap.jsx          # Skill gap analysis page
│   │       ├── RoleCompare.jsx       # Side-by-side role comparison
│   │       ├── ResumeUpload.jsx      # Resume ingestion + analysis
│   │       ├── DataManager.jsx       # Export/import/clear data
│   │       ├── Onboarding.jsx        # Onboarding wizard
│   │       ├── NotFound.jsx          # 404 page
│   │       └── SplashScreen.jsx      # Launch screen animation
│   │
│   ├── core/
│   │   ├── db/
│   │   │   ├── db.js                # Dexie schema design
│   │   │   └── repo.js              # Repository queries & CRUD
│   │   ├── logic/
│   │   │   ├── careerEngine.js      # Simulation logic
│   │   │   ├── skillEngine.js       # Analysis rules
│   │   │   ├── readiness.js         # Score calculation
│   │   │   ├── recommendationEngine.js  # Advice generation
│   │   │   ├── scenarioEngine.js    # Scenario logic
│   │   │   ├── roadmapEngine.js     # Step-by-step logic
│   │   │   ├── dataStore.js         # Centralized queries
│   │   │   └── rolesDataset.js      # Core dataset fallback
│   │   ├── parsing/
│   │   │   ├── resumeParser.js      # Parsers & heuristics
│   │   │   ├── pdfTextExtractor.js  # Local pdf.js extractor
│   │   │   └── skillNormalizer.js   # Normalization pipeline
│   │   ├── data/
│   │   │   ├── roles.v1.json        # 100+ roles catalog
│   │   │   ├── skills.v1.json       # Skills catalog
│   │   │   └── interests.v1.json    # Interests catalog
│   │   └── utils/
│   │       ├── format.js            # Currency & text formatters
│   │       └── pdfExport.js         # Report generation utilities
│   │
│   └── ui/
│       └── components/              # Reusable components (e.g. RecommendationList, WhatIfScenarios, CareerPathGraph, RoleAutocomplete)
│
├── index.html                       # Base HTML entry
├── package.json                     # Node dependencies & configs
├── vite.config.js                   # Vite & PWA building config
├── tailwind.config.js               # Theme style configurations
└── README.md                        # This file
```

---

## 🧠 Architecture

### Data Flow
1. **Input**: User provides skills, interests, target role (via onboarding or manual entry)
2. **Processing**: Engines compute match rates, projections, readiness scores
3. **Storage**: All results persist in IndexedDB (survives browser restarts)
4. **Output**: Visualized as interactive dashboards, charts, and actionable cards

### Key Algorithms
- **Career Projection**: `salary * (1 + effectiveGrowth)^year` where `effectiveGrowth = clamp(growthRate * learningSpeed, 0.10, 0.26)`
- **Skill Matching**: Case-insensitive set intersection with skill alias normalization
- **Readiness Score**: Weighted sum of Skill Coverage (40) + Resume Quality (20) + Interest Alignment (10) + Experience (15) + Learning Momentum (15)
- **Scenario Simulation**: Compares current state, upskilled state (100% match), and best pivot role from dataset

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm 9+

### Installation
```bash
git clone https://github.com/HACKER-GOD-07/lakshyaved.git
cd lakshyaved
npm install
```

### Development
```bash
npm run dev
```
Open http://localhost:5173

### Production Build
```bash
npm run build
npm run preview
```

---

## 📊 Dataset

The application ships with curated datasets:
- **100+ career roles** with required skills, salary data (INR), and growth rates
- **200+ skills** with aliases and categories
- **50+ interest categories** for personality-career matching

> Salary data is approximate and based on 2025 Indian industry averages. Use as directional guidance only.

---

## 🔒 Privacy

- **Zero server communication** — all processing happens in-browser
- **No analytics or tracking** — no cookies, no telemetry
- **Data ownership** — export your data anytime as JSON backup
- Resume content is parsed locally using pdf.js and never uploaded anywhere

---

## 📄 License

This project was built as a Major Project for academic purposes.
