# Lokafish — Design Rules

These are persistent design rules for this project. Apply them to every page, mock, and component.

## Typography

- **Hero display only**: Playfair Display (or whichever face is selected via the hero font picker), italic, 700–900. Used **only** for the single hero h1 — nothing else.
- **All other headings, brand marks, stat numbers, section titles, big numerals**: Inter Tight, weight 500–700, sentence case, tight negative letter-spacing (-0.025em to -0.04em). This is the workhorse for readability.
- **Body / UI / labels / system codes**: JetBrains Mono.
- Pair only these three families. No Inter (use Inter Tight instead), no system-sans fallback as a primary face.

## Casing — IMPORTANT

- **Avoid ALL-CAPS / `text-transform: uppercase` for body, headings, sentences, and CTA labels.** Use sentence case ("Start prediction", "What is Loka", "Five-layer prediction pipeline") instead of "START PREDICTION" / "WHAT IS LOKA".
- The only places where uppercase is acceptable:
  - Single-word system codes / monogram tags shorter than ~10 characters (e.g. "OASIS", "MSCI", "CGE", "MC")
  - Acronyms used inline within sentence-cased copy
- Section labels, buttons, navigation, table headers, eyebrows, status text, and footer text should all be **sentence case**.
- This rule overrides any prior page that used uppercase liberally.

## Color

- Pure black `#000` foreground, pure white `#fff` background, with a warm off-white `#f5f4ef` for alternating sections.
- Lines: 1px solid black for primary section borders; `rgba(0,0,0,0.15)` for inner divisions.
- Avoid colored accents in the landing visual language; let the type and grid carry the design.

## Visual chrome

- Four-corner system codes (top-left, top-right, bottom-left, bottom-right) are part of the brand. Keep them small (≈ 10–11px), letter-spaced, sentence case where copy allows.
- Registration marks (cross-hair) sit just inside the system codes at four corners.
- Cursor: `crosshair` on every element to keep the "instrument" feel.

## Layout

- Generous outer padding (≥ 80px desktop), narrow content columns inside.
- Use grid lines (1px black) to delineate features / pipeline / specs instead of card shadows or rounded containers.
- No rounded containers anywhere in the landing language. Sharp edges only.

## The globe

- Black-on-white particle sphere with neighbor-line connectivity, gentle rotation + per-particle drift. No flicker effects. Container has `overflow: hidden` and `border-radius: 50%` so particles are always visually contained.
- Brand label inside the globe reads "Loka World" (not "Loka").
