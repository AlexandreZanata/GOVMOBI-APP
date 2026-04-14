# GovMobile — Public Administration Mobile App

> **A professional React Native app for public administration services.**  
> Built with Atomic Design, Facade pattern, i18n, and production-grade architecture.

---

## 📐 Architecture Overview

```
govmobile/
├── src/
│   ├── components/           # Atomic Design System
│   │   ├── atoms/            # Button, Text, Input, Icon, Avatar, Badge
│   │   ├── molecules/        # SearchBar, MessageBubble, CallCard, NotificationItem
│   │   ├── organisms/        # ChatList, CallList, HomeHeader, BottomNav
│   │   └── templates/        # Screen layout wrappers
│   ├── screens/              # Feature screens
│   │   ├── Home/
│   │   ├── Chat/
│   │   ├── Calls/
│   │   └── Auth/
│   ├── navigation/           # React Navigation config
│   ├── services/
│   │   ├── facades/          # Service facades (hides implementation)
│   │   ├── api/              # REST clients
│   │   └── websocket/        # Real-time connection
│   ├── models/               # TypeScript types & interfaces
│   ├── store/                # Redux Toolkit slices
│   ├── hooks/                # Custom React hooks
│   ├── i18n/                 # Multi-language (pt-BR, en-US, es)
│   ├── theme/                # Colors, typography, spacing
│   └── utils/                # Helpers, formatters
└── docs/                     # Architecture docs
```

---

## 🚀 AI-Assisted Build — Step-by-Step Prompts

Each step below is a **standalone prompt** you can paste into Claude to generate that part of the system. Each step has a **Proof of Concept (POC)** file to validate the step before moving on.

---

### STEP 1 — Theme & Design Tokens

**Goal:** Establish the visual foundation: colors, typography, spacing, shadows.

**Prompt:**
```
Create a React Native theme system for a public administration mobile app called GovMobile.

Requirements:
- File: src/theme/index.ts
- Export: colors, typography, spacing, shadows, borderRadius, zIndex
- Colors: professional government palette — deep navy primary (#0A1628), institutional blue (#1B3A6B), accent gold (#C9992A), neutral grays, semantic colors (success, warning, error, info)
- Typography: use system fonts with defined scale (xs, sm, md, lg, xl, 2xl, 3xl) with weight variants
- Spacing: 4px base grid (4, 8, 12, 16, 20, 24, 32, 40, 48, 64)
- Include a createTheme() function and useTheme() hook
- Support light and dark mode variants
- Export a ThemeProvider component using React Context

POC: Create src/theme/__tests__/theme.test.ts that verifies all tokens are defined and useTheme() returns correct values.
```

**POC File:** `src/theme/__tests__/theme.test.ts`

---

### STEP 2 — i18n Internationalization

**Goal:** Multi-language support from day one (pt-BR, en-US, es).

**Prompt:**
```
Set up i18n internationalization for a React Native app (GovMobile) using i18next and react-i18next.

Requirements:
- File structure: src/i18n/index.ts, src/i18n/locales/pt-BR.json, en-US.json, es.json
- Namespaces: common, home, chat, calls, auth, errors
- Keys to include:
  - common: app name, loading, retry, cancel, confirm, save, back, search, notifications
  - home: greeting (with name interpolation), services, recent activity, announcements
  - chat: new message, typing, online, offline, send, attach
  - calls: incoming call, outgoing call, missed call, duration, answer, decline, end call
  - auth: login, logout, username, password, forgot password
  - errors: network error, session expired, unknown error
- Auto-detect device language, fallback to pt-BR
- Export useTranslation re-export from src/i18n/useTranslation.ts
- Export language switcher hook: useLanguage() with { currentLanguage, changeLanguage, availableLanguages }

POC: Create src/i18n/__tests__/i18n.test.ts that verifies all 3 languages load, keys exist in all locales, and interpolation works.
```

**POC File:** `src/i18n/__tests__/i18n.test.ts`

---

### STEP 3 — Models & TypeScript Interfaces

**Goal:** Define all domain models as TypeScript interfaces.

**Prompt:**
```
Create TypeScript models for a public administration mobile app (GovMobile).

Requirements:
- src/models/User.ts — User, UserRole (ADMIN, MANAGER, OFFICER, CITIZEN), UserStatus
- src/models/Message.ts — Message, MessageType (TEXT, IMAGE, FILE, AUDIO, SYSTEM), MessageStatus (SENDING, SENT, DELIVERED, READ, FAILED), Conversation, ConversationParticipant
- src/models/Call.ts — Call, CallType (VOICE, VIDEO), CallStatus (INCOMING, OUTGOING, MISSED, ACTIVE, ENDED), CallParticipant, CallDuration
- src/models/Notification.ts — Notification, NotificationType, NotificationPriority (LOW, MEDIUM, HIGH, CRITICAL)
- src/models/Department.ts — Department, Service, ServiceCategory
- src/models/index.ts — re-export all models

Each model must:
- Use strict TypeScript interfaces (no `any`)
- Include optional fields with `?`
- Include ID as string (UUID)
- Include timestamps: createdAt, updatedAt as ISO strings
- Add JSDoc comments on every interface

POC: Create src/models/__tests__/models.test.ts that type-checks all models compile without error and validates shape with Zod schemas.
```

**POC File:** `src/models/__tests__/models.test.ts`

---

### STEP 4 — Atomic Design: Atoms

**Goal:** Build the smallest reusable UI components.

**Prompt:**
```
Create Atomic Design "atoms" for a React Native public administration app (GovMobile).

Create these components in src/components/atoms/:
1. Button.tsx — variants: primary, secondary, ghost, danger | sizes: sm, md, lg | loading state | disabled state | icon support
2. Text.tsx — wraps RN Text with theme typography scale | variants: heading, subheading, body, caption, label | color prop
3. Input.tsx — label, placeholder, error state, helper text, left/right icon, secure entry toggle
4. Avatar.tsx — image or initials fallback | sizes: xs, sm, md, lg, xl | online indicator badge
5. Badge.tsx — for counts and status | variants: default, primary, success, warning, error | sizes: sm, md
6. Icon.tsx — wrapper for vector icons (use react-native-vector-icons or lucide-react-native) | size and color from theme
7. Divider.tsx — horizontal/vertical | with optional label
8. Skeleton.tsx — loading placeholder with shimmer animation

Rules:
- Every component uses useTheme() for all style values — NO hardcoded colors or sizes
- Every component has a fully typed Props interface exported
- Every component supports testID prop
- Use StyleSheet.create() for all styles
- Add displayName to every component

POC: Create src/components/atoms/__tests__/Button.test.tsx using React Native Testing Library that tests render, press, loading, and disabled states.
```

**POC File:** `src/components/atoms/__tests__/Button.test.tsx`

---

### STEP 5 — Atomic Design: Molecules

**Goal:** Compose atoms into functional UI units.

**Prompt:**
```
Create Atomic Design "molecules" for GovMobile React Native app.

Create in src/components/molecules/:
1. SearchBar.tsx — Input atom + Icon atom | animated expand/collapse | debounced onChange | clear button
2. MessageBubble.tsx — text/image/file/audio variants | sent/received layout | timestamp | read receipt icons | Message model type
3. CallCard.tsx — Call model | avatar + name + department | call type icon (voice/video) | status badge | duration or missed indicator | action buttons (call back, delete)
4. NotificationItem.tsx — Notification model | priority color stripe | icon by type | title + body + time | swipe-to-dismiss gesture
5. UserListItem.tsx — User model | Avatar + name + role + status | chevron | press handler
6. QuickActionCard.tsx — icon + label + description | used in Home screen grid | press animation

Rules:
- Each molecule imports only atoms and theme
- Props extend or use the TypeScript models from src/models/
- All text strings come from i18n (useTranslation) — NO hardcoded strings
- Include Animated for press feedback on tappable molecules

POC: Create src/components/molecules/__tests__/MessageBubble.test.tsx testing sent vs received layout, different message types.
```

**POC File:** `src/components/molecules/__tests__/MessageBubble.test.tsx`

---

### STEP 6 — Service Facades

**Goal:** Abstract all external dependencies behind facades.

**Prompt:**
```
Create service facades for GovMobile React Native app using the Facade design pattern.

Create in src/services/facades/:

1. AuthFacade.ts
   - Interface: IAuthFacade
   - Methods: login(credentials), logout(), refreshToken(), getCurrentUser(), isAuthenticated()
   - Implementation: AuthFacadeImpl (calls API, manages token in SecureStore)

2. ChatFacade.ts
   - Interface: IChatFacade
   - Methods: getConversations(), getMessages(conversationId, page), sendMessage(conversationId, content), markAsRead(messageId), uploadAttachment(file)
   - Implementation: ChatFacadeImpl (REST + WebSocket)

3. CallFacade.ts
   - Interface: ICallFacade
   - Methods: getCallHistory(page), initiateCall(userId, type), answerCall(callId), declineCall(callId), endCall(callId), getActiveCall()
   - Implementation: CallFacadeImpl

4. NotificationFacade.ts
   - Interface: INotificationFacade
   - Methods: getNotifications(page), markAsRead(id), markAllAsRead(), getUnreadCount(), requestPermission()
   - Implementation: NotificationFacadeImpl

5. src/services/facades/index.ts — exports a FacadeProvider with dependency injection

Rules:
- Each facade returns Promises with typed results (no `any`)
- Use a Result<T, E> wrapper type: { data: T; error: null } | { data: null; error: E }
- All facades accept an optional MockMode flag for testing/POC
- Add JSDoc on every method

POC: Create src/services/facades/__tests__/AuthFacade.test.ts using mock mode to test login, logout, and token refresh.
```

**POC File:** `src/services/facades/__tests__/AuthFacade.test.ts`

---

### STEP 7 — Redux Store Slices

**Goal:** Centralized state management with Redux Toolkit.

**Prompt:**
```
Create Redux Toolkit store slices for GovMobile React Native app.

Create in src/store/slices/:
1. authSlice.ts — user, token, isAuthenticated, isLoading, error | actions: setUser, setToken, logout, setLoading, setError
2. chatSlice.ts — conversations (normalized), messages (by conversationId), activeConversationId, typingUsers, unreadCounts
3. callsSlice.ts — callHistory, activeCall, incomingCall, callStatus
4. notificationsSlice.ts — notifications list, unreadCount, permissionStatus
5. uiSlice.ts — theme (light/dark), language, isConnected, globalLoading, toasts[]

Create src/store/index.ts:
- Configure store with Redux Persist for auth and ui slices
- Add RTK Query base API setup (src/store/api/baseApi.ts)
- Export RootState, AppDispatch types
- Export useAppSelector and useAppDispatch typed hooks

POC: Create src/store/__tests__/authSlice.test.ts testing all reducers and that initial state is correct.
```

**POC File:** `src/store/__tests__/authSlice.test.ts`

---

### STEP 8 — Navigation Setup

**Goal:** Full navigation structure with React Navigation 6.

**Prompt:**
```
Create React Navigation setup for GovMobile React Native app.

Create in src/navigation/:
1. types.ts — NavigationParams for every screen (RootStackParamList, AuthStackParamList, MainTabParamList, ChatStackParamList, CallsStackParamList)
2. AuthNavigator.tsx — Stack: LoginScreen, ForgotPasswordScreen
3. MainTabNavigator.tsx — Bottom tabs: Home, Chat, Calls, Notifications, Profile | custom tab bar component with badge counts | themed icons
4. ChatNavigator.tsx — Stack: ConversationListScreen, ChatRoomScreen, NewConversationScreen
5. CallsNavigator.tsx — Stack: CallHistoryScreen, ActiveCallScreen, IncomingCallScreen
6. RootNavigator.tsx — switches between Auth and Main based on auth state from Redux | handles deep links

Rules:
- All screens are typed with NavigationProp and RouteProp
- Custom header component using theme
- Transition animations: slide for stacks, fade for modals
- Gesture handler and safe area properly configured
- Export useNavigation typed wrapper hook

POC: Create src/navigation/__tests__/navigation.test.tsx testing that RootNavigator renders AuthNavigator when unauthenticated and MainTabNavigator when authenticated.
```

**POC File:** `src/navigation/__tests__/navigation.test.tsx`

---

### STEP 9 — Home Screen

**Goal:** Build the main dashboard screen.

**Prompt:**
```
Create the Home screen for GovMobile React Native app.

Files:
- src/screens/Home/HomeScreen.tsx — main screen component
- src/screens/Home/components/ — screen-specific sub-components
- src/screens/Home/useHomeScreen.ts — screen logic hook (separates logic from UI)
- src/screens/Home/HomeScreen.styles.ts — StyleSheet

UI Sections:
1. Header — department logo + user greeting (from i18n with name interpolation) + notification bell with badge
2. Status bar — connection status, current date/time, user's department
3. Quick Actions grid — 2x3 grid of QuickActionCard molecules: New Message, Call Directory, Announcements, Reports, Schedule, Documents
4. Recent Activity — last 5 items (calls + messages mixed), using CallCard or MessageBubble molecules
5. Announcements banner — scrollable horizontal list of important government notices

Rules:
- useHomeScreen.ts handles all data fetching via facades (mock data for POC)
- All strings via useTranslation()
- ScrollView with RefreshControl
- Skeleton loading state while data loads
- Animated entrance for each section (staggered slide-in)
- NO prices, NO commercial content

POC: Create src/screens/Home/__tests__/HomeScreen.test.tsx testing render, loading state, and that all quick action cards are displayed.
```

**POC File:** `src/screens/Home/__tests__/HomeScreen.test.tsx`

---

### STEP 10 — Chat Screen

**Goal:** Conversation list and chat room screens.

**Prompt:**
```
Create the Chat screens for GovMobile React Native app.

Files:
- src/screens/Chat/ConversationListScreen.tsx + useConversationList.ts + styles
- src/screens/Chat/ChatRoomScreen.tsx + useChatRoom.ts + styles
- src/screens/Chat/components/MessageList.tsx — FlatList optimized for messages (inverted, keyExtractor, getItemLayout)
- src/screens/Chat/components/MessageInput.tsx — text input + send button + attachment icon + voice note button

ConversationListScreen:
- SearchBar at top (filter conversations)
- FlatList of UserListItem showing last message preview and unread count badge
- Swipe actions: archive, delete
- FAB button to start new conversation

ChatRoomScreen:
- Custom header: back + Avatar + name + status + video call icon
- MessageList with date separators between days
- MessageBubble for each message (text, image, file, audio types)
- Typing indicator (animated dots)
- MessageInput with send animation

Rules:
- useChatRoom.ts handles WebSocket via ChatFacade (mock in POC)
- FlatList performance: windowSize={5}, maxToRenderPerBatch={10}, removeClippedSubviews
- Keyboard avoiding behavior
- All strings from i18n

POC: Create src/screens/Chat/__tests__/ChatRoomScreen.test.tsx testing message render, send action, and scroll to bottom on new message.
```

**POC File:** `src/screens/Chat/__tests__/ChatRoomScreen.test.tsx`

---

### STEP 11 — Calls Screen

**Goal:** Call history and incoming/active call screens.

**Prompt:**
```
Create the Calls screens for GovMobile React Native app.

Files:
- src/screens/Calls/CallHistoryScreen.tsx + useCallHistory.ts + styles
- src/screens/Calls/IncomingCallScreen.tsx + useIncomingCall.ts + styles
- src/screens/Calls/ActiveCallScreen.tsx + useActiveCall.ts + styles

CallHistoryScreen:
- Filter tabs: All | Incoming | Outgoing | Missed (missed in error color)
- FlatList of CallCard molecules
- Each card: avatar, name, department, time, duration, call-back action button
- Pull to refresh

IncomingCallScreen (full-screen modal):
- Blurred background with caller avatar (large, centered)
- Caller name and department
- Incoming call pulsing animation ring
- Answer button (green, bottom-right) + Decline button (red, bottom-left)
- Haptic feedback on render

ActiveCallScreen:
- Caller info + call duration timer (counting up)
- Mute, Speaker, Hold buttons
- End call button (red, centered bottom)
- Optional: video toggle button

Rules:
- useIncomingCall hooks into CallFacade (mock incoming call after 3s in POC)
- Duration formatted as MM:SS using utility function
- All animations pure RN Animated API (no libraries for POC)
- All strings from i18n (calls namespace)

POC: Create src/screens/Calls/__tests__/IncomingCallScreen.test.tsx testing that answer and decline buttons trigger correct facade methods.
```

**POC File:** `src/screens/Calls/__tests__/IncomingCallScreen.test.tsx`

---

### STEP 12 — Organisms & Final Assembly

**Goal:** Assemble organisms and wire everything together.

**Prompt:**
```
Create Atomic Design "organisms" and wire up the GovMobile app.

Create in src/components/organisms/:
1. BottomTabBar.tsx — custom tab bar with icons, labels, active state, badge counts from Redux store
2. AppHeader.tsx — reusable header with back button, title, right actions | reads current route
3. GlobalToast.tsx — overlay toast notification system | reads from uiSlice | auto-dismiss after 3s
4. NetworkBanner.tsx — appears when isConnected=false | yellow banner at top of screen

Create src/App.tsx:
- ThemeProvider wrapping all
- I18nextProvider
- Redux Provider with PersistGate
- SafeAreaProvider
- GestureHandlerRootView
- RootNavigator inside
- GlobalToast overlay
- NetworkBanner overlay

Create src/hooks/:
- useNetworkStatus.ts — NetInfo listener, dispatches to uiSlice
- useNotifications.ts — notification permission + FCM token setup
- useAuthSession.ts — checks token expiry, auto-refresh, redirects to auth if expired

POC: Create src/App.test.tsx that renders the full App component tree and verifies no crash on mount, theme context available, i18n available.
```

**POC File:** `src/App.test.tsx`

---

## 🛠 Tech Stack

| Layer          | Technology                          |
|----------------|-------------------------------------|
| Framework      | React Native 0.73+                  |
| Language       | TypeScript (strict)                 |
| Navigation     | React Navigation 6                  |
| State          | Redux Toolkit + Redux Persist       |
| i18n           | i18next + react-i18next             |
| API            | Axios + RTK Query                   |
| Real-time      | WebSocket (native)                  |
| Storage        | React Native MMKV                   |
| Secure Storage | Expo SecureStore / RN Keychain      |
| Testing        | Jest + React Native Testing Library |
| Linting        | ESLint + Prettier                   |
| Design Pattern | Atomic Design + Facade              |

---

## 📋 Development Order

```
Step 1: Theme       → Step 2: i18n       → Step 3: Models
    ↓                     ↓                    ↓
Step 4: Atoms  →  Step 5: Molecules  →  Step 6: Facades
    ↓                     ↓                    ↓
Step 7: Store  →  Step 8: Navigation → Step 9: Home Screen
    ↓                                         ↓
Step 10: Chat  →  Step 11: Calls  →  Step 12: Assembly
```

---

## ✅ Definition of Done per Step

Each step is complete when:
1. ✅ Source files created in correct location
2. ✅ TypeScript compiles with zero errors (`tsc --noEmit`)
3. ✅ POC test passes (`jest --testPathPattern=<step>`)
4. ✅ No hardcoded strings (all via i18n)
5. ✅ No hardcoded colors/sizes (all via theme)
6. ✅ `displayName` set on components
7. ✅ JSDoc on exported functions/interfaces

---

## 🏛 Government Design Principles

- **Accessibility first**: WCAG 2.1 AA minimum contrast
- **No commercial content**: No prices, no ads, no promotional language
- **Neutral language**: Formal, institutional tone in all UI text
- **Data privacy**: No PII displayed beyond necessary; mask sensitive data
- **Offline resilience**: Core features work with cached data