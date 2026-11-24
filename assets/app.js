const DATA = window.NAV || /*__DATA__*/null;
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
                set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
const L = DATA.lessons;
const PAGE = window.PAGE || null;            // set on the separate lesson pages (multi-page site)
if (PAGE && PAGE.lesson) L[PAGE.lesson.id] = PAGE.lesson;
const ROOT = PAGE ? PAGE.root : "";
const SLUG = DATA.slugs || {};
const urlOf = id => ROOT + (id === "home" ? "" : SLUG[id] + "/") + (location.protocol === "file:" ? "index.html" : "");
let SEARCH = null;                           // id -> plain text, loaded on first search (multi-page)
function loadSearch() {
  if (SEARCH || !PAGE) return;
  SEARCH = {};
  fetch(ROOT + "assets/search.json").then(r => r.json()).then(j => { SEARCH = j; buildNav(); }).catch(() => {});
}
const order = DATA.units.flatMap(u => u.lessons);
let state = PAGE ? { id: PAGE.id, tab: "read", file: 0 } : { id: "home", tab: "read", file: 0 };
let shut = new Set(JSON.parse(store.get("ws-shut") || "[]"));
let query = "";
let navRestored = false;

/* ---------- sidebar ---------- */
function buildNav() {
  const q = query.trim().toLowerCase();
  const match = id => !q || L[id].short.toLowerCase().includes(q) || L[id].title.toLowerCase().includes(q) || ((SEARCH || {})[id] || L[id].search || "").includes(q);
  let html = "", hits = 0;
  if (!q) html += `<${PAGE ? `a href="${urlOf("home")}"` : "button"} class="item" data-go="home"><span class="ic">⌂</span>Home</${PAGE ? "a" : "button"}>
                   <${PAGE ? `a href="${urlOf("syllabus")}"` : "button"} class="item" data-go="syllabus"><span class="ic">≡</span>Syllabus</${PAGE ? "a" : "button"}>`;
  DATA.units.forEach(u => {
    const ls = u.lessons.filter(match);
    hits += ls.length;
    if (q && !ls.length) return;
    const isShut = !q && shut.has(u.label) && !u.lessons.includes(state.id);
    html += `<div class="unit${isShut ? " shut" : ""}"><button class="uhead" data-unit="${esc(u.label)}"><span class="chev">▼</span>
      <span><span class="ul">${esc(u.label)}</span><span class="un">${esc(u.name)}</span></span></button><div class="ulist">` +
      ls.map(id => {
        const l = L[id];
        return PAGE ? `<a class="item" href="${urlOf(id)}" data-go="${id}"><span>${esc(l.short)}</span></a>` : `<button class="item" data-go="${id}"><span>${esc(l.short)}</span></button>`;
      }).join("") + `</div></div>`;
  });
  $("nav").innerHTML = html;
  if (PAGE && !q && !navRestored) { navRestored = true; try { $("nav").scrollTop = +sessionStorage.getItem("ws-nav") || 0; } catch (e) {} }
  $("hits").hidden = !q;
  $("hits").textContent = hits ? `${hits} lesson${hits > 1 ? "s" : ""} found` : "Nothing found";
  markNav();
}
const markNav = () => document.querySelectorAll("nav .item").forEach(b => {
  const on = b.dataset.go === state.id;
  b.classList.toggle("on", on);
  if (on) b.scrollIntoView({ block: "nearest" });
});

/* ---------- views ---------- */
function setHead(crumb, title, tabs) {
  $("crumb").textContent = crumb;
  $("title").textContent = title;
  $("tabs").innerHTML = tabs || "";
}

function reading(html, toc) {
  const tocHtml = "";  // no "On this page" index on the right
  return `<div class="read solo"><article class="art" id="art">${html}</article>${tocHtml}</div>`;
}

function startParticles(cv) {
  if (!cv) return;
  const ctx = cv.getContext("2d"), still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let W = 0, H = 0, P = [];
  const fit = () => {
    const r = cv.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2);
    W = r.width; H = r.height; cv.width = W * d; cv.height = H * d; ctx.setTransform(d, 0, 0, d, 0, 0);
    const n = Math.min(38, Math.round(W * H / 22000));
    P = Array.from({ length: n }, () => ({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * .22, vy: -.12 - Math.random() * .28, r: .8 + Math.random() * 1.9, c: Math.random() < .3 ? "255,210,122" : "159,224,199" }));
  };
  const draw = () => {
    ctx.clearRect(0, 0, W, H);
    for (const p of P) { if (!still) { p.x += p.vx; p.y += p.vy; } if (p.y < -6) { p.y = H + 6; p.x = Math.random() * W; } if (p.x < -6) p.x = W + 6; if (p.x > W + 6) p.x = -6; }
    for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) {
      const dx = P[i].x - P[j].x, dy = P[i].y - P[j].y, d = dx * dx + dy * dy;
      if (d < 9600) { ctx.strokeStyle = `rgba(159,224,199,${(1 - d / 9600) * .28})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(P[i].x, P[i].y); ctx.lineTo(P[j].x, P[j].y); ctx.stroke(); }
    }
    for (const p of P) { ctx.fillStyle = `rgba(${p.c},.85)`; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.2832); ctx.fill(); }
  };
  fit();
  let last = 0;
  const loop = t => { if (!document.body.contains(cv)) return; if (!still && document.hidden) { requestAnimationFrame(loop); return; } if (t - last > 33) { last = t; draw(); } if (!still) requestAnimationFrame(loop); };
  draw(); if (!still) requestAnimationFrame(loop);
  if (still) addEventListener("resize", () => { if (document.body.contains(cv)) { fit(); draw(); } });
}

function render() {
  document.body.classList.toggle("home", state.id === "home");
  markNav();
  const view = $("view");
  view.scrollTop = 0;

  if (state.id === "home") {
    setHead("", "");
    const first = order[0];
    const total = DATA.units.reduce((a, u) => a + u.lessons.length, 0);
    const PEOPLE = [["Elon Musk", "Founder, xAI", "musk", "#5b7cfa"], ["Sam Altman", "CEO, OpenAI", "altman", "#10a37f"], ["Dario Amodei", "CEO, Anthropic", "amodei", "#d97757"]];
    const busts = `<div class="busts">` + PEOPLE.map(([n, r, f, c], i) => `<div class="bust b${i}" style="--pc:${c}"><div class="bhead"><img src="people/${f}.jpg" alt="" onerror="this.remove()"></div><div class="bbody"></div><div class="bname"><b>${n}</b><small>${r}</small></div></div>`).join("") + `</div>`;
    const ppl = `<img class="heroimg" src="${ROOT}people/hero.webp" alt="">`;
    let html = `<div class="cover"><section class="hero"><div class="aurora"><i></i><i></i><i></i></div><canvas class="hbg"></canvas><div class="hero-l"><h1 class="ctitle">Generative AI</h1>
      <p class="tagline">From your first <b class="t1">LLM call</b><br>to <b class="t2">RAG apps</b> and<br><b class="t3">agents that remember.</b></p>
      </div>
      <div class="hero-r">${ppl}</div>
</section>`;
    view.innerHTML = html + `</div>`;
    startParticles(view.querySelector(".hbg"));
    return;
  }

  if (state.id === "syllabus") {
    setHead("Course", "Syllabus");
    let n = 0;
    view.innerHTML = `<div class="syltable">` + DATA.units.map(u => `<div class="syl-col"><div class="syl-h"><h3>${esc(u.name)}</h3><p>${esc(u.q || "")}</p></div><ol>` +
      u.lessons.map(id => (L[id].sub ? `<li class="syl-sub">${esc(L[id].sub)}</li>` : "") + `<li><button data-go="${id}"><span>${++n}</span><div><b>${esc(L[id].short)}</b>${L[id].info ? `<em>${esc(L[id].info)}</em>` : ""}</div></button></li>`).join("") + `</ol></div>`).join("") + `</div>`;
    return;
  }

  if (state.id === "roadmap") {
    setHead("Course", DATA.roadmap.title);
    view.innerHTML = reading(DATA.roadmap.html, DATA.roadmap.toc);
    watchToc();
    renderMath();
    return;
  }

  const l = L[state.id];
  if (!l) { state.id = "home"; return render(); }
  const tabs = [l.slides ? ["slides", "Notes"] : null, ["read", l.slides ? "Reference" : "Notes"], l.code.length ? ["code", "Code"] : null].filter(Boolean);
  if (!tabs.some(([k]) => k === state.tab)) state.tab = tabs[0][0];
  setHead(`${l.unit} · ${l.pos} of ${l.of}`, l.title,
    tabs.length > 1 ? tabs.map(([k, n]) => `<button class="${state.tab === k ? "on" : ""}" data-tab="${k}">${n}</button>`).join("") : "");

  if (state.tab === "read") {
    const i = order.indexOf(l.id), prev = L[order[i - 1]], next = L[order[i + 1]];
    view.innerHTML = reading(l.html, l.toc);
    watchToc();
    renderMath();
    drawDiagrams();
  } else if (state.tab === "slides") {
    const i = order.indexOf(l.id), prev = L[order[i - 1]], next = L[order[i + 1]];
    const cards = `<div class="slbar"><span>${l.slideCount} slides</span><button class="btn" id="present">Present ▶</button></div><div class="slcards">` +
      Array.from({ length: l.slideCount }, (_, k) => `<div class="slcard"><iframe loading="lazy" tabindex="-1" src="${l.slides}?embed#${k + 1}" title="slide ${k + 1}"></iframe></div>`).join("") + `</div>`;
    view.innerHTML = reading(cards, []) + `<div class="pn">` +
      (prev ? `<button data-go="${prev.id}"><small>← Previous</small><b>${esc(prev.short)}</b></button>` : "") +
      (next ? `<button class="nx" data-go="${next.id}"><small>Next →</small><b>${esc(next.short)}</b></button>` : "") + `</div>`;
    $("present").onclick = presentFs;
  } else if (state.tab === "code") {
    const i = Math.min(state.file, l.code.length - 1), f = l.code[i];
    view.innerHTML = `<div class="editor"><div class="ebar"><span class="dots"><i></i><i></i><i></i></span>` +
      l.code.map((c, k) => `<button class="ftab${k === i ? " on" : ""}" data-file="${k}">${esc(c.name)}</button>`).join("") +
      `<button class="copy" id="copy">Copy</button></div><div class="ebody">${f.html}</div></div>`;
    $("copy").onclick = () => {
      const done = () => { $("copy").textContent = "Copied ✓"; setTimeout(() => $("copy") && ($("copy").textContent = "Copy"), 1200); };
      if (navigator.clipboard) navigator.clipboard.writeText(f.text).then(done, () => {}); else done();
    };
  }
}

/* diagrams: Mermaid when online, the original ASCII when the library is not available */
let mmdReady = false, mmdFailed = false;
function drawDiagrams() {
  const nodes = [...document.querySelectorAll("pre.mermaid:not([data-processed])")];
  if (!nodes.length) return Promise.resolve();
  if (mmdFailed) { nodes.forEach(n => showAscii(n.closest(".diagram"))); return Promise.resolve(); }
  if (!mmdReady) return Promise.resolve();
  return mermaid.run({ nodes }).catch(() => nodes.forEach(n => showAscii(n.closest(".diagram"))));
}
function showAscii(fig, on = true) {
  fig.classList.toggle("off", on);
  fig.querySelector(".dg-ascii").hidden = !on;
}
$("mmd").onload = () => {
  mermaid.initialize({ startOnLoad: false, securityLevel: "loose", theme: "base", flowchart: { curve: "basis", padding: 12, nodeSpacing: 28, rankSpacing: 34 },
    themeVariables: { fontFamily: "Segoe UI, Arial, sans-serif", fontSize: "16px", primaryColor: "#ffffff", primaryBorderColor: "#1a5c5b",
      primaryTextColor: "#10302f", lineColor: "#2a7a79", clusterBkg: "#ffffff", clusterBorder: "#9fcfce", edgeLabelBackground: "#eef7f7",
      tertiaryColor: "#ffffff" } });
  mmdReady = true; drawDiagrams();
};
$("mmd").onerror = () => { mmdFailed = true; drawDiagrams(); };

/* math: KaTeX when online, the TeX text when not */
function renderMath() {
  if (!window.katex) return;
  document.querySelectorAll(".math:not([data-done])").forEach(el => {
    el.dataset.done = "1";
    try { katex.render(el.textContent, el, { displayMode: el.classList.contains("display"), throwOnError: false }); } catch (e) {}
  });
}
$("ktx").onload = renderMath;

/* highlight the section being read in "On this page" */
function watchToc() {
  const links = [...document.querySelectorAll(".toc a")];
  const view = $("view");
  view.onscroll = null;
  if (!links.length) return;
  const heads = links.map(a => document.getElementById(a.dataset.to)).filter(Boolean);
  const update = () => {
    let cur = heads[0];
    for (const h of heads) if (h.getBoundingClientRect().top - view.getBoundingClientRect().top < 140) cur = h;
    links.forEach(a => a.classList.toggle("on", cur && a.dataset.to === cur.id));
  };
  view.onscroll = update;
  update();
}

/* ---------- actions ---------- */
function toolboxReveal(btn) {
  const box = btn.closest(".tbx");
  const blocks = [...box.querySelectorAll(".blk")].sort((x, y) => +x.dataset.n - +y.dataset.n);
  const mode = btn.dataset.reveal;
  if (mode === "hide") blocks.forEach(b => b.classList.add("hid"));
  else if (mode === "all") blocks.forEach(b => b.classList.remove("hid"));
  else { const nx = blocks.find(b => b.classList.contains("hid")); if (nx) nx.classList.remove("hid"); }
}
function present() {
  const deck = $("deck");
  if (!deck) return;
  (deck.requestFullscreen ? deck.requestFullscreen() : Promise.resolve()).then(() => { try { deck.contentWindow.focus(); } catch (e) {} });
}
const isMobile = () => matchMedia("(max-width: 860px)").matches;
function toggleSide(force) {
  if (isMobile()) { document.body.classList.toggle("menu"); return; }
  const closed = force !== undefined ? force : !document.body.classList.contains("closed");
  document.body.classList.toggle("closed", closed);
  store.set("ws-side", closed ? "closed" : "open");
}
function presentFs() {
  const l = L[state.id];
  const f = document.createElement("iframe"); f.id = "fsdeck"; f.src = l.slides; f.allow = "fullscreen";
  const x = document.createElement("button"); x.id = "fsx"; x.textContent = "Close ✕";
  const close = () => { f.remove(); x.remove(); if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); };
  x.onclick = close;
  document.body.append(f, x);
  f.onload = () => { try { f.contentWindow.focus(); } catch (e) {} };
  (f.requestFullscreen ? f.requestFullscreen() : Promise.resolve()).catch(() => {});
  const onfs = () => { if (!document.fullscreenElement) { close(); document.removeEventListener("fullscreenchange", onfs); } };
  setTimeout(() => document.addEventListener("fullscreenchange", onfs), 400);
}
function setFocus(on) {
  document.body.classList.toggle("focus", on);
  $("focus").classList.toggle("on", on);
  if (on && !document.fullscreenElement && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
  if (!on && document.fullscreenElement === document.documentElement) document.exitFullscreen().catch(() => {});
}
document.addEventListener("fullscreenchange", () => {
  if (!document.fullscreenElement && document.body.classList.contains("focus")) setFocus(false);
});
function toggleBig(force) {
  const big = force !== undefined ? force : !document.body.classList.contains("big");
  document.body.classList.toggle("big", big);
  store.set("ws-big", big ? "1" : "0");
}
function save() {
  if (PAGE) return;
  location.hash = state.id + (L[state.id] && state.tab !== "read" ? "/" + state.tab : "");
  store.set("ws-last", location.hash);
}
function go(id) {
  document.body.classList.remove("menu");
  if (PAGE) { try { sessionStorage.setItem("ws-nav", $("nav").scrollTop); } catch (e) {} location.assign(urlOf(id)); return; }
  state = { id, tab: L[id] && L[id].slides ? "slides" : "read", file: 0 };
  save(); buildNav(); render();
}

document.addEventListener("click", e => {
  const rv = e.target.closest("[data-reveal]");
  if (rv) { e.preventDefault(); return toolboxReveal(rv); }
  const cf = e.target.closest("[data-codefile]");
  if (cf) { e.preventDefault(); state.tab = "code"; state.file = +cf.dataset.codefile; save(); return render(); }
  if (e.target.closest("[data-side]")) return toggleSide();
  const g = e.target.closest("[data-go]");
  if (g) { if (PAGE && (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1)) return; e.preventDefault(); return go(g.dataset.go); }
  const u = e.target.closest("[data-unit]");
  if (u) { const k = u.dataset.unit; shut.has(k) ? shut.delete(k) : shut.add(k); store.set("ws-shut", JSON.stringify([...shut])); u.parentElement.classList.toggle("shut"); return; }
  const t = e.target.closest("[data-tab]");
  if (t) { state.tab = t.dataset.tab; state.file = 0; save(); return render(); }
  const f = e.target.closest("[data-file]");
  if (f) { state.file = +f.dataset.file; return render(); }
  const a = e.target.closest("[data-to]");
  if (a) { e.preventDefault(); const h = document.getElementById(a.dataset.to); if (h) h.scrollIntoView({ block: "start", behavior: "smooth" }); }
});
$("q").addEventListener("input", e => { query = e.target.value; if (e.target.value) loadSearch(); buildNav(); });
$("big").onclick = () => toggleBig();
$("focus").onclick = () => setFocus(!document.body.classList.contains("focus"));
document.addEventListener("keydown", e => {
  if (e.target.tagName === "INPUT" || e.ctrlKey || e.metaKey || e.altKey) return;
  const k = e.key.toLowerCase();
  if (k === "s") toggleSide();
  if (k === "a") toggleBig();
  if (k === "f" && state.id !== "home") setFocus(!document.body.classList.contains("focus"));
  if (k === "p" && state.tab === "slides" && L[state.id] && L[state.id].slides) presentFs();
  if (k === "/") { e.preventDefault(); if (document.body.classList.contains("closed")) toggleSide(false); $("q").focus(); }
  if (state.tab === "read" && L[state.id] && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
    const i = order.indexOf(state.id), n = order[i + (e.key === "ArrowRight" ? 1 : -1)];
    if (n) go(n);
  }
});

if (PAGE) {
  const oh = location.hash.replace(/^#/, "").split("/")[0];       // old links like site/#n05 open the lesson page
  if (PAGE.id === "home" && oh && SLUG[oh]) location.replace(urlOf(oh));
} else {
  const [hid, htab] = (location.hash || store.get("ws-last") || "").replace(/^#/, "").split("/");
  if (hid && (hid === "home" || hid === "roadmap" || hid === "syllabus" || L[hid])) state = { id: hid, tab: htab || "", file: 0 };
}
if (store.get("ws-side") === "closed" && !isMobile()) toggleSide(true);
$("mbtn").addEventListener("click", () => document.body.classList.add("menu"));
$("scrim").addEventListener("click", () => document.body.classList.remove("menu"));
if (store.get("ws-big") === "1") toggleBig(true);
buildNav();
render();
addEventListener("pagehide", () => { if (PAGE) { try { sessionStorage.setItem("ws-nav", $("nav").scrollTop); } catch (e) {} } });

/* share the current lesson (opens the phone's share sheet, with WhatsApp); falls back to a WhatsApp link */
$("share").addEventListener("click", async () => {
  const title = ($("title").textContent || "Generative AI") + " · Generative AI notes", url = location.href;
  if (navigator.share) { try { await navigator.share({ title, text: title, url }); return; } catch (e) { if (e && e.name === "AbortError") return; } }
  window.open("https://wa.me/?text=" + encodeURIComponent(title + " " + url), "_blank", "noopener");
});

/* copy button on every code block */
(function () {
  const ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2.5"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/></svg>';
  const OK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  const copyText = t => navigator.clipboard && window.isSecureContext ? navigator.clipboard.writeText(t) : new Promise(res => { const a = document.createElement("textarea"); a.value = t; a.style.cssText = "position:fixed;opacity:0"; document.body.appendChild(a); a.select(); try { document.execCommand("copy"); } catch (e) {} a.remove(); res(); });
  function add() {
    document.querySelectorAll(".hl").forEach(h => {
      if (h.querySelector(":scope > .cpy")) return;
      const b = document.createElement("button");
      b.type = "button"; b.className = "cpy"; b.title = "Copy code"; b.setAttribute("aria-label", "Copy code"); b.innerHTML = ICON + "<span>Copy</span>";
      b.addEventListener("click", e => {
        e.stopPropagation();
        const pre = h.querySelector("td.code pre") || h.querySelector("pre");
        copyText(pre ? pre.innerText.replace(/\s+$/, "") : "").then(() => { b.classList.add("ok"); b.innerHTML = OK + "<span>Copied</span>"; setTimeout(() => { b.classList.remove("ok"); b.innerHTML = ICON + "<span>Copy</span>"; }, 1600); });
      });
      h.addEventListener("scroll", () => { b.style.transform = "translateX(" + h.scrollLeft + "px)"; }, { passive: true });
      h.appendChild(b);
    });
  }
  let q = 0; new MutationObserver(() => { if (!q) q = requestAnimationFrame(() => { q = 0; add(); }); }).observe(document.body, { childList: true, subtree: true });
  add();
})();
