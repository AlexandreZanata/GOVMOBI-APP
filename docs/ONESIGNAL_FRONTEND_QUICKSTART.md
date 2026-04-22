# OneSignal Frontend Quick Start Guide

## 🚀 5-Minute Setup

This is a condensed guide for frontend developers. For complete details, see [ONESIGNAL_PUSH_NOTIFICATION_GUIDE.md](./ONESIGNAL_PUSH_NOTIFICATION_GUIDE.md).

---

## Step 1: Install SDK

```bash
# React Native
npm install react-native-onesignal

# React Native (Expo)
npx expo install onesignal-expo-plugin
```

---

## Step 2: Initialize (App.tsx)

```typescript
import OneSignal from 'react-native-onesignal';

// Initialize with GovMob App ID
OneSignal.setAppId('d6247b88-6e87-4695-ac0f-396993ede8ba');

// Request permissions
OneSignal.promptForPushNotificationsWithUserResponse();
```

---

## Step 3: Set User ID After Login

```typescript
// After successful login
const servidorId = loginResponse.servidor.id; // UUID from backend

OneSignal.setExternalUserId(servidorId, (results) => {
  console.log('OneSignal user ID set:', results);
});
```

**⚠️ CRITICAL**: The `servidorId` MUST match the UUID from the backend. This is how the backend targets notifications to your device.

---

## Step 4: Handle Notifications

```typescript
// Notification received while app is open
OneSignal.setNotificationWillShowInForegroundHandler((event) => {
  const notification = event.getNotification();
  const data = notification.additionalData;
  
  console.log('Notification:', notification.title, notification.body);
  console.log('Data:', data);
  
  // Show the notification
  event.complete(notification);
});

// Notification opened (user tapped)
OneSignal.setNotificationOpenedHandler((event) => {
  const data = event.notification.additionalData;
  
  console.log('Notification opened:', data);
  
  // Navigate to ride screen
  if (data?.corridaId) {
    navigation.navigate('RideDetails', { corridaId: data.corridaId });
  }
});
```

---

## Step 5: Remove User ID on Logout

```typescript
// On logout
OneSignal.removeExternalUserId((results) => {
  console.log('OneSignal user ID removed:', results);
});
```

---

## 📦 Notification Data Structure

All notifications include these fields in `additionalData`:

```typescript
interface NotificationData {
  corridaId: string;  // UUID of the ride
  status: string;     // Current ride status
}
```

---

## 🔔 Notification Types You'll Receive

| Event | Title | When It Happens |
|-------|-------|-----------------|
| **Ride Accepted** | "Corrida Aceita" | Driver accepts your ride request |
| **Driver Arriving** | "Motorista Chegando" | Driver is close to pickup location |
| **Ride Cancelled** | "Corrida Cancelada" | Other party cancels the ride |

---

## ✅ Testing Checklist

- [ ] OneSignal SDK installed
- [ ] App ID set: `d6247b88-6e87-4695-ac0f-396993ede8ba`
- [ ] Notification permissions requested
- [ ] External user ID set after login
- [ ] External user ID removed on logout
- [ ] Notification handlers implemented
- [ ] Navigation works when tapping notification
- [ ] Tested on both iOS and Android

---

## 🐛 Quick Troubleshooting

### Not receiving notifications?

1. **Check device registration**:
   - Go to https://dashboard.onesignal.com/
   - Navigate to **Audience** → **All Users**
   - Search for your `servidorId`
   - Verify device shows as "Subscribed"

2. **Check permissions**:
   - iOS: Settings → [Your App] → Notifications → Allow Notifications
   - Android: Settings → Apps → [Your App] → Notifications → Enabled

3. **Check external user ID**:
   ```typescript
   // Add this after login to verify
   OneSignal.getDeviceState((state) => {
     console.log('External User ID:', state.userId);
     console.log('Push Token:', state.pushToken);
     console.log('Subscribed:', state.isSubscribed);
   });
   ```

4. **Check backend logs**:
   - Ask backend team to check for:
   ```
   [OneSignalPushService] [OneSignal] Push enviado para <your-servidorId>
   ```

---

## 📱 Platform-Specific Notes

### iOS
- Requires Apple Developer account with push notification capability
- Must configure APNs certificate in OneSignal dashboard
- Notifications don't work in iOS Simulator (use real device)

### Android
- Requires Firebase project with FCM enabled
- Must add `google-services.json` to project
- Works in Android Emulator (with Google Play Services)

---

## 🔗 Complete Documentation

For detailed information:
- **Implementation Guide**: [ONESIGNAL_PUSH_NOTIFICATION_GUIDE.md](./ONESIGNAL_PUSH_NOTIFICATION_GUIDE.md)
- **Architecture Diagrams**: [NOTIFICATION_ARCHITECTURE.md](./NOTIFICATION_ARCHITECTURE.md)
- **Backend Documentation**: [GOVMOB_DOCUMENTATION.md](./GOVMOB_DOCUMENTATION.md)

---

## 💡 Pro Tips

1. **Always test on real devices** - Push notifications don't work reliably in simulators
2. **Test both foreground and background** - Behavior differs when app is open vs closed
3. **Handle missing data gracefully** - Always check if `corridaId` exists before navigating
4. **Log everything during development** - Makes debugging much easier
5. **Test logout flow** - Verify external user ID is removed properly

---

## 🆘 Need Help?

1. Check the complete guide: [ONESIGNAL_PUSH_NOTIFICATION_GUIDE.md](./ONESIGNAL_PUSH_NOTIFICATION_GUIDE.md)
2. Check OneSignal docs: https://documentation.onesignal.com/
3. Ask backend team to verify their logs
4. Check OneSignal dashboard for delivery status

---

**App ID**: `d6247b88-6e87-4695-ac0f-396993ede8ba`  
**Last Updated**: April 22, 2026
