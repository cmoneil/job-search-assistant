import io
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import pypdf
from models import ProfileBase, Profile, AnalysisRequest, AnalysisRecord
from database import init_db, get_conn
from agent import run_analysis, parse_resume


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/profile", response_model=Profile | None)
def get_profile():
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM profile WHERE id = 1")
            row = cur.fetchone()
            return dict(row) if row else None


@app.post("/profile/parse-resume", response_model=ProfileBase)
async def parse_resume_endpoint(file: UploadFile = File(...)):
    content = await file.read()
    if file.filename and file.filename.lower().endswith(".pdf"):
        reader = pypdf.PdfReader(io.BytesIO(content))
        text = "\n".join(page.extract_text() or "" for page in reader.pages)
    else:
        text = content.decode("utf-8", errors="ignore")
    if not text.strip():
        raise HTTPException(status_code=400, detail="Could not extract text from file")
    result = await parse_resume(text)
    return result


@app.post("/profile", response_model=Profile)
def upsert_profile(profile: ProfileBase):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO profile (id, name, title, years_experience, skills, experience_summary, updated_at)
                VALUES (1, %s, %s, %s, %s, %s, NOW())
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    title = EXCLUDED.title,
                    years_experience = EXCLUDED.years_experience,
                    skills = EXCLUDED.skills,
                    experience_summary = EXCLUDED.experience_summary,
                    updated_at = NOW()
                RETURNING *
                """,
                (
                    profile.name,
                    profile.title,
                    profile.years_experience,
                    profile.skills,
                    profile.experience_summary,
                ),
            )
            return dict(cur.fetchone())


@app.post("/analyze", response_model=AnalysisRecord)
async def analyze(request: AnalysisRequest):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM profile WHERE id = 1")
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=400, detail="Profile not set up yet. Visit /profile to create one.")
            profile = ProfileBase(**dict(row))

    results = await run_analysis(request.job_description, profile)

    if not results.get("generate_verdict"):
        raise HTTPException(status_code=500, detail="Analysis failed to produce a verdict")

    stack_match = results.get(
        "analyze_stack_match",
        {"matched_skills": [], "missing_skills": [], "bonus_skills": [], "score": 0},
    )
    experience_fit = results.get(
        "analyze_experience_fit",
        {"required_years": None, "seniority_level": "mid", "fit_level": "weak", "notes": "Analysis incomplete"},
    )
    gaps = results.get("identify_gaps", {"gaps": []}).get("gaps", [])
    verdict = results["generate_verdict"]

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO analyses (job_description, stack_match, experience_fit, gaps, verdict)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING *
                """,
                (request.job_description, stack_match, experience_fit, gaps, verdict),
            )
            return dict(cur.fetchone())


@app.get("/analyses", response_model=list[AnalysisRecord])
def get_analyses():
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM analyses ORDER BY created_at DESC")
            return [dict(r) for r in cur.fetchall()]


@app.get("/analyses/{analysis_id}", response_model=AnalysisRecord)
def get_analysis(analysis_id: int):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM analyses WHERE id = %s", (analysis_id,))
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Analysis not found")
            return dict(row)
