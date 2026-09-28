import csv
import os
import time
import statistics
from collections import deque

from pynput import keyboard

WINDOW_SECONDS = 15
MIN_KEYS = 15
GRIP_PLACEHOLDER = 0.75
GRIP_ASYM_PLACEHOLDER = 0.05
CSV_PATH = "typing_data.csv"
HEADER = ["timestamp", "avg_dwell", "avg_flight", "typing_speed", "error_rate",
          "dwell_var", "flight_var", "grip", "grip_asym"]

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
        return  # held-key repeat, ignore
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


def save_row(vector):
    new_file = not os.path.exists(CSV_PATH)
    with open(CSV_PATH, "a", newline="") as f:
        w = csv.writer(f)
        if new_file:
            w.writerow(HEADER)
        w.writerow([time.strftime("%Y-%m-%d %H:%M:%S")] + [round(v, 3) for v in vector])


def main():
    print(f"Logging to {CSV_PATH}. One row every {WINDOW_SECONDS}s. Ctrl+C to stop.\n")
    listener = keyboard.Listener(on_press=on_press, on_release=on_release)
    listener.start()
    saved = 0
    try:
        while True:
            start = time.time()
            time.sleep(WINDOW_SECONDS)
            vector = compute_feature_vector(time.time() - start)
            if vector is not None:
                save_row(vector)
                saved += 1
                print(f"[{time.strftime('%H:%M:%S')}] saved row #{saved}: {[round(v, 1) for v in vector]}")
            else:
                print(f"[{time.strftime('%H:%M:%S')}] not enough typing, skipped")
            reset_window()
    except KeyboardInterrupt:
        print(f"\nStopped. {saved} rows saved to {CSV_PATH}.")
        listener.stop()


if __name__ == "__main__":
    main()