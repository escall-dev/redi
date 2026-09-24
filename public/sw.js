/**
 * Seijun Service Worker (Push & Notification Click Foundation)
 *
 * Implements the lifecycle and event hooks required for Web Push notifications
 * and safe same-origin notification click routing.
 * Offline caching is intentionally omitted to avoid interference with Next.js App Router,
 * Supabase authentication, and server actions.
 */

// ---------------------------------------------------------------------------
// 1. LIFECYCLE: Install & Activate
// ---------------------------------------------------------------------------

if (typeof self !== "undefined" && typeof self.addEventListener === "function") {
  self.addEventListener("install", () => {
    // Immediately take over from any older service worker without waiting
    self.skipWaiting();
  });

  self.addEventListener("activate", (event) => {
    // Claim control of all open clients immediately under the root scope
    event.waitUntil(self.clients.claim());
  });
}

// ---------------------------------------------------------------------------
// 2. NETWORKING: Fetch-Safe Policy
// ---------------------------------------------------------------------------
// IMPORTANT: No fetch event listener is registered.
// By omitting a fetch handler, all network requests (Next.js assets, API routes,
// SSR hydration, Server Actions, Supabase calls) are handled natively by the browser.
// This guarantees zero interference with application networking and authentication.

// ---------------------------------------------------------------------------
// 3. WEB PUSH: Push Event Listener
// ---------------------------------------------------------------------------

if (typeof self !== "undefined" && typeof self.addEventListener === "function") {
  self.addEventListener("push", (event) => {
    let data = {};

    if (event.data) {
      try {
        data = event.data.json();
      } catch {
        data = { title: "Seijun", body: event.data.text() };
      }
    }

    const title = data.title || "Seijun";
    const targetUrl =
      (data.data && typeof data.data === "object" && data.data.url) ||
      data.url ||
      "/dashboard";

    const options = {
      body: data.body || "You have a new update.",
      icon: data.icon || "/icons/icon-192.png",
      badge: data.badge || "/icons/icon-192.png",
      tag: data.tag || "seijun-notification",
      renotify: true,
      silent: false,
      sound: data.sound || "/sounds/notification.wav",
      data:
        typeof data.data === "object" && data.data !== null
          ? { url: targetUrl, ...data.data }
          : { url: targetUrl },
    };

    // 1. Show OS notification (triggers even when browser/app is closed or backgrounded)
    const showPromise = self.registration.showNotification(title, options);

    // 2. Broadcast to open window clients if app is active in foreground
    const broadcastPromise = self.clients
      ? self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
          for (const client of clients) {
            try {
              client.postMessage({
                type: "SEIJUN_PUSH_RECEIVED",
                payload: {
                  title,
                  body: options.body,
                  url: targetUrl,
                  data: options.data,
                  sound: options.sound,
                },
              });
            } catch {
              // Ignore individual postMessage errors
            }
          }
        })
      : Promise.resolve();

    event.waitUntil(Promise.all([showPromise, broadcastPromise]));
  });
}

// ---------------------------------------------------------------------------
// 4. ROUTING & SECURITY HELPERS
// ---------------------------------------------------------------------------

const FALLBACK_URL = "/dashboard";

/**
 * Normalizes and secures target URLs for notification navigation.
 * Strictly guarantees that any returned destination is a same-origin relative path.
 * Rejects external origins, javascript:, data:, blob:, and malformed inputs.
 *
 * @param {string|unknown} target - Untrusted destination string from notification payload.
 * @param {string} [baseOrigin] - Base origin to validate against (defaults to self.location.origin).
 * @returns {string} Safe normalized relative destination path (e.g. "/dashboard", "/cycles?open=latest").
 */
function getSafeNotificationUrl(target, baseOrigin) {
  if (!target || typeof target !== "string") {
    return FALLBACK_URL;
  }

  const trimmed = target.trim();
  if (!trimmed) {
    return FALLBACK_URL;
  }

  // Must be a relative path (/...) or an absolute HTTP(S) URL or protocol-relative URL (//...)
  const isRelative = trimmed.startsWith("/") && !trimmed.startsWith("//");
  const isAbsolute =
    trimmed.startsWith("https://") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("//");

  if (!isRelative && !isAbsolute) {
    return FALLBACK_URL;
  }

  try {
    const origin =
      baseOrigin ||
      (typeof self !== "undefined" && self.location && self.location.origin
        ? self.location.origin
        : "");

    if (!origin) {
      return FALLBACK_URL;
    }

    const baseObj = new URL(origin);
    const parsed = new URL(trimmed, baseObj.origin);

    // Protocol check: only https: or http: (permitted for local development)
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return FALLBACK_URL;
    }

    // Origin check: must strictly match base origin (prevents external redirection)
    if (parsed.origin !== baseObj.origin) {
      return FALLBACK_URL;
    }

    // Return the safe normalized same-origin relative path + search + hash
    return parsed.pathname + parsed.search + parsed.hash;
  } catch {
    return FALLBACK_URL;
  }
}

/**
 * Extracts candidate destination string from notification object.
 * Precedence:
 * 1. event.notification.data.url
 * 2. event.notification.data (if string)
 * 3. event.notification.url (top-level backward compatibility)
 *
 * @param {object} notification - Browser Notification object or payload.
 * @returns {string|null} Candidate destination string or null.
 */
function extractDestinationCandidate(notification) {
  if (!notification) return null;

  const data = notification.data;

  // 1. Prefer structured notification.data.url
  if (data && typeof data === "object" && typeof data.url === "string" && data.url.trim()) {
    return data.url.trim();
  }

  // 2. Fall back to notification.data if it is a string
  if (typeof data === "string" && data.trim()) {
    return data.trim();
  }

  // 3. Fall back to top-level notification.url if present
  if (typeof notification.url === "string" && notification.url.trim()) {
    return notification.url.trim();
  }

  return null;
}

/**
 * Resolves untrusted notification payload into a validated, safe same-origin path.
 *
 * @param {object} notification
 * @param {string} [baseOrigin]
 * @returns {string} Safe relative path (defaults to "/dashboard").
 */
function resolveNotificationDestination(notification, baseOrigin) {
  const candidate = extractDestinationCandidate(notification);
  return getSafeNotificationUrl(candidate, baseOrigin);
}

/**
 * Finds the most suitable same-origin window client among open browser windows/tabs.
 * Prefers currently focused same-origin window clients.
 *
 * @param {Array} clientList - List of WindowClient objects from clients.matchAll().
 * @param {string} origin - Expected same-origin origin string.
 * @returns {object|null} The selected WindowClient or null.
 */
function findBestWindowClient(clientList, origin) {
  if (!Array.isArray(clientList) || clientList.length === 0) {
    return null;
  }

  const sameOriginClients = [];

  for (const client of clientList) {
    if (!client || !client.url) continue;
    try {
      const clientUrl = new URL(client.url);
      if (clientUrl.origin === origin) {
        sameOriginClients.push(client);
      }
    } catch {
      // Ignore malformed client URLs
    }
  }

  if (sameOriginClients.length === 0) {
    return null;
  }

  // If multiple same-origin windows exist, prefer a currently focused client
  const focusedClient = sameOriginClients.find((c) => c.focused);
  if (focusedClient) {
    return focusedClient;
  }

  // Fallback to the first suitable same-origin window client
  return sameOriginClients[0];
}

/**
 * Handles the complete notification click routing sequence:
 * 1. Close notification.
 * 2. Resolve safe destination URL.
 * 3. Inspect existing window clients.
 * 4. Focus and navigate existing client if available; otherwise open a new window.
 *
 * @param {object} event - NotificationEvent
 * @param {object} [globalContext] - Global scope reference (defaults to self).
 */
async function handleNotificationClick(event, globalContext) {
  const ctx = globalContext || (typeof self !== "undefined" ? self : null);
  if (!ctx) return;

  if (event.notification && typeof event.notification.close === "function") {
    event.notification.close();
  }

  const baseOrigin = ctx.location ? ctx.location.origin : "";
  const targetPath = resolveNotificationDestination(event.notification, baseOrigin);
  const targetUrl = new URL(targetPath, baseOrigin).href;

  if (ctx.clients && typeof ctx.clients.matchAll === "function") {
    const clientList = await ctx.clients.matchAll({
      type: "window",
      includeUncontrolled: true,
    });

    const client = findBestWindowClient(clientList, baseOrigin);

    if (client) {
      if ("focus" in client && typeof client.focus === "function") {
        try {
          await client.focus();
        } catch {
          // Ignore focus failures (e.g. background/minimized OS constraints)
        }
      }

      if ("navigate" in client && typeof client.navigate === "function") {
        try {
          await client.navigate(targetUrl);
          return client;
        } catch {
          // If navigation fails, fall back to openWindow
          if (ctx.clients.openWindow) {
            return await ctx.clients.openWindow(targetUrl);
          }
        }
      }
      return client;
    }

    // No existing same-origin window found: open a new window
    if (ctx.clients.openWindow) {
      return await ctx.clients.openWindow(targetUrl);
    }
  }
}

// ---------------------------------------------------------------------------
// 5. NOTIFICATION CLICK: Event Listener
// ---------------------------------------------------------------------------

if (typeof self !== "undefined" && typeof self.addEventListener === "function") {
  self.addEventListener("notificationclick", (event) => {
    event.waitUntil(handleNotificationClick(event, self));
  });
}

// ---------------------------------------------------------------------------
// 6. TESTING EXPORTS (Node.js Environment Only)
// ---------------------------------------------------------------------------
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    FALLBACK_URL,
    getSafeNotificationUrl,
    extractDestinationCandidate,
    resolveNotificationDestination,
    findBestWindowClient,
    handleNotificationClick,
  };
}
