# Gentle Watch

Rhythm (minimal): Figma Make prompt

Paste everything between START and END into Figma Make in one go.

START OF PROMPT

Design and build a clickable prototype of Rhythm, a small Windows background app. It learns how one person normally types (timing only, never the words) and if their typing suddenly stops or goes erratic, it asks "Are you okay?" and, if there's no answer, sounds an alarm and messages a trusted contact. Use mock data only, no real keyboard capture. It is NOT a medical device and must never claim to detect a seizure or stroke — only that it notices a sudden change in typing.

Feel: calm, quiet, trustworthy. Plain language, sentence case. No medical icons (no crosses, hearts, ECG lines, pills). No flashing or strobing anywhere — nothing may change faster than once per second, this is a hard rule since the audience may include people sensitive to flashing.

Frames, all 1440x900, light theme only:

Setup (one screen, 3 steps in a single stepper):

Step 1, Consent: one sentence explaining it reads typing timing only, never words; a checkbox "I understand this is not a medical device"; button disabled until checked.

Step 2, Learn your typing: a progress ring (0 to 8 minutes) with the label "Keep typing normally in any app"; below it a simple row of small bars representing keystroke rhythm, animating gently.

Step 3, Add emergency contacts: a list (start with one row) of name + phone number fields, plus a "+ Add another contact" link (up to 3). A "Send test alert" button per row showing a status chip (Not tested / Sent / Delivered).

Home (the main small window, about 420x560, like a widget):

Top: a status sentence in large text, one of: "Watching quietly", "Getting to know your typing", "Paused until 4:30 PM".

Middle: the same small rhythm-bar strip, calmer/slower animation.

Below: two buttons stacked, "Pause for 30 minutes" and "I'm stepping away".

Bottom: one line showing contact status, e.g. "2 emergency contacts added" with a green dot, or "No internet — alerts can't send" with an amber dot.

A small settings gear icon top-right opening a simple list: Emergency contacts, Sensitivity (Relaxed/Balanced/Sensitive — three buttons), Pause with Windows startup toggle, Delete all my data.

Soft check-in card: small floating card (380x160) bottom-right over a mock desktop background. Text: "Your typing looks different from usual. Are you okay?" Two buttons: "I'm okay" (primary) and "Give me a minute". Thin countdown bar along the bottom.

Full-screen check-in: full-screen light overlay. Center panel with big text "Are you okay?", a countdown ring showing seconds, two large buttons "I'm okay" and "I need help now". Small text below: "Hold Enter for 1 second, or click, to answer. Random key presses won't dismiss this."

Alarm screen: full-screen warm red-orange background. Heading "Alerting your contacts". A simple list showing the contact's name with a status word (Sending / Delivered). A large button "I'm okay — hold to cancel" that visibly fills up over 2 seconds. Small text: "Alarm is playing and rising to full volume."

Colors: background off-white #F4F5FA, primary indigo #3A45A8, alert amber #F2A900 (soft check-in only), alarm red-orange #C2331F, text near-black #171B3A. Rounded corners (12–20px), no drop shadows except on the floating soft card.

Typography: one clean sans-serif (e.g. Inter or similar), sentence case everywhere, nothing smaller than 14px, big countdown numbers use a bold weight.

Interactions to wire up:

Setup step 1 → 2 → 3 → Home.

Home → (simulate trigger) → Soft check-in card → after 10s auto-advances to Full-screen check-in → after 20s auto-advances to Alarm screen.

"I'm okay" on either check-in screen returns to Home with a brief "Thanks, back to watching" toast.

Alarm screen hold-to-cancel returns to Home.

Do not include: history screens, charts, graphs, simulation labs, multiple themes, dark mode, or any medical iconography. Keep this to exactly the 5 frames above.

END OF PROMPT

Build in react+vite+typescript

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/d09c71dc-a064-463b-865f-7cb42297a13b).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
