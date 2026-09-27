# Roadmap

- [ ] Finish User A / User B contact isolation test (User B must not see User A's contact)
- [ ] Add `consents` table + POST /consent, GET /consent/status (additive; existing profiles consent stays)
- [ ] Add `alerts` table + POST /alerts, GET /alerts (insert/list only, no dispatch)
- [ ] Test: create consent + alert as logged-in user, verify GET endpoints return them scoped to that user
- [ ] Pending from before: wire real SMS (Twilio) + email (Resend) when accounts/keys are provided
