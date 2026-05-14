# Sorrimobi — Product Overview

> **Goal:** Define what Sorrimobi is, who it serves, and how operational field work is coordinated.

---

## Government Operational Mobility System — Business Model

**Purpose:** An internal fleet coordination and task dispatch platform for public servants. Not a consumer app - a controlled operational tool.

### Actors

- **Field Agent** - Executes assigned runs via mobile app
- **Dispatcher** - Creates and assigns runs, monitors operations in real-time
- **Supervisor** - Reviews performance, overrides actions
- **Admin** - Configures services, departments, and permissions

### Core Entity: The Run

A run is a government task that requires field movement.

Types:

- transport
- inspection
- emergency dispatch
- maintenance
- administrative delivery

Lifecycle:

```text
PENDING -> ASSIGNED -> IN_PROGRESS -> COMPLETED
                               \-> CANCELLED
```

### Operational Flow

1. Dispatcher creates a run (type, location, priority)
2. System suggests an agent or dispatcher assigns manually (based on location, availability, role)
3. Agent receives notification and accepts or rejects
4. Agent navigates, executes, updates status
5. Agent completes run with notes and proof (photo/document)
6. Supervisor reviews outcome

### Supporting Features

- Dispatcher <-> Agent real-time chat (text, attachments)
- Voice calls between dispatcher and agents
- Live map tracking of active runs
- Post-run proof uploads and supervisor review

### Permission Model

| Role       | Capabilities                           |
|------------|----------------------------------------|
| Agent      | View assigned runs, update status      |
| Dispatcher | Create/assign runs, monitor all agents |
| Supervisor | View reports, override actions         |
| Admin      | Full system access                     |

### System Identity

> A task dispatch engine for field operations - not a transportation app, but an operational coordination platform.

---

## Non-Goals

- No commercial transactions or payment flows
- No advertising or promotional content
- No public social-network behavior
- No data collection beyond operational necessity

---

## Product Principles

- **Operational clarity**: Every UI action maps to a real operational state
- **Role safety**: Permissions and transitions are role-aware and auditable
- **Accessibility first**: WCAG 2.1 AA baseline for public-sector reliability
- **Offline resilience**: Critical context stays available with degraded connectivity
- **Data privacy**: Only operationally necessary data is displayed

---

## Related Docs

- `README.md`
- `docs/product/use-cases.md`
- `docs/architecture/system-design.md`
- `docs/implementation/ai-driver-dispatcher-prompt-guide.md`
- `docs/security.md`
