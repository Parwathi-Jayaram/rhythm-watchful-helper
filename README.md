# Rhythm Watchful Helper 🚨⌨️

An automated, non-invasive health monitoring daemon that uses **keystroke dynamics** to detect sudden onset medical emergencies—such as stroke, severe dizziness, or cognitive distress—and dispatches immediate alerts to emergency contacts.

---

## 📌 Overview

**Rhythm Watchful Helper** passively monitors continuous typing patterns in the background. Neuromuscular impairment or acute cognitive disorientation rapidly manifests as measurable deviations in typing mechanics—specifically key hold duration (**Dwell Time**) and interval delay between successive keys (**Flight Time**).

By analyzing these biometric timing metrics in real time against a pre-calibrated baseline, the application detects anomalous motor behavior and automatically triggers email alerts to trusted contacts—enabling fast intervention even when the user is unable to reach for a phone or trigger a manual alarm.

---

## 🔒 Privacy & Safety First

- **Zero Content Logging:** The system **only** records key press and key release timestamps. It does **not** log key characters, passwords, or text typed.
- **Local Processing:** All anomaly computations run locally on your device. Typing metrics are never sent to external servers or cloud analytics.
- **False-Positive Guardrails:** Built-in sliding-window confirmation prevents single accidental key holds or typos from triggering false panic alarms.

---

## 🏗️ Technical Architecture
