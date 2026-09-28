"""
test_alert_insert.py

Reads Supabase credentials + test user login from .env.local (never commit
this file), logs in as that user, and inserts one test row into the
`alerts` table to confirm the connection works end-to-end.

Install first:
    pip install requests python-dotenv
"""

import os
import requests
from dotenv import load_dotenv

load_dotenv(".env.local")

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_ANON_KEY = os.environ["SUPABASE_ANON_KEY"]
TEST_EMAIL = os.environ["TEST_EMAIL"]
TEST_PASSWORD = os.environ["TEST_PASSWORD"]


def login():
    """Logs in with email+password, returns (access_token, user_id)."""
    url = f"{SUPABASE_URL}/auth/v1/token?grant_type=password"
    headers = {"apikey": SUPABASE_ANON_KEY, "Content-Type": "application/json"}
    body = {"email": TEST_EMAIL, "password": TEST_PASSWORD}

    resp = requests.post(url, headers=headers, json=body)
    resp.raise_for_status()
    data = resp.json()
    return data["access_token"], data["user"]["id"]


def insert_test_alert(access_token, user_id):
    url = f"{SUPABASE_URL}/rest/v1/alerts"
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }
    body = {
        "user_id": user_id,
        "keystroke_score": 2.5,
        "combined_score": 2.5,
        "user_response": "none",
    }

    resp = requests.post(url, headers=headers, json=body)
    resp.raise_for_status()
    return resp.json()


def main():
    print("Logging in...")
    access_token, user_id = login()
    print(f"Logged in. user_id = {user_id}")

    print("Inserting test alert...")
    result = insert_test_alert(access_token, user_id)
    print("Success! Inserted row:")
    print(result)


if __name__ == "__main__":
    main()