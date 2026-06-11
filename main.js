/* ============================================================
   Isaac Colomer Casas — Interactive CV  ·  vanilla JS
   ============================================================ */
(function () {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;
  document.documentElement.classList.remove("no-js");

  /* ----------------------------------------------------------
     DATA — swap these out for your own details
  ---------------------------------------------------------- */
  const SKILLS = [
    { name: "Computer Vision & Automation", lvl: 84, tags: ["Python", "Computer Vision", "Containers", "Test Automation"] },
    { name: "Gameplay Engineering", lvl: 90, tags: ["C#", "C++", "Unity", "Unreal Engine"] },
    { name: "Languages", lvl: 86, tags: ["C", "C++", "C#", "Python"] },
    { name: "Game & Level Design", lvl: 82, tags: ["Systems", "Level Design", "Playtesting"] },
    { name: "QA & Validation", lvl: 80, tags: ["Software Validation", "Documentation", "Reliability"] },
    { name: "Interactive Web", lvl: 74, tags: ["HTML", "CSS", "JavaScript", "UI State"] },
  ];

  const WORK = [
    {
      kind: "Computer Vision", title: "Mindsight — Medical Ultrasound Platform",
      desc: "Real-time medical-imaging platform: a PySide6 desktop debugger for model execution and doctor-mode QA, a Next.js auto-labeler for clinical review, and validation scripts that measure Dice/IoU segmentation accuracy against expert annotations.",
      stack: ["Python", "PySide6", "ONNX / CUDA", "Next.js", "Azure"],
    },
    {
      kind: "Game", game: true, title: "Lights Out",
      desc: "Indie Dev Game Jam entry — owned programming and bug fixing, reproducing and squashing issues fast under jam constraints.",
      stack: ["Game Jam", "Programming"],
      link: { url: "https://osvak.itch.io/lights-out", label: "itch.io ↗" },
    },
    {
      kind: "Game", game: true, title: "Final Degree Work",
      desc: "A first-person walking simulator built in Unreal Engine 5.1, focused on environmental narrative where design intent and technical execution reinforce each other.",
      stack: ["Unreal Engine 5.1", "Walking Sim"],
      link: { url: "https://www.youtube.com/watch?v=aa2Q2_MgMjY", label: "Watch ↗" },
    },
    {
      kind: "VR Game", game: true, title: "Màscares & Marquesos",
      desc: "VR experience built in Unity and optimized for Quest 2, commissioned by the Generalitat de Catalunya — performance-conscious work within tight hardware constraints.",
      stack: ["Unity", "VR", "Quest 2"],
      link: { url: "https://github.com/Makinilla-maker/Giravolt2023", label: "GitHub ↗" },
    },
    {
      kind: "Design", title: "Dune Fremen's Rising",
      desc: "Level design and creative direction for a project built in a student-made engine — layout, pacing, and direction from concept to playable.",
      stack: ["Level Design", "Creative Direction"],
      link: { url: "https://shorturl.at/hqtAC", label: "Info ↗" },
    },
    {
      kind: "Game", game: true, title: "Summer Game",
      desc: "A small, atmospheric experience-design project — a focused week of building mood and feel.",
      stack: ["Atmosphere", "Experience Design"],
      link: { url: "https://isaacolomer.itch.io/summer-game", label: "Play ↗" },
    },
  ];

  const TIMELINE = [
    { year: "2025 — now", role: "Software Developer", org: "Mindsight Ventures", desc: "Designing and implementing data-driven features and automation tools across internal products with Python, containerized environments, and automated data pipelines — improving test automation, data processing, and prototyping." },
    { year: "Aug 2025 — Oct 2025", role: "Software Developer Intern", org: "Mindsight Ventures", desc: "Supported research and prototyping, building internal tools and improving automation workflows. Contributed to early-stage prototypes, data-handling scripts, and test environments." },
    { year: "2023 — 2024", role: "Test Engineer", org: "GLI", desc: "Executed comprehensive software validation for regulatory compliance and correct functionality, coordinated with global teams, maintained validation documentation, and optimized testing processes for reliability and throughput." },
    { year: "2021", role: "Teacher & Mentor", org: "Innvideogames", desc: "Taught programming, Unity development, and game design fundamentals; mentored students on gameplay systems, level design, and code architecture from concept to polished prototype." },
  ];

  /* ----------------------------------------------------------
     Boot loader
  ---------------------------------------------------------- */
  const boot = document.getElementById("boot");
  (function runBoot() {
    if (reduceMotion) { boot.classList.add("is-done"); return; }
    const lines = [...document.querySelectorAll("[data-boot]")];
    const bar = document.getElementById("bootBar");
    const pct = document.getElementById("bootPct");
    lines.forEach((l, i) => setTimeout(() => l.classList.add("show"), 150 + i * 230));
    let p = 0;
    const tick = setInterval(() => {
      p += Math.random() * 16 + 6;
      if (p >= 100) { p = 100; clearInterval(tick); setTimeout(() => boot.classList.add("is-done"), 350); }
      bar.style.width = p + "%";
      pct.textContent = Math.floor(p) + "%";
    }, 130);
  })();

  /* ----------------------------------------------------------
     Custom cursor (pointer-fine only)
  ---------------------------------------------------------- */
  if (finePointer && !reduceMotion) {
    document.body.classList.add("has-cursor");
    const dot = document.getElementById("cursorDot");
    const ring = document.getElementById("cursorRing");
    let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
    addEventListener("mousemove", (e) => {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%)`;
    });
    (function loop() {
      rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18;
      ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
      requestAnimationFrame(loop);
    })();
    const hoverSel = "a, button, .skill, .card, [data-magnetic]";
    document.querySelectorAll(hoverSel).forEach((el) => {
      el.addEventListener("mouseenter", () => ring.classList.add("is-hover"));
      el.addEventListener("mouseleave", () => ring.classList.remove("is-hover"));
    });
  }

  /* ----------------------------------------------------------
     Hero particle field (constellation reacting to cursor)
  ---------------------------------------------------------- */
  (function field() {
    const canvas = document.getElementById("field");
    const ctx = canvas.getContext("2d");
    let w, h, dpr, particles = [];
    const pointer = { x: -9999, y: -9999 };

    function resize() {
      dpr = Math.min(devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(110, Math.floor((w * h) / 14000));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35,
        r: Math.random() * 1.6 + 0.6,
      }));
    }
    resize();
    addEventListener("resize", resize);
    canvas.addEventListener("mousemove", (e) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = e.clientX - rect.left; pointer.y = e.clientY - rect.top;
    });
    canvas.addEventListener("mouseleave", () => { pointer.x = -9999; pointer.y = -9999; });

    const accent = "255,31,61";
    function frame() {
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        // drift
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        // cursor repulsion
        const dx = p.x - pointer.x, dy = p.y - pointer.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 14000) {
          const d = Math.sqrt(d2) || 1;
          const force = (1 - d / 120) * 1.6;
          p.x += (dx / d) * force; p.y += (dy / d) * force;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${accent},0.55)`;
        ctx.fill();
      }
      // links
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i], b = particles[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 11000) {
            const o = (1 - d2 / 11000) * 0.32;
            ctx.strokeStyle = `rgba(${accent},${o})`;
            ctx.lineWidth = 0.6;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }
      // pointer halo
      if (pointer.x > -9000) {
        ctx.beginPath();
        ctx.arc(pointer.x, pointer.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${accent},0.9)`;
        ctx.fill();
      }
      requestAnimationFrame(frame);
    }
    if (!reduceMotion) frame();
    else { resize(); }
  })();

  /* ----------------------------------------------------------
     Per-section interactive backgrounds
     One canvas per section (data-fx), only animated while in view.
     Palette: signal red / runner orange / portal blue on hairline gray.
  ---------------------------------------------------------- */
  (function sectionFX() {
    const RED = "255,31,61", ORANGE = "255,122,24", BLUE = "43,180,255", LINE = "150,158,170";
    const canvases = [...document.querySelectorAll("canvas.sfx")];
    if (!canvases.length) return;

    // viewport pointer; mapped into each canvas's local space per frame
    const ptr = { x: -9999, y: -9999 };
    addEventListener("mousemove", (e) => { ptr.x = e.clientX; ptr.y = e.clientY; }, { passive: true });
    addEventListener("mouseout", (e) => { if (!e.relatedTarget) { ptr.x = -9999; ptr.y = -9999; } });

    /* ---- effects: each is { init(state), frame(state, p) } ---- */
    const FX = {
      // ABOUT — clean architectural beams converging on a cursor-led vanishing point
      beams: {
        init(s) { s.d = { n: 16 }; },
        frame(s, p) {
          const { ctx, w, h } = s; ctx.clearRect(0, 0, w, h);
          const tx = p.on ? p.x : w * 0.5, ty = p.on ? p.y : h * 0.45;
          const vx = w * 0.5 + (tx - w * 0.5) * 0.14;
          const vy = h * 0.42 + (ty - h * 0.45) * 0.14;
          for (let i = 0; i <= s.d.n; i++) {
            const accent = i % 8 === 0;
            ctx.beginPath();
            ctx.moveTo((i / s.d.n) * w, h);
            ctx.lineTo(vx, vy);
            ctx.strokeStyle = accent ? `rgba(${RED},0.16)` : `rgba(${LINE},0.40)`;
            ctx.lineWidth = accent ? 1.4 : 0.6;
            ctx.stroke();
          }
          const g = ctx.createRadialGradient(vx, vy, 0, vx, vy, 170);
          g.addColorStop(0, `rgba(${RED},0.10)`); g.addColorStop(1, `rgba(${RED},0)`);
          ctx.fillStyle = g; ctx.fillRect(vx - 170, vy - 170, 340, 340);
        }
      },
      // SKILLS — equalizer bars; bars near the cursor spike and turn accent
      bars: {
        init(s) { const count = Math.max(20, Math.floor(s.w / 32)); s.d = { count, ph: Array.from({ length: count }, (_, i) => i * 0.6) }; },
        frame(s, p) {
          const { ctx, w, h } = s; ctx.clearRect(0, 0, w, h);
          const { count, ph } = s.d, bw = w / count, t = s.t * 0.002;
          for (let i = 0; i < count; i++) {
            const x = i * bw;
            let height = (Math.sin(t + ph[i]) * 0.5 + 0.5) * h * 0.16 + 6;
            let col = `rgba(${LINE},0.5)`;
            if (p.on) {
              const infl = Math.max(0, 1 - Math.abs((x + bw / 2) - p.x) / 170);
              height += infl * h * 0.34;
              if (infl > 0.12) col = `rgba(${RED},${0.25 + infl * 0.55})`;
            }
            ctx.fillStyle = col;
            ctx.fillRect(x + bw * 0.22, h - height, bw * 0.56, height);
          }
        }
      },
      // WORK — portal dot-grid with a blue spotlight that follows the cursor
      grid: {
        init(s) { s.d = { gap: 38 }; },
        frame(s, p) {
          const { ctx, w, h } = s; ctx.clearRect(0, 0, w, h);
          const gap = s.d.gap;
          for (let y = gap / 2; y < h; y += gap) {
            for (let x = gap / 2; x < w; x += gap) {
              let r = 1.1, a = 0.45, col = LINE;
              if (p.on) {
                const infl = Math.max(0, 1 - Math.hypot(x - p.x, y - p.y) / 190);
                r += infl * 2.4; a = 0.4 + infl * 0.6;
                if (infl > 0.1) col = BLUE;
              }
              ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
              ctx.fillStyle = `rgba(${col},${a})`; ctx.fill();
            }
          }
          if (p.on) {
            const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 210);
            g.addColorStop(0, `rgba(${BLUE},0.10)`); g.addColorStop(1, `rgba(${BLUE},0)`);
            ctx.fillStyle = g; ctx.fillRect(p.x - 210, p.y - 210, 420, 420);
          }
        }
      },
      // PATH — vertical "runner" speed streaks; the cursor bends nearby streaks
      streaks: {
        init(s) {
          const n = Math.max(28, Math.floor(s.w / 24));
          s.d = { items: Array.from({ length: n }, () => ({ x: Math.random() * s.w, y: Math.random() * s.h, len: 18 + Math.random() * 64, sp: 1.4 + Math.random() * 3 })) };
        },
        frame(s, p) {
          const { ctx, w, h } = s; ctx.clearRect(0, 0, w, h);
          for (const it of s.d.items) {
            it.y += it.sp;
            if (p.on) { const infl = Math.max(0, 1 - Math.abs(it.x - p.x) / 200); it.x += infl * (it.x < p.x ? -0.9 : 0.9); }
            if (it.y - it.len > h) { it.y = -it.len; it.x = Math.random() * w; }
            const fast = it.sp > 3.2;
            ctx.strokeStyle = fast ? `rgba(${ORANGE},0.5)` : `rgba(${LINE},0.45)`;
            ctx.lineWidth = fast ? 1.4 : 0.8;
            ctx.beginPath(); ctx.moveTo(it.x, it.y - it.len); ctx.lineTo(it.x, it.y); ctx.stroke();
          }
        }
      },
      // CONTACT — portal ripples emanating from the cursor (+ an ambient pulse)
      ripples: {
        init(s) { s.d = { rings: [], lastSpawn: -9999, lastP: { x: 0, y: 0 } }; },
        frame(s, p) {
          const { ctx, w, h } = s; ctx.clearRect(0, 0, w, h);
          const d = s.d;
          if (p.on && Math.hypot(p.x - d.lastP.x, p.y - d.lastP.y) > 42 && s.t - d.lastSpawn > 130) {
            d.rings.push({ x: p.x, y: p.y, r: 4, max: 120 + Math.random() * 90, c: Math.random() < 0.5 ? BLUE : ORANGE });
            d.lastSpawn = s.t; d.lastP = { x: p.x, y: p.y };
          }
          if (s.t - (d.lastAmbient || 0) > 1700) { d.rings.push({ x: w * 0.5, y: h * 0.5, r: 4, max: 240, c: BLUE }); d.lastAmbient = s.t; }
          d.rings = d.rings.filter((r) => r.r < r.max);
          for (const r of d.rings) {
            r.r += 1.7;
            ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(${r.c},${(1 - r.r / r.max) * 0.5})`; ctx.lineWidth = 1.2; ctx.stroke();
          }
          if (p.on) { ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fillStyle = `rgba(${BLUE},0.85)`; ctx.fill(); }
        }
      }
    };

    const items = canvases.map((canvas) => {
      const ctx = canvas.getContext("2d");
      const s = { canvas, ctx, w: 0, h: 0, t: 0, active: false, def: FX[canvas.dataset.fx], d: null };
      s.resize = function () {
        const dpr = Math.min(devicePixelRatio || 1, 2);
        s.w = canvas.clientWidth; s.h = canvas.clientHeight;
        canvas.width = s.w * dpr; canvas.height = s.h * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        if (s.def) s.def.init(s);
      };
      return s;
    }).filter((s) => s.def);

    function localPointer(s) {
      if (ptr.x < -9000) return { x: -9999, y: -9999, on: false };
      const r = s.canvas.getBoundingClientRect();
      const on = ptr.x >= r.left && ptr.x <= r.right && ptr.y >= r.top && ptr.y <= r.bottom;
      return { x: ptr.x - r.left, y: ptr.y - r.top, on };
    }

    items.forEach((s) => s.resize());
    addEventListener("resize", () => items.forEach((s) => s.resize()));

    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        const s = items.find((it) => it.canvas === e.target);
        if (s) s.active = e.isIntersecting;
      });
    }, { threshold: 0.02 });
    items.forEach((s) => io.observe(s.canvas));

    if (reduceMotion) {
      items.forEach((s) => s.def.frame(s, { x: -9999, y: -9999, on: false }));
      return;
    }
    let last = performance.now();
    (function loop(now) {
      const dt = Math.min(40, now - last); last = now;
      for (const s of items) { if (!s.active) continue; s.t += dt; s.def.frame(s, localPointer(s)); }
      requestAnimationFrame(loop);
    })(last);
  })();

  /* ----------------------------------------------------------
     Render dynamic sections
  ---------------------------------------------------------- */
  const skillsGrid = document.getElementById("skillsGrid");
  SKILLS.forEach((s) => {
    const el = document.createElement("div");
    el.className = "skill reveal";
    el.innerHTML = `
      <div class="skill__top">
        <span class="skill__name">${s.name}</span>
        <span class="skill__lvl">${s.lvl}%</span>
      </div>
      <div class="skill__bar"><div class="skill__fill" data-lvl="${s.lvl}"></div></div>
      <div class="skill__tags">${s.tags.map((t) => `<span>${t}</span>`).join("")}</div>`;
    skillsGrid.appendChild(el);
    // hover weighting: emphasize hovered, dim siblings
    el.addEventListener("mouseenter", () => {
      [...skillsGrid.children].forEach((c) => { if (c !== el) c.style.opacity = "0.5"; });
    });
    el.addEventListener("mouseleave", () => {
      [...skillsGrid.children].forEach((c) => (c.style.opacity = "1"));
    });
  });

  const workGrid = document.getElementById("workGrid");
  WORK.forEach((p) => {
    const el = document.createElement("article");
    el.className = "card reveal" + (p.game ? " is-game" : "");
    el.innerHTML = `
      <div class="card__glow"></div>
      <span class="card__kind">${p.kind}</span>
      <h3 class="card__title">${p.title}</h3>
      <p class="card__desc">${p.desc}</p>
      <div class="card__foot">${p.stack.map((s) => `<span>${s}</span>`).join("")}</div>
      ${p.link ? `<a class="card__link magnetic" href="${p.link.url}" target="_blank" rel="noopener" data-magnetic>${p.link.label}</a>` : ""}`;
    workGrid.appendChild(el);

    // 3D tilt + glow follow
    if (finePointer && !reduceMotion) {
      const glow = el.querySelector(".card__glow");
      el.addEventListener("mousemove", (e) => {
        const r = el.getBoundingClientRect();
        const px = e.clientX - r.left, py = e.clientY - r.top;
        const rx = (py / r.height - 0.5) * -8;
        const ry = (px / r.width - 0.5) * 8;
        el.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-4px)`;
        glow.style.left = px + "px"; glow.style.top = py + "px";
      });
      el.addEventListener("mouseleave", () => { el.style.transform = ""; });
    }
  });

  const timeline = document.getElementById("timeline");
  TIMELINE.forEach((t) => {
    const li = document.createElement("li");
    li.className = "reveal";
    li.innerHTML = `
      <span class="t-year">${t.year}</span>
      <h3 class="t-role">${t.role}</h3>
      <p class="t-org">${t.org}</p>
      <p class="t-desc">${t.desc}</p>`;
    timeline.appendChild(li);
  });

  /* ----------------------------------------------------------
     Reveal on scroll + skill fill + counters + timeline dots
  ---------------------------------------------------------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add("is-in");
      const fill = e.target.querySelector?.(".skill__fill");
      if (fill) fill.style.width = fill.dataset.lvl + "%";
      io.unobserve(e.target);
    });
  }, { threshold: 0.18 });
  document.querySelectorAll(".reveal, .timeline li").forEach((el) => io.observe(el));

  // animated counters
  const counters = document.querySelectorAll(".stat[data-count]");
  const cio = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target;
      const target = +el.dataset.count;
      const suffix = el.dataset.suffix || "";
      let n = 0;
      const step = Math.max(1, target / 40);
      const t = setInterval(() => {
        n += step;
        if (n >= target) { n = target; clearInterval(t); }
        el.textContent = Math.floor(n) + suffix;
      }, 28);
      cio.unobserve(el);
    });
  }, { threshold: 0.6 });
  counters.forEach((c) => cio.observe(c));

  /* ----------------------------------------------------------
     Scroll progress + active dot
  ---------------------------------------------------------- */
  const progress = document.getElementById("scrollProgress");
  const sections = [...document.querySelectorAll("section[id]")];
  const dots = [...document.querySelectorAll(".dots__dot")];
  addEventListener("scroll", () => {
    const st = document.documentElement.scrollTop;
    const sh = document.documentElement.scrollHeight - innerHeight;
    progress.style.width = (st / sh) * 100 + "%";
    let active = sections[0].id;
    for (const s of sections) {
      if (st >= s.offsetTop - innerHeight * 0.4) active = s.id;
    }
    dots.forEach((d) => d.classList.toggle("is-active", d.getAttribute("href") === "#" + active));
  }, { passive: true });

  /* ----------------------------------------------------------
     Magnetic buttons
  ---------------------------------------------------------- */
  if (finePointer && !reduceMotion) {
    document.querySelectorAll("[data-magnetic]").forEach((el) => {
      el.addEventListener("mousemove", (e) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        el.style.transform = `translate(${x * 0.3}px, ${y * 0.3}px)`;
      });
      el.addEventListener("mouseleave", () => (el.style.transform = ""));
    });
  }

  /* ----------------------------------------------------------
     Hero title scramble on load
  ---------------------------------------------------------- */
  (function scramble() {
    if (reduceMotion) return;
    const chars = "!<>-_\\/[]{}=+*^?#";
    const lines = [...document.querySelectorAll("[data-scramble] .line")];
    let running = 0;
    document.querySelectorAll("[data-scramble]").forEach((title) => {
      // Lock the title's box and stop lines from rewrapping so the scramble
      // can't oscillate layout height and flicker the rest of the page.
      title.style.minHeight = title.offsetHeight + "px";
      title.classList.add("is-scrambling");
    });
    lines.forEach((line, idx) => {
      const final = line.textContent;
      let frame = 0;
      const reveal = Math.floor(Math.random() * 6) + 4;
      running++;
      setTimeout(() => {
        const t = setInterval(() => {
          let out = "";
          for (let i = 0; i < final.length; i++) {
            if (i < frame / reveal) out += final[i];
            else if (final[i] === " ") out += " ";
            else out += chars[Math.floor(Math.random() * chars.length)];
          }
          line.textContent = out;
          frame++;
          if (frame / reveal > final.length) {
            clearInterval(t);
            line.textContent = final;
            // when the last line settles, release the locked layout
            if (--running === 0) {
              document.querySelectorAll("[data-scramble]").forEach((title) => {
                title.classList.remove("is-scrambling");
                title.style.minHeight = "";
              });
            }
          }
        }, 28);
      }, 1400 + idx * 220);
    });
  })();

  /* ----------------------------------------------------------
     Keyboard navigation + shortcuts
  ---------------------------------------------------------- */
  const helpModal = document.getElementById("helpModal");
  const gridOverlay = document.getElementById("gridOverlay");
  function go(i) { sections[i]?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" }); }
  function currentIndex() {
    const st = document.documentElement.scrollTop;
    let idx = 0;
    sections.forEach((s, i) => { if (st >= s.offsetTop - innerHeight * 0.4) idx = i; });
    return idx;
  }
  addEventListener("keydown", (e) => {
    if (e.target.matches("input, textarea")) return;
    const k = e.key;
    if (k === "ArrowDown") { e.preventDefault(); go(Math.min(currentIndex() + 1, sections.length - 1)); }
    else if (k === "ArrowUp") { e.preventDefault(); go(Math.max(currentIndex() - 1, 0)); }
    else if (k >= "1" && k <= "6") { go(+k - 1); }
    else if (k === "?" || (k === "/" && e.shiftKey)) { toggleHelp(); }
    else if (k.toLowerCase() === "g") { gridOverlay.classList.toggle("is-on"); }
    else if (k === "Escape") { helpModal.hidden = true; gridOverlay.classList.remove("is-on"); }
  });
  function toggleHelp() { helpModal.hidden = !helpModal.hidden; }
  document.getElementById("helpBtn").addEventListener("click", toggleHelp);
  document.getElementById("helpClose").addEventListener("click", () => (helpModal.hidden = true));
  helpModal.addEventListener("click", (e) => { if (e.target === helpModal) helpModal.hidden = true; });

  /* ----------------------------------------------------------
     Misc
  ---------------------------------------------------------- */
  document.getElementById("year").textContent = new Date().getFullYear();

  // smooth anchor for dots/brand without hash jump artifacts
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (id.length > 1) {
        e.preventDefault();
        document.querySelector(id)?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
      }
    });
  });
})();
