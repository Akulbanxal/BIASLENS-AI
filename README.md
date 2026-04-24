# BiasLens AI - Production-Grade Fairness & Bias Detection Platform

## 🎯 Overview
BiasLens AI is a comprehensive full-stack solution for detecting and mitigating bias in AI systems. It combines multiple detection modules with a premium Google product-like UI.

## ✨ Features

### Core Modules
- **Dashboard**: Real-time system metrics and KPI overview
- **Causal Twin**: Force-directed graph visualization of causal relationships
- **Data Clean Room**: Privacy-preserving dataset analysis with BigQuery integration
- **Persona Probe**: Gemini AI-powered synthetic persona simulation
- **Voice Bias**: MediaRecorder-based voice analysis with accent detection
- **Global Bias Score**: Unified dashboard combining all module metrics

### System Features
- Global loading state management
- Toast notification system (success/error/info)
- Error boundaries with graceful fallbacks
- Lazy-loaded routes for optimal performance  
- Mock Google Cloud Logging
- Live SSE telemetry stream for dashboards
- Shared API client + unified request feedback hooks
- Helmet security headers + API rate limiting
- Production-ready Docker deployment

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Docker (optional)

### Development

```bash
# Install dependencies
npm install
npm install --prefix client
npm install --prefix server

# Start dev servers (both frontend & backend)
npm run dev

# Or start separately:
npm run dev:client  # Frontend on http://localhost:5173
npm run dev:server  # Backend on http://localhost:5001
```

### Set Environment Variables

Create `.env` file in the root:
```bash
GOOGLE_PROJECT_ID=biaslens-ai-dev
GEMINI_API_KEY=your-api-key-here
PORT=5001
```

## 📦 Production Deployment

In production, Express serves both:
- API endpoints at `/api/*`
- Built frontend app at `/`

### Docker
```bash
docker build -t biaslens-ai .
docker run -p 5001:5001 \
  -e NODE_ENV=production \
  -e GEMINI_API_KEY=your-key \
  -e GOOGLE_PROJECT_ID=your-project \
  biaslens-ai

# Open app: http://localhost:5001
# Health:   http://localhost:5001/api/health
```

### Docker Compose
```bash
docker-compose up --build -d

# Open app: http://localhost:5001
# Health:   http://localhost:5001/api/health
```

## 🏗️ Project Structure

```
biaslens-ai/
├── client/              # React frontend
│   ├── src/
│   │   ├── pages/      # Lazy-loaded page components
│   │   ├── components/ # Reusable UI components + system components
│   │   ├── contexts/   # Global state (Loading, Notification)
│   │   ├── services/   # API integrations
│   │   └── utils/      # Utilities & helpers
│   └── package.json
├── server/              # Express backend
│   ├── src/
│   │   ├── services/   # BigQuery, Gemini, Speech-to-Text, Cloud Logger
│   │   ├── cleanroom.js   # Data Clean Room routes
│   │   ├── persona.js     # Persona Probe routes
│   │   ├── voice.js       # Voice Bias routes
│   │   ├── monitoring.js  # Health & metrics endpoints
│   │   └── index.js       # Main server
│   └── package.json
├── Dockerfile
├── docker-compose.yml
└── package.json         # Root workspace
```

## 🛠️ Tech Stack

### Frontend
- React 19.2.4
- Vite 8.0.8
- Tailwind CSS 3.4.19
- Framer Motion 12.38.0
- React Router
- Recharts
- Lucide React
- react-force-graph

### Backend
- Express 5.2.1
- @google-cloud/bigquery
- @google/generative-ai
- multer (file uploads)
- CORS
- Helmet
- express-rate-limit

### Deployment
- Docker & Docker Compose
- Node.js production setup

## 📊 API Endpoints

### System
- `GET /api/health` - Health check
- `GET /api/system/metrics` - System metrics
- `GET /api/system/logs?limit=100` - System logs
- `GET /api/system/events` - Real-time telemetry stream (SSE)

### Data Analysis
- `POST /api/cleanroom/analyze` - Analyze dataset for bias
- `GET /api/cleanroom/sample` - Get sample dataset

### AI Personas
- `POST /api/persona/probe` - Simulate persona response

### Voice Analysis
- `POST /api/voice/analyze` - Analyze audio for bias

### Causal Analysis
- `GET /api/causal-graph` - Get causal feature graph
- `POST /api/simulate-intervention` - Simulate fairness intervention

## 🎨 UI/UX Highlights
- Glassmorphism design with neon glow effects
- Smooth page transitions & animations
- Responsive design (mobile-friendly)
- Real-time loading indicators
- Toast notifications for user feedback
- Dark mode (forced for premium feel)
- Consistent spacing & typography

## 🔒 Security Considerations
- Environment variables for sensitive credentials
- CORS configured for development
- Input validation on all API endpoints
- Mock implementations ready for real GCP services

## 📈 Performance
- Code splitting & lazy route loading
- Vendor chunk splitting (react/charts/motion/graph)
- Optimized Recharts visualizations
- Efficient canvas rendering (waveform, force graph)
- Memory storage for uploaded files
- Streaming simulations with real-time updates

## 🚦 Current Limitations & Future Work
- BigQuery & Gemini use mock implementations (ready for real API integration)
- Speech-to-Text is mocked (can integrate Google Speech-to-Text API)
- Accent detection is keyword-based (ready for ML model integration)
- Cloud logging is in-memory (can integrate real Cloud Logging)

## 🎓 Hackathon Impact
This project demonstrates:
- ✅ Full-stack AI/ML application development
- ✅ Production-grade UI/UX design
- ✅ Google Cloud integration expertise
- ✅ Real-time data visualization
- ✅ Ethical AI & fairness focus
- ✅ Scalable architecture

## 📝 License
ISC

---

Built with ❤️ for fair and ethical AI systems.
