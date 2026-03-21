const SERVER  = "http://localhost:3002";
let userId    = "default";
let donutChart, weeklyChart, goalRing;

function fmtSecs(s) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}

function focusScore(productive, total) {
  if (!total) return 0;
  return Math.round((productive / total) * 100);
}

// ── Tabs ──
document.querySelectorAll(".tab").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("page-" + btn.dataset.tab).classList.add("active");
    if (btn.dataset.tab === "weekly") loadWeekly();
    if (btn.dataset.tab === "settings") loadSettings();
  });
});

// ── Load today ──
async function loadToday() {
  try {
    const res  = await fetch(`${SERVER}/api/stats/today?user_id=${userId}`);
    const data = await res.json();

    document.getElementById("stat-productive").textContent   = fmtSecs(data.productive);
    document.getElementById("stat-unproductive").textContent = fmtSecs(data.unproductive);
    document.getElementById("stat-total").textContent        = fmtSecs(data.total);
    document.getElementById("stat-score").textContent        = focusScore(data.productive, data.total);
    document.getElementById("legend-prod").textContent       = fmtSecs(data.productive);
    document.getElementById("legend-unprod").textContent     = fmtSecs(data.unproductive);

    // Goal bar
    const pct = data.goal ? Math.min(100, Math.round((data.productive / data.goal) * 100)) : 0;
    document.getElementById("dash-goal-bar").style.width = pct + "%";
    document.getElementById("goal-pct-text").textContent  = pct + "%";
    document.getElementById("goal-done-text").textContent = fmtSecs(data.productive) + " done";
    document.getElementById("goal-target-text").textContent = "Goal: " + fmtSecs(data.goal);

    // Donut chart
    const donutCtx = document.getElementById("donut-chart").getContext("2d");
    if (donutChart) donutChart.destroy();
    donutChart = new Chart(donutCtx, {
      type: "doughnut",
      data: {
        labels: ["Productive", "Unproductive"],
        datasets: [{
          data: [data.productive || 0, data.unproductive || 0],
          backgroundColor: ["#62cba1", "#e06c75"],
          borderWidth: 0,
          hoverOffset: 4,
        }],
      },
      options: {
        cutout: "70%",
        plugins: { legend: { display: false }, tooltip: {
          callbacks: { label: ctx => " " + fmtSecs(ctx.raw) }
        }},
        responsive: true, maintainAspectRatio: false,
      },
    });

    // Sites table
    document.getElementById("sites-count").textContent = `${data.sites.length} sites`;
    const tbody   = document.getElementById("sites-tbody");
    const maxSecs = data.sites[0]?.seconds || 1;
    if (!data.sites.length) {
      tbody.innerHTML = `<tr><td colspan="4" class="empty">No data yet today.</td></tr>`;
    } else {
      tbody.innerHTML = data.sites.slice(0, 8).map(s => `
        <tr>
          <td class="domain-cell">${s.domain}</td>
          <td><span class="cat-pill pill-${s.category}">${s.category}</span></td>
          <td class="bar-cell">
            <div class="mini-bar-wrap">
              <div class="mini-bar-fill ${s.category === 'productive' ? 'bar-p' : 'bar-u'}"
                style="width:${Math.round((s.seconds/maxSecs)*100)}%"></div>
            </div>
          </td>
          <td class="time-cell">${fmtSecs(s.seconds)}</td>
        </tr>
      `).join("");
    }
  } catch (e) {
    console.warn("Could not load today stats:", e);
  }
}

// ── Load weekly ──
async function loadWeekly() {
  try {
    const res  = await fetch(`${SERVER}/api/stats/weekly?user_id=${userId}`);
    const data = await res.json();

    // Build 7-day labels
    const days   = [];
    const labels = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().slice(0, 10));
      labels.push(d.toLocaleDateString([], { weekday: "short" }));
    }

    const prodByDay   = {};
    const unprodByDay = {};
    data.daily.forEach(r => {
      const d = r.date.slice(0, 10);
      if (r.category === "productive")   prodByDay[d]   = parseInt(r.seconds);
      if (r.category === "unproductive") unprodByDay[d] = parseInt(r.seconds);
    });

    const wCtx = document.getElementById("weekly-chart").getContext("2d");
    if (weeklyChart) weeklyChart.destroy();
    weeklyChart = new Chart(wCtx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Productive",
            data: days.map(d => Math.round((prodByDay[d] || 0) / 60)),
            backgroundColor: "rgba(98,203,161,0.7)",
            borderRadius: 4,
          },
          {
            label: "Unproductive",
            data: days.map(d => Math.round((unprodByDay[d] || 0) / 60)),
            backgroundColor: "rgba(224,108,117,0.7)",
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: {
          x: { ticks: { color: "rgba(232,237,245,0.5)", font: { family: "Sora", size: 11 } }, grid: { display: false } },
          y: { ticks: { color: "rgba(232,237,245,0.5)", font: { family: "Sora", size: 11 }, callback: v => v + "m" }, grid: { color: "rgba(255,255,255,0.05)" } },
        },
        plugins: {
          legend: { labels: { color: "rgba(232,237,245,0.6)", font: { family: "Sora", size: 11 } } },
          tooltip: { callbacks: { label: ctx => " " + fmtSecs(ctx.raw * 60) } },
        },
      },
    });

    // Weekly top sites
    const tbody   = document.getElementById("weekly-tbody");
    const maxSecs = data.topSites[0]?.seconds || 1;
    if (!data.topSites.length) {
      tbody.innerHTML = `<tr><td colspan="4" class="empty">No data yet.</td></tr>`;
    } else {
      tbody.innerHTML = data.topSites.map(s => `
        <tr>
          <td class="domain-cell">${s.domain}</td>
          <td><span class="cat-pill pill-${s.category}">${s.category}</span></td>
          <td class="bar-cell">
            <div class="mini-bar-wrap">
              <div class="mini-bar-fill ${s.category === 'productive' ? 'bar-p' : 'bar-u'}"
                style="width:${Math.round((s.seconds/maxSecs)*100)}%"></div>
            </div>
          </td>
          <td class="time-cell">${fmtSecs(parseInt(s.seconds))}</td>
        </tr>
      `).join("");
    }
  } catch (e) { console.warn("Weekly load failed:", e); }
}

// ── Load settings ──
async function loadSettings() {
  try {
    // Today stats for goal ring
    const statsRes = await fetch(`${SERVER}/api/stats/today?user_id=${userId}`);
    const stats    = await statsRes.json();
    const pct = stats.goal ? Math.min(100, Math.round((stats.productive / stats.goal) * 100)) : 0;

    document.getElementById("settings-goal-pct").textContent = pct + "%";
    document.getElementById("s-productive").textContent      = fmtSecs(stats.productive);
    document.getElementById("s-goal").textContent            = fmtSecs(stats.goal);
    const remaining = Math.max(0, stats.goal - stats.productive);
    document.getElementById("s-remaining").textContent       = fmtSecs(remaining);

    // Goal ring chart
    const gCtx = document.getElementById("goal-ring").getContext("2d");
    if (goalRing) goalRing.destroy();
    goalRing = new Chart(gCtx, {
      type: "doughnut",
      data: {
        datasets: [{
          data: [pct, 100 - pct],
          backgroundColor: ["#5b8fd4", "rgba(255,255,255,0.06)"],
          borderWidth: 0,
        }],
      },
      options: { cutout: "78%", plugins: { legend: { display: false }, tooltip: { enabled: false } }, responsive: false },
    });

    // Blocked sites
    const blockedRes  = await fetch(`${SERVER}/api/blocked?user_id=${userId}`);
    const blockedList = await blockedRes.json();
    const bl          = document.getElementById("blocked-list");
    if (!blockedList.length) {
      bl.innerHTML = `<div class="empty">No sites blocked.</div>`;
    } else {
      bl.innerHTML = blockedList.map(d => `
        <div class="blocked-row">
          <span class="blocked-domain">${d}</span>
          <button class="unblock-btn" onclick="unblockSite('${d}')">Unblock</button>
        </div>
      `).join("");
    }
  } catch (e) { console.warn("Settings load failed:", e); }
}

// ── Save goal ──
document.getElementById("save-goal-btn").addEventListener("click", async () => {
  const h = parseFloat(document.getElementById("goal-hours").value);
  if (!h || h < 0.5 || h > 12) return alert("Enter hours between 0.5 and 12.");
  await fetch(`${SERVER}/api/goal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, productive_goal: Math.round(h * 3600) }),
  });
  alert(`✓ Goal set to ${h} hour${h !== 1 ? "s" : ""}`);
  loadSettings();
  loadToday();
});

// ── Block site ──
document.getElementById("add-block-btn").addEventListener("click", async () => {
  const input  = document.getElementById("new-block");
  const domain = input.value.trim().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
  if (!domain) return;
  await fetch(`${SERVER}/api/blocked`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, domain }),
  });
  chrome.runtime.sendMessage({ type: "RELOAD_BLOCKED" });
  input.value = "";
  loadSettings();
});

// ── Unblock site ──
async function unblockSite(domain) {
  await fetch(`${SERVER}/api/blocked/${encodeURIComponent(domain)}?user_id=${userId}`, { method: "DELETE" });
  chrome.runtime.sendMessage({ type: "RELOAD_BLOCKED" });
  loadSettings();
}

// ── Save category ──
document.getElementById("save-cat-btn").addEventListener("click", async () => {
  const domain   = document.getElementById("cat-domain").value.trim();
  const category = document.getElementById("cat-type").value;
  const label    = document.getElementById("cat-label").value.trim();
  if (!domain) return;
  await fetch(`${SERVER}/api/categories`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ domain, category, label }),
  });
  alert(`✓ ${domain} saved as ${category}`);
  document.getElementById("cat-domain").value = "";
  document.getElementById("cat-label").value  = "";
});

// ── Init ──
chrome.runtime.sendMessage({ type: "GET_USER_ID" }, ({ userId: uid }) => {
  userId = uid;
  document.getElementById("nav-user").textContent = uid;
  loadToday();
});