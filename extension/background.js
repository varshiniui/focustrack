const SERVER = "http://localhost:3002";
const USER_ID = "varshini";

let activeTab   = null;
let activeStart = null;
let blockedDomains = [];

async function loadBlockedSites() {
  try {
    const res = await fetch(`${SERVER}/api/blocked?user_id=${USER_ID}`);
    const data = await res.json(); blockedDomains = Array.isArray(data) ? data : [];
  } catch {
    const s = await chrome.storage.local.get("blockedDomains");
    blockedDomains = Array.isArray(s.blockedDomains) ? s.blockedDomains : [];
  }
  chrome.storage.local.set({ blockedDomains });
}

function getDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch { return null; }
}

async function logTime(domain, seconds) {
  if (!domain || seconds < 2) return;
  try {
    await fetch(`${SERVER}/api/log`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: USER_ID, domain, seconds }),
    });
    console.log(`[FocusTrack] Logged ${seconds}s on ${domain}`);
  } catch {
    const s = await chrome.storage.local.get("pendingLogs");
    const q = s.pendingLogs || [];
    q.push({ domain, seconds });
    chrome.storage.local.set({ pendingLogs: q });
  }
}

function stopTracking() {
  if (!activeTab || !activeStart) return;
  const seconds = Math.floor((Date.now() - activeStart) / 1000);
  logTime(activeTab, seconds);
  activeTab = null;
  activeStart = null;
}

function startTracking(url) {
  const domain = getDomain(url);
  if (!domain || url.startsWith("chrome://") || url.startsWith("chrome-extension://")) return;
  if (isBlocked(url)) return;
  activeTab = domain;
  activeStart = Date.now();
  chrome.storage.local.set({ currentDomain: domain });
}

function isBlocked(url) {
  const domain = getDomain(url);
  if (!domain) return false;
  return blockedDomains.some(b => domain === b || domain.endsWith("." + b));
}

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  stopTracking();
  try {
    const tab = await chrome.tabs.get(tabId);
    if (tab.url) startTracking(tab.url);
  } catch {}
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete" || !tab.active) return;
  if (!tab.url) return;

  if (isBlocked(tab.url)) {
    chrome.tabs.update(tabId, {
      url: chrome.runtime.getURL("blocked.html") + "?site=" + getDomain(tab.url),
    });
    return;
  }

  stopTracking();
  startTracking(tab.url);
});

chrome.tabs.onRemoved.addListener(() => stopTracking());

chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    stopTracking();
  } else {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.url) startTracking(tabs[0].url);
    });
  }
});

// Flush every 30 seconds
chrome.alarms.create("flush", { periodInMinutes: 0.5 });
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== "flush") return;

  // Flush current session
  if (activeTab && activeStart) {
    const seconds = Math.floor((Date.now() - activeStart) / 1000);
    if (seconds >= 2) {
      await logTime(activeTab, seconds);
      activeStart = Date.now(); // reset so we don't double count
    }
  }

  // Retry pending logs
  const s = await chrome.storage.local.get("pendingLogs");
  const q = s.pendingLogs || [];
  if (q.length) {
    for (const entry of q) await logTime(entry.domain, entry.seconds);
    chrome.storage.local.set({ pendingLogs: [] });
  }
});

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (msg.type === "GET_CURRENT") {
    const seconds = activeStart ? Math.floor((Date.now() - activeStart) / 1000) : 0;
    reply({ domain: activeTab, seconds });
  }
  if (msg.type === "GET_USER_ID") {
    reply({ userId: USER_ID });
  }
  if (msg.type === "RELOAD_BLOCKED") {
    loadBlockedSites();
    reply({ ok: true });
  }
  return true;
});

loadBlockedSites();
console.log("[FocusTrack] Background started, user:", USER_ID);