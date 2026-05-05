# Architecture Decision Records

> **Goal:** Document significant architectural decisions, their context, and their trade-offs.

---

## What is an ADR?

An Architecture Decision Record (ADR) captures a decision that has a meaningful impact on the system's structure, technology choices, or development practices. It records:

- The **context** that made the decision necessary
- The **decision** that was made
- The **consequences** (positive and negative)
- The **alternatives** that were considered and rejected

ADRs are immutable once accepted. If a decision is reversed, a new ADR is created to supersede the old one.

---

## Index

| ADR                                    | Title                                        | Status   |
|----------------------------------------|----------------------------------------------|----------|
| [ADR-001](./adr-001-facade-pattern.md) | Use Facade Pattern for Service Layer         | Accepted |
| [ADR-002](./adr-002-atomic-design.md)  | Use Atomic Design for Component Architecture | Accepted |
| [ADR-003](./adr-003-redux-toolkit.md)  | Use Redux Toolkit for State Management       | Accepted |

---

## ADR Status Values

| Status       | Meaning                                       |
|--------------|-----------------------------------------------|
| `Proposed`   | Under discussion, not yet implemented         |
| `Accepted`   | Decision made and implemented                 |
| `Deprecated` | Was accepted but is being phased out          |
| `Superseded` | Replaced by a newer ADR (link to replacement) |

---

## Adding a New ADR

1. Copy the structure from an existing ADR
2. Name the file `adr-NNN-short-title.md` (next sequential number)
3. Set status to `Proposed` until the team agrees
4. Update this index after the ADR is accepted
