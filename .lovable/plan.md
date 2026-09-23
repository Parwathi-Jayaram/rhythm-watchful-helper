# Rhythm interactive prototype

## Goal
Build the requested light-theme Rhythm prototype as a polished React experience using mock data only, with exactly five product states: Setup, Home, Soft check-in, Full-screen check-in, and Alarm.

## What I’ll build
- A three-step Setup screen covering consent, an 8-minute simulated learning state, and up to three emergency contacts with test-status feedback.
- A compact 420×560 Home window with calm rhythm activity, pause/away controls, connectivity status, a settings menu, sensitivity selection, startup toggle, and data deletion action.
- A soft check-in over a mock Windows desktop, including a visible 10-second countdown and both response actions.
- A full-screen check-in with a 20-second countdown ring, click controls, and a working one-second Enter-key hold.
- A warm alarm state with contact delivery statuses and a working two-second hold-to-cancel control.
- Return-to-home confirmation toast after successful check-in or alarm cancellation.

## Visual direction
- Follow the supplied palette exactly: off-white, indigo, amber, red-orange, and near-black.
- Use Inter, sentence case, 14px minimum text, 12–20px radii, restrained borders, and only one shadow on the floating check-in.
- Keep animation gentle and slower than one state change per second; support reduced-motion preferences.
- Use neutral abstract UI marks only—no medical iconography, charts, dark mode, or additional screens.

## Technical details
- Implement the five frames as interactive states on the existing `/` page.
- Define all visual colors and motion centrally as semantic design tokens.
- Add app-specific page metadata and font loading.
- Validate the setup path, timed escalation, response actions, keyboard hold, settings, and alarm cancellation in the live preview at desktop and compact sizes.
