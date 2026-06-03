from __future__ import annotations

import json
import os

from app.awin_importer import import_all_active_awin_sources


def main() -> None:
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL is not set")
    summaries = import_all_active_awin_sources(database_url)
    print(json.dumps({"imports": summaries}, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
