const SERVER  = "http://localhost:3002";
const USER_ID = "varshini"; // must match background.js

function fmtSecs(s) {
  s = parseInt(s) || 0;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

async function loadData() {
  // Current tab
  chrome.runtime.sendMessage({ type: "GET_CURRENT" }, (res) => {
    document.getElementById("current-site").textContent = res?.domain || "No active tab";
    document.getElementById("current-time").textContent =
      res?.seconds > 0 ? `${fmtSecs(res.seconds)} this session` : "Just started";
  });

  // Stats from server
  try {
    const res  = await fetch(`${SERVER}/api/stats/today?user_id=${USER_ID}`);
    const data = await res.json();

    // Goal bar
    const pct = data.goal ? Math.min(100, Math.round((data.productive / data.goal) * 100)) : 0;
    document.getElementById("goal-fill").style.width  = pct + "%";
    document.getElementById("goal-done").textContent  = fmtSecs(data.productive);
    document.getElementById("goal-total").textContent = `Goal: ${fmtSecs(data.goal)}`;

    // Sites list
    const list = document.getElementById("sites-list");
    if (!data.sites || !data.sites.length) {
      list.innerHTML = `<div class="empty">No data yet — browse some sites!</div>`;
      return;
    }
    const maxSecs = data.sites[0]?.seconds || 1;
    list.innerHTML = data.sites.slice(0, 5).map(s => `
      <div class="site-row">
        <div class="site-name">${s.domain}</div>
        <div class="site-bar-wrap">
          <div class="site-bar-fill ${s.category === 'productive' ? 'productive-bar' : 'unproductive-bar'}"
            style="width:${Math.round((s.seconds / maxSecs) * 100)}%"></div>
        </div>
        <div class="site-dur">${fmtSecs(s.seconds)}</div>
      </div>
    `).join("");

  } catch (e) {
    document.getElementById("sites-list").innerHTML =
      `<div class="empty">Server offline — start server on port 3002</div>`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("block-btn").addEventListener("click", async () => {
    const input  = document.getElementById("block-input");
    const domain = input.value.trim()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split("/")[0];
    if (!domain) return;
    try {
      await fetch(`${SERVER}/api/blocked`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: USER_ID, domain }),
      });
      chrome.runtime.sendMessage({ type: "RELOAD_BLOCKED" });
      input.value = "";
      alert(`✓ ${domain} blocked`);
    } catch { alert("Could not block — is the server running?"); }
  });

  document.getElementById("open-dash").addEventListener("click", () => {
    chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") });
  });

  loadData();
  setInterval(loadData, 5000);
});