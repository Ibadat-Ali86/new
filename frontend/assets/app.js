const API = "/api/v1";
let auth = { access: null, refresh: null, user: null };

const $ = (sel) => document.querySelector(sel);
const setText = (id, val) => (document.getElementById(id).textContent = val);

async function api(path, { method = "GET", data, file } = {}) {
  const headers = {};
  if (!file) headers["Content-Type"] = "application/json";
  if (auth.access) headers["Authorization"] = `Bearer ${auth.access}`;
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: file ? data : data ? JSON.stringify(data) : undefined,
  });
  if (res.status === 401 && auth.refresh) {
    const r = await fetch(`${API}/auth/refresh`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${auth.refresh}` },
    });
    if (r.ok) {
      const j = await r.json();
      auth.access = j.access_token;
      return api(path, { method, data, file });
    }
  }
  if (!res.ok) throw new Error((await res.json()).message || "Request failed");
  const ct = res.headers.get("content-type");
  return ct && ct.includes("application/json") ? res.json() : res.text();
}

function saveAuth() { localStorage.setItem("auth", JSON.stringify(auth)); }
function loadAuth() { const v = localStorage.getItem("auth"); if (v) auth = JSON.parse(v); }

function showApp() {
  if (auth.access) {
    $("#auth-card").style.display = "none";
    ["#summary-card", "#goals-card", "#resources-card"].forEach(s => $(s).style.display = "block");
    $("#auth-controls").innerHTML = `<span class="muted">${auth.user?.email}</span> <button id="logout-btn" class="secondary">Logout</button>`;
    $("#logout-btn").onclick = () => { auth = { access:null, refresh:null, user:null }; saveAuth(); location.reload(); };
    refreshSummary();
    refreshGoals();
    refreshResources();
  } else {
    $("#auth-card").style.display = "block";
    ["#summary-card", "#goals-card", "#resources-card"].forEach(s => $(s).style.display = "none");
    $("#auth-controls").innerHTML = "";
  }
}

async function refreshSummary() {
  try {
    const s = await api(`/analytics/summary`);
    setText("kpi-goals", s.goals);
    setText("kpi-resources", s.resources);
    setText("kpi-minutes", s.minutes);
    drawChart(s);
  } catch(e) {}
}

function drawChart(summary) {
  const ctx = document.getElementById('progressChart');
  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Goals', 'Resources', 'Minutes/10'],
      datasets: [{
        data: [summary.goals||0, summary.resources||0, (summary.minutes||0)/10],
        backgroundColor: ['#3B82F6', '#8B5CF6', '#10B981'],
      }]
    },
    options: { plugins: { legend: { labels: { color: '#e7ecff' } } } }
  });
}

async function refreshGoals() {
  const list = $("#goals-list");
  list.innerHTML = "";
  const goals = await api(`/goals/`);
  goals.forEach(g => {
    const li = document.createElement("li");
    li.innerHTML = `<span class="title">${g.title}</span><div class="actions"><button data-id="${g.id}">+15m</button></div>`;
    li.querySelector("button").onclick = async (ev) => {
      await api(`/goals/${g.id}/progress`, { method: "POST", data: { minutes: 15 } });
      refreshSummary();
    };
    list.appendChild(li);
  });
}

async function refreshResources() {
  const list = $("#resources-list");
  list.innerHTML = "";
  const resources = await api(`/resources/`);
  resources.forEach(r => {
    const li = document.createElement("li");
    li.innerHTML = `<span class="title">${r.title}</span><div class="actions"><button data-id="${r.id}" class="secondary">Delete</button></div>`;
    li.querySelector("button").onclick = async () => { await api(`/resources/${r.id}`, { method: "DELETE" }); refreshResources(); refreshSummary(); };
    list.appendChild(li);
  });
}

function bindAuth() {
  $("#login-btn").onclick = async () => {
    $("#auth-msg").textContent = "";
    try {
      const email = $("#email").value.trim();
      const password = $("#password").value;
      const res = await api(`/auth/login`, { method: "POST", data: { email, password } });
      auth.access = res.access_token; auth.refresh = res.refresh_token; auth.user = res.user; saveAuth(); showApp();
    } catch(e) { $("#auth-msg").textContent = e.message; }
  };
  $("#register-btn").onclick = async () => {
    $("#auth-msg").textContent = "";
    try {
      const email = $("#email").value.trim();
      const name = $("#name").value.trim();
      const password = $("#password").value;
      await api(`/auth/register`, { method: "POST", data: { email, name, password } });
      $("#auth-msg").textContent = "Registered. Please login.";
    } catch(e) { $("#auth-msg").textContent = e.message; }
  };
}

function bindGoalActions() {
  $("#add-goal-btn").onclick = async () => {
    const title = $("#goal-title").value.trim();
    if (!title) return;
    await api(`/goals/`, { method: "POST", data: { title } });
    $("#goal-title").value = "";
    refreshGoals(); refreshSummary();
  };
}

function bindResourceActions() {
  $("#add-res-btn").onclick = async () => {
    const title = $("#res-title").value.trim();
    const url = $("#res-url").value.trim();
    if (!title) return;
    await api(`/resources/`, { method: "POST", data: { title, type: url ? 'link' : 'note', url: url || null } });
    $("#res-title").value = ""; $("#res-url").value = "";
    refreshResources(); refreshSummary();
  };
  $("#upload-res-btn").onclick = async () => {
    const fileInput = $("#res-file");
    if (!fileInput.files[0]) return;
    const form = new FormData();
    form.append("file", fileInput.files[0]);
    await api(`/resources/upload`, { method: "POST", data: form, file: true });
    fileInput.value = "";
    refreshResources(); refreshSummary();
  };
}

function main() {
  loadAuth();
  bindAuth();
  bindGoalActions();
  bindResourceActions();
  showApp();
}

main();