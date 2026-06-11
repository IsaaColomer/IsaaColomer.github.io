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
     Same constellation family as the hero field — drifting linked
     particles reacting to the cursor — varied per section by accent
     colour and interaction (data-accent / data-mode). In view only.
  ---------------------------------------------------------- */
  (function sectionFX() {
    const COLORS = { red: "255,31,61", orange: "255,122,24", blue: "43,180,255" };
    const canvases = [...document.querySelectorAll("canvas.sfx")];
    if (!canvases.length) return;

    // viewport pointer; mapped into each canvas's local space per frame
    const ptr = { x: -9999, y: -9999 };
    addEventListener("mousemove", (e) => { ptr.x = e.clientX; ptr.y = e.clientY; }, { passive: true });
    addEventListener("mouseout", (e) => { if (!e.relatedTarget) { ptr.x = -9999; ptr.y = -9999; } });

    const items = canvases.map((canvas) => {
      const ctx = canvas.getContext("2d");
      const s = {
        canvas, ctx, w: 0, h: 0, active: false, particles: [],
        accent: COLORS[canvas.dataset.accent] || COLORS.red,
        mode: canvas.dataset.mode || "repel",   // repel | attract | connect
      };
      s.resize = function () {
        const cw = canvas.clientWidth, ch = canvas.clientHeight;
        if (!cw || !ch) return;
        if (cw === s.w && ch === s.h && s.particles.length) return; // no real change
        const dpr = Math.min(devicePixelRatio || 1, 2);
        s.w = cw; s.h = ch;
        canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const count = Math.max(36, Math.min(140, Math.floor((cw * ch) / 11000)));
        s.particles = Array.from({ length: count }, () => ({
          x: Math.random() * cw, y: Math.random() * ch,
          vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35,
          r: Math.random() * 1.6 + 0.6,
        }));
      };
      return s;
    });

    function localPointer(s) {
      if (ptr.x < -9000) return { x: -9999, y: -9999, on: false };
      const r = s.canvas.getBoundingClientRect();
      const on = ptr.x >= r.left && ptr.x <= r.right && ptr.y >= r.top && ptr.y <= r.bottom;
      return { x: ptr.x - r.left, y: ptr.y - r.top, on };
    }

    function frame(s, p) {
      // keep the pixel buffer matched to the rendered size every frame — the
      // section grows after its content is injected, so any earlier buffer
      // would otherwise be stretched (the distortion). resize() is guarded.
      if (s.canvas.clientWidth !== s.w || s.canvas.clientHeight !== s.h) s.resize();
      const { ctx, w, h, accent, particles } = s;
      ctx.clearRect(0, 0, w, h);

      // particles drift, bounce, and react to the cursor
      for (const pt of particles) {
        pt.x += pt.vx; pt.y += pt.vy;
        if (pt.x < 0 || pt.x > w) pt.vx *= -1;
        if (pt.y < 0 || pt.y > h) pt.vy *= -1;
        if (p.on) {
          const dx = pt.x - p.x, dy = pt.y - p.y, d2 = dx * dx + dy * dy;
          if (s.mode === "repel" && d2 < 14000) {
            const d = Math.sqrt(d2) || 1, f = (1 - d / 118) * 1.6;
            pt.x += (dx / d) * f; pt.y += (dy / d) * f;
          } else if (s.mode === "attract" && d2 < 40000 && d2 > 200) {
            const d = Math.sqrt(d2) || 1, f = (1 - d / 200) * 0.8;
            pt.x -= (dx / d) * f; pt.y -= (dy / d) * f;
          }
        }
        ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${accent},0.5)`; ctx.fill();
      }

      // links between nearby particles (the constellation)
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i], b = particles[j];
          const dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy;
          if (d2 < 11000) {
            ctx.strokeStyle = `rgba(${accent},${(1 - d2 / 11000) * 0.3})`;
            ctx.lineWidth = 0.6;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }

      if (p.on) {
        // connect mode: the network reaches toward the cursor
        if (s.mode === "connect") {
          for (const pt of particles) {
            const dx = pt.x - p.x, dy = pt.y - p.y, d2 = dx * dx + dy * dy;
            if (d2 < 22000) {
              ctx.strokeStyle = `rgba(${accent},${(1 - d2 / 22000) * 0.55})`;
              ctx.lineWidth = 0.8;
              ctx.beginPath(); ctx.moveTo(pt.x, pt.y); ctx.lineTo(p.x, p.y); ctx.stroke();
            }
          }
        }
        // pointer halo
        ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${accent},0.9)`; ctx.fill();
      }
    }

    // ResizeObserver keeps each canvas buffer exactly matched to its rendered
    // size (handles font reflow, content changes, window resize) — no stretching.
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const s = items.find((it) => it.canvas === e.target);
        if (s) s.resize();
      }
    });
    items.forEach((s) => { s.resize(); ro.observe(s.canvas); });

    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        const s = items.find((it) => it.canvas === e.target);
        if (s) s.active = e.isIntersecting;
      });
    }, { threshold: 0.02 });
    items.forEach((s) => io.observe(s.canvas));

    if (reduceMotion) {
      items.forEach((s) => frame(s, { x: -9999, y: -9999, on: false }));
      return;
    }
    (function loop() {
      for (const s of items) { if (s.active) frame(s, localPointer(s)); }
      requestAnimationFrame(loop);
    })();
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
  addEventListener("scroll", () => {
    const st = document.documentElement.scrollTop;
    const sh = document.documentElement.scrollHeight - innerHeight;
    progress.style.width = (st / sh) * 100 + "%";
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

  // smooth anchor for in-page links without hash jump artifacts
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
