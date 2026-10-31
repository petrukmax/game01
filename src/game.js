(function () {
  "use strict";

  const NF = (window.NF = window.NF || {});
  const T = window.THREE;
  const A = NF.Assets;
  const I18n = NF.I18n || { t: function (key) { return key; } };

  const BEST_KEY = "nightfang-best-score";
  const DIFF_KEY = "nightfang-difficulty";

  const DIFFICULTIES = {
    easy: {
      labelKey: "diff.easy",
      noteKey: "diff.easy.note",
      lives: 5,
      health: 120,
      enemyHealth: 0.8,
      enemyDamage: 0.6,
      maxAlive: 3
    },
    normal: {
      labelKey: "diff.normal",
      noteKey: "diff.normal.note",
      lives: 3,
      health: 100,
      enemyHealth: 1,
      enemyDamage: 1,
      maxAlive: 3
    },
    hard: {
      labelKey: "diff.hard",
      noteKey: "diff.hard.note",
      lives: 2,
      health: 90,
      enemyHealth: 1.2,
      enemyDamage: 1.35,
      maxAlive: 4
    }
  };

  function readStored(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : value;
    } catch (err) {
      return fallback;
    }
  }

  function Game(scene, camera, renderer, input, ui, audio, lights) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.input = input;
    this.ui = ui;
    this.audio = audio;
    this.lights = lights || {};

    this.state = "boot";
    this.enemies = [];
    this.level = null;
    this.levelIndex = 0;
    this.score = 0;
    this.coins = 0;
    this.lives = 3;
    this.bestScore = 0;
    this.difficulty = "normal";
    this.difficulties = DIFFICULTIES;
    const storedDiff = readStored(DIFF_KEY, "normal");
    if (DIFFICULTIES[storedDiff]) this.difficulty = storedDiff;
    try {
      this.bestScore = Number(localStorage.getItem(BEST_KEY) || 0) || 0;
    } catch (err) {
      this.bestScore = 0;
    }

    this.combo = 0;
    this.comboTimer = 0;
    this.hitstop = 0;
    this.shakeAmount = 0;
    this.shakeTime = 0;
    this.shakeDuration = 0.2;
    this.playTime = 0;
    this.hintFaded = false;
    this.levelStartScore = 0;
    this.levelStartCoins = 0;
    this.camX = null;
    this.camInit = false;

    this.particles = new NF.Particles(scene);
    this.combat = new NF.Combat(this);
    this.hero = new NF.Panther(this);
    scene.add(this.hero.root);
    this.hero.root.visible = false;

    this.bossHideTimer = 0;

    this.accentLightA = new T.PointLight(0xc8ff55, 0.55, 24, 2);
    this.accentLightA.position.set(10, 3.4, 3.2);
    scene.add(this.accentLightA);
    this.accentLightB = new T.PointLight(0x5b8cff, 0.4, 22, 2);
    this.accentLightB.position.set(24, 2.6, -2.4);
    scene.add(this.accentLightB);

    // Tight hero rim light: keeps the black panther readable against dark scenery
    // without washing out the environment.
    this.heroLight = new T.PointLight(0x7cc6ff, 1.35, 3.6, 2);
    this.heroLight.position.set(0, 1.3, -1.5);
    scene.add(this.heroLight);

    // Soft camera-side fill so the panther's near flank reads as sculpted fur,
    // not a flat cut-out.
    this.heroFill = new T.PointLight(0xa8c4e8, 0.5, 3.2, 2);
    this.heroFill.position.set(0, 1.0, 1.2);
    scene.add(this.heroFill);

    this.nullInput = {
      getMoveX: function () { return 0; },
      getMoveZ: function () { return 0; },
      isRunning: function () { return false; },
      isDown: function () { return false; },
      wasPressed: function () { return false; }
    };

    this.menuGroup = null;
    this.tmpVec = new T.Vector3();
    this._shakeX = 0;
    this._shakeY = 0;
  }

  Game.prototype.init = function () {
    this.hero.maxHealth = this.difficultyMods().health;
    this.hero.health = this.hero.maxHealth;
    this.showMenu();
  };

  Game.prototype.difficultyMods = function () {
    return this.difficulties[this.difficulty] || this.difficulties.normal;
  };

  Game.prototype.setDifficulty = function (name, silent) {
    if (!this.difficulties[name]) return;
    this.difficulty = name;
    try {
      localStorage.setItem(DIFF_KEY, name);
    } catch (err) { /* private mode */ }
    const mods = this.difficultyMods();
    this.hero.maxHealth = mods.health;
    if (this.state === "menu" || this.state === "boot") {
      this.hero.health = mods.health;
      this.lives = mods.lives;
      this.hero.lives = mods.lives;
    }
    if (this.ui) {
      if (this.ui.setDifficulty) {
        this.ui.setDifficulty(name, I18n.t(mods.noteKey));
      }
      this.ui.setHealth(this.hero.health, this.hero.maxHealth);
      this.ui.setLives(this.lives);
    }
    if (!silent) {
      const label = I18n.t(mods.labelKey);
      if (this.ui) this.ui.toast(I18n.t("toast.difficulty", { name: label }), 1200);
    }
  };

  Game.prototype.toggleFullscreen = function () {
    const doc = document;
    const el = doc.documentElement;
    const active = doc.fullscreenElement || doc.webkitFullscreenElement;
    if (active) {
      const exit = doc.exitFullscreen || doc.webkitExitFullscreen;
      if (exit) {
        try { exit.call(doc); } catch (err) { /* ignore */ }
      }
      return false;
    }
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (req) {
      try {
        const result = req.call(el);
        if (result && typeof result.catch === "function") result.catch(function () {});
      } catch (err) { /* ignore */ }
      return true;
    }
    if (this.ui) this.ui.toast(I18n.t("toast.fullscreenUnsupported"), 1400);
    return false;
  };

  Game.prototype.applyMenuLighting = function () {
    this.scene.background = new T.Color(0x080a0e);
    this.scene.fog = new T.FogExp2(0x080a0e, 0.036);
    const l = this.lights;
    if (l.hemi) {
      l.hemi.color.setHex(0x6a86a8);
      l.hemi.groundColor.setHex(0x1b1510);
      l.hemi.intensity = 0.9;
    }
    if (l.key) {
      l.key.color.setHex(0xbfd6ff);
      l.key.intensity = 1.35;
    }
    if (l.rim) {
      l.rim.color.setHex(0x5c8cff);
      l.rim.intensity = 0.6;
    }
    if (l.ambient) l.ambient.intensity = 0.34;
    if (this.accentLightA) {
      this.accentLightA.color.setHex(0xc8ff55);
      this.accentLightA.intensity = 0.4;
      this.accentLightA.position.set(2, 3.2, 2.4);
    }
    if (this.accentLightB) {
      this.accentLightB.color.setHex(0x5b8cff);
      this.accentLightB.intensity = 0.3;
      this.accentLightB.position.set(-4, 2.4, -1.2);
    }
    if (this.heroLight) {
      this.heroLight.color.setHex(0x7cc6ff);
      this.heroLight.intensity = 1.7;
    }
    if (this.heroFill) {
      this.heroFill.color.setHex(0xa8c4e8);
      this.heroFill.intensity = 1.1;
    }
    if (l.key && l.keyTarget) {
      l.key.position.set(-5, 11, 7);
      l.keyTarget.position.set(0, 0, 0);
      l.keyTarget.updateMatrixWorld();
    }
  };

  Game.prototype.applyLevelLighting = function (def) {
    this.scene.background = new T.Color(def.fogColor);
    this.scene.fog = new T.FogExp2(def.fogColor, def.fogDensity);
    const l = this.lights;
    if (l.hemi) {
      l.hemi.color.setHex(def.hemiSky);
      l.hemi.groundColor.setHex(def.hemiGround);
      l.hemi.intensity = def.hemiIntensity;
    }
    if (l.key) {
      l.key.color.setHex(def.keyColor);
      l.key.intensity = def.keyIntensity;
    }
    if (l.rim) {
      l.rim.color.setHex(def.rimColor);
      l.rim.intensity = 0.62;
    }
    if (l.ambient) l.ambient.intensity = 0.3;
    if (this.accentLightA) {
      this.accentLightA.color.setHex(def.accent);
      this.accentLightA.intensity = 0.5;
      this.accentLightA.position.set(def.length * 0.3, 3.2, 2.2);
    }
    if (this.accentLightB) {
      this.accentLightB.color.setHex(def.rimColor);
      this.accentLightB.intensity = 0.35;
      this.accentLightB.position.set(def.length * 0.7, 2.6, -2.2);
    }
    if (this.heroLight) {
      this.heroLight.color.setHex(def.rimColor);
      this.heroLight.intensity = def.theme === "foundry" ? 2.0 : 1.8;
    }
    if (this.heroFill) {
      this.heroFill.color.setHex(def.keyColor);
      this.heroFill.intensity = def.theme === "dojo" ? 1.35 : 1.2;
    }
  };

  Game.prototype.buildMenuStage = function () {
    if (this.menuGroup) return;
    const g = new T.Group();
    g.name = "menu-stage";
    this.scene.add(g);
    this.menuGroup = g;

    const floorTex = A.asphaltTexture();
    floorTex.repeat.set(6, 2);
    const floor = new T.Mesh(
      new T.PlaneGeometry(46, 18),
      new T.MeshStandardMaterial({ map: floorTex, roughness: 0.9, metalness: 0.08 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, 0);
    floor.receiveShadow = true;
    g.add(floor);

    const skyline = new T.Mesh(
      new T.PlaneGeometry(60, 18),
      new T.MeshBasicMaterial({
        map: A.skylineTexture(999, {
          sky: ["#080b11", "#0f1824", "#172331"],
          windowA: "#ffd27a",
          windowB: "#8fd5ff",
          moon: true,
          haze: "rgba(80,120,160,0.08)"
        }),
        fog: false
      })
    );
    skyline.position.set(0, 7.6, -18);
    g.add(skyline);

    const wallMat = new T.MeshStandardMaterial({
      map: (function () {
        const t = A.brickTexture();
        t.repeat.set(3, 2);
        return t;
      })(),
      roughness: 0.9
    });
    const wall = new T.Mesh(new T.PlaneGeometry(46, 8), wallMat);
    wall.position.set(0, 4, -5.4);
    wall.receiveShadow = true;
    g.add(wall);

    const neon = new T.Mesh(
      new T.PlaneGeometry(4.4, 1.5),
      new T.MeshBasicMaterial({ map: A.neonTexture("NIGHTFANG", "#c8ff55") })
    );
    neon.position.set(-6.5, 4.4, -5.2);
    g.add(neon);
    const neon2 = new T.Mesh(
      new T.PlaneGeometry(3.2, 1.1),
      new T.MeshBasicMaterial({ map: A.neonTexture("QUAY 9", "#7ce6ff") })
    );
    neon2.position.set(8.2, 3.4, -5.2);
    g.add(neon2);

    const lampPost = A.cylinder(0.06, 0.09, 4.2, 6, A.standard(0x1c2026, 0.6, 0.5), -3.4, 2.1, -2.2);
    g.add(lampPost);
    const lampArm = A.box(0.8, 0.07, 0.07, A.standard(0x1c2026, 0.6, 0.5), -3.0, 4.1, -2.2);
    g.add(lampArm);
    const lampHead = A.box(0.34, 0.14, 0.24, A.emissive(0xffe0a0, 1.4), -2.6, 4.03, -2.2);
    g.add(lampHead);
    const lampGlow = new T.Mesh(
      new T.PlaneGeometry(2.4, 2.4),
      new T.MeshBasicMaterial({ map: A.radialTexture(), color: 0xffdca0, transparent: true, opacity: 0.16, depthWrite: false, blending: T.AdditiveBlending })
    );
    lampGlow.position.set(-2.6, 3.9, -2.1);
    g.add(lampGlow);

    for (let i = 0; i < 5; i++) {
      const crate = A.box(0.8, 0.8, 0.8, new T.MeshStandardMaterial({ map: A.crateTexture(), roughness: 0.85 }), 6 + i * 1.1, 0.4, -2.6 + (i % 2) * 0.9);
      g.add(crate);
    }

    this.applyMenuLighting();
    this.camera.position.set(2.0, 1.55, 5.6);
    this.camera.lookAt(0.6, 0.72, 0);
    this.hero.reset(0.6, 0);
    this.hero.facing = 1;
    this.hero.root.rotation.y = 0;
    this.hero.root.visible = true;
    this.hero.lives = this.lives;
  };

  Game.prototype.disposeMenuStage = function () {
    if (!this.menuGroup) return;
    if (this.menuGroup.parent) this.menuGroup.parent.remove(this.menuGroup);
    A.disposeObject(this.menuGroup);
    this.menuGroup = null;
  };

  Game.prototype.showMenu = function () {
    this.state = "menu";
    this.cleanupLevel();
    this.disposeMenuStage();
    this.particles.clear();
    this.buildMenuStage();
    this.ui.showMenu(this.bestScore);
    this.ui.setBuff(false);
    this.ui.hideBoss();
    this.ui.hidePause();
    this.ui.showGrabHint(false);
    this.setDifficulty(this.difficulty, true);
    if (this.ui.hideWave) this.ui.hideWave();
    this.audio.play("click");
    if (this.audio.startMusic) this.audio.startMusic("menu");
    if (this.audio.setMusicIntensity) this.audio.setMusicIntensity(0.15);
  };

  Game.prototype.requestStart = function () {
    if (typeof this.onStartRequest === "function") {
      this.onStartRequest();
      return;
    }
    this.startNewGame();
  };

  Game.prototype.onLanguageChange = function () {
    if (this.ui && this.ui.refreshLanguage) this.ui.refreshLanguage();
    for (const enemy of this.enemies) {
      if (enemy && enemy.refreshLabel) enemy.refreshLabel();
    }
    if (this.level && this.level.refreshLanguage) this.level.refreshLanguage();
  };

  Game.prototype.cleanupLevel = function () {
    if (this.level) {
      this.level.dispose();
      this.level = null;
    }
    for (const enemy of this.enemies) {
      if (!enemy) continue;
      if (enemy.root && enemy.root.parent) enemy.root.parent.remove(enemy.root);
      A.disposeObject(enemy.root);
    }
    this.enemies.length = 0;
    this.particles.clear();
    this.ui.hideBoss();
    this.ui.showGrabHint(false);
  };

  Game.prototype.startNewGame = function () {
    this.audio.ensure();
    this.disposeMenuStage();
    this.cleanupLevel();
    const mods = this.difficultyMods();
    this.score = 0;
    this.coins = 0;
    this.lives = mods.lives;
    this.hero.maxHealth = mods.health;
    this.hero.health = mods.health;
    this.combo = 0;
    this.comboTimer = 0;
    this.hitstop = 0;
    this.levelStartScore = 0;
    this.levelStartCoins = 0;
    this.ui.setCombo(0);
    this.ui.setScore(0);
    this.ui.setCoins(0);
    this.ui.hideAllOverlays();
    this.ui.hidePause();
    this.levelIndex = 0;
    this.loadLevel(0);
  };

  Game.prototype.restartLevel = function () {
    if (this.levelIndex === undefined) return;
    this.score = this.levelStartScore;
    this.coins = this.levelStartCoins;
    this.combo = 0;
    this.ui.setCombo(0);
    this.ui.setScore(this.score);
    this.ui.setCoins(this.coins);
    this.loadLevel(this.levelIndex);
  };

  Game.prototype.loadLevel = function (index) {
    this.cleanupLevel();
    this.disposeMenuStage();
    this.levelIndex = index;
    this.level = new NF.Level(this, index);
    this.levelStartScore = this.score;
    this.levelStartCoins = this.coins;
    this.applyLevelLighting(this.level.def);

    const mods = this.difficultyMods();
    this.hero.maxHealth = mods.health;
    this.hero.lives = this.lives;
    this.hero.reset(3, 0);
    this.hero.health = this.hero.maxHealth;
    this.hero.buff = 0;
    this.hero.specialCooldown = 0;
    this.hero.root.visible = true;
    this.hero.invuln = 1.2;

    this.combo = 0;
    this.comboTimer = 0;
    this.playTime = 0;
    this.hintFaded = false;
    this.camInit = false;
    this.hitstop = 0;

    this.ui.hideAllOverlays();
    this.ui.hidePause();
    this.ui.showHud();
    this.ui.fadeHintReset ? this.ui.fadeHintReset() : null;
    this.ui.setLevel(index, this.level.name);
    this.ui.setHealth(this.hero.health, this.hero.maxHealth);
    this.ui.setLives(this.lives);
    this.ui.setScore(this.score);
    this.ui.setCoins(this.coins);
    this.ui.setCombo(0);
    this.ui.setBuff(false);
    this.ui.setSpecial(0, this.hero.specialMax);
    this.ui.setJump(this.hero.jumpStamina, this.hero.maxJumpStamina);
    this.ui.setGrab(this.hero.grabCooldown, this.hero.grabMaxCooldown);
    this.ui.hideBoss();
    this.ui.setObjective(this.level.objective);
    this.ui.showGrabHint(false);
    if (this.ui.hideWave) this.ui.hideWave();
    this.ui.toast(this.level.district + " · " + this.level.name, 2400);
    if (this.audio.startMusic) this.audio.startMusic(this.level.theme || "street");
    if (this.audio.setMusicIntensity) this.audio.setMusicIntensity(0.2);
    if (index === 0 && this.playTime === 0) {
      const self = this;
      setTimeout(function () {
        if (self.state === "playing" && self.ui) {
          self.ui.toast(I18n.t("toast.autoTarget"), 2400);
        }
      }, 3200);
    }

    this.state = "playing";
    this.updateCamera(0, true);
    this.updateHud();
  };

  Game.prototype.nextLevel = function () {
    if (!this.level) return;
    this.audio.ensure();
    if (this.levelIndex + 1 >= NF.LEVEL_DEFS.length) {
      this.showVictory();
    } else {
      this.loadLevel(this.levelIndex + 1);
    }
  };

  Game.prototype.completeLevel = function () {
    if (this.state !== "playing") return;
    this.state = "levelclear";
    this.hero.vx = 0;
    this.hero.vz = 0;
    this.hero.state = "idle";
    this.hero.stateTime = 0;
    this.combo = 0;
    this.ui.setCombo(0);
    this.ui.setScore(this.score);
    this.ui.setCoins(this.coins);
    this.ui.showLevelClear(this.score, this.coins);
    this.audio.play("levelClear");
    if (this.audio.setMusicIntensity) this.audio.setMusicIntensity(0.1);
    this.saveBest();
    for (let i = 0; i < 24; i++) {
      this.particles.spawn(
        this.hero.x + (Math.random() - 0.5) * 3,
        1.2 + Math.random() * 2.4,
        this.hero.z + (Math.random() - 0.5) * 3,
        Math.random() > 0.5 ? "#c8ff55" : "#e7b84d",
        { speed: 3.2, up: 0.8, life: 1.0, spread: 0.3, gravity: -3.4 }
      );
    }
  };

  Game.prototype.showVictory = function () {
    this.state = "victory";
    this.ui.hideAllOverlays();
    this.ui.showVictory(this.score, this.coins);
    this.audio.play("victory");
    if (this.audio.stopMusic) this.audio.stopMusic();
    this.saveBest();
  };

  Game.prototype.gameOver = function () {
    this.state = "gameover";
    this.ui.showGameOver(this.score, this.coins);
    this.audio.play("gameOver");
    if (this.audio.stopMusic) this.audio.stopMusic();
    this.saveBest();
  };

  Game.prototype.saveBest = function () {
    if (this.score > this.bestScore) {
      this.bestScore = Math.floor(this.score);
      try {
        localStorage.setItem(BEST_KEY, String(this.bestScore));
      } catch (err) { /* ignore */ }
    }
  };

  Game.prototype.togglePause = function () {
    if (this.state === "playing") {
      this.state = "paused";
      this.ui.showPause(this.audio.muted);
      this.input.reset();
      this.audio.play("click");
    } else if (this.state === "paused") {
      this.resume();
    }
  };

  Game.prototype.resume = function () {
    if (this.state !== "paused") return;
    this.state = "playing";
    this.ui.hidePause();
    this.input.reset();
    this.audio.play("click");
  };

  Game.prototype.toggleMute = function () {
    this.audio.ensure();
    const muted = this.audio.toggleMute();
    this.ui.setMuteState(muted);
    this.ui.toast(I18n.t(muted ? "toast.soundOff" : "toast.soundOn"), 900);
    if (!muted) this.audio.play("click");
  };

  Game.prototype.addHitstop = function (seconds) {
    if (seconds > this.hitstop) this.hitstop = seconds;
  };

  Game.prototype.shake = function (amount, duration) {
    if (!amount) return;
    if (amount >= this.shakeAmount || this.shakeTime <= 0) {
      this.shakeAmount = amount;
      this.shakeDuration = Math.max(0.05, duration || 0.2);
      this.shakeTime = this.shakeDuration;
    }
  };

  Game.prototype.registerHit = function (enemy, weight) {
    if (!enemy) return;
    this.combo += 1;
    this.comboTimer = 2.2;
    const w = weight || 1;
    const gain = Math.round((8 + this.combo * 3.5) * w);
    this.score += gain;
    this.ui.setScore(this.score);
    this.ui.setCombo(this.combo);
    if (this.combo === 5 || this.combo === 10 || this.combo === 20) {
      this.ui.toast(I18n.t("toast.combo", { n: this.combo }), 900);
      this.audio.play("focus");
    }
  };

  Game.prototype.resetCombo = function () {
    if (this.combo > 0) {
      this.combo = 0;
      this.comboTimer = 0;
      this.ui.setCombo(0);
    }
  };

  Game.prototype.addCoins = function (n) {
    const amount = n || 1;
    this.coins += amount;
    this.score += amount * 5;
    this.ui.setCoins(this.coins);
    this.ui.setScore(this.score);
  };

  Game.prototype.addHealth = function (amount) {
    this.hero.health = Math.min(this.hero.maxHealth, this.hero.health + amount);
    this.ui.setHealth(this.hero.health, this.hero.maxHealth);
  };

  Game.prototype.onEnemyDefeated = function (enemy) {
    if (!enemy) return;
    this.score += enemy.scoreValue;
    this.ui.setScore(this.score);
    if (this.level && this.level.addPickup) {
      const drops = enemy.isBoss ? 8 : (enemy.type === "brute" ? 3 : 1);
      const chance = enemy.isBoss ? 1 : 0.42;
      if (Math.random() < chance) {
        for (let i = 0; i < drops; i++) {
          const p = this.level.addPickup("coin", enemy.x + (Math.random() - 0.5) * 0.9, enemy.z + (Math.random() - 0.5) * 0.9);
          p.vy = 2.2;
          p.y = 1.0;
        }
      }
    }
    if (enemy.isBoss) {
      this.ui.hideBoss();
      this.ui.toast(I18n.t("toast.defeated", { name: enemy.label }), 1800);
      this.bossHideTimer = 1.2;
    }
  };

  Game.prototype.onHeroDeathStart = function () {
    this.ui.showGrabHint(false);
    this.resetCombo();
    this.freezeEnemiesAround();
  };

  Game.prototype.freezeEnemiesAround = function () {
    for (const e of this.enemies) {
      if (!e || e.dead) continue;
      e.attackCooldown = Math.max(e.attackCooldown, 1.3);
    }
  };

  Game.prototype.onHeroDeathComplete = function () {
    this.lives -= 1;
    this.hero.lives = this.lives;
    this.ui.setLives(this.lives);
    this.saveBest();
    if (this.lives <= 0) {
      this.gameOver();
      return;
    }
    if (this.level) {
      this.level.onRespawn();
      this.hero.respawnAt(this.level.respawnX, 0);
      this.ui.toast(I18n.t("toast.lives", { n: this.lives }), 2200);
      this.audio.play("focus");
      this.camInit = false;
      this.particles.burst(new T.Vector3(this.hero.x, 0.6, this.hero.z), "#c8ff55", 18, {
        speed: 3.2, up: 0.9, life: 0.6, spread: 0.3, gravity: -3
      });
    }
  };

  Game.prototype.canGrabSomething = function () {
    const hero = this.hero;
    if (!hero || !hero.canAct()) return false;
    for (const e of this.enemies) {
      if (!e || e.dead || e.isBoss) continue;
      if (!e.canBeGrabbed()) continue;
      if (Math.abs(e.x - hero.x) < 1.5 && Math.abs(e.z - hero.z) < 1.1) return true;
    }
    return false;
  };

  Game.prototype.update = function (dt) {
    this.input.poll();

    if (this.input.wasPressed("mute")) {
      this.toggleMute();
    }

    if (this.input.wasPressed("fullscreen")) {
      this.toggleFullscreen();
    }

    if (this.state === "menu") {
      if (this.input.wasPressed("confirm")) {
        this.requestStart();
        this.input.endFrame();
        return;
      }
      this.hero.update(dt, this.nullInput);
      this.particles.update(dt);
      this.updateLightsFollow();
      this.input.endFrame();
      return;
    }

    if (this.state === "trailer") {
      this.hero.update(dt, this.nullInput);
      this.particles.update(dt);
      this.updateLightsFollow();
      this.input.endFrame();
      return;
    }

    if (this.state === "paused") {
      if (this.input.wasPressed("pause") || this.input.wasPressed("confirm")) {
        this.resume();
      }
      this.input.endFrame();
      return;
    }

    if (this.state === "gameover") {
      if (this.input.wasPressed("confirm")) this.startNewGame();
      this.particles.update(dt);
      this.input.endFrame();
      return;
    }

    if (this.state === "levelclear") {
      if (this.input.wasPressed("confirm")) this.nextLevel();
      this.particles.update(dt);
      this.input.endFrame();
      return;
    }

    if (this.state === "victory") {
      if (this.input.wasPressed("confirm")) this.startNewGame();
      this.particles.update(dt);
      this.input.endFrame();
      return;
    }

    if (this.state === "playing") {
      if (this.input.wasPressed("pause")) {
        this.togglePause();
        this.input.endFrame();
        return;
      }
      // Enter / Confirm: emergency teleport to unstuck from textures or air
      if (this.input.wasPressed("confirm")) {
        this.hero.unstuck();
        this.input.endFrame();
        return;
      }
      this.playTime += dt;
      this.updateShake(dt);

      if (this.hitstop > 0) {
        this.hitstop = Math.max(0, this.hitstop - dt);
        this.particles.update(dt * 0.25);
        this.updateCamera(dt);
        this.updateHud();
        this.input.endFrame();
        return;
      }

      if (this.comboTimer > 0) {
        this.comboTimer -= dt;
        if (this.comboTimer <= 0) this.resetCombo();
      }

      this.hero.update(dt, this.input);

      for (const enemy of this.enemies) {
        if (!enemy) continue;
        enemy.update(dt, this.hero);
      }
      this.separateEnemies();
      this.separateHero();

      if (this.level) this.level.update(dt);

      this.removeExpiredEnemies();
      this.particles.update(dt);
      this.updateCamera(dt);
      this.updateLightsFollow();
      this.updateHud();
      if (this.audio.setMusicIntensity) {
        let intensity = 0.2;
        if (this.level && this.level.waveActive) intensity = 0.62;
        if (this.level && this.level.bossEnemy && !this.level.bossEnemy.dead) intensity = 0.9;
        this.audio.setMusicIntensity(intensity);
      }

      if (this.playTime > 14 && !this.hintFaded) {
        this.hintFaded = true;
        this.ui.fadeHint();
      }
      this.input.endFrame();
      return;
    }

    this.input.endFrame();
  };

  Game.prototype.separateEnemies = function () {
    const list = this.enemies;
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      if (!a || a.dead) continue;
      if (a.state === "grabbed" || a.state === "thrown") continue;
      for (let j = i + 1; j < list.length; j++) {
        const b = list[j];
        if (!b || b.dead) continue;
        if (b.state === "grabbed" || b.state === "thrown") continue;
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const min = (a.radius + b.radius) * 0.9;
        const d2 = dx * dx + dz * dz;
        if (d2 < min * min && d2 > 0.0001) {
          const d = Math.sqrt(d2);
          const push = (min - d) * 0.5;
          const nx = dx / d;
          const nz = dz / d;
          a.x -= nx * push;
          a.z -= nz * push;
          b.x += nx * push;
          b.z += nz * push;
          if (this.level) {
            this.level.clampEntity(a);
            this.level.clampEntity(b);
          }
          a.syncRoot();
          b.syncRoot();
        }
      }
    }
  };

  // The hero has a body too: enemies can no longer stand inside the panther and
  // clip through her while attacking.
  Game.prototype.separateHero = function () {
    const hero = this.hero;
    if (!hero || hero.dead) return;
    for (const e of this.enemies) {
      if (!e || e.dead) continue;
      if (e.state === "grabbed" || e.state === "thrown") continue;
      if (Math.abs((e.y || 0) - (hero.y || 0)) > 0.9) continue;
      const dx = e.x - hero.x;
      const dz = e.z - hero.z;
      const min = (hero.radius + e.radius) * 0.74;
      const d2 = dx * dx + dz * dz;
      if (d2 < min * min && d2 > 0.0001) {
        const d = Math.sqrt(d2);
        const push = min - d;
        const nx = dx / d;
        const nz = dz / d;
        hero.x -= nx * push * 0.45;
        hero.z -= nz * push * 0.45;
        e.x += nx * push * 0.55;
        e.z += nz * push * 0.55;
        if (this.level) {
          this.level.clampEntity(hero);
          this.level.clampEntity(e);
        }
        hero.syncRoot();
        e.syncRoot();
      }
    }
  };

  Game.prototype.removeExpiredEnemies = function () {
    let removed = false;
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (e && e.removable) {
        if (e.root && e.root.parent) e.root.parent.remove(e.root);
        A.disposeObject(e.root);
        this.enemies.splice(i, 1);
        removed = true;
      }
    }
    if (removed && this.level) {
      this.level.waveEnemies = this.level.waveEnemies.filter((e) => e && !e.removable);
    }
  };

  Game.prototype.updateShake = function (dt) {
    if (this.shakeTime > 0) {
      this.shakeTime = Math.max(0, this.shakeTime - dt);
    }
    if (this.shakeTime > 0) {
      const k = this.shakeTime / Math.max(0.001, this.shakeDuration);
      this._shakeX = (Math.random() - 0.5) * 2 * this.shakeAmount * k;
      this._shakeY = (Math.random() - 0.5) * 2 * this.shakeAmount * k * 0.7;
    } else {
      this._shakeX = 0;
      this._shakeY = 0;
      this.shakeAmount = 0;
    }
  };

  Game.prototype.updateCamera = function (dt, immediate) {
    const hero = this.hero;
    if (!hero || !this.level) return;
    // Narrow (portrait) viewports would otherwise show a slice barely wider than
    // the panther. Pull the camera back until the arena is readable again, and
    // scale the look-ahead so the tail never leaves the frame.
    const aspect = Math.max(0.35, this.camera.aspect || 1.6);
    const tanHalf = Math.tan((this.camera.fov * Math.PI) / 360);
    this.camDist = Math.min(13.5, Math.max(8.15, 3.3 / (tanHalf * aspect)));
    const halfW = tanHalf * this.camDist * aspect;
    const lead = Math.min(1.15, halfW * 0.28);
    let desiredX = hero.x + lead;
    const bounds = this.level.getCameraBounds();
    if (bounds.max > bounds.min) {
      desiredX = A.clamp(desiredX, bounds.min, bounds.max);
    } else {
      desiredX = bounds.center;
    }
    desiredX = A.clamp(desiredX, 1.4, this.level.def.length - 1.4);
    if (immediate || !this.camInit || this.camX === null) {
      this.camX = desiredX;
      this.camInit = true;
    } else {
      this.camX = A.damp(this.camX, desiredX, 5.4, dt);
    }
    const lift = this.camDist / 8.15;
    this.camera.position.set(this.camX + this._shakeX, 2.62 * lift + this._shakeY, this.camDist + 0.2);
    this.camera.lookAt(this.camX + 0.35 * lead / 1.15, 0.86 * lift, 0.2);
  };

  Game.prototype.updateLightsFollow = function () {
    const l = this.lights;
    if (l.key && this.level) {
      const x = this.hero.x;
      l.key.position.set(x - 6, 12, 8);
      if (l.keyTarget) {
        l.keyTarget.position.set(x, 0, 0);
        l.keyTarget.updateMatrixWorld();
      }
    }
    if (this.accentLightA && this.level) {
      this.accentLightA.position.x = this.hero.x + 3.5;
    }
    if (this.accentLightB && this.level) {
      this.accentLightB.position.x = this.hero.x - 3.2;
    }
    if (this.heroLight) {
      this.heroLight.position.set(this.hero.x - 0.15, this.hero.y + 1.25, this.hero.z - 1.45);
    }
    if (this.heroFill) {
      this.heroFill.position.set(this.hero.x + 0.45, this.hero.y + 0.95, this.hero.z + 1.15);
    }
  };

  Game.prototype.updateHud = function () {
    const hero = this.hero;
    this.ui.setHealth(hero.health, hero.maxHealth);
    this.ui.setLives(this.lives);
    this.ui.setSpecial(hero.specialCooldown, hero.specialMax);
    this.ui.setJump(hero.jumpStamina, hero.maxJumpStamina);
    this.ui.setGrab(hero.grabCooldown, hero.grabMaxCooldown);
    this.ui.setBuff(hero.buff > 0);
    if (this.level) {
      const boss = this.level.bossEnemy;
      if (boss && this.level.bossUI) {
        this.ui.updateBoss(Math.max(0, boss.health), boss.maxHealth);
      }
      this.ui.showGrabHint(this.canGrabSomething());
    }
  };

  Game.prototype.dispose = function () {
    this.cleanupLevel();
    this.disposeMenuStage();
  };

  NF.Game = Game;
})();
