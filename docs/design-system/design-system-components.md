# Design System — Component Rules

> **Goal:** Standardize behavior and appearance for reusable UI components.

---

## Button

Variants:

- `primary`
- `secondary`
- `ghost`
- `danger`

Rules:

- Min height 44
- Disabled state must be visually distinct
- Loading state keeps layout size stable
- Press feedback is mandatory

---

## Input

Rules:

- Default, focused, and error borders must be distinct.
- Error must show icon/text context, not color alone.
- Label above input, helper/error text below input.

---

## Avatar

Rules:

- Fallback to initials when image is unavailable.
- Initials color generation should be deterministic by user id.
- Online badge should be visible and accessible.

---

## Badge

Rules:

- Hide when count is zero.
- For count > 99, display `99+`.
- Keep placement and touch target consistent.

---

## Message Bubble

Rules:

- Outgoing and incoming styles must be clearly distinct.
- Max width around 75% of screen width.
- Timestamp and delivery state should be easy to parse.
- Failed states must include retry affordance.

---

## Call Card

Rules:

- Missed calls use semantic missed color.
- Caller identity and action hierarchy must be clear.
- Callback action requires minimum 44x44 touch area.

---

## Notification Item

Rules:

- Priority stripe color maps to priority level.
- Unread/read states must be visually distinct.
- Swipe-to-dismiss should provide clear destructive feedback.

---

## Shared Component Requirements

- Typed props interface exported
- `displayName` set
- Supports `testID`
- Uses `StyleSheet.create()`
- Uses theme tokens only
- Uses i18n for text

