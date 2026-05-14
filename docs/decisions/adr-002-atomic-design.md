# ADR-002 — Use Atomic Design for Component Architecture

> **Status:** Accepted  
> **Date:** 2024-01  
> **Deciders:** Engineering team

---

## Context

Sorrimobi needs a scalable component system that can grow from a small set of screens to a full enterprise application without accumulating UI debt. Without a clear component hierarchy, teams tend to duplicate UI code, create inconsistent visual patterns, and produce components that are hard to test or reuse.

---

## Decision

Adopt **Atomic Design** as the component architecture:

| Level      | Location                          | Examples                                      |
|------------|-----------------------------------|-----------------------------------------------|
| Atoms      | `src/components/atoms/`           | Button, Text, Input, Icon, Avatar, Badge      |
| Molecules  | `src/components/molecules/`       | MessageBubble, CallCard, SearchBar            |
| Organisms  | `src/components/organisms/`       | BottomTabBar, AppHeader, ChatList             |
| Templates  | `src/components/templates/`       | Screen layout wrappers                        |
| Screens    | `src/screens/`                    | HomeScreen, ChatRoomScreen, CallHistoryScreen |

**Rules enforced by this decision:**
- Atoms use only `useTheme()` for styling — no hardcoded values
- Molecules import only atoms and theme — no direct store access
- Organisms may access the Redux store via hooks
- Screens compose organisms and handle navigation

---

## Consequences

**Positive:**
- Clear rules for where new UI code belongs
- Atoms and molecules are highly reusable and independently testable
- Design system changes propagate automatically through the hierarchy
- Onboarding new developers is faster with a well-known pattern

**Negative:**
- Requires discipline to maintain layer boundaries
- Small features may feel over-engineered at the atom level
- Naming and placement decisions require judgment calls at the boundary between levels

---

## Alternatives Considered

| Alternative              | Reason rejected                                                  |
|--------------------------|------------------------------------------------------------------|
| Feature-based components | Leads to duplication; no shared visual language                  |
| Flat component folder    | Doesn't scale; no hierarchy or reuse guidance                    |
| Storybook-driven design  | Valuable addition in future; not a replacement for structure     |

---

## Related Docs

- `docs/design-system/design-system.md`
- `README.md` (Step 4 — Atoms, Step 5 — Molecules, Step 12 — Organisms)
- `src/components/`
