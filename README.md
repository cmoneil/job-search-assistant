# Job Search Assistant

An AI-powered tool that analyzes job descriptions against your candidate profile and tells you how well you fit the role — covering tech stack match, experience fit, skill gaps, and an overall verdict.

## How it works

Paste a job description into the app. The backend runs a Claude agentic loop that calls four structured tools in sequence:

1. **`analyze_stack_match`** — compares required technologies to your skills
2. **`analyze_experience_fit`** — evaluates years of experience and seniority alignment
3. **`identify_gaps`** — surfaces missing skills or qualifications
4. **`generate_verdict`** — produces an overall fit score and recommendation

Results are saved to Postgres so you can browse your full history.

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 15, React 19, Tailwind CSS, TypeScript |
| Backend | Python, FastAPI, Anthropic SDK |
| AI | Claude (claude-sonnet-4-20250514) with tool use + prompt caching |
| Database | PostgreSQL (psycopg2 connection pool, JSONB for structured results) |

## Project structure

```
job-search-assistant/
├── backend/
│   ├── main.py        # FastAPI app and routes
│   ├── agent.py       # Claude agentic loop
│   ├── models.py      # Pydantic request/response models
│   ├── database.py    # Postgres connection pool and schema init
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── app/       # Next.js App Router pages (/, /profile, /history)
│       ├── components/ # AnalysisResult, ProfileForm, Nav
│       └── lib/api.ts # Typed fetch wrappers
└── docker-compose.yml
```

## Local development

### Option A: Docker Compose (recommended)

```bash
# Copy root .env and set your key
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env

docker compose up --build
# Frontend → http://localhost:3000
# Backend  → http://localhost:8000
# API docs → http://localhost:8000/docs
```

### Option B: Run services individually

**Backend**

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in ANTHROPIC_API_KEY and DATABASE_URL
uvicorn main:app --reload
```

**Frontend**

```bash
cd frontend
npm install
cp .env.local.example .env.local   # set NEXT_PUBLIC_API_URL if needed
npm run dev
```

## Environment variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Your Anthropic API key |
| `DATABASE_URL` | Yes | Postgres connection string — e.g. `postgresql://user:pass@localhost:5432/job_search` |

### Frontend (`frontend/.env.local`)

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Backend base URL |

## API

| Method | Path | Description |
|---|---|---|
| `GET` | `/profile` | Fetch current profile (null if not set) |
| `POST` | `/profile` | Create or replace the profile |
| `POST` | `/analyze` | Run AI analysis on a job description |
| `GET` | `/analyses` | List all past analyses (newest first) |
| `GET` | `/analyses/{id}` | Fetch a single analysis |

Interactive docs available at `/docs` when the backend is running.

## Deployment

**Backend → Railway**

1. Connect the repo and set root directory to `backend/`
2. Add a Postgres plugin — Railway injects `DATABASE_URL` automatically
3. Set `ANTHROPIC_API_KEY` in the Railway environment
4. Railway picks up `Procfile`: `uvicorn main:app --host 0.0.0.0 --port $PORT`

**Frontend → Vercel**

1. Connect the repo and set root directory to `frontend/`
2. Set `NEXT_PUBLIC_API_URL` to your Railway backend URL
3. Deploy
