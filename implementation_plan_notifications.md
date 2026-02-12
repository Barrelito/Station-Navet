# Notification System Implementation Plan

## Goal
Implement a comprehensive notification system to keep users engaged and informed about relevant activities (new ideas, votes, comments).

## 1. In-App Notifications 🔔
**Objective:** Show a notification bell in the header with a badge for unread items. Clicking it shows a dropdown list.

### Schema Changes
```typescript
// convex/schema.ts
notifications: defineTable({
  userId: v.id("users"),        // Who receives this?
  type: v.string(),             // "new_idea", "vote", "comment", "status_change"
  title: v.string(),            // "Ny idé från Norrtälje"
  message: v.string(),          // "Kalle har lagt upp 'Bättre kaffe'..."
  link: v.string(),             // "/idea/<id>" or just "/"
  relatedId: v.optional(v.string()), // ID of idea/comment usually
  isRead: v.boolean(),
  isArchived: v.boolean(),
})
  .index("by_user", ["userId", "isArchived"])
  .index("by_user_unread", ["userId", "isRead"])
```

### Backend - `convex/notifications.ts`
- `getNotifications`: Query for current user's unread + recent read notifications.
- `markAsRead`: Mutation to mark specific or all as read.
- `archiveNotification`: Mutation to hide/archive.
- `sendNotification`: Internal helper/mutation to creating notifications.
    - **Triggers:**
        - `submitIdea` -> Notify users in same scope (Station/Area/Region).
        - `castVote` -> Notify idea author.
        - `updateStatus` -> Notify idea author & followers (future).

### Frontend
- **Component:** `NotificationBell.tsx`
    - Uses `useQuery(api.notifications.getNotifications)` (Real-time!)
    - Shows red badge count.
    - Dropdown with list of items.
    - Click item -> mark read -> navigate.

---

## 2. Push Notifications 📲
**Objective:** Send mobile/desktop push notifications even when app is closed.

### Prerequisites
- **VAPID Keys:** Generate public/private keys (using `web-push` package).
- **Service Worker:** `public/sw.js` or `worker/index.ts` to handle `push` event.
- **Manifest:** Ensure `manifest.json` is set up for PWA.

### Schema Changes
```typescript
// convex/schema.ts
pushSubscriptions: defineTable({
  userId: v.id("users"),
  endpoint: v.string(),
  keys: v.object({
    p256dh: v.string(),
    auth: v.string()
  }),
})
  .index("by_user", ["userId"])
  .index("by_endpoint", ["endpoint"]) // Prevent duplicates
```

### Backend - `convex/push.ts`
- `saveSubscription`: Mutation to store user's browser push subscription.
- **Action:** `sendPushAction`:
    - Uses `web-push` library.
    - Called by `sendNotification` helper (from In-App step).
    - Fetches user's subscriptions.
    - Sends payload.

### Frontend
- **Component:** `PushPermissionRequest.tsx`
    - "Vill du ha notiser?" button/banner.
    - Logic to register SW and subscribe to PushManager.
    - Send subscription to backend.

---

## Implementation Steps

### Phase 1: In-App Notifications (MVP)
1.  [ ] Update Schema (`notifications`)
2.  [ ] Create `convex/notifications.ts`
3.  [ ] Update `submitIdea` etc. to trigger notifications
4.  [ ] Create `NotificationBell` component
5.  [ ] Add to `Header.tsx`

### Phase 2: Push Notifications
1.  [ ] Generate VAPID keys -> `.env.local`
2.  [ ] Update Schema (`pushSubscriptions`)
3.  [ ] Create `public/sw.js` (Service Worker)
4.  [ ] Create `convex/push.ts` (actions)
5.  [ ] Create frontend subscription logic
6.  [ ] Hook into `sendNotification` to also trigger push
