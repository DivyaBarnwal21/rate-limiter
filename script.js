/* =============================================================
   script.js — ChaiPay Rate Limiter Masterclass
   Features:
   - Shared algorithms from js/ratelimiter.js (TokenBucket, FixedWindow, SlidingWindowLog, SlidingWindowCounter, makeFakeClock)
   - Gamification Engine: XP points, Level titles, Badges unlock, Toast alerts
   - Journey Map tracker with vertical fill line
   - Confetti particle cannon for quiz completion (score >= 4) & coding challenge (5/5 tests)
   - Responsive sidebar & light/dark theme persistence
   ============================================================= */
'use strict';

/* ── GLOBALS & ALGORITHM IMPORT ───────────────────────────── */
const { TokenBucket, FixedWindow, SlidingWindowLog, SlidingWindowCounter, makeFakeClock } =
  window.RateLimiterAlgorithms;

const SECTION_COUNT = 7;
const SECTION_TIMES = ['0–4 min', '4–9 min', '9–19 min', '19–29 min', '29–34 min', '34–39 min', '39–45 min'];
const SECTION_MINS  = [0, 4, 9, 19, 29, 34, 39];
const TOTAL_MINS    = 45;

let currentSection = 0;

/* ── GAMIFICATION STATE & BADGES ──────────────────────────── */
const BADGES = [
  { icon: '🛡️', title: 'Gatekeeper Rookie', quote: 'Server bach gaya, welcome to ChaiPay!', xp: 50 },
  { icon: '🎟️', title: 'Token Collector', quote: 'Line mein rehna seekh gaye!', xp: 75 },
  { icon: '🪣', title: 'Bucket Master', quote: 'Lazy refill formula yaad ho gaya!', xp: 125 },
  { icon: '🪟', title: 'Window Wizard', quote: 'Tatkal boundary hack pakad liya!', xp: 150 },
  { icon: '⚖️', title: 'Architecture Guru', quote: 'Sahi tool, sahi scale!', xp: 75 },
  { icon: '⚡', title: 'Redis Commander', quote: 'Distributed locks ka badshah!', xp: 100 },
  { icon: '🏆', title: 'Chief Bouncer Engineer', quote: 'ChaiPay production ready hai!', xp: 125 },
];

let unlockedBadges = new Set();
let currentXP = 0;
let completedMissions = new Set();
let quizSubmitted = false;
let challengePassed = false;

const checkpoints = {
  0: { demo: false, think: false },
  1: { think: false },
  2: { demo: false, think: false },
  3: { demo: false, think: false },
  4: { demo: false, think: false },
  5: { think: false }
};

function tryCheckpoint(mission, type) {
  if (checkpoints[mission]) {
    checkpoints[mission][type] = true;
    if (mission === 0 && checkpoints[0].demo && checkpoints[0].think) completeMission(0);
    else if (mission === 1 && checkpoints[1].think) completeMission(1);
    else if (mission === 2 && checkpoints[2].demo && checkpoints[2].think) completeMission(2);
    else if (mission === 3 && checkpoints[3].demo && checkpoints[3].think) completeMission(3);
    else if (mission === 4 && checkpoints[4].demo && checkpoints[4].think) completeMission(4);
    else if (mission === 5 && checkpoints[5].think) completeMission(5);
  }
}

function saveGamificationState() {
  try {
    localStorage.setItem('chaipay_rate_limiter_completed', JSON.stringify([...completedMissions]));
  } catch (e) {}
}

function loadGamificationState() {
  try {
    const raw = localStorage.getItem('chaipay_rate_limiter_completed');
    if (raw) {
      const arr = JSON.parse(raw);
      arr.forEach(n => {
        if (n >= 0 && n < SECTION_COUNT) {
          completedMissions.add(n);
          unlockedBadges.add(n);
          currentXP += BADGES[n].xp;
        }
      });
    }
  } catch (e) {}
  updateGamificationUI();
  updateSidebarCompletionState();
}

function showXpToast(amount) {
  const toast = document.getElementById('xp-toast');
  if (!toast) return;
  toast.textContent = `+${amount} XP! ⚡`;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2000);
}

function showBadgeToast(badge) {
  const toast = document.getElementById('badge-toast');
  if (!toast) return;
  document.getElementById('badge-toast-icon').textContent = badge.icon;
  document.getElementById('badge-toast-name').textContent = badge.title;
  document.getElementById('badge-toast-quote').textContent = `"${badge.quote}"`;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3500);
}

function unlockBadge(index) {
  if (unlockedBadges.has(index) || index >= BADGES.length) return;
  unlockedBadges.add(index);
  const badge = BADGES[index];
  currentXP += badge.xp;
  showXpToast(badge.xp);
  showBadgeToast(badge);
  updateGamificationUI();
}

function completeMission(n) {
  if (completedMissions.has(n) || n < 0 || n >= SECTION_COUNT) return;
  completedMissions.add(n);
  unlockBadge(n);
  saveGamificationState();
  updateSidebarCompletionState();
}

function checkMission6Completion() {
  if (quizSubmitted && challengePassed) {
    completeMission(6);
  }
}

function updateSidebarCompletionState() {
  document.querySelectorAll('.sidebar-item').forEach((btn, i) => {
    btn.classList.toggle('done', completedMissions.has(i));
  });
  document.querySelectorAll('.btn-complete-mission').forEach((btn) => {
    const m = +btn.dataset.mission;
    if (completedMissions.has(m)) {
      btn.classList.add('completed');
      btn.textContent = `✓ Mission ${m} Completed!`;
      btn.disabled = true;
    }
  });
}

function updateGamificationUI() {
  const xpCountEl = document.getElementById('xp-count');
  const levelTitleEl = document.getElementById('xp-level-title');
  const sidebarXpTotal = document.getElementById('sidebar-xp-total');
  const badgeTray = document.getElementById('header-badges');

  if (xpCountEl) xpCountEl.textContent = `${currentXP} / 700 XP`;
  if (sidebarXpTotal) sidebarXpTotal.textContent = currentXP;

  let levelName = 'Trainee Bouncer 👮';
  if (currentXP >= 550) levelName = 'Chief Bouncer Engineer 🏆';
  else if (currentXP >= 350) levelName = 'Rate Limiter Senior ⚡';
  else if (currentXP >= 150) levelName = 'Gatekeeper Pro 🛡️';

  if (levelTitleEl) levelTitleEl.textContent = levelName;

  if (badgeTray) {
    badgeTray.innerHTML = '';
    unlockedBadges.forEach(idx => {
      const b = BADGES[idx];
      const span = document.createElement('span');
      span.className = 'header-badge';
      span.textContent = b.icon;
      span.title = `${b.title}: "${b.quote}"`;
      badgeTray.appendChild(span);
    });
  }
}

/* ── 1. NAVIGATION & JOURNEY MAP ──────────────────────────── */
function goToSection(n, autoScroll = true) {
  if (n < 0 || n >= SECTION_COUNT) return;

  // hide current
  document.querySelectorAll('.lesson-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.sidebar-item').forEach((btn) => {
    btn.classList.remove('active');
    btn.removeAttribute('aria-current');
    btn.setAttribute('aria-selected', 'false');
  });

  currentSection = n;

  // show new
  const targetSection = document.getElementById(`section-${n}`);
  if (targetSection) targetSection.classList.add('active');

  const sideBtn = document.querySelector(`.sidebar-item[data-section="${n}"]`);
  if (sideBtn) {
    sideBtn.classList.add('active');
    sideBtn.setAttribute('aria-current', 'page');
    sideBtn.setAttribute('aria-selected', 'true');
  }

  updateProgress(n);

  if (autoScroll && targetSection) {
    targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // close mobile sidebar
  const sidebar = document.getElementById('sidebar');
  if (sidebar) sidebar.classList.remove('open');
  const mBtn = document.getElementById('mobile-menu-btn');
  if (mBtn) mBtn.setAttribute('aria-expanded', 'false');
}

function updateProgress(sectionIndex) {
  const pct = Math.round((sectionIndex / (SECTION_COUNT - 1)) * 100);
  const fill = document.getElementById('progress-bar-fill');
  const bar  = document.getElementById('progress-bar-wrap');
  const timeEl = document.getElementById('time-remaining');
  const journeyFill = document.getElementById('journey-fill');

  if (fill) fill.style.width = pct + '%';
  if (bar) bar.setAttribute('aria-valuenow', pct);

  if (journeyFill) {
    journeyFill.style.height = pct + '%';
  }

  const minsElapsed = SECTION_MINS[sectionIndex];
  const minsLeft    = TOTAL_MINS - minsElapsed;
  if (timeEl) timeEl.textContent = minsLeft > 0 ? `~${minsLeft} min left` : '🎉 Done!';
}

// Sidebar item clicks
document.querySelectorAll('.sidebar-item').forEach(btn => {
  btn.addEventListener('click', () => goToSection(+btn.dataset.section));
  btn.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goToSection(+btn.dataset.section); }
  });
});

// Mobile menu toggle
const mobileBtn = document.getElementById('mobile-menu-btn');
if (mobileBtn) {
  mobileBtn.addEventListener('click', () => {
    const sidebar = document.getElementById('sidebar');
    const isOpen  = sidebar.classList.toggle('open');
    mobileBtn.setAttribute('aria-expanded', isOpen.toString());
  });
}

/* ── 2. THEME CONFIGURATION (Exclusively Light Mode) ────── */
(function initTheme() {
  const toggle = document.getElementById('theme-toggle');
  document.documentElement.setAttribute('data-theme', 'light');
  document.documentElement.style.colorScheme = 'light';
  try {
    localStorage.setItem('rl-theme', 'light');
    localStorage.getItem('rl-theme');
  } catch (e) {}
  if (toggle) {
    toggle.style.display = 'none';
  }
})();

/* ── 3. COPY CODE BUTTONS ────────────────────────────────── */
function copyCode(btn) {
  const codeWrap = btn.closest('.code-wrap');
  if (!codeWrap) return;
  const pre = codeWrap.querySelector('pre');
  if (!pre) return;
  const text = pre.innerText || pre.textContent;
  navigator.clipboard.writeText(text).then(() => {
    btn.textContent = 'Copied!';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 1500);
  }).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity  = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    btn.textContent = 'Copied!';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 1500);
  });
}
window.copyCode = copyCode;

document.querySelectorAll('.copy-btn').forEach(btn => {
  btn.addEventListener('click', () => copyCode(btn));
});

/* ── 4. CONFETTI CANNON ANIMATION ────────────────────────── */
function fireConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const colors = ['#ff7a2b', '#00d4b0', '#ff4f8b', '#ffd60a', '#8b5cf6', '#ffffff'];
  const particles = [];
  const count = 120;

  for (let i = 0; i < count; i++) {
    particles.push({
      x: canvas.width / 2,
      y: canvas.height * 0.4,
      w: Math.random() * 10 + 6,
      h: Math.random() * 6 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 18,
      vy: (Math.random() - 0.7) * 16,
      rot: Math.random() * 360,
      vrot: (Math.random() - 0.5) * 10,
      gravity: 0.38,
      opacity: 1,
    });
  }

  let animFrame;
  function update() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.rot += p.vrot;
      p.opacity -= 0.008;

      if (p.opacity > 0) {
        alive = true;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rot * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
    });

    if (alive) {
      animFrame = requestAnimationFrame(update);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      cancelAnimationFrame(animFrame);
    }
  }
  update();
}

/* ── 5. MISSION 0 — SERVER LOAD DEMO ─────────────────────── */
(function initAttackDemo() {
  let attackInterval = null;
  let reqBad = 0, reqGood = 0;

  const badCounter   = document.getElementById('req-count-bad');
  const goodCounter  = document.getElementById('req-count-good');
  const badStatus    = document.getElementById('server-status-bad');
  const goodStatus   = document.getElementById('server-status-good');
  const badBar       = document.getElementById('load-bar-bad');
  const goodBar      = document.getElementById('load-bar-good');
  const badIcon      = document.getElementById('server-icon-bad');
  const startBtn     = document.getElementById('btn-start-attack');
  const stopBtn      = document.getElementById('btn-stop-attack');

  const protectedBucket = new TokenBucket(20, 20);

  function tick() {
    const incomingPerTick = 200;
    reqBad += incomingPerTick;

    let goodThisTick = 0;
    for (let i = 0; i < incomingPerTick; i++) {
      if (protectedBucket.allowRequest()) goodThisTick++;
    }
    reqGood += goodThisTick;

    const displayBad  = Math.round(reqBad / (Date.now() - startTime) * 1000);
    const displayGood = Math.round(reqGood / (Date.now() - startTime) * 1000);

    if (badCounter)  badCounter.textContent  = displayBad.toLocaleString();
    if (goodCounter) goodCounter.textContent = displayGood;

    const badPct  = Math.min(100, (displayBad / 10000) * 100);
    const goodPct = Math.min(100, (displayGood / 20) * 100);

    if (badBar)  badBar.style.width  = badPct + '%';
    if (goodBar) goodBar.style.width = goodPct + '%';

    if (badPct > 90) {
      if (badStatus) {
        badStatus.textContent = '💥 OVERLOADED';
        badStatus.className   = 'server-status overloaded';
      }
      if (badIcon) badIcon.style.animation = 'shake .15s infinite';
    } else if (badPct > 50) {
      if (badStatus) {
        badStatus.textContent = '⚠️ High Load';
        badStatus.className   = 'server-status overloaded';
      }
      if (badIcon) badIcon.style.animation = '';
    }

    if (goodStatus) {
      goodStatus.textContent = '✅ Protected';
      goodStatus.className   = 'server-status protected';
    }
  }

  let startTime;

  if (startBtn) {
    startBtn.addEventListener('click', () => {
      if (attackInterval) return;
      reqBad = 0; reqGood = 0;
      startTime = Date.now();

      Object.assign(protectedBucket, new TokenBucket(20, 20));

      if (badStatus) {
        badStatus.textContent  = '🔴 Under Attack';
        badStatus.className    = 'server-status overloaded';
      }
      if (goodStatus) {
        goodStatus.textContent = '✅ Protected';
        goodStatus.className   = 'server-status protected';
      }

      attackInterval = setInterval(tick, 20);
      startBtn.disabled = true;
      if (stopBtn) stopBtn.disabled = false;
      tryCheckpoint(0, 'demo');
    });
  }

  if (stopBtn) {
    stopBtn.addEventListener('click', () => {
      clearInterval(attackInterval);
      attackInterval = null;
      if (startBtn) startBtn.disabled = false;
      stopBtn.disabled  = true;

      if (badIcon) badIcon.style.animation = '';
      if (badStatus) {
        badStatus.textContent = 'Stopped';
        badStatus.className   = 'server-status idle';
      }
      if (goodStatus) {
        goodStatus.textContent = 'Stopped';
        goodStatus.className   = 'server-status idle';
      }
    });
  }
})();

/* ── 6. MISSION 2 — TOKEN BUCKET SIMULATOR ───────────────── */
(function initTokenBucketSim() {
  let capacity   = 10;
  let refillRate = 2;
  let simBucket  = new TokenBucket(capacity, refillRate);
  let allowedCount = 0, rejectedCount = 0;

  const capSlider    = document.getElementById('tb-capacity');
  const refillSlider = document.getElementById('tb-refill');
  const capVal       = document.getElementById('tb-capacity-val');
  const refillVal    = document.getElementById('tb-refill-val');
  const water        = document.getElementById('tb-water');
  const tokenDisplay = document.getElementById('tb-token-display');
  const allowedEl    = document.getElementById('tb-allowed-count');
  const rejectedEl   = document.getElementById('tb-rejected-count');
  const tokensLeft   = document.getElementById('tb-tokens-left');
  const log          = document.getElementById('tb-log');
  const sendBtn      = document.getElementById('btn-tb-send');
  const burstBtn     = document.getElementById('btn-tb-burst');
  const resetBtn     = document.getElementById('btn-tb-reset');

  function resetSim() {
    if (!capSlider || !refillSlider) return;
    capacity   = +capSlider.value;
    refillRate = +refillSlider.value;
    simBucket  = new TokenBucket(capacity, refillRate);
    allowedCount = 0;
    rejectedCount = 0;
    updateDisplay();
    if (log) log.innerHTML = '<div style="color:var(--text-muted);font-size:.78rem;padding:.5rem;">Press a button to send requests…</div>';
  }

  function updateDisplay() {
    const tokens = simBucket.peekTokens();
    const pct    = Math.min(100, Math.max(0, (tokens / capacity) * 100));
    if (water) water.style.height = pct + '%';
    if (tokenDisplay) tokenDisplay.textContent = tokens.toFixed(2);
    if (tokensLeft) tokensLeft.textContent = tokens.toFixed(1);
    if (allowedEl)  allowedEl.textContent  = allowedCount;
    if (rejectedEl) rejectedEl.textContent = rejectedCount;
    if (capSlider)  capSlider.setAttribute('aria-valuenow', capacity);
    if (refillSlider) refillSlider.setAttribute('aria-valuenow', refillRate);
  }

  function addLogEntry(allowed, tokensBefore, tokensAfter) {
    if (!log) return;
    const existing = log.querySelector('[data-placeholder]');
    if (existing) existing.remove();

    const entry = document.createElement('div');
    entry.className = `log-entry ${allowed ? 'allowed' : 'rejected'}`;
    const now = new Date().toLocaleTimeString('en', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    entry.innerHTML = `
      <span class="log-status">${allowed ? '✅ ALLOW' : '❌ REJECT (429)'}</span>
      <span>tokens: ${tokensBefore.toFixed(1)} → ${tokensAfter.toFixed(1)}</span>
      <span class="log-time">${now}</span>
    `;
    log.insertBefore(entry, log.firstChild);
    while (log.children.length > 30) log.removeChild(log.lastChild);
  }

  function sendRequest() {
    const before  = simBucket.peekTokens();
    const allowed = simBucket.allowRequest();
    const after   = simBucket.peekTokens();
    if (allowed) allowedCount++; else rejectedCount++;
    addLogEntry(allowed, before, after);
    updateDisplay();
    tryCheckpoint(2, 'demo');
  }

  if (capSlider) {
    capSlider.addEventListener('input', () => {
      capacity = +capSlider.value;
      if (capVal) capVal.textContent = capacity;
      resetSim();
    });
  }

  if (refillSlider) {
    refillSlider.addEventListener('input', () => {
      refillRate = +refillSlider.value;
      if (refillVal) refillVal.textContent = refillRate;
      resetSim();
    });
  }

  if (sendBtn)  sendBtn.addEventListener('click', sendRequest);
  if (burstBtn) burstBtn.addEventListener('click', () => {
    for (let i = 0; i < 10; i++) sendRequest();
  });
  if (resetBtn) resetBtn.addEventListener('click', resetSim);

  setInterval(updateDisplay, 200);
  updateDisplay();
})();

/* ── 7. MISSION 2 — PREDICT THE OUTPUT ───────────────────── */
(function initPredictActivity() {
  const btn    = document.getElementById('btn-predict-run');
  const result = document.getElementById('predict-result');
  const guess  = document.getElementById('predict-guess');

  if (!btn) return;

  btn.addEventListener('click', () => {
    const clock  = makeFakeClock(0);
    const bucket = new TokenBucket(5, 1, clock.now);

    const step1Results = [];
    for (let i = 0; i < 8; i++) step1Results.push(bucket.allowRequest());

    clock.advance(3000); // 3 seconds pass

    const step3Results = [];
    for (let i = 0; i < 4; i++) step3Results.push(bucket.allowRequest());

    const step1Allowed = step1Results.filter(Boolean).length;
    const step3Allowed = step3Results.filter(Boolean).length;
    const totalAllowed = step1Allowed + step3Allowed;

    const userGuess = parseInt(guess ? guess.value : 0, 10);
    const correct   = userGuess === totalAllowed;

    const step1Log = step1Results.map((r, i) => `  Request ${i+1}: ${r ? '✅ ALLOW' : '❌ REJECT'}`).join('\n');
    const step3Log = step3Results.map((r, i) => `  Request ${i+1}: ${r ? '✅ ALLOW' : '❌ REJECT'}`).join('\n');

    if (result) {
      result.className = 'predict-result show';
      result.innerHTML = `
        <div style="margin-bottom:.5rem;font-size:1rem;font-weight:700;color:${correct ? 'var(--teal)' : 'var(--danger)'}">
          ${correct ? '🎉 Shabaash! Ekdum Correct Prediction!' : `❌ Arre nahi! Sahi answer ${totalAllowed} hai.`}
        </div>
        <strong>Bouncer Bhaiya ka Mathematical Calculation:</strong>
        <p style="font-size:.88rem;margin:.5rem 0;">
          Bucket capacity = 5. Step 1 mein 5 requests ne bucket ko 0 kar diya (tokens 5→0). Requests 6–8 reject ho gayi.
          Phir 3 seconds idle rahe: <code>min(5, 0 + 3×1) = 3</code> tokens refill hue.
          Step 3 mein 3 requests allow hui, aur 4th reject ho gayi (bucket empty).
          <strong>Total allowed = 5 + 3 = 8.</strong>
        </p>
        <pre style="font-size:.78rem;line-height:1.5;">Step 1 (t=0s, bucket=5):
${step1Log}
  → bucket now empty (0 tokens)

Step 2: wait 3s → bucket = min(5, 0 + 3×1) = 3

Step 3 (t=3s, bucket=3):
${step3Log}</pre>
      `;
    }
  });
})();

/* ── 8. MISSION 3 — SLIDING WINDOW DEMO ──────────────────── */
(function initSlidingWindowDemo() {
  const LIMIT     = 5;
  const WINDOW_MS = 1000;

  let demoTime = 0;
  const clock  = makeFakeClock(0);

  let fw  = new FixedWindow(LIMIT, WINDOW_MS, clock.now);
  let swl = new SlidingWindowLog(LIMIT, WINDOW_MS, clock.now);
  let swc = new SlidingWindowCounter(LIMIT, WINDOW_MS, clock.now);

  let fwAllowed = 0, swlAllowed = 0, swcAllowed = 0;
  const logEl = document.getElementById('sw-demo-log');

  function resetAll() {
    demoTime = 0;
    clock.set(0);
    fw  = new FixedWindow(LIMIT, WINDOW_MS, clock.now);
    swl = new SlidingWindowLog(LIMIT, WINDOW_MS, clock.now);
    swc = new SlidingWindowCounter(LIMIT, WINDOW_MS, clock.now);
    fwAllowed = 0; swlAllowed = 0; swcAllowed = 0;
    updateCounters(null, null, null);
    if (logEl) logEl.textContent = 'Press "Run Boundary Burst Demo" to see the boundary burst flaw in action.';
  }

  function updateCounters(fwR, swlR, swcR) {
    const fwCountEl  = document.getElementById('fw-count');
    const swlCountEl = document.getElementById('swl-count');
    const swcCountEl = document.getElementById('swc-count');
    if (fwCountEl)  fwCountEl.textContent  = fwAllowed;
    if (swlCountEl) swlCountEl.textContent = swlAllowed;
    if (swcCountEl) swcCountEl.textContent = swcAllowed;

    if (fwR !== null) {
      setStatus('fw-status',  fwR,  `at t=${demoTime}ms`);
      setStatus('swl-status', swlR, `at t=${demoTime}ms`);
      setStatus('swc-status', swcR, `at t=${demoTime}ms`);
    }
  }

  function setStatus(id, allowed, note) {
    const el = document.getElementById(id);
    if (!el) return;
    if (allowed === null) {
      el.textContent = 'waiting'; el.className = 'sw-status'; return;
    }
    el.textContent = allowed ? '✅ ALLOWED' : '❌ REJECTED (429)';
    el.className   = `sw-status ${allowed ? 'allowed' : 'rejected'}`;
    const noteEl = document.getElementById(id.replace('-status', '-note'));
    if (noteEl) noteEl.textContent = note || '';
  }

  async function runBurstDemo() {
    resetAll();
    if (!logEl) return;
    logEl.innerHTML = '';

    const steps = [
      { time: 900,  requests: 5, label: 'Window 1 (t=900ms, late in window [0,1000ms))' },
      { time: 1100, requests: 5, label: 'Window 2 (t=1100ms, early in window [1000ms,2000ms))' },
    ];

    for (const step of steps) {
      clock.set(step.time);
      demoTime = step.time;

      const p = document.createElement('p');
      p.style.cssText = 'margin:.4rem 0 .2rem;font-weight:700;color:var(--saffron);';
      p.textContent = `📍 ${step.label}`;
      logEl.appendChild(p);

      for (let i = 0; i < step.requests; i++) {
        await delay(120);
        const fwR  = fw.allowRequest();
        const swlR = swl.allowRequest();
        const swcR = swc.allowRequest();
        if (fwR)  fwAllowed++;
        if (swlR) swlAllowed++;
        if (swcR) swcAllowed++;
        updateCounters(fwR, swlR, swcR);

        const row = document.createElement('div');
        row.style.cssText = 'font-size:.82rem;padding:.1rem .3rem;display:flex;gap:1rem;';
        row.innerHTML = `
          <span>Req #${i+1}:</span>
          <span style="color:${fwR  ? 'var(--teal)' : 'var(--danger)'}">FW: ${fwR  ? '✅' : '❌'}</span>
          <span style="color:${swlR ? 'var(--teal)' : 'var(--danger)'}">SWL: ${swlR ? '✅' : '❌'}</span>
          <span style="color:${swcR ? 'var(--teal)' : 'var(--danger)'}">SWC: ${swcR ? '✅' : '❌'}</span>
        `;
        logEl.appendChild(row);
      }
    }

    const summary = document.createElement('div');
    summary.style.cssText = 'margin-top:.75rem;padding:.75rem;background:var(--surface);border-radius:6px;border-left:3px solid var(--saffron);font-size:.88rem;';
    summary.innerHTML = `
      <strong>Bouncer Bhaiya ka Summary Report (10 requests in 200ms burst window):</strong><br/>
      • Fixed Window: <strong style="color:var(--warn)">${fwAllowed}/10 allowed</strong> — Boundary burst bypassed the bouncer (allowed 5 at 900ms + 5 at 1100ms)!<br/>
      • Sliding Window Log: <strong style="color:var(--teal)">${swlAllowed}/10 allowed</strong> — Perfectly blocked using timestamps array.<br/>
      • Sliding Window Counter: <strong style="color:var(--teal)">${swcAllowed}/10 allowed</strong> — Safely throttled with O(1) RAM.<br/>
      <div style="margin-top:0.4rem;padding:0.4rem 0.6rem;background:var(--surface2);border-radius:4px;font-size:0.8rem;color:var(--text-muted);">
        📐 <strong>Counter Math at t=1100ms:</strong> Previous window had 5 requests; time elapsed into current window is 100ms (10%), so weight = 1 - 0.1 = 0.9.<br/>
        Weighted estimate = <code>(5 × 0.9) + 0 = 4.5</code>. Test condition: <code>4.5 + 1 = 5.5 &gt; limit (5)</code> → <strong>REJECTED (429)</strong>!
      </div>
    `;
    logEl.appendChild(summary);
    tryCheckpoint(3, 'demo');
  }

  const fwDemoBtn = document.getElementById('btn-fw-demo');
  const swResetBtn = document.getElementById('btn-sw-reset');
  if (fwDemoBtn) fwDemoBtn.addEventListener('click', runBurstDemo);
  if (swResetBtn) swResetBtn.addEventListener('click', resetAll);

  function delay(ms) { return new Promise(res => setTimeout(res, ms)); }
})();

/* ── 9. MISSION 4 — SCENARIO PICKER ──────────────────────── */
(function initScenarioPicker() {
  document.querySelectorAll('.scenario-card').forEach(card => {
    function toggle() {
      const idx = card.dataset.scenario;
      const ans = document.getElementById(`scenario-ans-${idx}`);
      if (!ans) return;
      const isOpen = ans.classList.contains('show');
      document.querySelectorAll('.scenario-answer').forEach(a => a.classList.remove('show'));
      document.querySelectorAll('.scenario-card').forEach(c => {
        c.classList.remove('selected');
        c.setAttribute('aria-expanded', 'false');
      });
      if (!isOpen) {
        ans.classList.add('show');
        card.classList.add('selected');
        card.setAttribute('aria-expanded', 'true');
      }
    }
    card.addEventListener('click', toggle);
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
    });
  });
})();

/* ── 10. MISSION 6 — QUIZ & CONFETTI ─────────────────────── */
(function initQuiz() {
  const ANSWERS = { 1: 'B', 2: 'B', 3: 'C', 4: 'B', 5: 'B' };
  let submitted = false;

  const FEEDBACK = {
    1: {
      text: "In 2 seconds at 1 token/sec, exactly 2 new tokens are added via lazy refill: min(5, 0 + 2*1) = 2.",
      bouncerCorrect: "Bhaiya says: 'Ekdum mast! 2 second mein 2 naye token bucket mein drop ho gaye!'",
      bouncerWrong: "Bhaiya says: 'Arre bhai, math dekho: 2 second beete × 1 token/sec = 2 tokens milenge na!'"
    },
    2: {
      text: "Fixed Window resets at hard clock boundaries. A burst at 11:59 and another at 12:00 lets 2x the limit pass in seconds.",
      bouncerCorrect: "Bhaiya says: 'Sahi pakde hain! Tatkal wala boundary burst hack yahi toh tha!'",
      bouncerWrong: "Bhaiya says: 'Nahi dost! Fixed Window boundary pe chhed chhod deta hai jahan se 2x traffic leak ho jata hai!'"
    },
    3: {
      text: "The Retry-After header informs the client how many seconds to pause before sending another request.",
      bouncerCorrect: "Bhaiya says: 'Bilkul sahi! Retry-After bolta hai: 30 second chai piyo, fir wapas aao!'",
      bouncerWrong: "Bhaiya says: 'Arre nahi! Retry-After standard header hai jo client SDK ko pause time batata hai!'"
    },
    4: {
      text: "Redis executes Lua scripts atomically in a single thread, preventing multiple servers from double-spending quotas (TOCTOU).",
      bouncerCorrect: "Bhaiya says: 'Zabardast! Atomic script matlab beech mein koi doosra server ghus hi nahi sakta!'",
      bouncerWrong: "Bhaiya says: 'Dhyan se! JavaScript ke multiple servers ke beech race condition hoti hai. Redis Lua script usko atomic banata hai!'"
    },
    5: {
      text: "Sliding Window Counter weights the previous window by (1 - timeInWindow/windowSize), assuming requests were evenly distributed.",
      bouncerCorrect: "Bhaiya says: 'Superb! Uniform distribution maan ke hum 99.9% accuracy paate hain bina memory foonke!'",
      bouncerWrong: "Bhaiya says: 'Yaad karo worked example: hum maante hain ki previous window ki requests pure 60 second mein barabar phaili hui thin!'"
    }
  };

  const submitBtn = document.getElementById('btn-submit-quiz');
  const resetBtn  = document.getElementById('btn-reset-quiz');
  const scoreDiv  = document.getElementById('quiz-score');
  const scoreNum  = document.getElementById('score-num');
  const scoreMsg  = document.getElementById('score-msg');

  // Question tracking
  const userAnswers = {};

  function handleOptionSelect(opt) {
    if (submitted) return;
    const q = opt.dataset.q || opt.querySelector('input')?.name?.replace('q', '');
    const val = opt.dataset.val || opt.querySelector('input')?.value;
    if (!q || !val) return;

    // If this question is already answered, ignore
    if (userAnswers[q]) return;
    userAnswers[q] = val;

    const correct = ANSWERS[q];
    const isCorrect = val === correct;

    // Mark current question's options
    document.querySelectorAll(`.quiz-option[data-q="${q}"]`).forEach(o => {
      o.classList.add('answered');
      o.style.cursor = 'default';
      const r = o.querySelector('input');
      const oVal = o.dataset.val || r?.value;

      if (oVal === correct) {
        o.classList.add('correct');
      } else if (oVal === val && !isCorrect) {
        o.classList.add('wrong');
      }
      if (oVal === val && r) {
        r.checked = true;
        o.classList.add('selected');
      }
    });

    // Show instant explanation & Bouncer reaction
    const expEl = document.getElementById(`q${q}-exp`);
    if (expEl && FEEDBACK[q]) {
      expEl.className = `quiz-feedback show ${isCorrect ? 'is-correct' : 'is-wrong'}`;
      expEl.innerHTML = `
        <div>${isCorrect ? '✅ <strong>Correct!</strong>' : '❌ <strong>Not quite!</strong>'} ${FEEDBACK[q].text}</div>
        <div class="quiz-reaction-bouncer">
          <span>👮‍♂️</span>
          <strong>${isCorrect ? FEEDBACK[q].bouncerCorrect : FEEDBACK[q].bouncerWrong}</strong>
        </div>
      `;
    }

    // Check if all 5 answered
    if (Object.keys(userAnswers).length === 5) {
      calculateAndShowScore();
    }
  }

  document.querySelectorAll('.quiz-option').forEach(opt => {
    opt.addEventListener('click', () => handleOptionSelect(opt));
    opt.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleOptionSelect(opt); }
    });
  });

  function calculateAndShowScore() {
    submitted = true;
    let score = 0;
    for (const [q, correct] of Object.entries(ANSWERS)) {
      if (userAnswers[q] === correct) score++;
    }

    if (scoreDiv) {
      scoreDiv.style.display = 'block';
      scoreDiv.innerHTML = `
        <div class="score-num" id="score-num">${score} / 5</div>
        <div class="score-msg" id="score-msg"></div>
        <div class="quiz-badge-award">
          <span>🏆</span>
          <div>
            <div>${score >= 4 ? 'Mission Accomplished: Certified Bouncer Engineer!' : 'Keep Practicing, Trainee Bouncer!'}</div>
            <small style="opacity:0.85;">Score: ${score}/5 · ${score >= 4 ? 'Unlocked Chief Bouncer Badge + Confetti! ⚡' : 'Review feedback above and retry anytime.'}</small>
          </div>
        </div>
      `;
    }
    const scoreMsgEl = document.getElementById('score-msg');

    const msgs = [
      'Dhyan se padho bhai — revision karo fir se! 💪',
      'Kuch galtiyan hui, but achha attempt tha!',
      'Not bad! Chai piyo aur concepts revise karo.',
      'Bahut badiya! Almost perfect bouncer!',
      'Zabardast! 4 out of 5! Sirf 1 chhota sawal choota. 🌟',
      '🏆 Full 5/5! Ekdum Shaandar! Bouncer Bhaiya ka favourite student!',
    ];
    if (scoreMsgEl) scoreMsgEl.textContent = msgs[score];

    quizSubmitted = true;
    if (score >= 4) {
      fireConfetti();
    }
    checkMission6Completion();

    if (submitBtn) submitBtn.disabled = true;
  }

  if (submitBtn) {
    submitBtn.addEventListener('click', () => {
      if (submitted) return;
      // Grade any unanswered as empty and finalize
      for (const q of Object.keys(ANSWERS)) {
        if (!userAnswers[q]) {
          const fakeOpt = document.querySelector(`.quiz-option[data-q="${q}"]`);
          if (fakeOpt) {
            document.querySelectorAll(`.quiz-option[data-q="${q}"]`).forEach(o => {
              o.classList.add('answered');
              o.style.cursor = 'default';
              const r = o.querySelector('input');
              const oVal = o.dataset.val || r?.value;
              if (oVal === ANSWERS[q]) o.classList.add('correct');
            });
            const expEl = document.getElementById(`q${q}-exp`);
            if (expEl && FEEDBACK[q]) {
              expEl.className = 'quiz-feedback show is-wrong';
              expEl.innerHTML = `<div>❌ <strong>Unanswered:</strong> ${FEEDBACK[q].text}</div>`;
            }
          }
        }
      }
      calculateAndShowScore();
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      submitted = false;
      for (const k in userAnswers) delete userAnswers[k];

      if (submitBtn) submitBtn.disabled = false;
      if (scoreDiv) scoreDiv.style.display = 'none';

      document.querySelectorAll('.quiz-option').forEach(opt => {
        opt.classList.remove('selected', 'correct', 'wrong', 'answered');
        opt.style.cursor = '';
        const radio = opt.querySelector('input');
        if (radio) radio.checked = false;
      });
      document.querySelectorAll('.quiz-feedback').forEach(e => {
        e.className = 'quiz-feedback';
        e.innerHTML = '';
      });
    });
  }
})();

/* ── 11. MISSION 6 — CODING CHALLENGE & PROGRESSIVE HINTS ── */
(function initCodingChallenge() {
  const runBtn      = document.getElementById('btn-run-tests');
  const showSolBtn  = document.getElementById('btn-show-solution');
  const clearBtn    = document.getElementById('btn-clear-editor');
  const editor      = document.getElementById('challenge-code');
  const resultsEl   = document.getElementById('test-results');
  const solutionBox = document.getElementById('solution-box');

  // Progressive Hints
  const hintBtn     = document.getElementById('btn-reveal-hint');
  const hintCounter = document.getElementById('hint-counter');
  let currentHint   = 0;

  if (hintBtn) {
    hintBtn.addEventListener('click', () => {
      currentHint++;
      const hintCard = document.getElementById(`hint-${currentHint}`);
      if (hintCard) hintCard.classList.add('show');
      if (hintCounter) hintCounter.textContent = `${Math.min(currentHint, 3)} / 3 hints used`;

      if (currentHint === 1) {
        hintBtn.textContent = '💡 Need another hint? (Unlock Hint 2/3)';
      } else if (currentHint === 2) {
        hintBtn.textContent = '💡 Final hint! (Unlock Hint 3/3)';
      } else {
        hintBtn.textContent = '✅ All 3 hints unlocked!';
        hintBtn.disabled = true;
      }
    });
  }

  const TEST_CASES = [
    {
      desc: 'Starts full: first N requests (up to capacity) are allowed',
      run(BucketClass) {
        const clock = makeFakeClock(0);
        const b = new BucketClass(5, 1, clock.now);
        const res = [b.allowRequest(), b.allowRequest(), b.allowRequest(),
                     b.allowRequest(), b.allowRequest(), b.allowRequest()];
        const expect = [true, true, true, true, true, false];
        if (JSON.stringify(res) !== JSON.stringify(expect))
          throw new Error(`Expected ${JSON.stringify(expect)}, got ${JSON.stringify(res)}`);
      },
    },
    {
      desc: 'Rejects when empty; lazy refill restores tokens after 2 seconds',
      run(BucketClass) {
        const clock = makeFakeClock(0);
        const b = new BucketClass(3, 1, clock.now);
        b.allowRequest(); b.allowRequest(); b.allowRequest();
        if (b.allowRequest() !== false) throw new Error('Should reject when empty');
        clock.advance(2000);
        if (b.allowRequest() !== true)  throw new Error('Should allow after refill');
        if (b.allowRequest() !== true)  throw new Error('Should allow second refill token');
        if (b.allowRequest() !== false) throw new Error('Should reject when empty again');
      },
    },
    {
      desc: 'Refill is capped at capacity (no infinite banking during idle)',
      run(BucketClass) {
        const clock = makeFakeClock(0);
        const b = new BucketClass(5, 10, clock.now);
        b.allowRequest();
        clock.advance(60_000);
        if (b.allowRequest() !== true) throw new Error('Should allow');
        b.allowRequest(); b.allowRequest(); b.allowRequest(); b.allowRequest();
        if (b.allowRequest() !== false) throw new Error('Tokens should be capped at 5');
      },
    },
    {
      desc: 'Fractional tokens: 500ms at 1 token/sec yields 0.5 tokens (not enough for 1)',
      run(BucketClass) {
        const clock = makeFakeClock(0);
        const b = new BucketClass(5, 1, clock.now);
        for (let i = 0; i < 5; i++) b.allowRequest();
        clock.advance(500);
        if (b.allowRequest() !== false) throw new Error('0.5 tokens should not be enough');
        clock.advance(500);
        if (b.allowRequest() !== true) throw new Error('1.0 token should allow');
      },
    },
    {
      desc: 'Returns true/false (boolean), not truthy/falsy',
      run(BucketClass) {
        const clock = makeFakeClock(0);
        const b = new BucketClass(1, 1, clock.now);
        const r1 = b.allowRequest();
        const r2 = b.allowRequest();
        if (typeof r1 !== 'boolean') throw new Error(`allowRequest() must return a boolean, got ${typeof r1}`);
        if (typeof r2 !== 'boolean') throw new Error(`allowRequest() must return a boolean, got ${typeof r2}`);
        if (r1 !== true)  throw new Error('First call should return true');
        if (r2 !== false) throw new Error('Second call should return false');
      },
    },
  ];

  if (runBtn) {
    runBtn.addEventListener('click', () => {
      if (!resultsEl || !editor) return;
      resultsEl.style.display = 'flex';
      resultsEl.innerHTML = '';
      const code = editor.value.trim();

      if (!code) {
        showResult('fail', '⚠️ Pehle code toh likho!', 'Please write your implementation inside the editor first.');
        return;
      }

      let BucketClass;
      try {
        const factory = new Function('makeFakeClock', `${code}\nreturn typeof TokenBucket !== 'undefined' ? TokenBucket : (typeof MyTokenBucket !== 'undefined' ? MyTokenBucket : null);`);
        BucketClass = factory(makeFakeClock);
        if (!BucketClass) throw new Error('Could not find a class named TokenBucket or MyTokenBucket.');
      } catch (err) {
        showResult('fail', `❌ Syntax error: ${err.message}`, '');
        return;
      }

      let pass = 0;
      TEST_CASES.forEach((tc, i) => {
        try {
          tc.run(BucketClass);
          pass++;
          showResult('pass', `Test ${i+1}: PASS`, tc.desc);
        } catch (err) {
          showResult('fail', `Test ${i+1}: FAIL`, `${tc.desc} — ${err.message}`);
        }
      });

      const summary = document.createElement('div');
      summary.style.cssText = 'text-align:center;padding:1rem;font-weight:700;font-size:1.05rem;background:var(--surface);border-radius:8px;border:2px solid var(--border-strong);';
      summary.style.color = pass === TEST_CASES.length ? 'var(--teal)' : 'var(--warn)';
      summary.innerHTML = `${pass}/${TEST_CASES.length} Test Cases Passed ${pass === TEST_CASES.length ? '🎉 🏆 Bouncer Approved!' : '💪 Keep debugging!'}`;
      resultsEl.appendChild(summary);

      if (pass === TEST_CASES.length) {
        fireConfetti();
        challengePassed = true;
        checkMission6Completion();
      }
    });
  }

  function showResult(type, title, desc) {
    const el = document.createElement('div');
    el.className = `test-case-card ${type}`;
    el.innerHTML = `
      <div>
        <div style="font-weight:700;">${title}</div>
        ${desc ? `<div style="font-size:0.82rem; color:var(--text-muted); margin-top:0.2rem;">${desc}</div>` : ''}
      </div>
      <span class="test-badge ${type}">${type}</span>
    `;
    if (resultsEl) resultsEl.appendChild(el);
  }

  if (showSolBtn) {
    showSolBtn.addEventListener('click', () => {
      if (!solutionBox) return;
      const isHidden = solutionBox.style.display === 'none';
      solutionBox.style.display = isHidden ? 'block' : 'none';
      showSolBtn.textContent = isHidden ? '🙈 Hide Solution' : '💡 Show Reference Solution';
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (editor) {
        editor.value = `class TokenBucket {
  constructor(capacity, refillRate, clock = Date.now) {
    this.capacity   = capacity;    // Max tokens bucket can hold
    this.refillRate = refillRate;  // Tokens added per second
    this.clock      = clock;       // Injectable clock function returning ms
    this.tokens     = capacity;    // Starts full
    this.lastRefill = clock();     // Timestamp of last refill (ms)
  }

  allowRequest() {
    // TODO: implement allowRequest() using lazy refill
    return false;
  }
}`;
        editor.focus();
      }
      if (resultsEl) resultsEl.innerHTML = '';
    });
  }

  if (editor) {
    editor.addEventListener('keydown', e => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = editor.selectionStart;
        const end   = editor.selectionEnd;
        editor.value = editor.value.substring(0, start) + '  ' + editor.value.substring(end);
        editor.selectionStart = editor.selectionEnd = start + 2;
      }
    });
  }
})();

/* ── 12. MISSION 4 — RATE LIMITER BATTLE ARENA ───────────── */
(function initRateLimiterBattle() {
  const limitInput   = document.getElementById('battle-limit');
  const limitVal     = document.getElementById('battle-limit-val');
  const windowInput  = document.getElementById('battle-window');
  const windowVal    = document.getElementById('battle-window-val');
  const tbParamsEl   = document.getElementById('battle-tb-params');
  const commentaryEl = document.getElementById('battle-commentary');

  if (!limitInput || !windowInput) return;

  function updateLabels() {
    const limit = parseInt(limitInput.value, 10);
    const windowSec = parseInt(windowInput.value, 10) / 1000;
    if (limitVal) limitVal.textContent = `${limit} req`;
    if (windowVal) windowVal.textContent = `${windowSec}s`;
    if (tbParamsEl) {
      tbParamsEl.textContent = `capacity = ${limit}, refill = ${(limit / windowSec).toFixed(1)}/s`;
    }
  }
  limitInput.addEventListener('input', updateLabels);
  windowInput.addEventListener('input', updateLabels);
  updateLabels();

  function runBattle(patternType, isUserAction = false) {
    if (isUserAction) tryCheckpoint(4, 'demo');
    const limit    = parseInt(limitInput.value, 10);
    const windowMs = parseInt(windowInput.value, 10);

    // Active button highlight
    document.querySelectorAll('.btn-traffic').forEach(b => {
      b.classList.toggle('active', b.dataset.pattern === patternType);
    });

    const clock = makeFakeClock(0);
    const tb  = new TokenBucket(limit, limit / (windowMs / 1000), clock.now);
    const fw  = new FixedWindow(limit, windowMs, clock.now);
    const swl = new SlidingWindowLog(limit, windowMs, clock.now);
    const swc = new SlidingWindowCounter(limit, windowMs, clock.now);

    const stats = {
      tb:  { allowed: 0, rejected: 0, total: 0 },
      fw:  { allowed: 0, rejected: 0, total: 0 },
      swl: { allowed: 0, rejected: 0, total: 0 },
      swc: { allowed: 0, rejected: 0, total: 0 }
    };

    function sendToAll() {
      tb.allowRequest()  ? stats.tb.allowed++  : stats.tb.rejected++;
      fw.allowRequest()  ? stats.fw.allowed++  : stats.fw.rejected++;
      swl.allowRequest() ? stats.swl.allowed++ : stats.swl.rejected++;
      swc.allowRequest() ? stats.swc.allowed++ : stats.swc.rejected++;
      stats.tb.total++; stats.fw.total++; stats.swl.total++; stats.swc.total++;
    }

    let commentary = '';

    if (patternType === 'steady') {
      // Steady: limit requests spaced evenly across the window
      const step = windowMs / (limit + 2);
      for (let i = 0; i < limit; i++) {
        clock.advance(step);
        sendToAll();
      }
      commentary = `🟢 <strong>Steady Traffic (100% Polite):</strong> Traffic arrived at a smooth pace under the limit (${limit} req / ${windowMs/1000}s). All 4 algorithms easily allowed 100% of the traffic without any 429 rejections!`;
    } else if (patternType === 'burst') {
      // Sudden Burst: 1.5x limit arriving simultaneously
      const burstCount = Math.round(limit * 1.5);
      clock.set(100);
      for (let i = 0; i < burstCount; i++) {
        sendToAll();
      }
      commentary = `🟡 <strong>Sudden Burst (${burstCount} requests at once):</strong> Token Bucket allowed up to capacity (${limit}) and gracefully dropped the remaining ${burstCount - limit}. Fixed Window and Sliding Window Log also capped at ${limit}. Ideal behavior for human user traffic!`;
    } else if (patternType === 'boundary') {
      // Boundary Attack: limit requests at 90% of window 1, limit requests at 10% of window 2
      const t1 = Math.round(windowMs * 0.9);
      const t2 = Math.round(windowMs * 1.1);
      clock.set(t1);
      for (let i = 0; i < limit; i++) sendToAll();
      clock.set(t2);
      for (let i = 0; i < limit; i++) sendToAll();

      const swcNote = stats.swc.allowed > limit ? ' (this is the approximation trade-off)' : '';
      commentary = `🔴 <strong>Boundary Attack (Tatkal Surges):</strong> Look closely! <strong>Fixed Window leaked ${stats.fw.allowed} requests (2x the limit!)</strong> because the clock ticked over at ${windowMs}ms. Meanwhile, <strong>Sliding Window Log strictly blocked it (${stats.swl.allowed}/${stats.swl.total} allowed)</strong> and <strong>Sliding Window Counter throttled it (${stats.swc.allowed} allowed${swcNote})</strong> with constant O(1) memory!`;
    }

    // Render results into UI
    ['tb', 'fw', 'swl', 'swc'].forEach(algo => {
      const allowedEl = document.getElementById(`battle-${algo}-allowed`);
      const rejectEl  = document.getElementById(`battle-${algo}-rejected`);
      const barAllow  = document.getElementById(`battle-${algo}-bar-allow`);
      const barReject = document.getElementById(`battle-${algo}-bar-reject`);
      const card      = document.getElementById(`battle-card-${algo}`);
      const tag       = document.getElementById(`battle-${algo}-tag`);

      const a = stats[algo].allowed;
      const r = stats[algo].rejected;
      const tot = stats[algo].total;

      if (allowedEl) allowedEl.textContent = a;
      if (rejectEl)  rejectEl.textContent  = r;

      const allowPct  = tot > 0 ? (a / tot) * 100 : 0;
      const rejectPct = tot > 0 ? (r / tot) * 100 : 0;

      if (barAllow)  barAllow.style.width  = `${allowPct}%`;
      if (barReject) barReject.style.width = `${rejectPct}%`;

      if (card) {
        card.classList.remove('winner', 'leaked');
        if (patternType === 'boundary') {
          if (algo === 'fw') card.classList.add('leaked');
          else if (algo === 'swl' || algo === 'swc') card.classList.add('winner');
        }
      }

      if (tag) {
        if (patternType === 'boundary') {
          if (algo === 'fw') {
            tag.className = 'battle-verdict-tag warning';
            tag.textContent = 'LEAKED 2x TRAFFIC! ❌';
          } else if (algo === 'swl') {
            tag.className = 'battle-verdict-tag safe';
            tag.textContent = '100% STRICT SHIELD 🛡️';
          } else if (algo === 'swc') {
            tag.className = 'battle-verdict-tag safe';
            tag.textContent = 'OPTIMAL O(1) BALANCE ⚖️';
          } else {
            tag.className = 'battle-verdict-tag neutral';
            tag.textContent = 'BURST TOLERANT 🪣';
          }
        } else {
          tag.className = 'battle-verdict-tag neutral';
          tag.textContent = a === tot ? 'ALL PASSED (200 OK)' : 'BURST REGULATED';
        }
      }
    });

    if (commentaryEl) commentaryEl.innerHTML = commentary;
  }

  // Attach button events
  const btnSteady   = document.getElementById('btn-battle-steady');
  const btnBurst    = document.getElementById('btn-battle-burst');
  const btnBoundary = document.getElementById('btn-battle-boundary');

  if (btnSteady)   btnSteady.addEventListener('click', () => runBattle('steady', true));
  if (btnBurst)    btnBurst.addEventListener('click', () => runBattle('burst', true));
  if (btnBoundary) btnBoundary.addEventListener('click', () => runBattle('boundary', true));

  updateLabels();
  // Initialize with boundary attack view
  runBattle('boundary');
})();

/* ── 13. CHEAT SHEET ACTIONS ─────────────────────────────── */
(function initCheatSheet() {
  const copyBtn = document.getElementById('btn-copy-cheatsheet');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const markdown = `# 🛡️ Bouncer Bhaiya's Rate Limiter Cheat Sheet (ChaiPay Security)

| Algorithm | Memory | Time | Burst Handling | Boundary Attack Safe? | Best Use Case |
|---|---|---|---|---|---|
| **Token Bucket** | O(1) | O(1) | Allows bursts up to capacity | Yes (Continuous Lazy Refill) | Public APIs (Stripe, GitHub, AWS Gateway) |
| **Fixed Window** | O(1) | O(1) | Resets at boundary | ❌ NO (Leaks 2x limit at edges) | Simple daily/monthly quotas resetting at midnight |
| **Sliding Window Log** | O(N) | O(1) amortized (array) / O(log N) (Redis ZSET) | Strict enforcement | ✅ 100% Exact Precision | High-security financial transfers & credit card APIs |
| **Sliding Window Counter** | O(1) | O(1) | Smooth approximation | ✅ Yes (~99.95% accuracy) | High-scale CDNs, Cloudflare, and massive public APIs |

### Key Formulas:
- **Token Bucket (Lazy Refill):** tokens = min(capacity, current + (now - lastRefill) / 1000 * rate)
- **Sliding Window Counter:** estimate = prevWindowCount * (1 - timeInCurrentWindow / windowSize) + curWindowCount
- **Redis Lua Atomic EXPIRE:** Only set EXPIRE on first request (when INCR returns 1) so TTL never resets indefinitely!
`;
      navigator.clipboard.writeText(markdown).then(() => {
        const toast = document.getElementById('xp-toast');
        if (toast) {
          toast.textContent = '📋 Cheat Sheet copied to clipboard!';
          toast.classList.add('show');
          setTimeout(() => toast.classList.remove('show'), 2500);
        }
      });
    });
  }
})();

/* ── 12. KEYBOARD SHORTCUTS ──────────────────────────────── */
(function initKeyboardNav() {
  const sidebar = document.getElementById('sidebar');
  if (sidebar) {
    sidebar.addEventListener('keydown', e => {
      const items  = [...document.querySelectorAll('.sidebar-item')];
      const active = document.querySelector('.sidebar-item.active');
      const idx    = items.indexOf(active);

      if (e.key === 'ArrowDown' && idx < items.length - 1) {
        e.preventDefault();
        goToSection(idx + 1);
        items[idx + 1].focus();
      } else if (e.key === 'ArrowUp' && idx > 0) {
        e.preventDefault();
        goToSection(idx - 1);
        items[idx - 1].focus();
      }
    });
  }

  document.addEventListener('keydown', e => {
    if (document.activeElement.matches('input, textarea, select')) return;
    if (e.key === 'ArrowRight' || e.key === ']') goToSection(currentSection + 1);
    if (e.key === 'ArrowLeft'  || e.key === '[') goToSection(currentSection - 1);
  });
})();

/* ── 13. INTERACTIVE PEDAGOGY: ELI5, THINK BOXES, CODE WALKTHROUGHS ── */
(function initPedagogyEnhancements() {
  // 1. ELI5 Toggles
  document.querySelectorAll('.eli5-container').forEach(container => {
    const btns = container.querySelectorAll('.eli5-btn');
    const panes = container.querySelectorAll('.eli5-pane');
    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.mode;
        btns.forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
        panes.forEach(p => p.classList.toggle('active', p.dataset.pane === mode));
      });
    });
  });

  // 2. Think About It Reveal Buttons
  document.querySelectorAll('.think-reveal-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const parent = btn.closest('.think-pause-box');
      if (!parent) return;
      const answer = parent.querySelector('.think-answer');
      if (!answer) return;
      const isShowing = answer.classList.contains('show');
      answer.classList.toggle('show');
      btn.textContent = isShowing ? '👉 Click to reveal Bouncer Bhaiya\'s answer' : '🙈 Hide answer';

      const sec = btn.closest('.lesson-section');
      if (sec) {
        const idx = +sec.id.replace('section-', '');
        tryCheckpoint(idx, 'think');
      }
    });
  });

  // 3. Code Walkthrough Hover & Click Highlighting
  document.querySelectorAll('.walkthrough-step').forEach(step => {
    const lineTarget = step.dataset.targetLine;
    const parentSection = step.closest('.lesson-section') || document;

    function setHighlight(active) {
      if (!lineTarget) return;
      const targets = parentSection.querySelectorAll(`.code-line-target[data-line="${lineTarget}"]`);
      targets.forEach(t => t.classList.toggle('highlight', active));
      step.classList.toggle('active', active);
    }

    step.addEventListener('mouseenter', () => setHighlight(true));
    step.addEventListener('mouseleave', () => setHighlight(false));
    step.addEventListener('click', () => {
      const isCurrentActive = step.classList.contains('active');
      parentSection.querySelectorAll('.walkthrough-step').forEach(s => s.classList.remove('active'));
      parentSection.querySelectorAll('.code-line-target').forEach(t => t.classList.remove('highlight'));
      if (!isCurrentActive) setHighlight(true);
    });
  });
})();

/* ── 14. MISSION COMPLETION BUTTONS & PROGRESS RESET ─────── */
document.querySelectorAll('.btn-complete-mission').forEach(btn => {
  btn.addEventListener('click', () => {
    const m = +btn.dataset.mission;
    completeMission(m);
  });
});

const resetProgressBtn = document.getElementById('btn-reset-progress');
if (resetProgressBtn) {
  resetProgressBtn.addEventListener('click', () => {
    if (confirm("Reset all lesson progress and start fresh with 0 XP?")) {
      try { localStorage.removeItem('chaipay_rate_limiter_completed'); } catch(e){}
      completedMissions.clear();
      unlockedBadges.clear();
      currentXP = 0;
      quizSubmitted = false;
      challengePassed = false;
      document.querySelectorAll('.sidebar-item').forEach(btn => btn.classList.remove('done'));
      document.querySelectorAll('.btn-complete-mission').forEach((btn) => {
        const m = +btn.dataset.mission;
        btn.classList.remove('completed');
        btn.disabled = false;
        btn.textContent = `✓ Complete Mission ${m} (+${BADGES[m].xp} XP)`;
      });
      updateGamificationUI();
      const toast = document.getElementById('xp-toast');
      if (toast) {
        toast.textContent = '🔄 Progress reset to 0 XP';
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2000);
      }
    }
  });
}

/* ── 15. INITIALIZE STATE & LOGO NAVIGATION ─────────────── */
const logoEl = document.querySelector('.logo');
if (logoEl) {
  logoEl.style.cursor = 'pointer';
  logoEl.setAttribute('title', 'Back to ChaiPay Hero Overview');
  logoEl.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

loadGamificationState();
goToSection(0, false);
