from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ProfileBase(BaseModel):
    name: str
    title: str
    years_experience: int
    skills: list[str]
    experience_summary: str


class Profile(ProfileBase):
    user_id: str
    updated_at: datetime


class StackMatch(BaseModel):
    matched_skills: list[str]
    missing_skills: list[str]
    bonus_skills: list[str]
    score: int


class ExperienceFit(BaseModel):
    required_years: Optional[int]
    seniority_level: str
    fit_level: str
    notes: str


class Gap(BaseModel):
    area: str
    description: str
    severity: str


class Verdict(BaseModel):
    recommendation: str
    confidence: int
    summary: str
    key_selling_points: list[str]


class AnalysisRequest(BaseModel):
    job_description: str


class AnalysisRecord(BaseModel):
    id: int
    job_description: str
    stack_match: StackMatch
    experience_fit: ExperienceFit
    gaps: list[Gap]
    verdict: Verdict
    created_at: datetime
