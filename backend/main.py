import io
import os
import jwt
from jwt import PyJWKClient
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, UploadFile, File, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
import pypdf
from models import ProfileBase, Profile, AnalysisRequest, AnalysisRecord
from database import init_db, get_conn
from agent import run_analysis, parse_resume

_jwks_client: PyJWKClient | None = None


def _get_jwks_client() -> PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        _jwks_client = PyJWKClient(os.environ["CLERK_JWKS_URL"])
    return _jwks_client


def get_user(authorization: str = Header(...)) -> str:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    token = authorization[7:]
    try:
        client = _get_jwks_client()
        signing_key = client.get_signing_key_from_jwt(token)
        data = jwt.decode(token, signing_key.key, algorithms=["RS256"], options={"verify_aud": False})
        return data["sub"]
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


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
def get_profile(user_id: str = Depends(get_user)):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM profile WHERE user_id = %s", (user_id,))
            row = cur.fetchone()
            return dict(row) if row else None


@app.post("/profile/parse-resume", response_model=ProfileBase)
async def parse_resume_endpoint(file: UploadFile = File(...), user_id: str = Depends(get_user)):
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
def upsert_profile(profile: ProfileBase, user_id: str = Depends(get_user)):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO profile (user_id, name, title, years_experience, skills, experience_summary, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, NOW())
                ON CONFLICT (user_id) DO UPDATE SET
                    name = EXCLUDED.name,
                    title = EXCLUDED.title,
                    years_experience = EXCLUDED.years_experience,
                    skills = EXCLUDED.skills,
                    experience_summary = EXCLUDED.experience_summary,
                    updated_at = NOW()
                RETURNING *
                """,
                (user_id, profile.name, profile.title, profile.years_experience, profile.skills, profile.experience_summary),
            )
            return dict(cur.fetchone())


@app.post("/analyze", response_model=AnalysisRecord)
async def analyze(request: AnalysisRequest, user_id: str = Depends(get_user)):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM profile WHERE user_id = %s", (user_id,))
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
                INSERT INTO analyses (user_id, job_description, stack_match, experience_fit, gaps, verdict)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING *
                """,
                (user_id, request.job_description, stack_match, experience_fit, gaps, verdict),
            )
            return dict(cur.fetchone())


@app.get("/analyses", response_model=list[AnalysisRecord])
def get_analyses(user_id: str = Depends(get_user)):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM analyses WHERE user_id = %s ORDER BY created_at DESC", (user_id,))
            return [dict(r) for r in cur.fetchall()]


@app.get("/analyses/{analysis_id}", response_model=AnalysisRecord)
def get_analysis(analysis_id: int, user_id: str = Depends(get_user)):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM analyses WHERE id = %s AND user_id = %s", (analysis_id, user_id))
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Analysis not found")
            return dict(row)
