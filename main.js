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
    { name: "AI & Automation", lvl: 84, tags: ["Python", "LLM Workflows", "Containers", "Test Automation"] },
    { name: "Gameplay Engineering", lvl: 90, tags: ["C#", "C++", "Unity", "Unreal Engine"] },
    { name: "Languages", lvl: 86, tags: ["C", "C++", "C#", "Python"] },
    { name: "Game & Level Design", lvl: 82, tags: ["Systems", "Level Design", "Playtesting"] },
    { name: "QA & Validation", lvl: 80, tags: ["Software Validation", "Documentation", "Reliability"] },
    { name: "Interactive Web", lvl: 74, tags: ["HTML", "CSS", "JavaScript", "UI State"] },
  ];

  const WORK = [
    {
      kind: "AI Platform", title: "Mindsight — Medical Ultrasound AI",
      desc: "Edge-AI platform for real-time ultrasound analysis: a PySide6 desktop debugger for model execution and doctor-mode QA, a Next.js auto-labeler for clinical review, and validation scripts that measure Dice/IoU against expert annotations.",
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
    { year: "2025 — now", role: "Junior AI Developer", org: "Mindsight Ventures", desc: "Designing and implementing AI-powered features and automation tools across internal products with Python, containerized environments, and LLM-driven workflows — improving test automation, data processing, and prototyping." },
    { year: "Aug 2025 — Oct 2025", role: "AI Development Intern", org: "Mindsight Ventures", desc: "Supported AI research and prototyping, building internal tools and improving automation workflows. Contributed to early-stage models, data-handling scripts, and test environments." },
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

    const accent = "214,255,67";
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
    document.querySelectorAll("[data-scramble] .line").forEach((line, idx) => {
      const final = line.textContent;
      let frame = 0;
      const reveal = Math.floor(Math.random() * 6) + 4;
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
          if (frame / reveal > final.length) { clearInterval(t); line.textContent = final; }
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
     Konami easter egg → confetti / pixel rain
  ---------------------------------------------------------- */
  const KONAMI = ["ArrowUp","ArrowUp","ArrowDown","ArrowDown","ArrowLeft","ArrowRight","ArrowLeft","ArrowRight","b","a"];
  let kPos = 0;
  addEventListener("keydown", (e) => {
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    kPos = key === KONAMI[kPos] ? kPos + 1 : (key === KONAMI[0] ? 1 : 0);
    if (kPos === KONAMI.length) { kPos = 0; partyTime(); }
  });

  function partyTime() {
    const canvas = document.getElementById("confetti");
    const ctx = canvas.getContext("2d");
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const colors = ["#d6ff43", "#ff6a45", "#f4f4ef"];
    const bits = Array.from({ length: 160 }, () => ({
      x: Math.random() * innerWidth, y: -20 - Math.random() * innerHeight,
      s: Math.random() * 8 + 4, vy: Math.random() * 3 + 2, vx: (Math.random() - 0.5) * 2,
      rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
      c: colors[Math.floor(Math.random() * colors.length)],
    }));
    let life = 0;
    (function run() {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      bits.forEach((b) => {
        b.x += b.vx; b.y += b.vy; b.rot += b.vr;
        ctx.save();
        ctx.translate(b.x, b.y); ctx.rotate(b.rot);
        ctx.fillStyle = b.c;
        ctx.fillRect(-b.s / 2, -b.s / 2, b.s, b.s);
        ctx.restore();
      });
      life++;
      if (life < 260) requestAnimationFrame(run);
      else ctx.clearRect(0, 0, innerWidth, innerHeight);
    })();
    // little toast
    const note = document.createElement("div");
    note.textContent = "↑↑↓↓ achievement unlocked ✦ thanks for exploring";
    note.style.cssText = "position:fixed;left:50%;top:24px;transform:translateX(-50%);background:#d6ff43;color:#0a0a0b;font-family:'Space Mono',monospace;font-size:0.8rem;padding:10px 18px;border-radius:99px;z-index:195;font-weight:700;";
    document.body.appendChild(note);
    setTimeout(() => note.remove(), 3500);
  }

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
