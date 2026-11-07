# ☕ ChaiPay Engineering: Rate Limiter Masterclass with Bouncer Bhaiya

An interactive, gamified **45-minute self-paced masterclass** on designing production-grade rate limiters using the **Token Bucket** and **Sliding Window** algorithms. Built specifically for instructional excellence, technical accuracy, and delightful hands-on interactivity.

**Tech Stack:** Pure HTML5 + CSS3 + Vanilla JavaScript — **zero build tools, zero external dependencies**, deployable straight to **GitHub Pages**.

---

## 🎯 Learning Objectives

By the end of this 45-minute masterclass, learners will be able to:
1. **Diagnose and Mitigate API Collapses:** Explain why unprotected endpoints crash under automated bot attacks, credential-stuffing floods, and Tatkal flash surges.
2. **Implement Rate Limiting Algorithms from Scratch:** Code both the **Token Bucket** (with O(1) memory lazy refill) and **Sliding Window** (Log vs. Counter weighted approximation) algorithms in pure JavaScript.
3. **Architect Distributed Production Limiters:** Design multi-server rate limiters using centralized **Redis**, understand atomic operations via **Lua scripts**, and handle standard `HTTP 429 Too Many Requests` response headers (`Retry-After`, `X-RateLimit-*`).

---

## 🎭 The Story: Welcome to ChaiPay!

You are a newly minted backend engineering intern at **ChaiPay** — India's fastest-growing UPI payments app. On your very first morning, an attacker launches a credential-stuffing assault, firing **10,000 requests per second** at the `/api/login` endpoint.

Your mentor is **Bouncer Bhaiya** — ChaiPay's seasoned head of security operations. Through desi-relatable analogies, he guides you step-by-step:
- **The IRCTC Tatkal Rush:** Why clock boundaries break simple window limiters.
- **The Cutting Chai & Canteen Token:** How physical tokens allow natural bursts while maintaining a steady refill rate.
- **The Metro Station AFC Gate:** How turnstiles reject overflow with instant sensory feedback (`HTTP 429`).

---

## ⏱️ 45-Minute Lesson Timeline & Mission Structure

The lesson is structured as 7 tactical missions with an interactive roadmap, XP counter, unlockable badges, and 2 bonus sandbox sections:

| Mission | Time | Topic & Hands-on Activities | Badges & XP |
|---|---|---|---|
| **Mission 0** | 0–4 min | 🚨 **The 10,000 Req/s Login Attack**<br>Live animated server load simulator comparing unprotected server crash vs. rate-limited protection. | 🛡️ Bouncer Rookie (+50 XP) |
| **Mission 1** | 4–9 min | 🚦 **Rate Limiting 101**<br>Metro turnstile analogy, HTTP 429 status code, and common `Retry-After` (standard) / `X-RateLimit-*` (convention) headers. | 🎟️ Gatekeeper (+75 XP) |
| **Mission 2** | 9–19 min | 🪣 **Token Bucket Algorithm**<br>Interactive animated bucket simulator (capacity & refill sliders), "Predict the Output" puzzle, and 7-step lazy refill code walkthrough. | 🪣 Token Master (+125 XP) |
| **Mission 3** | 19–29 min | 🪟 **Sliding Window & Boundary Burst**<br>Fixed Window vulnerability demo, side-by-side timeline comparator (Log vs. Counter), and 7-step code walkthrough. | 🪟 Window Wizard (+150 XP) |
| **Mission 4** | 29–34 min | 📊 **Comparison & Architectural Decision**<br>Comprehensive comparison table + ChaiPay production scenario picker.<br>*Includes 🥊 **Bonus Section:** Rate Limiter Battle Arena mini-game.* | ⚖️ System Architect (+75 XP) |
| **Mission 5** | 34–39 min | 🌐 **Production Distributed Redis**<br>Express.js Token Bucket middleware, stale key memory leak prevention, and atomic Redis Lua scripts (`current == 1` TTL guard). | ⚡ Cloud Master (+100 XP) |
| **Mission 6** | 39–45 min | 🧠 **Bouncer Academy Finals**<br>5-question MCQ quiz with instant feedback and 3-step progressive hints coding challenge.<br>*Includes 📌 **Bonus Section:** Printable Rate Limiter Cheat Sheet card.* | 🏆 Chief Bouncer (+125 XP) |

---

## 🎮 Key Interactive Features & Mini-Games

- **🥊 Rate Limiter Battle Arena (Mission 4):** Simultaneously unleashes real-world traffic patterns (*Steady Traffic*, *Sudden Burst*, *Boundary Attack*) against all 4 algorithms. Watch Fixed Window leak 2x traffic while Sliding Window Log and Counter block the attack!
- **🎛️ Animated Token Bucket Simulator (Mission 2):** Live SVG water/token filling, sliders for capacity and refill rate, single request & burst triggers, and live request log.
- **🔬 Side-by-Side Timeline Comparator (Mission 3):** Demonstrates boundary burst penetration at $t = 900\text{ms}$ and $t = 1100\text{ms}$.
- **📝 Instant-Feedback Quiz (Mission 6):** Answers stay hidden until clicked. Immediately highlights correct/wrong selections, displays a plain-English explanation, and shares Bouncer Bhaiya's humorous reaction. Unlocks confetti on score $\ge 4/5$.
- **💡 3 Progressive Hints Coding Challenge (Mission 6):** In-browser code editor with progressive hints unlocking on demand before revealing the full reference solution.
- **📌 Rate Limiter Cheat Sheet Card (Mission 6):** Comprehensive summary table comparing all 4 algorithms, with **"Copy Markdown"** and **"Print / Save PDF"** buttons.
- **👶 ELI5 Mode Toggles:** Toggle between *"Senior Dev View"* and *"Explain Like I'm 5"* in Missions 2 and 3.

---

## 🚀 How to Run Locally

### Option A: Direct File Open (Zero Setup)
Simply double-click `index.html` or open it directly in any modern browser (Chrome, Firefox, Safari, Edge).

### Option B: Local HTTP Server
```bash
# Using Python 3 (built-in)
python -m http.server 8080

# OR using Node.js
npx serve .
```
Navigate to `http://localhost:8080` in your web browser.

### Option C: Run the Production Node.js Server Example
A standalone runnable HTTP server showcasing the **Token Bucket** algorithm with response headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `Retry-After`) and background memory cleanup:
```bash
# Start the example server on http://localhost:3000
node examples/server.js

# In another terminal, trigger HTTP 429 with 8 rapid requests:
# On Linux / Mac / Git Bash:
for i in {1..8}; do curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/pay; done

# On PowerShell:
1..8 | ForEach-Object { (Invoke-WebRequest -Uri "http://localhost:3000/api/pay" -SkipHttpErrorCheck).StatusCode }
```
You will observe five `200 OK` responses followed by immediate `429 Too Many Requests` responses with `Retry-After` headers!

---

## 🌐 How to Deploy to GitHub Pages

Because this project uses vanilla HTML, CSS, and JavaScript with zero build steps or bundlers, deploying to GitHub Pages takes under 1 minute:

1. Push your repository to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Deploy ChaiPay Rate Limiter Masterclass"
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git branch -M main
   git push -u origin main
   ```
2. On GitHub, navigate to your repository's **Settings** tab.
3. In the left sidebar, click **Pages**.
4. Under **Build and deployment**:
   - Source: **Deploy from a branch**
   - Branch: **`main`** / Folder: **`/ (root)`**
5. Click **Save**. Your site will be live at `https://<your-username>.github.io/<your-repo-name>/` in ~30 seconds!

---

## 🧪 Automated Test Suite

All algorithm implementations in [`js/ratelimiter.js`](js/ratelimiter.js) are shared directly between the frontend UI simulators, the in-browser code evaluator, and the automated Node.js test runners:

```bash
# 1. Run core algorithm unit tests (17 tests)
node tests/ratelimiter.test.js

# 2. Run browser simulation & integration tests (24 tests)
node scratch/browser-sim-test.js

# 3. Run feature polish test suite (5 tests)
node scratch/feature-polish-test.js

# 4. Run UI polish & gamification test suite (10 tests)
node scratch/ui-polish-fixes-test.js
```

**All 56 automated tests pass with 100% success rate.**

---

## ♿ Accessibility & Device Responsiveness

- **Keyboard Navigation:** Full support for Arrow keys (`←` / `→` or `[` / `]`) to navigate missions, `Tab` and `Enter` for all interactive widgets.
- **Screen Reader Friendly:** Built with semantic HTML5 landmarks, ARIA live regions, `role="progressbar"`, and `role="tablist"`.
- **Fully Responsive:** Tested across mobile (375px), tablet (768px), and desktop (1440px) screen widths.
- **Reduced Motion:** Fully complies with `prefers-reduced-motion: reduce` by disabling non-essential transitions and floating animations.

---

## 📂 Project Structure

```
Rate Limiter/
├── index.html              # ChaiPay Masterclass single-page app (Hero + 7 Missions)
├── style.css               # Neo-brutalist theme, responsive layouts & print styles
├── script.js               # Simulators, gamification, confetti, Battle Arena & tests
├── README.md               # Complete course documentation
├── js/
│   └── ratelimiter.js      # UMD algorithm implementations (Node.js & browser shared)
├── examples/
│   └── server.js           # Runnable Node.js HTTP server with Token Bucket & 429 headers
└── tests/
    └── ratelimiter.test.js # Deterministic Node.js unit tests with fake clock
```

---

## 📜 License

Created for educational use. Feel free to use and adapt this lesson for system design workshops and frontend/backend engineering training!
