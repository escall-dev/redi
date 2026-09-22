/**
 * Seijun Service Worker (Push Foundation)
 *
 * Implements the lifecycle and event hooks required for Web Push notifications.
 * Offline caching is intentionally omitted to avoid interference with Next.js App Router,
 * Supabase authentication, and server actions.
 */

// ---------------------------------------------------------------------------
// 1. LIFECYCLE: Install & Activate
// ---------------------------------------------------------------------------

self.addEventListener("install", () => {
  // Immediately take over from any older service worker without waiting
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Claim control of all open clients immediately under the root scope
  event.waitUntil(self.clients.claim());
});

// ---------------------------------------------------------------------------
// 2. NETWORKING: Fetch-Safe Policy
// ---------------------------------------------------------------------------
// IMPORTANT: No fetch event listener is registered.
// By omitting a fetch handler, all network requests (Next.js assets, API routes,
// SSR hydration, Server Actions, Supabase calls) are handled natively by the browser.
// This guarantees zero interference with application networking and authentication.

// ---------------------------------------------------------------------------
// 3. WEB PUSH: Push Event Listener (Foundation)
// ---------------------------------------------------------------------------

self.addEventListener("push", (event) => {
  // Placeholder push event handler for Web Push notifications (Phase 17)
  // Actual payload parsing, vibration, and display logic will be expanded in upcoming sub-phases.
  let data = {};

  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = { title: "Seijun", body: event.data.text() };
    }
  }

  const title = data.title || "Seijun";
  const options = {
    body: data.body || "You have a new cycle update.",
    icon: data.icon || "/icons/icon-192.png",
    badge: data.badge || "/icons/icon-192.png",
    tag: data.tag || "seijun-notification",
    data: data.data || { url: data.url || "/dashboard" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ---------------------------------------------------------------------------
// 4. NOTIFICATION CLICK: Navigation & Focus (Foundation)
// ---------------------------------------------------------------------------

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl =
    event.notification.data && event.notification.data.url
      ? event.notification.data.url
      : "/dashboard";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // If an existing window is open, focus it and optionally navigate
        for (const client of clientList) {
          if ("focus" in client) {
            client.focus();
            if ("navigate" in client && targetUrl) {
              client.navigate(targetUrl);
            }
            return;
          }
        }
        // If no window is currently open, open a new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});
