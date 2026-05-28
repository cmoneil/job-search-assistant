import os
import psycopg2
import psycopg2.pool
import psycopg2.extras
import psycopg2.extensions
from contextlib import contextmanager

psycopg2.extensions.register_adapter(dict, psycopg2.extras.Json)
psycopg2.extensions.register_adapter(list, psycopg2.extras.Json)

_pool: psycopg2.pool.ThreadedConnectionPool | None = None


def init_db():
    global _pool
    _pool = psycopg2.pool.ThreadedConnectionPool(1, 10, os.environ["DATABASE_URL"])
    with get_conn() as conn:
        with conn.cursor() as cur:
            # Migrate: if analyses table exists without user_id, drop and recreate both tables
            cur.execute("""
                SELECT column_name FROM information_schema.columns
                WHERE table_name = 'analyses' AND column_name = 'user_id'
            """)
            if cur.fetchone() is None:
                cur.execute("DROP TABLE IF EXISTS analyses")
                cur.execute("DROP TABLE IF EXISTS profile")

            cur.execute("""
                CREATE TABLE IF NOT EXISTS profile (
                    user_id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    title TEXT NOT NULL,
                    years_experience INTEGER NOT NULL,
                    skills JSONB NOT NULL,
                    experience_summary TEXT NOT NULL,
                    updated_at TIMESTAMPTZ DEFAULT NOW()
                )
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS analyses (
                    id SERIAL PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    job_description TEXT NOT NULL,
                    stack_match JSONB NOT NULL,
                    experience_fit JSONB NOT NULL,
                    gaps JSONB NOT NULL,
                    verdict JSONB NOT NULL,
                    created_at TIMESTAMPTZ DEFAULT NOW()
                )
            """)


@contextmanager
def get_conn():
    conn = _pool.getconn()
    conn.cursor_factory = psycopg2.extras.RealDictCursor
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        _pool.putconn(conn)
