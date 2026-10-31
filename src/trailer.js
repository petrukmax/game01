(function () {
  "use strict";

  const NF = (window.NF = window.NF || {});
  const I18n = NF.I18n || { t: function (key) { return key; } };

  // A short 10-second teaser: six frames at 1.4 s plus a 1.6 s title card.
  const FRAME_MS = 1400;
  const CUT_MS = 150;
  const TITLE_MS = 1600;
  const SLIDE_COUNT = 6;
  const TOTAL_MS = FRAME_MS * SLIDE_COUNT + TITLE_MS;
  const SEEN_KEY = "nightfang-intro-seen";

  function Trailer() {
    this.root = document.getElementById("trailer");
    this.stage = document.getElementById("trailer-stage");
    this.slides = Array.prototype.slice.call(document.querySelectorAll(".trailer-slide"));
    this.subtitle = document.getElementById("trailer-subtitle");
    this.titleCard = document.getElementById("trailer-title-card");
    this.skipBtn = document.getElementById("trailer-skip");
    this.progressFill = document.getElementById("trailer-progress-fill");
    this.rainCanvas = document.getElementById("trailer-rain");

    this.active = false;
    this.done = false;
    this.onDone = null;
    this.timers = [];
    this.startedAt = 0;
    this.rainRaf = 0;
    this.progressRaf = 0;
    this.rainDrops = [];
    this.rainCtx = null;
    this.rainW = 0;
    this.rainH = 0;
    this.rainLast = 0;
    this.audio = null;
    this.audioCtx = null;

    this.boundKey = this.onKey.bind(this);
    this.boundPointer = this.onPointer.bind(this);
    this.boundResize = this.resizeRain.bind(this);

    if (this.skipBtn) {
      this.skipBtn.addEventListener("click", () => this.finish(true));
    }
    if (this.root) {
      this.root.addEventListener("pointerdown", this.boundPointer);
    }

    // Warm the local images so the first hard cut never shows a blank frame.
    this.slides.forEach(function (slide) {
      const img = slide.querySelector("img");
      if (img && img.getAttribute("src")) {
        const preload = new Image();
        preload.src = img.getAttribute("src");
      }
    });
  }

  Trailer.prototype.addTimer = function (fn, ms) {
    const id = setTimeout(fn, ms);
    this.timers.push(id);
    return id;
  };

  Trailer.prototype.clearTimers = function () {
    for (const id of this.timers) clearTimeout(id);
    this.timers.length = 0;
  };

  Trailer.prototype.shouldPlay = function () {
    try {
      return localStorage.getItem(SEEN_KEY) !== "1";
    } catch (err) {
      return true;
    }
  };

  Trailer.prototype.markSeen = function () {
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch (err) { /* private mode */ }
  };

  Trailer.prototype.play = function (onDone, force) {
    if (!this.root || this.active) return;
    if (!force && !this.shouldPlay()) {
      if (onDone) onDone();
      return;
    }
    this.active = true;
    this.done = false;
    this.onDone = onDone || function () {};
    this.startedAt = performance.now();

    this.clearTimers();
    this.root.classList.remove("hidden", "fade-out");
    this.root.setAttribute("aria-hidden", "false");
    this.stage.classList.remove("is-cut");
    this.titleCard.classList.remove("visible");
    this.subtitle.classList.remove("visible");
    this.subtitle.textContent = "";
    this.progressFill.style.width = "0%";

    this.slides.forEach(function (slide) { slide.classList.remove("active"); });

    this.startRain();
    this.startAudio();
    window.addEventListener("keydown", this.boundKey, true);
    window.addEventListener("pointerdown", this.boundPointer, true);
    window.addEventListener("resize", this.boundResize);

    this.showSlide(0);

    for (let i = 1; i < SLIDE_COUNT; i++) {
      this.addTimer(() => this.advanceTo(i), FRAME_MS * i);
    }
    this.addTimer(() => this.showTitle(), FRAME_MS * SLIDE_COUNT);
    this.addTimer(() => this.finish(false), TOTAL_MS);

    this.tickProgress();
  };

  Trailer.prototype.showSlide = function (index) {
    const slide = this.slides[index];
    if (!slide) return;
    this.slides.forEach(function (s) { s.classList.remove("active"); });
    slide.classList.add("active");
    const n = index + 1;
    this.subtitle.textContent = I18n.t("trailer.teaser" + n);
    const self = this;
    requestAnimationFrame(function () {
      if (self.active) self.subtitle.classList.add("visible");
    });
  };

  Trailer.prototype.advanceTo = function (index) {
    if (!this.active) return;
    const self = this;
    this.stage.classList.add("is-cut");
    this.subtitle.classList.remove("visible");
    this.addTimer(function () {
      if (!self.active) return;
      self.showSlide(index);
      self.stage.classList.remove("is-cut");
    }, CUT_MS);
  };

  Trailer.prototype.showTitle = function () {
    if (!this.active) return;
    const self = this;
    this.stage.classList.add("is-cut");
    this.subtitle.classList.remove("visible");
    this.addTimer(function () {
      if (!self.active) return;
      self.slides.forEach(function (slide) { slide.classList.remove("active"); });
      self.subtitle.textContent = "";
      self.titleCard.classList.add("visible");
      self.stage.classList.remove("is-cut");
    }, CUT_MS);
  };

  Trailer.prototype.onKey = function (e) {
    if (!this.active) return;
    e.preventDefault();
    e.stopPropagation();
    this.finish(true);
  };

  Trailer.prototype.onPointer = function (e) {
    if (!this.active) return;
    if (e && e.target && e.target.id === "trailer-skip") return;
    if (e) e.preventDefault();
    this.finish(true);
  };

  Trailer.prototype.finish = function (immediate) {
    if (!this.active || this.done) return;
    this.done = true;
    this.markSeen();
    this.clearTimers();
    this.stopRain();
    this.stopAudio();
    window.removeEventListener("keydown", this.boundKey, true);
    window.removeEventListener("pointerdown", this.boundPointer, true);
    window.removeEventListener("resize", this.boundResize);

    const self = this;
    const done = this.onDone;
    this.onDone = null;

    const complete = function () {
      self.active = false;
      self.root.classList.add("hidden");
      self.root.classList.remove("fade-out");
      self.root.setAttribute("aria-hidden", "true");
      self.slides.forEach(function (slide) { slide.classList.remove("active"); });
      self.subtitle.classList.remove("visible");
      self.titleCard.classList.remove("visible");
      if (done) done();
    };

    if (immediate) {
      complete();
    } else {
      this.root.classList.add("fade-out");
      setTimeout(complete, 560);
    }
  };

  Trailer.prototype.tickProgress = function () {
    if (!this.active) return;
    const p = Math.min(1, (performance.now() - this.startedAt) / TOTAL_MS);
    this.progressFill.style.width = (p * 100).toFixed(2) + "%";
    const self = this;
    this.progressRaf = requestAnimationFrame(function () { self.tickProgress(); });
  };

  Trailer.prototype.startRain = function () {
    if (!this.rainCanvas) return;
    this.rainCtx = this.rainCanvas.getContext("2d");
    if (!this.rainCtx) return;
    this.resizeRain();
    this.rainLast = performance.now();
    const self = this;
    const draw = function (now) {
      if (!self.active) return;
      const dt = Math.min(0.05, Math.max(0.001, (now - self.rainLast) / 1000));
      self.rainLast = now;
      self.drawRain(dt);
      self.rainRaf = requestAnimationFrame(draw);
    };
    this.rainRaf = requestAnimationFrame(draw);
  };

  Trailer.prototype.resizeRain = function () {
    if (!this.rainCanvas || !this.rainCtx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.rainW = w;
    this.rainH = h;
    this.rainCanvas.width = Math.max(1, Math.floor(w * dpr));
    this.rainCanvas.height = Math.max(1, Math.floor(h * dpr));
    this.rainCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const target = Math.max(90, Math.min(260, Math.round((w * h) / 9200)));
    const drops = [];
    for (let i = 0; i < target; i++) {
      drops.push(this.makeDrop(true));
    }
    this.rainDrops = drops;
  };

  Trailer.prototype.makeDrop = function (anywhere) {
    const depth = Math.random();
    const len = 12 + depth * 34;
    return {
      x: Math.random() * (this.rainW + 120) - 40,
      y: anywhere ? Math.random() * this.rainH : -len - Math.random() * 80,
      len: len,
      speed: 620 + depth * 920,
      alpha: 0.10 + depth * 0.28,
      width: 0.6 + depth * 1.15,
      drift: 0.18 + depth * 0.10
    };
  };

  Trailer.prototype.drawRain = function (dt) {
    const ctx = this.rainCtx;
    if (!ctx) return;
    const w = this.rainW;
    const h = this.rainH;
    ctx.clearRect(0, 0, w, h);
    ctx.lineCap = "round";
    for (const drop of this.rainDrops) {
      drop.y += drop.speed * dt;
      drop.x -= drop.speed * drop.drift * dt;
      if (drop.y > h + 30 || drop.x < -60) {
        drop.y = -drop.len - Math.random() * 120;
        drop.x = Math.random() * (w + 120) - 20;
      }
      ctx.beginPath();
      ctx.strokeStyle = "rgba(184, 222, 255, " + drop.alpha.toFixed(3) + ")";
      ctx.lineWidth = drop.width;
      ctx.moveTo(drop.x, drop.y);
      ctx.lineTo(drop.x - drop.len * drop.drift, drop.y + drop.len);
      ctx.stroke();
    }
    // A few slow foreground beads add depth without covering the photography.
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 18; i++) {
      const x = ((i * 197.3 + performance.now() * 0.012) % (w + 40)) - 20;
      const y = (i * 131.7 + performance.now() * 0.08) % (h + 20);
      ctx.fillStyle = "rgba(120, 200, 255, 0.05)";
      ctx.beginPath();
      ctx.arc(x, y, 1.1, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
  };

  Trailer.prototype.stopRain = function () {
    if (this.rainRaf) cancelAnimationFrame(this.rainRaf);
    this.rainRaf = 0;
    if (this.progressRaf) cancelAnimationFrame(this.progressRaf);
    this.progressRaf = 0;
    this.rainDrops = [];
    if (this.rainCtx) this.rainCtx.clearRect(0, 0, this.rainW, this.rainH);
  };

  Trailer.prototype.startAudio = function () {
    const game = NF.game;
    if (!game || !game.audio) return;
    game.audio.ensure();
    game.audio.startRumble();
  };

  Trailer.prototype.stopAudio = function () {
    const game = NF.game;
    if (game && game.audio) game.audio.stopRumble();
    this.audio = null;
    this.audioCtx = null;
  };

  NF.Trailer = new Trailer();
})();
