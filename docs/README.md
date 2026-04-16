# GovMobile — Documentation Index

> Entry point for all project documentation.

---

## Product

Understanding what we're building and why.

- [Product Overview](./product/overview.md) — problem, solution, users, core features
- [Use Cases](./product/use-cases.md) — primary user flows and business rules

---

## Architecture

How the system is structured and how it works.

- [System Design](./architecture/system-design.md) — layers, data flows, state management, offline strategy
- [API Contract](./api-contract.md) — REST endpoints and WebSocket events
- [Architecture Decision Records](./decisions/README.md) — key decisions and their trade-offs

---

## Design System

Visual language and component rules.

- [Design System](./design-system/design-system.md) — entry point for all design system docs
- [Philosophy](./design-system/design-system-philosophy.md)
- [Tokens](./design-system/design-system-tokens.md)
- [Components](./design-system/design-system-components.md)
- [Accessibility](./design-system/design-system-accessibility.md)
- [Theme Reference](./design-system/design-system-theme-reference.md)
- [Quick Reference](./design-system/design-system-quick-reference.md)

---

## Design Patterns

Interaction, motion, and performance rules.

- [Design Pattern](./design-pattern/design-pattern.md) — entry point for all pattern docs
- [Philosophy](./design-pattern/design-pattern-philosophy.md)
- [Motion and Navigation](./design-pattern/design-pattern-motion-navigation.md)
- [Interactions](./design-pattern/design-pattern-interactions.md)
- [Loading and Gestures](./design-pattern/design-pattern-loading-gestures.md)
- [Performance](./design-pattern/design-pattern-performance.md)
- [Accessibility and Anti-patterns](./design-pattern/design-pattern-accessibility-anti-patterns.md)
- [Quick Reference](./design-pattern/design-pattern-quick-reference.md)

---

## Implementation Guides

Step-by-step build playbooks with prompts and POCs.

- [AI Driver and Dispatcher Prompt Guide](./implementation/ai-driver-dispatcher-prompt-guide.md) — prompts + POCs to finish run lifecycle, role routing, and operational screens
- [GovMob WebSocket Integration Guide](./implementation/websocket-integration-govmob.md) — `/despacho` namespace, JWT auth, ride lifecycle, telemetry, and persistent chat

---

## UX

Screen flows and navigation structure.

- [User Flows](./ux/flows.md) — screen sequences for all primary user journeys

---

## Engineering

Standards, workflows, and quality practices.

- [Engineering Standards](./engineering-standards.md) — commits, JSDoc, clean code, file naming
- [Git Workflow](./git-workflow.md) — branching, PR, and merge strategy
- [Testing Strategy](./testing-strategy.md) — levels, tools, coverage targets, what to test
- [Full System Testing Guide](./testing-system-guide.md) — step-by-step local validation of lint, type-check, tests, coverage, and manual smoke flows
- [DevOps](./devops.md) — CI pipeline, build process, deployment
- [Security](./security.md) — authentication, authorization, data protection
