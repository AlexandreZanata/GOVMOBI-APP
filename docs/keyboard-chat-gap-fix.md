# Fix: Gap Below Chat Input When Keyboard Opens (React Native)

## The Problem

When a keyboard opens in a chat screen, a blank space appears between the input bar and the top of the keyboard. This is one of the most common layout bugs in React Native chat UIs.

![Gap below input](./gap-example.png)

---

## Root Cause Analysis

### Why `KeyboardStickyView` causes this

`KeyboardStickyView` from `react-native-keyboard-controller` is designed for **floating toolbars** — it translates a single element upward in sync with the keyboard using `translateY`. It does **not** resize the parent container.

```
┌─────────────────────┐
│                     │  ← root (flex: 1, full screen height — UNCHANGED)
│   message list      │
│                     │
├─────────────────────┤  ← input bar (translated up by KeyboardStickyView)
│  [input]   [send]   │
├─────────────────────┤
│                     │  ← GAP: root still occupies this space
│   (blank space)     │     because container was never resized
├─────────────────────┤
│   K E Y B O A R D   │
└─────────────────────┘
```

The container's height is never reduced. The input moves up, but the space it vacated remains, creating the visible gap.

### Why `KeyboardAvoidingView` with wrong config also fails

Using the standard RN `KeyboardAvoidingView` with `behavior="padding"` triggers a **full layout pass on every animation frame** (60–120 times per second). This causes:

- Visual glitches as `flex: 1` containers collapse and re-expand
- `gap` and `justifyContent: "space-between"` redistributing space every frame
- Performance degradation on complex screens

---

## The Correct Solution

Use `KeyboardAvoidingView` from `react-native-keyboard-controller` with `behavior="translate-with-padding"` and `keyboardVerticalOffset` set to the navigation header height.

### How `translate-with-padding` works

1. **During animation:** uses `translateY` (GPU-only, zero layout cost) — smooth 120 FPS
2. **After keyboard fully opens:** resizes the container once via padding — layout settles correctly
3. **Result:** no gap, no jank, correct behavior on all devices

```
┌─────────────────────┐
│                     │  ← root (resized once after keyboard opens)
│   message list      │
│                     │
├─────────────────────┤
│  [input]   [send]   │  ← flush against keyboard top
├─────────────────────┤
│   K E Y B O A R D   │
└─────────────────────┘
```

---

## Implementation

### Dependencies

```bash
# react-native-keyboard-controller >= 1.9.0
# @react-navigation/elements (for useHeaderHeight)
```

### Step 1 — Ensure `KeyboardProvider` wraps your app

```tsx
// App.tsx
import { KeyboardProvider } from 'react-native-keyboard-controller';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <KeyboardProvider>
          {/* rest of your app */}
        </KeyboardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
```

> Without `KeyboardProvider`, the library's components fall back to no-ops.

### Step 2 — Replace `KeyboardStickyView` (or `KeyboardAvoidingView` from RN core) with the correct setup

```tsx
// ❌ WRONG — KeyboardStickyView does not resize the container
import { KeyboardStickyView } from 'react-native-keyboard-controller';

return (
  <View style={{ flex: 1 }}>
    <FlatList ... />
    <KeyboardStickyView offset={{ opened: insets.bottom, closed: 0 }}>
      <InputBar />
    </KeyboardStickyView>
  </View>
);

// ❌ WRONG — RN core KeyboardAvoidingView causes layout thrashing every frame
import { KeyboardAvoidingView } from 'react-native';

return (
  <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
    <FlatList ... />
    <InputBar />
  </KeyboardAvoidingView>
);
```

```tsx
// ✅ CORRECT
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useHeaderHeight } from '@react-navigation/elements';

export function ChatScreen() {
  const headerHeight = useHeaderHeight();

  return (
    <KeyboardAvoidingView
      behavior="translate-with-padding"
      keyboardVerticalOffset={headerHeight}
      style={{ flex: 1 }}
    >
      <FlatList
        data={messages}
        renderItem={renderMessage}
        keyboardShouldPersistTaps="handled"
        // ...
      />
      <InputBar />
    </KeyboardAvoidingView>
  );
}
```

### Step 3 — `keyboardVerticalOffset` explained

This value tells the component how much vertical space above it is occupied by UI that is **not** part of the keyboard-avoiding area (navigation header, status bar, etc.).

| Scenario | Value |
|---|---|
| Screen inside React Navigation stack | `useHeaderHeight()` |
| Screen inside a modal | `useHeaderHeight()` |
| Screen with no header | `0` |
| Screen with custom header height | measure it manually |

```tsx
import { useHeaderHeight } from '@react-navigation/elements';

// useHeaderHeight() returns the combined height of:
// - status bar
// - navigation header
// It works correctly across all device types (notch, dynamic island, etc.)
const headerHeight = useHeaderHeight();
```

> On `react-native-keyboard-controller >= 1.21`, you can use `automaticOffset` instead
> of `keyboardVerticalOffset` and the library detects the offset automatically:
> ```tsx
> <KeyboardAvoidingView behavior="translate-with-padding" automaticOffset>
> ```

---

## Version-specific notes

| Library version | Recommended approach |
|---|---|
| `< 1.9.0` | Use RN core `KeyboardAvoidingView` with `behavior="padding"` (imperfect) |
| `>= 1.9.0` | `KeyboardAvoidingView` from the library + `behavior="translate-with-padding"` + `keyboardVerticalOffset={useHeaderHeight()}` |
| `>= 1.21.0` | Same as above but replace `keyboardVerticalOffset` with `automaticOffset` prop |

---

## Common Mistakes

### Mistake 1 — Using `KeyboardStickyView` as the chat container

`KeyboardStickyView` is for elements that should **float above** the keyboard (e.g., a reaction picker, a floating toolbar). It is not a layout container. Never wrap your entire chat layout in it.

**Use it for:** emoji pickers, attachment menus, floating action buttons above the keyboard.  
**Do not use it for:** the main chat screen layout.

### Mistake 2 — Using `insets.bottom` as `offset.opened` in `KeyboardStickyView`

```tsx
// ❌ This adds an extra gap equal to the safe area inset when keyboard opens
const offset = { opened: insets.bottom, closed: 0 };
```

When the keyboard is open, the safe area inset is already absorbed by the keyboard itself on most devices. Adding it again creates a double-gap.

### Mistake 3 — Forgetting `keyboardShouldPersistTaps="handled"` on the list

Without this, tapping a message bubble dismisses the keyboard unexpectedly.

```tsx
<FlatList keyboardShouldPersistTaps="handled" ... />
```

### Mistake 4 — Nesting `KeyboardAvoidingView` inside another `KeyboardAvoidingView`

If your navigator already wraps screens in a `KeyboardAvoidingView`, adding another one inside creates conflicting offsets. Check your navigator configuration.

---

## Full working example

```tsx
import React, { useCallback, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ListRenderItem,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useHeaderHeight } from '@react-navigation/elements';

interface Message {
  id: string;
  text: string;
  isOwn: boolean;
}

export function ChatScreen() {
  const headerHeight = useHeaderHeight();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const listRef = useRef<FlatList<Message>>(null);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setMessages(prev => [...prev, { id: Date.now().toString(), text: trimmed, isOwn: true }]);
    setText('');
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
  }, [text]);

  const renderItem: ListRenderItem<Message> = useCallback(({ item }) => (
    <View style={[styles.bubble, item.isOwn && styles.bubbleOwn]}>
      <Text style={styles.bubbleText}>{item.text}</Text>
    </View>
  ), []);

  return (
    // ✅ KeyboardAvoidingView from react-native-keyboard-controller
    // behavior="translate-with-padding": GPU translateY during animation,
    // single layout resize after keyboard settles — no gap, no jank.
    <KeyboardAvoidingView
      behavior="translate-with-padding"
      keyboardVerticalOffset={headerHeight}
      style={styles.root}
    >
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={item => item.id}
        keyboardShouldPersistTaps="handled"
        renderItem={renderItem}
        style={styles.list}
      />
      <View style={styles.inputRow}>
        <TextInput
          multiline
          onChangeText={setText}
          placeholder="Type a message..."
          style={styles.input}
          value={text}
        />
        <Pressable onPress={handleSend} style={styles.sendBtn}>
          <Text style={styles.sendLabel}>Send</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4F6F9' },
  list: { flex: 1 },
  bubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxWidth: '80%',
  },
  bubbleOwn: {
    alignSelf: 'flex-end',
    backgroundColor: '#1B2B4B',
  },
  bubbleText: { fontSize: 15, color: '#111' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E0E0E0',
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    backgroundColor: '#F4F6F9',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
  },
  sendBtn: {
    backgroundColor: '#1B2B4B',
    borderRadius: 22,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendLabel: { color: '#fff', fontWeight: '600' },
});
```

---

## Jest mock update

If you mock `react-native-keyboard-controller` in tests, keep `KeyboardAvoidingView` in the mock and remove `KeyboardStickyView` if it's no longer used:

```ts
// src/__mocks__/react-native-keyboard-controller.ts
import React from 'react';
import { View } from 'react-native';

export const KeyboardProvider = ({ children }: { children: React.ReactNode }) =>
  React.createElement(View, { testID: 'keyboard-provider' }, children);

export const KeyboardAvoidingView = ({
  children,
  style,
  testID,
}: {
  children: React.ReactNode;
  style?: object;
  testID?: string;
}) => React.createElement(View, { style, testID }, children);

export const useKeyboardHandler = () => ({});
export const useReanimatedKeyboardAnimation = () => ({ height: { value: 0 }, state: { value: 0 } });
export const KeyboardEvents = { addListener: () => ({ remove: () => {} }) };
```

---

## References

- [react-native-keyboard-controller — Components Overview](https://kirillzyusko.github.io/react-native-keyboard-controller/docs/guides/components-overview)
- [react-native-keyboard-controller — KeyboardStickyView API](https://kirillzyusko.github.io/react-native-keyboard-controller/docs/api/components/keyboard-sticky-view)
- [react-native-keyboard-controller — v1.21 blog (KeyboardChatScrollView)](https://kirillzyusko.github.io/react-native-keyboard-controller/blog/chat-scroll-view)
- [Official chat example — ReanimatedChatFlatList](https://github.com/kirillzyusko/react-native-keyboard-controller/blob/main/example/src/screens/Examples/ReanimatedChatFlatList/index.tsx)
- [@react-navigation/elements — useHeaderHeight](https://reactnavigation.org/docs/elements/#useheaderheight)
