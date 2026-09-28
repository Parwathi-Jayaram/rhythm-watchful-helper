"""
live_monitor.py (v2 — wired to Supabase)

Captures keystrokes, scores them against the trained model, and when
CONSECUTIVE_ANOMALIES_TO_ALERT bad windows happen in a row, actually
inserts a row into the `alerts` table in Supabase.

Install first:
    pip install pynput onnxruntime numpy requests python-dotenv

Requires .env.local in the same folder with:
    SUPABASE_URL=...
    SUPABASE_ANON_KEY=...
    TEST_EMAIL=...
    TEST_PASSWORD=...
"""

import json
import os
import time
import statistics
from collections import deque

import numpy as np
import onnxruntime as ort
import requests
from dotenv import load_dotenv
from pynput import keyboard

WINDOW_SECONDS = 15
MIN_KEYS = 15
GRIP_PLACEHOLDER = 0.75
GRIP_ASYM_PLACEHOLDER = 0.05
MODEL_PATH = "optimized_keystroke_model.onnx"
STATS_PATH = "model_stats.json"
CONSECUTIVE_ANOMALIES_TO_ALERT = 3

load_dotenv(".env.local")
SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_ANON_KEY = os.environ["SUPABASE_ANON_KEY"]
TEST_EMAIL = os.environ["TEST_EMAIL"]
TEST_PASSWORD = os.environ["TEST_PASSWORD"]

# ---- keystroke capture state ----
_key_press_times = {}
_dwell_times = deque()
_flight_times = deque()
_last_release_time = None
_key_count = 0
_error_count = 0


def on_press(key):
    global _key_count, _error_count
    now = time.time()
    if key in _key_press_times:
        return
    _key_press_times[key] = now
    _key_count += 1
    if key in (keyboard.Key.backspace, keyboard.Key.delete):
        _error_count += 1
    if _last_release_time is not None:
        flight_ms = (now - _last_release_time) * 1000
        if 0 <= flight_ms < 3000:
            _flight_times.append(flight_ms)


def on_release(key):
    global _last_release_time
    now = time.time()
    press_time = _key_press_times.pop(key, None)
    if press_time is not None:
        dwell_ms = (now - press_time) * 1000
        if 0 <= dwell_ms < 1000:
            _dwell_times.append(dwell_ms)
    _last_release_time = now


def compute_feature_vector(window_duration_s):
    if _key_count < MIN_KEYS or len(_dwell_times) < 3 or len(_flight_times) < 3:
        return None
    return [
        statistics.mean(_dwell_times),
        statistics.mean(_flight_times),
        _key_count / window_duration_s,
        _error_count / _key_count * 100,
        statistics.pstdev(_dwell_times),
        statistics.pstdev(_flight_times),
        GRIP_PLACEHOLDER,
        GRIP_ASYM_PLACEHOLDER,
    ]


def reset_window():
    global _key_count, _error_count
    _dwell_times.clear()
    _flight_times.clear()
    _key_count = 0
    _error_count = 0


def load_model_and_stats():
    with open(STATS_PATH) as f:
        stats = json.load(f)
    session = ort.InferenceSession(MODEL_PATH)
    input_name = session.get_inputs()[0].name
    return session, input_name, stats


def score_vector(session, input_name, vector, mean, std, threshold):
    vector = np.array(vector, dtype=np.float32)
    normalized = (vector - np.array(mean, dtype=np.float32)) / np.array(std, dtype=np.float32)
    input_tensor = normalized.reshape(1, -1).astype(np.float32)
    outputs = session.run(None, {input_name: input_tensor})
    reconstruction = outputs[0][0]
    mse = float(np.mean((reconstruction - normalized) ** 2))
    return mse, mse > threshold


def supabase_login():
    url = f"{SUPABASE_URL}/auth/v1/token?grant_type=password"
    headers = {"apikey": SUPABASE_ANON_KEY, "Content-Type": "application/json"}
    body = {"email": TEST_EMAIL, "password": TEST_PASSWORD}
    resp = requests.post(url, headers=headers, json=body)
    resp.raise_for_status()
    data = resp.json()
    return data["access_token"], data["user"]["id"]


def trigger_alert(access_token, user_id, mse):
    url = f"{SUPABASE_URL}/rest/v1/alerts"
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }
    body = {
        "user_id": user_id,
        "keystroke_score": mse,
        "combined_score": mse,
        "user_response": "none",
    }
    resp = requests.post(url, headers=headers, json=body)
    resp.raise_for_status()
    return resp.json()


def main():
    session, input_name, stats = load_model_and_stats()
    mean, std, threshold = stats["feature_mean"], stats["feature_std"], stats["anomaly_threshold"]

    print("Logging into Supabase...")
    access_token, user_id = supabase_login()
    print(f"Logged in as user {user_id}\n")

    print(f"Live monitoring started. Threshold = {threshold:.4f}")
    print(f"Scoring every {WINDOW_SECONDS}s. Press Ctrl+C to stop.\n")

    listener = keyboard.Listener(on_press=on_press, on_release=on_release)
    listener.start()

    consecutive_anomalies = 0

    try:
        while True:
            start = time.time()
            time.sleep(WINDOW_SECONDS)
            vector = compute_feature_vector(time.time() - start)

            if vector is None:
                print(f"[{time.strftime('%H:%M:%S')}] not enough typing, skipped")
                reset_window()
                continue

            mse, is_anomaly = score_vector(session, input_name, vector, mean, std, threshold)

            if is_anomaly:
                consecutive_anomalies += 1
                status = f"ANOMALY ({consecutive_anomalies}/{CONSECUTIVE_ANOMALIES_TO_ALERT} in a row)"
            else:
                consecutive_anomalies = 0
                status = "normal"

            print(f"[{time.strftime('%H:%M:%S')}] {status} | mse={mse:.4f}")

            if consecutive_anomalies >= CONSECUTIVE_ANOMALIES_TO_ALERT:
                print("\n*** Sustained anomaly detected. Sending alert... ***")
                try:
                    result = trigger_alert(access_token, user_id, mse)
                    print(f"*** Alert inserted: {result[0]['id']} ***\n")
                except Exception as e:
                    print(f"*** Failed to send alert: {e} ***\n")
                consecutive_anomalies = 0

            reset_window()

    except KeyboardInterrupt:
        print("\nStopped.")
        listener.stop()


if __name__ == "__main__":
    main()