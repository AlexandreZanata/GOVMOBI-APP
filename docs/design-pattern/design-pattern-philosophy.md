# Design Pattern — Philosophy

> **Goal:** Keep interactions fast, purposeful, and institutionally professional.

---

## Core Direction

Sorrimobi is used in high-cognitive-load contexts. Interaction design must prioritize:

- Purposeful feedback
- Perceived speed
- Institutional confidence

Target style: efficient and restrained, not playful.

---

## Three Pillars

| Pillar                   | Meaning                                       | Avoid                                       |
|--------------------------|-----------------------------------------------|---------------------------------------------|
| Purposeful               | Animation communicates state/hierarchy        | Decorative looping motion                   |
| Invisible Speed          | UI appears responsive before data is complete | Waiting for full payload to render anything |
| Institutional Confidence | Tight, precise motion style                   | Bouncy or exaggerated transitions           |

---

## Global Rules

- No bounce/elastic easing in production flows.
- No long animations in repeated journeys.
- Every interaction needs immediate visual response.
- All behavior should be consistent across screens.

