/* Push notifications (Solution 6). Load this only when using push; PWA may use its own SW for caching. */
self.addEventListener("push", function (event) {
  if (!event.data) return;
  let payload = { title: "Mediimate", body: "", data: {} };
  try {
    payload = event.data.json();
  } catch (_) {
    payload.body = event.data.text();
  }
  const options = {
    body: payload.body || payload.title,
    tag: payload.tag || "mediimate",
    data: payload.data || {},
    actions: [],
  };
  if (payload.data && payload.data.token) {
    options.actions = [
      { action: "log", title: payload.data.value ? "Log " + payload.data.value : "Log" },
      { action: "skip", title: "Skip" },
    ];
  }
  event.waitUntil(self.registration.showNotification(payload.title || "Mediimate", options));
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  const data = event.notification.data || {};
  const token = data.token;
  const action = event.action || "log";
  const baseUrl = self.registration.scope.replace(/\/$/, "");
  if (action === "log" && token) {
    const url = baseUrl + "/patient?log_token=" + encodeURIComponent(token);
    event.waitUntil(
      self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientList) {
        for (var i = 0; i < clientList.length; i++) {
          var c = clientList[i];
          if (c.url.indexOf("/patient") !== -1 && "focus" in c) {
            c.navigate(url);
            return c.focus();
          }
        }
        if (self.clients.openWindow) return self.clients.openWindow(url);
      })
    );
  }
});
