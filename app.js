// Init Supabase
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let logs = [];
let currentUser = null;
let weightChart = null;

// ── User selection screen ─────────────────────────────────────────────────────

function renderUserSelect() {
  const u1 = CONFIG.users.user1;
  const u2 = CONFIG.users.user2;
  document.body.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:1rem;">
      <div style="width:100%;max-width:360px;">
        <h1 style="text-align:center;font-size:22px;font-weight:600;margin-bottom:6px;">Tracker Berat Badan</h1>
        <p style="text-align:center;font-size:13px;color:#6b6b67;margin-bottom:2rem;">Siapa yang mau catat hari ini?</p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <button onclick="selectUser('user1')" style="padding:2rem 1rem;border:1.5px solid ${u1.color};border-radius:14px;background:transparent;cursor:pointer;">
            <div style="font-size:32px;margin-bottom:8px;">🧍‍♀️</div>
            <div style="font-size:16px;font-weight:600;color:${u1.color};">${u1.name}</div>
            <div style="font-size:12px;color:#6b6b67;margin-top:4px;">Target: ${u1.targetWeight} kg</div>
          </button>
          <button onclick="selectUser('user2')" style="padding:2rem 1rem;border:1.5px solid ${u2.color};border-radius:14px;background:transparent;cursor:pointer;">
            <div style="font-size:32px;margin-bottom:8px;">🧍‍♂️</div>
            <div style="font-size:16px;font-weight:600;color:${u2.color};">${u2.name}</div>
            <div style="font-size:12px;color:#6b6b67;margin-top:4px;">Target: ${u2.targetWeight} kg</div>
          </button>
        </div>
      </div>
    </div>`;
}

function selectUser(userId) {
  sessionStorage.setItem('wt_user', userId);
  location.reload();
}

// ── Init ──────────────────────────────────────────────────────────────────────

function init() {
  const saved = sessionStorage.getItem('wt_user');
  if (!saved || !CONFIG.users[saved]) {
    renderUserSelect();
    return;
  }
  currentUser = saved;
  const user = getUser();

  // Tombol ganti user
  const headerEl = document.querySelector('.header');
  if (headerEl) {
    const switchBtn = document.createElement('button');
    switchBtn.textContent = '← Ganti user';
    switchBtn.style.cssText = 'background:none;border:none;font-size:12px;color:#6b6b67;cursor:pointer;margin-bottom:8px;padding:0;display:block;';
    switchBtn.onclick = () => { sessionStorage.removeItem('wt_user'); location.reload(); };
    headerEl.prepend(switchBtn);
    document.querySelector('.header h1').textContent = `Tracker ${user.name}`;
    document.querySelector('.header p').textContent  = `Target ${user.targetWeight} kg sebelum 30 April 2026`;
  }

  updateHeader();
  fetchLogs();
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getUser() { return CONFIG.users[currentUser]; }

function getLatestWeight() {
  if (!logs.length) return getUser().initialWeight;
  return logs[logs.length - 1].weight;
}

function getLoss() {
  return parseFloat((getUser().initialWeight - getLatestWeight()).toFixed(1));
}

function getStreak() {
  if (!logs.length) return 0;
  const today = new Date(); today.setHours(0,0,0,0);
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(today); d.setDate(today.getDate() - i);
    const ds = d.toISOString().split('T')[0];
    if (logs.find(l => l.date === ds)) streak++;
    else break;
  }
  return streak;
}

function getDaysLeft() {
  const now = new Date(); now.setHours(0,0,0,0);
  return Math.max(0, Math.ceil((new Date(CONFIG.targetDate) - now) / 86400000));
}

function formatDate(ds) {
  return new Date(ds + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

// ── Supabase ──────────────────────────────────────────────────────────────────

async function fetchLogs() {
  const { data, error } = await db
    .from('weight_logs')
    .select('*')
    .eq('user_name', getUser().name)
    .order('date', { ascending: true });
  if (error) { console.error(error); return; }
  logs = data || [];
  updateHeader();
  renderLogList();
}

async function saveLog() {
  const weight   = parseFloat(document.getElementById('inputWeight').value);
  const calories = parseInt(document.getElementById('inputCalories').value) || 0;
  const exercise = parseInt(document.getElementById('inputExercise').value) || 0;
  const water    = parseFloat(document.getElementById('inputWater').value) || 0;
  const activity = document.getElementById('inputActivity').value.trim();

  if (!weight || weight < 30 || weight > 200) {
    showStatus('Masukkan berat badan yang valid (30–200 kg)', true); return;
  }

  const btn = document.getElementById('btnSave');
  btn.disabled = true;
  showStatus('Menyimpan...');

  const today   = new Date().toISOString().split('T')[0];
  const payload = { date: today, user_name: getUser().name, weight, calories, exercise, water, activity };

  const { error } = await db
    .from('weight_logs')
    .upsert(payload, { onConflict: 'date,user_name' });

  btn.disabled = false;
  if (error) { showStatus('Gagal: ' + error.message, true); return; }

  showStatus('Tersimpan!');
  ['inputWeight','inputCalories','inputExercise','inputWater','inputActivity']
    .forEach(id => document.getElementById(id).value = '');
  await fetchLogs();
}

async function deleteLog(date) {
  if (!confirm('Hapus log tanggal ' + formatDate(date) + '?')) return;
  await db.from('weight_logs').delete().eq('date', date).eq('user_name', getUser().name);
  await fetchLogs();
}

// ── Render ────────────────────────────────────────────────────────────────────

function showStatus(msg, isError = false) {
  const el = document.getElementById('saveStatus');
  el.textContent = msg;
  el.className = 'status-msg' + (isError ? ' error' : '');
  if (!isError) setTimeout(() => el.textContent = '', 3000);
}

function updateHeader() {
  const user  = getUser();
  const cur   = getLatestWeight();
  const loss  = getLoss();
  const total = user.initialWeight - user.targetWeight;
  const pct   = Math.min(100, Math.max(0, Math.round((loss / total) * 100)));

  document.getElementById('curWeightLabel').textContent   = cur.toFixed(1) + ' kg';
  document.getElementById('mainProgress').style.width     = pct + '%';
  document.getElementById('mainProgress').style.background= user.color;
  document.getElementById('progressPct').textContent      = pct + '% tercapai';
  document.getElementById('daysLeft').textContent         = getDaysLeft() + ' hari tersisa';
}

function renderLogList() {
  const el = document.getElementById('logList');
  if (!logs.length) {
    el.innerHTML = '<div class="empty-state">Belum ada log. Mulai catat hari ini!</div>';
    return;
  }
  el.innerHTML = [...logs].reverse().map((l) => {
    const idx     = logs.findIndex(x => x.date === l.date);
    const prev    = idx > 0 ? logs[idx - 1].weight : getUser().initialWeight;
    const diff    = l.weight - prev;
    const diffStr = diff === 0 ? '=' : (diff > 0 ? '+' + diff.toFixed(1) : diff.toFixed(1));
    const isGain  = diff > 0;
    const parts   = [];
    if (l.calories) parts.push(l.calories + ' kkal');
    if (l.exercise) parts.push((l.activity || 'olahraga') + ' ' + l.exercise + ' mnt');
    if (l.water)    parts.push(l.water.toFixed(1) + 'L air');
    return `<div class="log-item">
      <div>
        <div class="log-date">${formatDate(l.date)}</div>
        <div class="log-meta">${parts.join(' · ') || '–'}</div>
      </div>
      <div style="display:flex;align-items:center;gap:4px;">
        <div>
          <div class="log-weight" style="color:${isGain ? '#D85A30' : getUser().color}">${l.weight.toFixed(1)} kg</div>
          <div class="log-diff" style="color:${isGain ? '#D85A30' : getUser().color}">${diffStr} kg</div>
        </div>
        <button class="delete-btn" onclick="deleteLog('${l.date}')">✕</button>
      </div>
    </div>`;
  }).join('');
}

function renderProgress() {
  document.getElementById('statLoss').textContent    = getLoss().toFixed(1);
  document.getElementById('statStreak').textContent  = getStreak();
  document.getElementById('statLogs').textContent    = logs.length;

  const withCal   = logs.filter(l => l.calories > 0);
  const withWater = logs.filter(l => l.water > 0);
  const withEx    = logs.filter(l => l.exercise > 0);

  document.getElementById('statAvgCal').textContent      = withCal.length   ? Math.round(withCal.reduce((s,l)=>s+l.calories,0)/withCal.length) : '–';
  document.getElementById('statAvgWater').textContent    = withWater.length ? (withWater.reduce((s,l)=>s+l.water,0)/withWater.length).toFixed(1) : '–';
  document.getElementById('statTotalEx').textContent     = withEx.length    ? withEx.reduce((s,l)=>s+l.exercise,0) : '–';
  document.getElementById('statHealthyDays').textContent = logs.filter(l => l.calories > 0 && l.calories < 2000).length;
  document.getElementById('statHydrated').textContent    = logs.filter(l => l.water >= 2).length;

  renderStreakRow();
  renderWeightChart();
}

function renderStreakRow() {
  const el    = document.getElementById('streakRow');
  const today = new Date(); today.setHours(0,0,0,0);
  const days  = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
  const color = getUser().color;
  let html    = '';
  for (let i = 6; i >= 0; i--) {
    const d   = new Date(today); d.setDate(today.getDate() - i);
    const ds  = d.toISOString().split('T')[0];
    const has = logs.find(l => l.date === ds);
    const isToday = i === 0;
    const style = has && isToday ? `background:${color};color:#fff;`
                : has            ? `background:${color}22;color:${color};`
                :                  `background:rgba(0,0,0,0.06);color:#888;`;
    html += `<div class="streak-item">
      <div class="streak-dot" style="${style}">${d.getDate()}</div>
      <div class="streak-day-label">${days[d.getDay()]}</div>
    </div>`;
  }
  el.innerHTML = html;
  const s = getStreak();
  document.getElementById('tipText').textContent =
    s === 0 ? 'Catat setiap hari untuk menjaga streak-mu!' :
    s < 4   ? `Keren! Streak ${s} hari. Pertahankan!` :
              `Luar biasa! ${s} hari konsisten. Jangan berhenti!`;
}

function renderWeightChart() {
  const user   = getUser();
  const canvas = document.getElementById('weightChart');
  const points = [{ date: '2026-04-01', weight: user.initialWeight }, ...logs];
  const labels = points.map((l, i) => i === 0 ? 'Awal' : formatDate(l.date));

  if (weightChart) { weightChart.destroy(); weightChart = null; }
  weightChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Berat badan', data: points.map(l => l.weight), borderColor: user.color, backgroundColor: user.color + '15', pointBackgroundColor: user.color, pointRadius: 4, tension: 0.3, fill: true },
        { label: 'Target', data: points.map(() => user.targetWeight), borderColor: '#D85A30', borderDash: [5,5], pointRadius: 0, borderWidth: 1.5 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { min: user.targetWeight - 1, max: user.initialWeight + 1, ticks: { callback: v => v + ' kg', font: { size: 11 } }, grid: { color: 'rgba(128,128,128,0.1)' } },
        x: { ticks: { font: { size: 11 } }, grid: { display: false } }
      }
    }
  });
}

function renderBadges() {
  const user = getUser();
  const half = (user.initialWeight - user.targetWeight) / 2;
  const BADGES = [
    { id: 'first_log',   icon: '✦', bg: '#E1F5EE', color: '#0F6E56', name: 'Langkah Pertama',   desc: 'Catat log pertama',              check: () => logs.length >= 1 },
    { id: 'week_streak', icon: '◆', bg: '#E6F1FB', color: '#185FA5', name: 'Seminggu Solid',    desc: '7 hari log berturut-turut',       check: () => getStreak() >= 7 },
    { id: 'half_goal',   icon: '▲', bg: '#FAEEDA', color: '#854F0B', name: 'Setengah Jalan',    desc: `Turun ${half} kg dari awal`,     check: () => getLoss() >= half },
    { id: 'goal',        icon: '★', bg: '#E1F5EE', color: '#085041', name: 'Target Tercapai!',  desc: `Capai berat ${user.targetWeight} kg`, check: () => getLatestWeight() <= user.targetWeight },
    { id: 'hydration',   icon: '◉', bg: '#EEEDFE', color: '#534AB7', name: 'Rajin Minum',       desc: '5 hari minum ≥2L air',            check: () => logs.filter(l => l.water >= 2).length >= 5 },
    { id: 'workout5',    icon: '■', bg: '#FAECE7', color: '#993C1D', name: 'Aktif Bergerak',    desc: '5 hari olahraga ≥30 menit',       check: () => logs.filter(l => l.exercise >= 30).length >= 5 },
    { id: 'low_cal',     icon: '●', bg: '#EAF3DE', color: '#3B6D11', name: 'Makan Bijak',       desc: '5 hari kalori <1800 kkal',        check: () => logs.filter(l => l.calories > 0 && l.calories < 1800).length >= 5 },
    { id: 'log10',       icon: '♦', bg: '#FBEAF0', color: '#993556', name: 'Konsisten 10 Hari', desc: 'Total 10 entri log',              check: () => logs.length >= 10 },
  ];
  document.getElementById('badgesGrid').innerHTML = BADGES.map(b => {
    const earned = b.check();
    return `<div class="badge ${earned ? '' : 'locked'}">
      <div class="badge-icon" style="background:${b.bg};color:${b.color}">${b.icon}</div>
      <div>
        <div class="badge-name">${b.name}</div>
        <div class="badge-desc">${b.desc}</div>
        <div class="badge-status ${earned ? 'earned' : 'locked'}">${earned ? '✓ Diraih!' : 'Belum terbuka'}</div>
      </div>
    </div>`;
  }).join('');
}

// ── Tab switching ─────────────────────────────────────────────────────────────

document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + tab).classList.add('active');
    if (tab === 'progress') renderProgress();
    if (tab === 'badges')   renderBadges();
  });
});

document.getElementById('btnSave').addEventListener('click', saveLog);

// ── Boot ──────────────────────────────────────────────────────────────────────
init();
