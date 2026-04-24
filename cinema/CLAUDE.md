# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Plain HTML/CSS/JS website for **Cinema** — a premium web design agency. No build tools, no framework, no package manager. Open `index.html` directly in a browser to preview.

Deployed on Vercel. Push to `main` → auto-deploy. `vercel.json` sets `outputDirectory: "."` so Vercel serves from the repo root (not the `public/` folder).

## Architecture

### Entry flow
The site uses a **full-screen lead capture gate** that blocks access until the visitor submits their name, email, and phone. The gate (`#entry-gate`) sits fixed over the main site (`#main-site`), which starts with `display:none` + `opacity:0`. On valid gate submission, the gate fades out and the main site fades in via CSS transitions.

### Files
- `index.html` — all markup. One page, seven sections: Hero → Services → Why Us → Process → Contact → CTA → Footer.
- `src/styles/main.css` — all styles. No preprocessor. Organized with section comments matching the HTML order.
- `src/js/gate.js` — gate logic only: validation, lead storage, gate→site transition.
- `src/js/main.js` — site logic: mobile nav toggle, contact form, scroll reveal (IntersectionObserver).

### Lead storage
Both `gate.js` and `main.js` store submissions to `localStorage` as structured JSON arrays. Each entry has `id`, `timestamp`, `source`, `name`, `email`, `phone`, `status: 'new'`. `TODO` comments in both files mark the exact lines to replace with a `fetch()` API call when a backend is added.

### Scroll reveal
Elements with `[data-reveal]` start at `opacity:0; transform:translateY(28px)` via CSS. `initReveal()` in `main.js` uses IntersectionObserver to add `.is-revealed` when they enter the viewport. `data-delay="1"–"4"` maps to CSS `transition-delay` for staggered effects. Hero elements skip this system and animate via CSS keyframes on `.site--visible` instead (fires right after gate dismiss).

## Design system

**Palette:** deep black `#080809` · charcoal surfaces `#1d1d21` · warm gold `#c09a45` · cream text `#ede9e0`

**Fonts (Google Fonts):**
- `Cormorant Garamond` — all headings (`--font-display`), editorial serif
- `Montserrat` — nav, labels, buttons (`--font-head`), uppercase tracked
- `Inter` — body copy (`--font-body`)

**CSS variables** in `:root` control the entire palette, spacing scale, and transition easings. Change a variable once to update the whole site.

## Business rules (do not violate)
- Cinema sells **premium websites and website upgrades only**. Do not add copy that mentions custom consulting, custom strategy, or bespoke service engagements.
- The gate **always** shows on every visit — do not add logic that skips it for returning visitors unless explicitly asked.
- Keep the offer simple: new websites, website upgrades, lead capture built in.
