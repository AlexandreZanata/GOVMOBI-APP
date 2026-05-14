# Sorrimobi — Use Cases

> **Goal:** Document the primary user flows and business logic that drive feature decisions.

---

## UC-01 — Citizen Requests a Service

**Actor:** Citizen  
**Precondition:** Citizen is authenticated

1. Citizen opens the app and lands on the Home screen
2. Citizen selects a service category from the Quick Actions grid
3. Citizen fills in the service request form (description, location, urgency)
4. System creates a service request and notifies available officers
5. Citizen receives confirmation and waits for assignment
6. System notifies citizen when an officer is assigned
7. Citizen can track status and communicate with the assigned officer via chat

**Postcondition:** Service request is active and assigned to an officer

---

## UC-02 — Officer Receives and Accepts an Assignment

**Actor:** Officer  
**Precondition:** Officer is authenticated and available

1. Officer receives a push notification for a new service request
2. Officer opens the notification and views request details
3. Officer accepts or declines the assignment
4. If accepted: officer status updates to "on assignment"
5. Officer navigates to the citizen's location (external map integration, future)
6. Officer communicates with citizen via in-app chat or call
7. Officer marks the service as completed

**Postcondition:** Service request is closed; activity is logged

---

## UC-03 — Real-time Chat Between Citizen and Officer

**Actor:** Citizen or Officer  
**Precondition:** Both parties are authenticated; a service request exists

1. User opens the Chat screen
2. User selects an existing conversation or starts a new one
3. User types a message and sends it
4. Message is delivered in real-time via WebSocket
5. Recipient receives a push notification if the app is in background
6. Recipient opens the conversation and reads the message
7. Read receipt is sent back to the sender

**Supported message types:** Text, image, file attachment, audio note

---

## UC-04 — Voice/Video Call

**Actor:** Citizen or Officer  
**Precondition:** Both parties are authenticated

1. Caller initiates a call from the Call Directory or from a conversation
2. Callee receives an incoming call screen with caller info
3. Callee answers or declines
4. If answered: call is established (voice or video)
5. Either party can mute, toggle speaker, or put on hold
6. Either party ends the call
7. Call is logged in both parties' call history

---

## UC-05 — Manager Sends an Announcement

**Actor:** Manager or Admin  
**Precondition:** User has `MANAGER` or `ADMIN` role

1. Manager navigates to the Announcements section
2. Manager creates a new announcement with title, body, and priority level
3. System broadcasts the announcement to all users in the department
4. Users receive a push notification
5. Announcement appears in the Home screen banner and Notifications list

---

## UC-06 — Admin Manages Users and Departments

**Actor:** Admin  
**Precondition:** User has `ADMIN` role

1. Admin accesses the administration panel
2. Admin creates, edits, or deactivates user accounts
3. Admin assigns roles and departments to users
4. Admin views department activity and service request reports

---

## UC-07 — Session Expiry and Re-authentication

**Actor:** Any authenticated user  
**Precondition:** User has an active session with an expiring token

1. App detects token is near expiry via `useAuthSession` hook
2. App silently attempts token refresh via `AuthFacade.refreshToken()`
3. If refresh succeeds: session continues transparently
4. If refresh fails: user is redirected to the Login screen
5. User re-authenticates and resumes their previous context

---

## Business Rules

- A citizen can only have one active service request at a time
- An officer can only be assigned to one active request at a time
- Missed calls must be logged and surfaced in the Calls screen with a visual indicator
- Notifications with `CRITICAL` priority must trigger haptic feedback
- All user-facing text must be available in pt-BR, en-US, and es

---

## Related Docs

- `docs/product/overview.md`
- `docs/architecture/system-design.md`
- `docs/api-contract.md`
