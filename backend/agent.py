import anthropic
from models import ProfileBase

client = anthropic.AsyncAnthropic()

SYSTEM_PROMPT = """You are a career advisor analyzing job descriptions against candidate profiles.
You must analyze the fit by calling all four tools in this exact order:
1. analyze_stack_match
2. analyze_experience_fit
3. identify_gaps
4. generate_verdict
Be specific and honest. Do not skip any tool."""

TOOLS = [
    {
        "name": "analyze_stack_match",
        "description": "Analyze how well the job's required tech stack matches the candidate's skills profile.",
        "input_schema": {
            "type": "object",
            "properties": {
                "matched_skills": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Skills present in both job requirements and candidate profile",
                },
                "missing_skills": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Skills required by the job that the candidate does not have",
                },
                "bonus_skills": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Candidate skills relevant but not strictly required",
                },
                "score": {"type": "integer", "description": "Match score from 0 to 100"},
            },
            "required": ["matched_skills", "missing_skills", "bonus_skills", "score"],
        },
    },
    {
        "name": "analyze_experience_fit",
        "description": "Evaluate how well the candidate's experience level matches the job requirements.",
        "input_schema": {
            "type": "object",
            "properties": {
                "required_years": {
                    "type": ["integer", "null"],
                    "description": "Years of experience required, or null if not specified",
                },
                "seniority_level": {
                    "type": "string",
                    "enum": ["junior", "mid", "senior", "staff", "principal"],
                },
                "fit_level": {"type": "string", "enum": ["strong", "moderate", "weak"]},
                "notes": {"type": "string", "description": "Brief explanation of the fit assessment"},
            },
            "required": ["required_years", "seniority_level", "fit_level", "notes"],
        },
    },
    {
        "name": "identify_gaps",
        "description": "Identify specific gaps between what the job requires and what the candidate's profile shows.",
        "input_schema": {
            "type": "object",
            "properties": {
                "gaps": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "area": {"type": "string"},
                            "description": {"type": "string"},
                            "severity": {"type": "string", "enum": ["critical", "moderate", "minor"]},
                        },
                        "required": ["area", "description", "severity"],
                    },
                }
            },
            "required": ["gaps"],
        },
    },
    {
        "name": "generate_verdict",
        "description": "Generate the overall verdict and recommendation on whether the candidate should apply.",
        "input_schema": {
            "type": "object",
            "properties": {
                "recommendation": {"type": "string", "enum": ["apply", "consider", "skip"]},
                "confidence": {"type": "integer", "description": "Confidence 0-100"},
                "summary": {"type": "string", "description": "2-3 sentence overall summary"},
                "key_selling_points": {"type": "array", "items": {"type": "string"}},
            },
            "required": ["recommendation", "confidence", "summary", "key_selling_points"],
        },
    },
]


PARSE_RESUME_TOOL = {
    "name": "extract_profile",
    "description": "Extract candidate profile information from a resume.",
    "input_schema": {
        "type": "object",
        "properties": {
            "name": {"type": "string"},
            "title": {"type": "string", "description": "Current or most recent job title"},
            "years_experience": {"type": "integer", "description": "Total years of professional experience"},
            "skills": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Technical skills, languages, frameworks, and tools",
            },
            "experience_summary": {
                "type": "string",
                "description": "2-3 sentence summary of background and expertise",
            },
        },
        "required": ["name", "title", "years_experience", "skills", "experience_summary"],
    },
}


async def parse_resume(resume_text: str) -> dict:
    response = await client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1024,
        tools=[PARSE_RESUME_TOOL],
        tool_choice={"type": "any"},
        messages=[{"role": "user", "content": f"Extract the candidate profile from this resume:\n\n{resume_text}"}],
    )
    for block in response.content:
        if block.type == "tool_use" and block.name == "extract_profile":
            return block.input
    raise ValueError("Failed to extract profile from resume")


async def run_analysis(job_description: str, profile: ProfileBase) -> dict:
    user_content = (
        f"CANDIDATE PROFILE:\n"
        f"Name: {profile.name}\n"
        f"Title: {profile.title}\n"
        f"Years of Experience: {profile.years_experience}\n"
        f"Skills: {', '.join(profile.skills)}\n"
        f"Background: {profile.experience_summary}\n\n"
        f"JOB DESCRIPTION:\n{job_description}"
    )
    messages = [{"role": "user", "content": user_content}]
    collected: dict = {}

    while len(collected) < 4:
        response = await client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4096,
            system=[
                {
                    "type": "text",
                    "text": SYSTEM_PROMPT,
                    "cache_control": {"type": "ephemeral"},
                }
            ],
            tools=TOOLS,
            messages=messages,
        )

        tool_uses = [b for b in response.content if b.type == "tool_use"]
        for tu in tool_uses:
            collected[tu.name] = tu.input

        if response.stop_reason != "tool_use":
            break

        messages.append({"role": "assistant", "content": response.content})
        messages.append(
            {
                "role": "user",
                "content": [
                    {"type": "tool_result", "tool_use_id": tu.id, "content": "Analysis recorded."}
                    for tu in tool_uses
                ],
            }
        )

    return collected
