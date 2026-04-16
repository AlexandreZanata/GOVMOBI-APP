# GovMobile — Professional Visual Redesign Prompt

> **How to use:** Paste everything below this line into your AI assistant (Claude, Cursor, ChatGPT, etc.) as the task prompt. Replace the `[CURRENT TASK]` placeholder at the end with the specific screen or component you want to implement first.

---

You are a **Senior UI/UX Designer and React Native Engineer** specializing in professional government and enterprise mobile applications. Your task is to perform a **full visual redesign** of the **GovMobile** app — a Government Operational Mobility System — transforming it from its current basic state into a polished, consistent, and professional product comparable to **Uber**, **99**, **iFood**, and **Nubank** in terms of visual quality and user experience.

You must strictly follow all the design decisions described below. Do not deviate from the design system defined here.

---

## 1. DIAGNOSIS — What is wrong with the current app

Based on the existing screenshots, these are the specific problems to solve:

- **Inconsistent surface treatment:** The app uses a dark navy header (`#0D1B2A`) immediately followed by a flat light gray body (`#F1F3F6`). This hard split looks unpolished. There is no visual continuity between sections.
- **Accent color is underused:** The golden/amber accent (`#C9972A`) appears only on selected tab icons and one FAB button. It is not used to create a consistent visual language across the entire app.
- **Weak typography hierarchy:** All text appears in similar weights and sizes. There is no clear distinction between page titles, section headers, body copy, captions, and metadata labels.
- **Cards lack depth and definition:** Service cards on the Home screen use a plain white fill with no shadow or border, making them visually flat and indistinct.
- **Bottom tab bar is generic:** The tab bar background blends into the page body. There is no visual elevation, separation, or refinement.
- **Empty states are not designed:** Messages, Calls, and Notifications screens show only a small icon + a single line of text. These states feel abandoned.
- **Profile screen has disconnected sections:** The dark avatar header and the white info cards below feel like two different apps.
- **Login screen card lacks refinement:** The form card has no visual personality or micro-detail that suggests a professional product.
- **No consistent spacing rhythm:** Padding and margins are applied inconsistently across screens.

---

## 2. DESIGN SYSTEM — The Single Source of Truth

### 2.1 Color Palette

Define these exact tokens in `src/theme/colors.ts`. Do NOT use any color outside this palette.

```ts
export const colors = {
  // Primary surfaces
  navy900: '#0B1623',   // Deepest background (header, splashscreen)
  navy800: '#0D1B2A',   // Default dark surface
  navy700: '#152238',   // Elevated dark surface (cards on dark bg)
  navy600: '#1E3048',   // Borders and dividers on dark surfaces

  // Accent — Golden Amber
  amber500: '#C9972A',  // Primary accent (active icons, CTA outlines, badges)
  amber400: '#E0AD3D',  // Hover / pressed state of amber
  amber100: '#FFF4DC',  // Amber tint (light background use, badges bg)
  amber900: '#7A5510',  // Amber text on amber100 backgrounds

  // Light surfaces
  surface100: '#FFFFFF', // Cards, modals, input backgrounds
  surface200: '#F4F6F9', // Page background (light sections)
  surface300: '#E8ECF2', // Borders and dividers on light surfaces
  surface400: '#D0D6E2', // Disabled fields, placeholder borders

  // Text
  textPrimary:   '#0B1623', // Primary text on light backgrounds
  textSecondary: '#4A5568', // Secondary/body text
  textTertiary:  '#8A94A6', // Captions, hints, metadata
  textOnDark:    '#FFFFFF', // All text on dark/navy backgrounds
  textOnDarkMuted: '#9AAFC7', // Muted text on dark backgrounds

  // Semantic
  success:  '#1D9E75', // Online status, positive confirmations
  warning:  '#E0AD3D', // Warnings (reuse amber400)
  danger:   '#D85A30', // Errors, destructive actions
  info:     '#378ADD', // Informational states

  // Roles (badge chips)
  roleAdmin:      { bg: '#D85A30', text: '#FFFFFF' },
  roleOfficer:    { bg: '#378ADD', text: '#FFFFFF' },
  roleSupervisor: { bg: '#534AB7', text: '#FFFFFF' },
  roleDispatcher: { bg: '#1D9E75', text: '#FFFFFF' },
};
```

### 2.2 Typography Scale

Define in `src/theme/typography.ts`. Use **Inter** (available via `expo-font`). Zero hardcoded font sizes anywhere — always reference these tokens.

```ts
export const typography = {
  // Display — Screen titles on dark backgrounds
  displayLg: { fontSize: 28, fontWeight: '700', lineHeight: 34, letterSpacing: -0.5 },
  displayMd: { fontSize: 22, fontWeight: '700', lineHeight: 28, letterSpacing: -0.3 },

  // Headings — Section titles on light backgrounds
  headingLg: { fontSize: 20, fontWeight: '600', lineHeight: 26 },
  headingMd: { fontSize: 17, fontWeight: '600', lineHeight: 22 },
  headingSm: { fontSize: 15, fontWeight: '600', lineHeight: 20 },

  // Body
  bodyLg:   { fontSize: 16, fontWeight: '400', lineHeight: 24 },
  bodyMd:   { fontSize: 14, fontWeight: '400', lineHeight: 21 },
  bodySm:   { fontSize: 13, fontWeight: '400', lineHeight: 19 },

  // Labels / UI
  labelLg:  { fontSize: 14, fontWeight: '600', lineHeight: 18 },
  labelMd:  { fontSize: 12, fontWeight: '600', lineHeight: 16, letterSpacing: 0.3 },
  labelSm:  { fontSize: 11, fontWeight: '500', lineHeight: 14, letterSpacing: 0.5 },

  // Caption
  caption:  { fontSize: 12, fontWeight: '400', lineHeight: 16, color: 'textTertiary' },
};
```

### 2.3 Spacing Scale

Use a base-4 spacing system. No raw pixel values anywhere.

```ts
export const space = {
  1: 4,   // Micro gaps inside components
  2: 8,   // Component internal padding (icon + label)
  3: 12,  // Tight card padding
  4: 16,  // Standard padding (most used)
  5: 20,
  6: 24,  // Section spacing
  7: 28,
  8: 32,  // Large section gaps
  10: 40,
  12: 48,
  16: 64,
};
```

### 2.4 Border Radius

```ts
export const radius = {
  sm:   6,   // Badges, chips, small buttons
  md:   10,  // Input fields, small cards
  lg:   16,  // Primary cards, modals
  xl:   24,  // Bottom sheets, large panels
  full: 9999, // Pill buttons, avatar circles
};
```

### 2.5 Elevation (Shadows)

```ts
export const shadows = {
  card: {
    shadowColor: '#0B1623',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHover: {
    shadowColor: '#0B1623',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  tabBar: {
    shadowColor: '#0B1623',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 10,
  },
};
```

---

## 3. COMPONENT REDESIGN SPECIFICATIONS

### 3.1 Bottom Tab Bar

**Current problem:** Generic, no visual separation from content, icon labels too prominent.

**New spec:**
- Background: `surface100` (white)
- Top border: `0.5px solid surface300`
- Apply `shadows.tabBar`
- Height: 60px (plus safe area inset)
- Active icon color: `amber500`
- Active label color: `amber500`
- Active label: `typography.labelSm`
- Inactive icon color: `textTertiary`
- Inactive label: `typography.labelSm`, color `textTertiary`
- Active tab shows a `3px` rounded top indicator bar in `amber500` (like Nubank / iFood)
- No filled bubble backgrounds on active tabs

### 3.2 Screen Headers

The current hard dark-to-light split must be eliminated. Use one of two header patterns:

**Pattern A — Dark Immersive (Home, Profile):**
- Header background: `navy800` continuing as the top portion of the screen
- Below the header, transition using a subtle `navy800` → `surface200` gradient over `24px` height, OR use a curved `borderBottomLeftRadius: 24, borderBottomRightRadius: 24` on the header, revealing the `surface200` page body below
- Page body background: `surface200`
- Header title: `typography.displayMd`, color `textOnDark`
- Subtitle / status line: `typography.bodyMd`, color `textOnDarkMuted`

**Pattern B — Light Contextual (Messages, Calls, Notifications):**
- Header background: `surface100` (white)
- Bottom border: `0.5px solid surface300`
- Title centered: `typography.headingMd`, color `textPrimary`
- Back arrow: `navy800` tinted

### 3.3 Service Cards (Home Screen Grid)

**Current problem:** Plain white boxes with no depth.

**New spec:**
- Background: `surface100`
- Apply `shadows.card`
- Border radius: `radius.lg`
- Border: `0.5px solid surface300`
- Icon container: 44×44, background `amber100`, border radius `radius.md`, icon color `amber900`
- Card title: `typography.headingSm`, color `textPrimary`
- Card subtitle: `typography.bodySm`, color `textSecondary`
- Padding: `space.4` all sides
- On press: scale to `0.97` with `Animated` (100ms)

### 3.4 Input Fields (Login Screen)

**Current problem:** Plain bordered boxes with no refinement.

**New spec:**
- Background: `surface200`
- Border: `1px solid surface400` at rest, `1.5px solid amber500` on focus
- Border radius: `radius.md`
- Height: 52px
- Label: `typography.labelMd`, color `textSecondary`, positioned above (floating label pattern)
- Input text: `typography.bodyLg`, color `textPrimary`
- Placeholder: `typography.bodyLg`, color `textTertiary`
- Left icon area: 48px wide, icon color changes to `amber500` on focus
- Password toggle eye icon: color `textTertiary`, 24×24

### 3.5 Primary Button

**Current problem:** Dark flat rectangle with no refinement.

**New spec:**
- Background: `navy800`
- Border radius: `radius.md`
- Height: 52px
- Label: `typography.labelLg`, color `textOnDark`, letter-spacing 0.5
- On press: opacity 0.85 + scale 0.98 (100ms animation)
- Loading state: replace label with `ActivityIndicator` in `amber500`
- Full width in forms, fixed width in other contexts

### 3.6 Avatar / Profile Header

**Current problem:** The avatar ring is styled but the overall section feels disconnected.

**New spec:**
- Full-width dark header occupying ~240px with `navy800` background
- Avatar circle: 80×80, background `navy600`, text initials in `typography.displayMd` color `amber500`
- Avatar border: `3px solid amber500`
- Below avatar: user name in `typography.displayMd` color `textOnDark`
- Below name: email in `typography.bodyMd` color `textOnDarkMuted`
- Role badge pill: background `amber500`, text `typography.labelMd` color `navy900`
- Header has `borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl`
- White `surface200` body continues below

### 3.7 Profile Info Rows

- Grouped inside a single card with `radius.lg`, `shadows.card`, `surface100` background
- Each row: 56px height, flex row, icon left (color `textTertiary`, 20×20), label text right
- Row divider: `0.5px solid surface300`
- Label: `typography.caption` color `textTertiary`, displayed above the value
- Value: `typography.bodyMd` color `textPrimary`
- Edit icon: `20px`, color `amber500`

### 3.8 Section Headers (inside screens)

- `typography.headingMd`, color `textPrimary`
- Margin top: `space.6`, margin bottom: `space.3`
- No background, no borders

### 3.9 Online Status Indicator

- Green dot: 8px circle, color `success`
- Label: `typography.labelMd`, color `success`
- Timestamp: `typography.caption`, color `textTertiary`
- Displayed in a row with `space.2` gap

### 3.10 Empty States

**Current problem:** Just an icon + one line of text.

**New spec for all empty state screens:**
- Container: centered vertically and horizontally, padding `space.8`
- Illustration: custom SVG or Lottie (see specs per screen below)
- Primary message: `typography.headingMd`, color `textPrimary`, centered
- Secondary message: `typography.bodyMd`, color `textSecondary`, centered, max width 260
- CTA button (when applicable): standard button styled with `amber500` outline, `amber500` text

**Per-screen empty state copy + illustration colors:**
- **Messages:** Chat bubble icon, `amber100` bg, `amber500` stroke. Title: "No conversations yet". Subtitle: "Start a conversation by tapping the compose button below."
- **Calls:** Phone icon, `surface300` bg, `textTertiary` stroke. Title: "No call history". Subtitle: "Incoming, outgoing, and missed calls will appear here."
- **Notifications:** Bell icon, `surface300` bg, `textTertiary` stroke. Title: "You're all caught up". Subtitle: "New alerts and system notifications will appear here."

### 3.11 Call History Filter Tabs

**Current problem:** The tab row has an amber underline on "Clear" but the overall style is inconsistent.

**New spec:**
- Container: `surface100` background, bottom border `surface300`
- Each tab: `typography.labelMd`, height 44px, flex-centered
- Active tab: `amber500` text, `3px` bottom border in `amber500`, `radius.sm` on the border
- Inactive tab: `textTertiary` text, no border
- Tab options: Clear · Incoming call · Outgoing call · Missed call
- "Missed call" count badge (if any): `danger` background pill

### 3.12 FAB Button (Messages Screen)

**Current problem:** The amber FAB is styled but sits isolated without refinement.

**New spec:**
- Size: 56×56
- Background: `amber500`
- Border radius: `radius.full`
- Apply `shadows.cardHover`
- Icon: compose/pencil, color `navy900`, size 22×22
- Bottom margin from tab bar: `space.6`

### 3.13 Login Screen Layout

**Current problem:** The card floats on a plain dark background without personality.

**New spec:**
- Full screen background: `navy800`
- Add a very subtle radial glow at center: `amber500` at 4% opacity, radius 300px (optional for native, skip if performance concern)
- App logo area (top 35% of screen):
  - App name: `typography.displayLg`, color `textOnDark`
  - Subtitle: `typography.bodyMd`, color `textOnDarkMuted`
  - Consider an abstract geometric mark above the name (4 squares in `amber500`)
- Login card:
  - Background: `surface100`
  - Border radius top: `radius.xl` (bottom flush or also rounded)
  - Padding: `space.6`
  - Title: `typography.headingLg`, color `textPrimary`
  - Apply `shadows.cardHover`
  - Alternatively: expand the card to bottom sheet style (anchored to bottom, 65% of screen height)

---

## 4. SCREEN-BY-SCREEN IMPLEMENTATION GUIDE

### Screen 1: Login (`LoginScreen`)

Layout order:
1. Full dark background `navy800`
2. Top area (35%): Logo mark + "GovMobile" (`displayLg`) + subtitle (`bodyMd`, `textOnDarkMuted`)
3. Bottom area (65%): Rounded top card (`surface100`, `radius.xl`)
   - Title "Login" (`headingLg`)
   - CPF input field (with mask `000.000.000-00`, ID card icon left)
   - Password input field (lock icon left, eye toggle right)
   - "Login" primary button
   - Optionally: version string caption at very bottom

### Screen 2: Home (`HomeScreen`)

Layout order:
1. Dark header (`navy800`, curved bottom `radius.xl`):
   - Row: "GovMobile" title (`displayMd`) + bell icon (color `textOnDark`)
   - Row: Online status indicator + timestamp
2. Page body (`surface200`):
   - Section header "Services" (`headingMd`)
   - 2×3 grid of service cards with `space.3` gap
   - Section header "Recent activity" (`headingMd`)
   - Section header "Announcements" (`headingMd`)
   - FlatList of announcement cards

Cards in grid order (with icons):
1. New message → chat-bubble icon
2. Call directory → phone-book icon
3. Announcements → megaphone icon
4. Reports → bar-chart icon
5. Schedule → calendar icon
6. Documents → folder icon

### Screen 3: Profile (`ProfileScreen`)

Layout order:
1. Dark header (`navy800`, curved bottom `radius.xl`, height ~220):
   - Avatar circle (80px, initials, amber border)
   - Name (`displayMd`, `textOnDark`)
   - Email (`bodyMd`, `textOnDarkMuted`)
   - Role badge pill
2. Page body (`surface200`, padding `space.4`):
   - Info card (Name row + Email row with divider)
   - Settings row card (gear icon + "Settings" label + chevron right)
   - Sign out row card (exit icon in `danger` + "Sign out" label in `danger`)

### Screen 4: Messages (`MessagesScreen`)

Layout order:
1. Light header (Pattern B): back arrow + "Messages" centered title
2. Search bar row: `surface100` card, search icon `textTertiary`, placeholder `textTertiary`
3. Conversation list via `FlatList`:
   - Avatar circle (48px initials), sender name (`headingSm`), preview text (`bodySm`, `textSecondary`), timestamp (`caption`)
   - Unread badge: `amber500` filled pill, white number
4. If empty: Empty state component (see 3.10)
5. FAB button bottom-right

### Screen 5: Calls (`CallsScreen`)

Layout order:
1. Light header (Pattern B): back arrow + "Calls" centered title
2. Filter tab row (see 3.11)
3. Call log list via `FlatList`:
   - Icon: phone-in, phone-out, or phone-missed (colors: `success`, `textPrimary`, `danger`)
   - Caller name (`headingSm`) + call type label (`caption`, `textTertiary`)
   - Timestamp (`caption`)
   - Duration (`caption`, right-aligned)
4. If empty: Empty state component (see 3.10)

### Screen 6: Notifications / Alerts (`AlertsScreen`)

Layout order:
1. Dark immersive header (Pattern A): "Notifications" (`displayMd`, `textOnDark`)
2. Page body (`surface200`):
   - If has items: FlatList of notification cards
     - Icon left (semantic color per type), title (`headingSm`), body (`bodySm`), timestamp (`caption`)
     - Unread: left `3px` border in `amber500`, `surface100` bg
     - Read: no border, `surface200` bg
   - If empty: Empty state component (see 3.10)

---

## 5. IMPLEMENTATION RULES

1. **Theme tokens only.** Every color, spacing, font size, and border radius value must reference a theme token. Zero raw hex codes, zero raw pixel values.
2. **i18n coverage.** Every visible string must use `react-i18next`. No hardcoded text in JSX.
3. **Animations.** Use `Animated` API or `react-native-reanimated` for press states. Minimum: 100ms scale-down on pressable cards and buttons.
4. **FlatList performance.** Use `keyExtractor`, `removeClippedSubviews={true}`, `windowSize={5}`, `maxToRenderPerBatch={10}` on all lists.
5. **Facade pattern.** All data access goes through `src/services/facades/`. Screens call hooks, hooks call facades.
6. **Safe area.** All screens use `useSafeAreaInsets()`. Never hardcode top/bottom padding for device notch/home indicator.
7. **Accessibility.** All interactive elements have `accessibilityLabel` and `accessibilityRole` props.
8. **Role visibility gates.** Admin-only actions (e.g. Reports, admin badge) must be gated via `useAppSelector(selectUserRole)`.

---

## 6. REFERENCE APPS — Design Benchmarks

Study these apps for design inspiration and apply their patterns:

- **Uber:** Clean dark headers, high contrast white cards, consistent amber/green accent usage
- **99:** Tab bar with top indicator, rounded card grids, strong typography hierarchy
- **Nubank:** Immersive dark header curving into light body, avatar + role badge pattern, clean empty states
- **iFood:** Service card grid pattern, FAB placement, section header rhythm

---

## [CURRENT TASK]

> Replace this section with the specific screen or component you want to implement. Example:
>
> *"Implement the redesigned HomeScreen following all specifications above. Generate: HomeScreen.tsx, useHome.ts, Home.styles.ts, homeFacade.ts, i18n strings for pt-BR / en-US / es, and the Jest + RNTL test file."*
