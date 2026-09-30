# Rhythm Watchful Helper

[![GitHub](https://img.shields.io/badge/GitHub-Repository-black?logo=github)](https://github.com/Parwathi-Jayaram/rhythm-watchful-helper)

## Overview

Rhythm Watchful Helper is an AI-assisted early-warning system that monitors a user's typing patterns and detects unusual changes in their normal typing rhythm.

When a significant and sustained change is detected, the system sends a warning to the user's verified emergency contacts via email/SMS, allowing them to check on the person and seek appropriate help if necessary.

The system focuses on **typing behavior rather than the content being typed**, making it possible to monitor changes in motor patterns without reading or storing the user's messages.

> **Note:** Rhythm Watchful Helper is a prototype and is not intended to diagnose stroke or any other medical condition. An alert simply indicates an unusual change in typing behavior and should not be treated as a medical diagnosis.

## How It Works

1. **Monitor** — The system captures typing-pattern information such as typing speed, dwell time, flight time, and typing consistency.
2. **Analyze** — A machine-learning model compares the current typing pattern with the user's normal pattern.
3. **Detect** — Sustained unusual behavior triggers an alert.
4. **Notify** — The system warns the user's verified emergency contacts.
5. **Respond** — Emergency contacts can check on the user and take appropriate action if necessary.

## Key Features

- Personalized typing-pattern monitoring
- Machine-learning based anomaly detection
- Detection of sustained changes in typing behavior
- Emergency contact management
- Emergency contact verification
- Automatic warning notifications
- Alert history
- Privacy-focused monitoring that does not analyze typed message content
