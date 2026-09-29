# Roadmap

- [x] User A / User B contact isolation verified
- [x] consents + alerts tables and endpoints
- [x] Auto SMS on new alert: DB trigger -> /api/public/hooks/alert-sms -> Twilio (duplicate-safe)
- [ ] Blocked: Twilio sender number (TWILIO_FROM_NUMBER) — connected Twilio account lists no phone numbers; waiting on user
- [ ] Publish/confirm hook URL works, then end-to-end test with live_monitor_v2.py
- [ ] Email via Resend (later)
