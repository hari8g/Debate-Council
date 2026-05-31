#!/usr/bin/env python3
"""
Import an Instagram session from Firefox cookies (official instaloader workaround).

Use when `instaloader --login=USER` fails with "Unexpected null login result".

Steps:
  1. Log into https://www.instagram.com in Firefox (not private browsing)
  2. Run: python scripts/import_instagram_session.py
  3. Set INSTAGRAM_USERNAME in .env to the printed username
  4. Restart uvicorn
"""
from __future__ import annotations

import argparse
import sys
from glob import glob
from os.path import expanduser
from platform import system
from sqlite3 import OperationalError, connect

from instaloader import ConnectionException, Instaloader
from instaloader.instaloader import get_default_session_filename


def get_firefox_cookiefile() -> str:
    pattern = {
        "Windows": "~/AppData/Roaming/Mozilla/Firefox/Profiles/*/cookies.sqlite",
        "Darwin": "~/Library/Application Support/Firefox/Profiles/*/cookies.sqlite",
    }.get(system(), "~/.mozilla/firefox/*/cookies.sqlite")
    matches = glob(expanduser(pattern))
    if not matches:
        raise SystemExit(
            "No Firefox cookies.sqlite found.\n"
            "Log into instagram.com in Firefox, or pass -c /path/to/cookies.sqlite"
        )
    return matches[0]


def import_session(cookiefile: str, sessionfile: str | None) -> str:
    print(f"Using cookies from {cookiefile}")
    conn = connect(f"file:{cookiefile}?immutable=1", uri=True)
    try:
        rows = conn.execute(
            "SELECT name, value FROM moz_cookies WHERE baseDomain='instagram.com'"
        )
    except OperationalError:
        rows = conn.execute(
            "SELECT name, value FROM moz_cookies WHERE host LIKE '%instagram.com'"
        )

    loader = Instaloader(max_connection_attempts=1)
    loader.context._session.cookies.update(rows)
    username = loader.test_login()
    if not username:
        raise SystemExit(
            "Not logged in via cookies. Open instagram.com in Firefox and sign in first."
        )

    out = sessionfile or get_default_session_filename(username)
    loader.context.username = username
    loader.save_session_to_file(out)
    print(f"Imported session for @{username}")
    print(f"Saved to: {out}")
    print(f"\nAdd to backend/.env:\n  INSTAGRAM_USERNAME={username}")
    return username


def main() -> None:
    parser = argparse.ArgumentParser(description="Import Instagram session from Firefox")
    parser.add_argument("-c", "--cookiefile", help="Path to Firefox cookies.sqlite")
    parser.add_argument("-f", "--sessionfile", help="Output session file path")
    args = parser.parse_args()
    try:
        import_session(args.cookiefile or get_firefox_cookiefile(), args.sessionfile)
    except (ConnectionException, OperationalError) as exc:
        raise SystemExit(f"Cookie import failed: {exc}") from exc


if __name__ == "__main__":
    main()
