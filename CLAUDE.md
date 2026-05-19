# Job Search Assistant

AI-powered tool for analyzing job descriptions against your candidate profile.

## Architecture

```
job-search-assistant/
├── backend/          # Python FastAPI — deployed to Railway
└── frontend/         # Next.js 15 App Router — deployed to Vercel
```

### Backend

| File | Purpose |
|---|---|
| `main.py` | FastAPI app, routes, lifespan |
| `agent.py` | Claude agentic loop with 4 tools |
| `models.py` | Pydantic v2 request/response models |
| `database.py` | Postgres connection pool + init |

**API endpoints:**

| Method | Path | Description |
|---|---|---|
| GET | `/profile` | Fetch current profile (null if not set) |
| POST | `/profile` | Create or replace the profile |
| POST | `/analyze` | Run AI analysis on a job description |
| GET | `/analyses` | List all past analyses (newest first) |
| GET | `/analyses/{id}` | Fetch a single analysis |

**Claude tool use flow:**

The agent calls 4 tools in order: `analyze_stack_match` → `analyze_experience_fit` → `identify_gaps` → `generate_verdict`. Each tool's *input* from Claude is the structured analysis result — we send back a minimal `"Analysis recorded."` as the tool result. The loop continues until all 4 tools have been called or Claude stops with a non-`tool_use` stop reason.

Prompt caching: `cache_control: {"type": "ephemeral"}` on the system block caches both the tools list and system prompt together (tools render before system in the prefix).

Model: `claude-sonnet-4-20250514`

### Frontend

Next.js 15 App Router with TypeScript and Tailwind CSS.

| Route | Page |
|---|---|
| `/` | Main analyze page — paste JD, see results |
| `/profile` | Set up / edit your candidate profile |
| `/history` | Browse past analyses with expandable detail |

`src/lib/api.ts` — all typed fetch wrappers with base URL from env.

### Storage

Single-user PostgreSQL. No auth. Connection pool of 1–10 connections via `psycopg2.pool.ThreadedConnectionPool`. Python dicts/lists are automatically serialized to JSONB via a registered `psycopg2` adapter — no manual `json.dumps/loads` needed.

**Schema:**

```sql
CREATE TABLE profile (
    id INTEGER PRIMARY KEY,           -- always 1 (single user)
    name TEXT NOT NULL,
    title TEXT NOT NULL,
    years_experience INTEGER NOT NULL,
    skills JSONB NOT NULL,
    experience_summary TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE analyses (
    id SERIAL PRIMARY KEY,
    job_description TEXT NOT NULL,
    stack_match JSONB NOT NULL,
    experience_fit JSONB NOT NULL,
    gaps JSONB NOT NULL,
    verdict JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Local Development

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # add ANTHROPIC_API_KEY and DATABASE_URL
uvicorn main:app --reload
# API available at http://localhost:8000
# Docs at http://localhost:8000/docs
```

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local   # set NEXT_PUBLIC_API_URL if needed
npm run dev
# App available at http://localhost:3000
```

## Environment Variables

### Backend

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key |
| `DATABASE_URL` | Yes | Postgres connection string (`postgresql://user:pass@host:5432/db`) |

### Frontend

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Backend base URL |

## Deployment

### Backend → Railway

1. Push `backend/` to a repo (or connect the monorepo)
2. Add a Postgres plugin in Railway — it injects `DATABASE_URL` automatically
3. Set `ANTHROPIC_API_KEY` in Railway environment variables
4. Railway picks up `Procfile` automatically: `uvicorn main:app --host 0.0.0.0 --port $PORT`

### Frontend → Vercel

1. Connect repo to Vercel, set root directory to `frontend/`
2. Set `NEXT_PUBLIC_API_URL` to your Railway backend URL
3. Deploy
