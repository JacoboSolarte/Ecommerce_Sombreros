"""Create the application and test databases if they do not exist."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import create_engine, text  # noqa: E402
from sqlalchemy.engine import make_url  # noqa: E402

from app.infrastructure.config import Settings  # noqa: E402


def main() -> None:
    settings = Settings()
    for url in (settings.database_url, settings.test_database_url):
        parsed = make_url(url)
        server = create_engine(parsed._replace(database=None), isolation_level="AUTOCOMMIT")
        with server.connect() as conn:
            conn.execute(text(
                f"CREATE DATABASE IF NOT EXISTS `{parsed.database}` "
                "CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci"
            ))
        print(f"ok: {parsed.database}")


if __name__ == "__main__":
    main()
