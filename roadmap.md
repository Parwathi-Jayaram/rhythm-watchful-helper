# Roadmap

- [x] User A / User B contact isolation verified (B sees only own contacts; cannot delete A's)
- [x] `consents` table + POST /consent, GET /consent/status
- [x] `alerts` table extended (keystroke_score, sensor_score) + POST /alerts, GET /alerts
- [x] Tested: consent + alert created as logged-in user, retrievable via GET, 401 without token
- [ ] Pending: wire real SMS (Twilio) + email (Resend) when accounts/keys are provided
