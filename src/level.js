(function () {
  "use strict";

  const NF = (window.NF = window.NF || {});
  const T = window.THREE;
  const A = NF.Assets;
  const I18n = NF.I18n || { t: function (key) { return key; } };

  const LEVEL_DEFS = [
    {
      nameKey: "level.1.name",
      districtKey: "level.1.district",
      theme: "street",
      length: 84,
      seed: 2101,
      bossIndex: 0,
      objectiveKey: "level.1.objective",
      fogColor: 0x0a111d,
      fogDensity: 0.013,
      hemiSky: 0x5c7ea8,
      hemiGround: 0x16110d,
      hemiIntensity: 0.78,
      keyColor: 0xbcd6ff,
      keyIntensity: 1.25,
      rimColor: 0x7cc6ff,
      accent: 0xc8ff55,
      waves: [
        { trigger: 13, arena: [9, 22], spawns: ["grunt", "grunt"] },
        { trigger: 28, arena: [24, 38], spawns: ["grunt", "agile", "grunt"] },
        { trigger: 45, arena: [41, 56], spawns: ["brute", "grunt", "agile"] },
        { trigger: 63, arena: [59, 76], boss: true, spawns: ["agile", "agile"] }
      ]
    },
    {
      nameKey: "level.2.name",
      districtKey: "level.2.district",
      theme: "dojo",
      length: 78,
      seed: 2202,
      bossIndex: 1,
      objectiveKey: "level.2.objective",
      fogColor: 0x140f12,
      fogDensity: 0.016,
      hemiSky: 0x8d6a52,
      hemiGround: 0x1a110b,
      hemiIntensity: 0.64,
      keyColor: 0xffd7a8,
      keyIntensity: 1.06,
      rimColor: 0x9fd4e6,
      accent: 0x54e0b8,
      waves: [
        { trigger: 12, arena: [8, 21], spawns: ["agile", "agile"] },
        { trigger: 27, arena: [23, 38], spawns: ["agile", "grunt", "agile"] },
        { trigger: 43, arena: [39, 53], spawns: ["brute", "agile", "grunt"] },
        { trigger: 60, arena: [56, 71], boss: true, spawns: ["agile", "grunt"] }
      ]
    },
    {
      nameKey: "level.3.name",
      districtKey: "level.3.district",
      theme: "foundry",
      length: 92,
      seed: 2303,
      bossIndex: 2,
      objectiveKey: "level.3.objective",
      fogColor: 0x120c08,
      fogDensity: 0.02,
      hemiSky: 0x7a5a3c,
      hemiGround: 0x1b0e08,
      hemiIntensity: 0.66,
      keyColor: 0xffc58a,
      keyIntensity: 1.05,
      rimColor: 0x8fb6dc,
      accent: 0xff7a2f,
      waves: [
        { trigger: 13, arena: [9, 23], spawns: ["grunt", "brute"] },
        { trigger: 29, arena: [25, 40], spawns: ["brute", "grunt", "agile"] },
        { trigger: 46, arena: [42, 58], spawns: ["agile", "agile", "brute"] },
        { trigger: 69, arena: [65, 84], boss: true, spawns: ["grunt", "agile", "grunt"] }
      ]
    }
  ];

  function Level(game, index) {
    this.game = game;
    this.index = index;
    this.def = LEVEL_DEFS[index];
    this.name = I18n.t(this.def.nameKey);
    this.district = I18n.t(this.def.districtKey);
    this.theme = this.def.theme;
    this.rng = A.makeRng(this.def.seed);
    this.group = new T.Group();
    this.group.name = "level-" + index;
    game.scene.add(this.group);

    this.minX = 0;
    this.maxX = this.def.length;
    this.activeMinX = 0;
    this.activeMaxX = this.def.length;

    this.obstacles = [];
    this.breakables = [];
    this.pickups = [];
    this.waves = this.def.waves;
    this.waveIndex = 0;
    this.waveActive = false;
    this.currentWave = null;
    this.waveEnemies = [];
    this.waveSerial = 0;

    this.bossEnemy = null;
    this.bossSpawned = false;
    this.bossUI = false;

    this.flagActive = false;
    this.flagRaised = false;
    this.flagRaise = 0;
    this.clearTimer = 0;
    this.cleared = false;
    this.completed = false;
    this.gateOpen = false;
    this.gateAmount = 0;
    this.secretFound = false;

    this.respawnX = 3;
    this.checkpointX = 3;

    this.pickupGroup = new T.Group();
    this.group.add(this.pickupGroup);
    this.shadowGroup = new T.Group();
    this.group.add(this.shadowGroup);

    this.animated = [];
    this.spawnPoints = [];
    this.dustTimer = 1.5;

    this.build();
    this.setObjective(this.def.objectiveKey);
  }

  Level.prototype.setObjective = function (key, vars) {
    this.objectiveKey = key;
    this.objectiveVars = vars || null;
    this.objective = I18n.t(key, vars);
    if (this.game.ui) this.game.ui.setObjective(this.objective);
  };

  Level.prototype.refreshLanguage = function () {
    this.name = I18n.t(this.def.nameKey);
    this.district = I18n.t(this.def.districtKey);
    if (this.bossEnemy) {
      this.bossEnemy.refreshLabel();
      if (this.objectiveKey === "obj.defeatBoss") {
        this.objectiveVars = { name: this.bossEnemy.label };
      }
      if (this.bossUI) this.game.ui.setBossName(this.bossEnemy.label);
    }
    this.objective = I18n.t(this.objectiveKey, this.objectiveVars);
    if (this.game.ui) {
      this.game.ui.setLevel(this.index, this.name);
      this.game.ui.setObjective(this.objective);
    }
  };

  Level.prototype.build = function () {
    this.buildSky();
    this.buildGround();
    this.buildBackdrop();
    if (this.theme === "street") this.buildStreet();
    else if (this.theme === "dojo") this.buildDojo();
    else this.buildFoundry();
    this.buildProps();
    this.buildSecret();
    this.buildFlagAndCastle();
    this.buildLightProps();
  };

  Level.prototype.buildSky = function () {
    const len = this.def.length;
    let palette;
    if (this.theme === "street") {
      palette = {
        sky: ["#0a1220", "#13233a", "#1b2c44"],
        windowA: "#ffd27a",
        windowB: "#8fd5ff",
        moon: true,
        haze: "rgba(88,130,170,0.1)"
      };
    } else if (this.theme === "dojo") {
      palette = {
        sky: ["#160f18", "#2a1b26", "#3a2731"],
        windowA: "#ffb45e",
        windowB: "#d18a5a",
        moon: true,
        haze: "rgba(120,80,70,0.12)"
      };
    } else {
      palette = {
        sky: ["#140b08", "#281409", "#3a1d0d"],
        windowA: "#ff8a3c",
        windowB: "#ffc069",
        moon: false,
        haze: "rgba(150,70,20,0.14)"
      };
    }
    const tex = A.skylineTexture(this.def.seed + 3, palette);
    tex.repeat.set(1, 1);
    const mesh = new T.Mesh(
      new T.PlaneGeometry(len + 70, 18),
      new T.MeshBasicMaterial({ map: tex, fog: false })
    );
    mesh.position.set(len / 2, 7.6, -20);
    this.group.add(mesh);
    this.skyline = mesh;

    const glow = new T.Mesh(
      new T.PlaneGeometry(len + 70, 7),
      new T.MeshBasicMaterial({
        color: this.theme === "foundry" ? 0x361408 : this.theme === "dojo" ? 0x241822 : 0x101f30,
        transparent: true,
        opacity: 0.55,
        fog: false,
        depthWrite: false
      })
    );
    glow.position.set(len / 2, 3.7, -17);
    this.group.add(glow);
  };

  Level.prototype.buildGround = function () {
    const len = this.def.length;
    let tex;
    if (this.theme === "street") {
      tex = A.asphaltTexture();
      tex.repeat.set(len / 5.5, 2.4);
    } else if (this.theme === "dojo") {
      tex = A.woodTexture();
      tex.repeat.set(len / 9, 2);
    } else {
      tex = A.metalTexture();
      tex.repeat.set(len / 9, 2);
    }
    const mat = new T.MeshStandardMaterial({
      map: tex,
      roughness: 0.92,
      metalness: this.theme === "foundry" ? 0.32 : 0.05,
      color: this.theme === "foundry" ? 0xa9b2bd : 0xffffff
    });
    const floor = new T.Mesh(new T.PlaneGeometry(len + 30, 16), mat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(len / 2, 0, 0.4);
    floor.receiveShadow = true;
    this.group.add(floor);
    this.floor = floor;

    if (this.theme === "dojo") {
      const tatamiTex = A.tatamiTexture();
      tatamiTex.repeat.set(len / 6, 1);
      const matSide = new T.MeshStandardMaterial({ map: tatamiTex, roughness: 0.97, metalness: 0, color: 0x9aa084 });
      for (let side = -1; side <= 1; side += 2) {
        const strip = new T.Mesh(new T.PlaneGeometry(len + 10, 2.2), matSide);
        strip.rotation.x = -Math.PI / 2;
        strip.position.set(len / 2, 0.012, side * 3.7);
        strip.receiveShadow = true;
        this.group.add(strip);
      }
      const border = new T.Mesh(new T.PlaneGeometry(len + 10, 0.18), A.standard(0x2a2114, 0.8));
      border.rotation.x = -Math.PI / 2;
      border.position.set(len / 2, 0.02, 2.6);
      this.group.add(border);
    } else {
      const curbTex = A.sidewalkTexture();
      curbTex.repeat.set(len / 6, 1);
      const curbMat = new T.MeshStandardMaterial({ map: curbTex, roughness: 0.9 });
      for (let side = -1; side <= 1; side += 2) {
        const curb = new T.Mesh(new T.BoxGeometry(len + 12, 0.22, 1.6), curbMat);
        curb.position.set(len / 2, 0.11, side * 3.9);
        curb.receiveShadow = true;
        curb.castShadow = true;
        this.group.add(curb);
      }
      if (this.theme === "street") {
        const lineMat = new T.MeshBasicMaterial({ color: 0xc9b04f, transparent: true, opacity: 0.55 });
        for (let x = 6; x < len - 6; x += 9) {
          const line = new T.Mesh(new T.PlaneGeometry(3.2, 0.14), lineMat);
          line.rotation.x = -Math.PI / 2;
          line.position.set(x, 0.02, 0.4);
          this.group.add(line);
        }
      } else {
        const hazard = A.hazardTexture();
        hazard.repeat.set(len / 3, 1);
        const hm = new T.MeshBasicMaterial({ map: hazard, transparent: true, opacity: 0.55 });
        for (let side = -1; side <= 1; side += 2) {
          const strip = new T.Mesh(new T.PlaneGeometry(len + 6, 0.5), hm);
          strip.rotation.x = -Math.PI / 2;
          strip.position.set(len / 2, 0.022, side * 2.85);
          this.group.add(strip);
        }
      }
    }
  };

  Level.prototype.buildBackdrop = function () {
    const len = this.def.length;
    const wallEnd = len - 12;
    let tex;
    if (this.theme === "street") {
      tex = A.brickTexture();
      tex.repeat.set(wallEnd / 12, 1.1);
    } else if (this.theme === "dojo") {
      tex = A.paperTexture();
      tex.repeat.set(wallEnd / 8, 2);
    } else {
      tex = A.metalTexture();
      tex.repeat.set(wallEnd / 9, 2);
    }
    const mat = new T.MeshStandardMaterial({
      map: tex,
      roughness: 0.88,
      metalness: this.theme === "foundry" ? 0.4 : 0.05,
      color: this.theme === "street" ? 0x9a9a9a : this.theme === "dojo" ? 0x6b5140 : this.theme === "foundry" ? 0xb4bac2 : 0xffffff
    });
    const wallHeight = this.theme === "dojo" ? 3.6 : this.theme === "foundry" ? 4.2 : 1.9;
    const wall = new T.Mesh(new T.PlaneGeometry(Math.max(4, wallEnd), wallHeight), mat);
    wall.position.set(wallEnd / 2 - 1, wallHeight / 2, -5.5);
    wall.receiveShadow = true;
    this.group.add(wall);
    this.backWall = wall;

    if (this.theme === "street") this.buildQuayWallCap(wallEnd, wallHeight);
    if (this.theme === "street") this.buildStreetBackdrop(wallEnd);
    else if (this.theme === "dojo") this.buildDojoBackdrop(wallEnd);
    else this.buildFoundryBackdrop(wallEnd);
  };

  Level.prototype.buildQuayWallCap = function (wallEnd, wallHeight) {
    const capMat = A.standard(0x2b3138, 0.86, 0.12);
    const railMat = A.standard(0x1a2026, 0.52, 0.62);
    const cap = A.box(Math.max(4, wallEnd), 0.16, 0.44, capMat, wallEnd / 2 - 1, wallHeight + 0.08, -5.5);
    this.group.add(cap);
    for (let x = 1; x < wallEnd; x += 3.2) {
      const post = A.box(0.055, 0.95, 0.055, railMat, x, wallHeight + 0.55, -5.42);
      this.group.add(post);
    }
    const railTop = A.box(Math.max(4, wallEnd), 0.045, 0.045, railMat, wallEnd / 2 - 1, wallHeight + 1.0, -5.42);
    const railMid = A.box(Math.max(4, wallEnd), 0.035, 0.035, railMat, wallEnd / 2 - 1, wallHeight + 0.56, -5.42);
    this.group.add(railTop);
    this.group.add(railMid);

    // Drainpipes and wall boxes break up the long brick run.
    const pipeMat = A.standard(0x39434b, 0.55, 0.45);
    for (let x = 8; x < wallEnd; x += 17) {
      const pipe = A.cylinder(0.055, 0.055, wallHeight - 0.1, 6, pipeMat, x, wallHeight * 0.5, -5.4);
      this.group.add(pipe);
      const bracket = A.box(0.16, 0.06, 0.12, A.standard(0x242a30, 0.7, 0.4), x, wallHeight * 0.72, -5.42);
      this.group.add(bracket);
    }
  };

  Level.prototype.buildStreetBackdrop = function (wallEnd) {
    const rng = this.rng;
    const lit = ["#ffd27a", "#8fd5ff", "#ffb45e"];
    for (let x = 6; x < wallEnd + 4; x += 13) {
      const h = A.rand(rng, 7, 15);
      const w = A.rand(rng, 6, 9);
      const tex = A.buildingTexture(this.def.seed + Math.floor(x), "#1a222d", lit[Math.floor(rng() * lit.length)]);
      tex.repeat.set(1, 1);
      const bmat = new T.MeshStandardMaterial({ map: tex, roughness: 0.9, metalness: 0.1, emissive: 0x0a0e14, emissiveIntensity: 0.4 });
      const b = new T.Mesh(new T.BoxGeometry(w, h, 3.2), bmat);
      b.position.set(x + A.rand(rng, -1.5, 1.5), h / 2, -7.6);
      b.castShadow = false;
      b.receiveShadow = true;
      this.group.add(b);
      if (rng() > 0.55) {
        const sign = new T.Mesh(
          new T.PlaneGeometry(3.4, 1.05),
          new T.MeshBasicMaterial({ map: A.neonTexture(A.pick(rng, ["NOODLES", "QUAY 9", "OPEN", "MOTEL", "NIGHT MKT"]), A.pick(rng, ["#ff6f8f", "#7ce6ff", "#ffd36a"])) })
        );
        sign.position.set(x + (rng() > 0.5 ? 1.9 : -1.9), A.rand(rng, 3.4, 6.4), -5.72);
        this.group.add(sign);
      }
      if (rng() > 0.6) {
        const mast = A.cylinder(0.05, 0.07, 2.4, 5, A.standard(0x22262b, 0.7, 0.4), x, h + 1.2, -7.6);
        this.group.add(mast);
        const lamp = A.sphere(0.14, A.emissive(0xff5a5a, 1.6), x, h + 2.4, -7.6, 0);
        this.group.add(lamp);
      }
    }

    // Storefront band: a lit layer between the quay wall and the towers so the
    // awnings and neon signs sit on real facades instead of floating in the dark.
    const awningColors = [0x5c2424, 0x1f4a4c, 0x4a3a1c, 0x3a2444];
    const shopFront = A.standard(0x1b232d, 0.92, 0.05);
    const shopFrame = A.standard(0x2a323b, 0.82, 0.2);
    const shopTrim = A.standard(0x39424c, 0.74, 0.28);
    const windowTex = (glow, interior) => A.canvasTexture(256, 128, (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, glow);
      g.addColorStop(0.62, interior);
      g.addColorStop(1, "#141a20");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      // Shelf and bottle silhouettes: enough detail to read as a shop interior.
      ctx.fillStyle = "rgba(9, 13, 17, 0.62)";
      ctx.fillRect(0, 74, w, 6);
      ctx.fillRect(0, 96, w, 5);
      for (let b = 0; b < 9; b++) {
        const bx = 14 + b * 26 + (b % 3) * 4;
        const bh = 16 + (b % 4) * 7;
        ctx.fillRect(bx, 74 - bh, 8, bh);
      }
      ctx.fillStyle = "rgba(9, 13, 17, 0.5)";
      ctx.fillRect(150, 20, 46, 54);
      // Mullions and a dark frame.
      ctx.fillStyle = "#0a0f14";
      ctx.fillRect(w / 2 - 4, 0, 8, h);
      ctx.fillRect(0, h / 2 - 3, w, 6);
      ctx.strokeStyle = "#080c11";
      ctx.lineWidth = 12;
      ctx.strokeRect(0, 0, w, h);
    }, { linear: true });
    const warmWin = new T.MeshBasicMaterial({ map: windowTex("#ffd79a", "#8a5c2a"), color: 0xc8c8c8 });
    const coolWin = new T.MeshBasicMaterial({ map: windowTex("#a9e6ff", "#2c5e74"), color: 0xb8c6cf });
    for (let i = 0; i < 6; i++) {
      const x = 8 + i * 12.5 + A.rand(rng, -1.4, 1.4);
      if (x > wallEnd - 2) break;

      const shop = A.box(6.7, 1.8, 0.62, shopFront, x, 2.69, -6.12);
      shop.castShadow = false;
      this.group.add(shop);
      const header = A.box(6.86, 0.16, 0.68, shopTrim, x, 3.62, -6.12);
      header.castShadow = false;
      this.group.add(header);
      for (let k = -1; k <= 1; k += 2) {
        const pilaster = A.box(0.26, 1.86, 0.7, shopFrame, x + k * 3.3, 2.66, -6.12);
        pilaster.castShadow = false;
        this.group.add(pilaster);
      }

      for (let k = -1; k <= 1; k += 2) {
        const frame = A.box(1.78, 0.98, 0.07, shopFrame, x + k * 1.9, 2.5, -5.8);
        frame.castShadow = false;
        this.group.add(frame);
        const win = new T.Mesh(new T.PlaneGeometry(1.56, 0.78), i % 2 ? coolWin : warmWin);
        win.position.set(x + k * 1.9, 2.5, -5.755);
        this.group.add(win);
      }

      const awning = A.box(3.4, 0.12, 1.05, A.standard(awningColors[i % awningColors.length], 0.82, 0.04), x, 3.02, -5.55);
      awning.rotation.z = A.rand(rng, -0.03, 0.03);
      awning.castShadow = false;
      this.group.add(awning);
      const trim = A.box(3.5, 0.05, 0.06, A.standard(0x8a7a52, 0.6, 0.2), x, 2.96, -5.02);
      trim.castShadow = false;
      this.group.add(trim);
      const spill = new T.Mesh(
        new T.PlaneGeometry(2.8, 1.6),
        new T.MeshBasicMaterial({
          map: A.radialTexture(),
          color: i % 2 ? 0x7ce6ff : 0xffb45e,
          transparent: true,
          opacity: 0.1,
          depthWrite: false,
          blending: T.AdditiveBlending
        })
      );
      spill.position.set(x, 2.42, -5.3);
      this.group.add(spill);
    }

    // Weathered notices and a couple of stencil tags on the retaining wall.
    const posterTex = A.canvasTexture(160, 224, (ctx, w, h) => {
      ctx.fillStyle = "#cdc5ab";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#1c222a";
      ctx.fillRect(9, 9, w - 18, 40);
      ctx.fillStyle = "#d9a13f";
      ctx.fillRect(14, 58, w - 28, h * 0.46);
      ctx.fillStyle = "#252b32";
      ctx.beginPath();
      ctx.arc(w / 2, 58 + h * 0.23, 33, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#a8342f";
      ctx.fillRect(14, h - 52, w - 28, 9);
      ctx.fillStyle = "#6d6455";
      ctx.fillRect(14, h - 35, w - 62, 5);
      ctx.fillRect(14, h - 24, w - 88, 5);
      ctx.fillStyle = "rgba(40, 38, 32, 0.16)";
      ctx.fillRect(0, h - 14, w, 14);
      ctx.fillRect(0, 0, 5, h);
    }, { linear: true });
    const posterTints = [0xffffff, 0xd9e6ff, 0xffe6c0, 0xcfe0d4];
    for (let i = 0; i < 11; i++) {
      const px = 4 + i * 7.1 + A.rand(rng, -1.2, 1.2);
      if (px > wallEnd - 1) break;
      const poster = new T.Mesh(
        new T.PlaneGeometry(A.rand(rng, 0.46, 0.66), A.rand(rng, 0.6, 0.86)),
        new T.MeshStandardMaterial({
          map: posterTex,
          roughness: 0.95,
          color: posterTints[i % posterTints.length]
        })
      );
      poster.position.set(px, A.rand(rng, 0.62, 1.12), -5.415);
      poster.rotation.z = A.rand(rng, -0.05, 0.05);
      this.group.add(poster);
    }
    for (let i = 0; i < 3; i++) {
      const tag = new T.Mesh(
        new T.PlaneGeometry(1.5, 0.5),
        new T.MeshBasicMaterial({
          map: A.canvasTexture(256, 96, (ctx, w, h) => {
            ctx.clearRect(0, 0, w, h);
            ctx.strokeStyle = "rgba(122, 214, 190, 0.92)";
            ctx.lineWidth = 8;
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.moveTo(18, 78);
            ctx.lineTo(44, 18);
            ctx.lineTo(72, 78);
            ctx.moveTo(52, 48);
            ctx.lineTo(84, 48);
            ctx.moveTo(108, 18);
            ctx.lineTo(108, 78);
            ctx.lineTo(150, 78);
            ctx.moveTo(188, 18);
            ctx.lineTo(164, 48);
            ctx.lineTo(188, 78);
            ctx.moveTo(164, 48);
            ctx.lineTo(198, 48);
            ctx.stroke();
          }, { linear: true }),
          transparent: true,
          opacity: 0.8,
          depthWrite: false
        })
      );
      tag.position.set(14 + i * 26, 1.18, -5.395);
      this.group.add(tag);
    }

    // Far skyline silhouettes
    for (let x = -2; x < wallEnd + 8; x += A.rand(rng, 9, 16)) {
      const h = A.rand(rng, 5, 11);
      const w = A.rand(rng, 4, 8);
      const sil = new T.Mesh(
        new T.BoxGeometry(w, h, 2),
        new T.MeshBasicMaterial({ color: 0x0b121b, fog: false })
      );
      sil.position.set(x, h / 2 + 0.5, -13.5);
      this.group.add(sil);
    }
  };

  Level.prototype.buildDojoBackdrop = function (wallEnd) {
    const rng = this.rng;
    if (!this.mountainTex) {
      this.mountainTex = A.canvasTexture(1024, 320, (ctx, w, h) => {
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, "#170f1a");
        grad.addColorStop(0.5, "#2b1a26");
        grad.addColorStop(1, "#3b2731");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        const moon = ctx.createRadialGradient(w * 0.78, h * 0.24, 4, w * 0.78, h * 0.24, 62);
        moon.addColorStop(0, "rgba(255,230,190,0.95)");
        moon.addColorStop(0.2, "rgba(255,200,140,0.38)");
        moon.addColorStop(1, "rgba(255,170,90,0)");
        ctx.fillStyle = moon;
        ctx.fillRect(w * 0.78 - 70, h * 0.24 - 70, 140, 140);
        ctx.fillStyle = "#ffe2b0";
        ctx.beginPath();
        ctx.arc(w * 0.78, h * 0.24, 15, 0, Math.PI * 2);
        ctx.fill();
        for (let layer = 0; layer < 3; layer++) {
          ctx.fillStyle = ["rgba(20,13,20,0.55)", "rgba(16,10,16,0.8)", "rgba(9,6,10,0.96)"][layer];
          ctx.beginPath();
          ctx.moveTo(-20, h);
          let y = h * (0.5 + layer * 0.12);
          for (let x = -20; x < w + 40; x += 42) {
            y += A.rand(rng, -26, 26);
            y = Math.max(h * 0.25, Math.min(h * 0.92, y));
            ctx.lineTo(x, y);
          }
          ctx.lineTo(w + 40, h);
          ctx.closePath();
          ctx.fill();
        }
      });
    }
    const sky = new T.Mesh(
      new T.PlaneGeometry(this.def.length + 70, 18),
      new T.MeshBasicMaterial({ map: this.mountainTex, fog: false })
    );
    sky.position.set(this.def.length / 2, 7.6, -19);
    this.group.add(sky);

    // Low moon above the roofline: a single calm focal point in the dark band
    // above the shoji screens.
    const moon = new T.Mesh(
      new T.CircleGeometry(1.15, 24),
      new T.MeshBasicMaterial({ color: 0xfff0cc, fog: false })
    );
    moon.position.set(this.def.length * 0.58, 6.4, -18.4);
    this.group.add(moon);
    const moonGlow = new T.Sprite(new T.SpriteMaterial({
      map: A.radialTexture(),
      color: 0xffd9a0,
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
      blending: T.AdditiveBlending,
      fog: false
    }));
    moonGlow.position.set(this.def.length * 0.58, 6.4, -18.34);
    moonGlow.scale.set(7.2, 7.2, 1);
    this.group.add(moonGlow);

    if (!this.shojiTex) {
      const tr = A.makeRng(7712);
      this.shojiTex = A.canvasTexture(512, 256, (ctx, w, h) => {
        const g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, "#8a6749");
        g.addColorStop(0.42, "#cdb28a");
        g.addColorStop(0.76, "#efd7ae");
        g.addColorStop(1, "#c6a87f");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 520; i++) {
          ctx.fillStyle = "rgba(92, 66, 42, " + A.rand(tr, 0.02, 0.06) + ")";
          ctx.fillRect(A.rand(tr, 0, w), A.rand(tr, 0, h), A.rand(tr, 1, 3), A.rand(tr, 2, 9));
        }
        const hot = ctx.createRadialGradient(w * 0.5, h * 1.02, 10, w * 0.5, h * 1.02, 210);
        hot.addColorStop(0, "rgba(255, 202, 128, 0.3)");
        hot.addColorStop(1, "rgba(255, 202, 128, 0)");
        ctx.fillStyle = hot;
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = "#2a1c12";
        ctx.lineWidth = 11;
        for (let c = 0; c <= 4; c++) {
          ctx.beginPath();
          ctx.moveTo((w / 4) * c, 0);
          ctx.lineTo((w / 4) * c, h);
          ctx.stroke();
        }
        for (let r = 0; r <= 3; r++) {
          ctx.beginPath();
          ctx.moveTo(0, (h / 3) * r);
          ctx.lineTo(w, (h / 3) * r);
          ctx.stroke();
        }
      }, { linear: true });
    }
    const shojiMat = new T.MeshBasicMaterial({ map: this.shojiTex, color: 0xe4d3b4 });
    const pillarMat = A.standard(0x3a2718, 0.78, 0.02);
    for (let x = 4; x < wallEnd; x += 11) {
      const pillar = A.cylinder(0.19, 0.21, 3.7, 6, pillarMat, x, 1.85, -5.1);
      this.group.add(pillar);
      const beam = A.box(11.4, 0.28, 0.34, pillarMat, x + 5.4, 3.64, -5.1);
      this.group.add(beam);
      const panel = new T.Mesh(new T.PlaneGeometry(8.7, 3.0), shojiMat);
      panel.position.set(x + 5.5, 1.95, -5.42);
      this.group.add(panel);
      const bracket = A.box(0.5, 0.16, 0.5, A.standard(0x2b1e14, 0.82, 0.04), x, 3.46, -4.95);
      this.group.add(bracket);
    }

    // Deep eave board and rafter ends: gives the open wall a roof line and
    // keeps the moonlit sky reading as a separate layer.
    const eave = A.box(Math.max(4, wallEnd), 0.22, 1.3, A.standard(0x241a12, 0.86, 0.05), wallEnd / 2 - 1, 3.82, -4.9);
    this.group.add(eave);
    for (let x = 6; x < wallEnd; x += 4.4) {
      const rafter = A.box(0.12, 0.14, 1.5, A.standard(0x1d150e, 0.9, 0.04), x, 3.7, -4.72);
      this.group.add(rafter);
    }

    // Jade cloth banners: the district identity colour against the warm paper.
    if (!this.bannerTex) {
      this.bannerTex = A.canvasTexture(128, 256, (ctx, w, h) => {
        ctx.fillStyle = "#1d6b58";
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = "rgba(8, 40, 34, 0.24)";
        for (let x = 0; x < w; x += 9) ctx.fillRect(x, 0, 2, h);
        ctx.strokeStyle = "rgba(234, 240, 224, 0.9)";
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.arc(w / 2, 102, 33, 0.45, 5.5);
        ctx.stroke();
        ctx.fillStyle = "#e8efe2";
        ctx.beginPath();
        ctx.moveTo(64, 52);
        ctx.lineTo(76, 96);
        ctx.lineTo(64, 158);
        ctx.lineTo(52, 96);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#144c40";
        ctx.fillRect(0, 0, w, 13);
        ctx.fillRect(0, h - 11, w, 11);
      }, { linear: true });
    }
    const bannerMat = new T.MeshStandardMaterial({ map: this.bannerTex, roughness: 0.92, side: T.DoubleSide });
    for (let i = 0; i < 3; i++) {
      const bx = 20 + i * 21;
      if (bx > wallEnd - 3) break;
      const rod = A.cylinder(0.03, 0.03, 1.5, 5, A.standard(0x241a12, 0.7), bx, 3.35, -5.34);
      rod.rotation.z = Math.PI / 2;
      this.group.add(rod);
      const banner = new T.Mesh(new T.PlaneGeometry(1.08, 2.0), bannerMat);
      banner.position.set(bx, 2.32, -5.32);
      this.group.add(banner);
    }

    // Hanging lanterns, now low enough to read behind the fighters.
    const lanternColors = [0x54e0b8, 0xffb15e, 0x54e0b8, 0xff7a52, 0xffd08a, 0x54e0b8];
    for (let i = 0; i < 12; i++) {
      const x = 8 + i * 5.6;
      if (x > wallEnd - 2) break;
      const cord = A.cylinder(0.012, 0.012, 0.62, 4, A.basic(0x17120d), x, 3.38, -4.6);
      this.group.add(cord);
      const lampColor = lanternColors[i % lanternColors.length];
      const lamp = new T.Mesh(
        new T.SphereGeometry(0.2, 8, 6),
        A.emissive(lampColor, 1.7, { transparent: true, opacity: 0.94 })
      );
      lamp.position.set(x, 2.95, -4.6);
      lamp.scale.y = 1.35;
      this.group.add(lamp);
      const cap = A.cylinder(0.115, 0.115, 0.05, 6, A.standard(0x241a10, 0.7), x, 3.25, -4.6);
      this.group.add(cap);
      const base = A.cylinder(0.08, 0.08, 0.04, 6, A.standard(0x241a10, 0.7), x, 2.63, -4.6);
      this.group.add(base);
      const halo = new T.Sprite(new T.SpriteMaterial({
        map: A.radialTexture(),
        color: lampColor,
        transparent: true,
        opacity: 0.3,
        depthWrite: false,
        blending: T.AdditiveBlending
      }));
      halo.position.set(x, 2.95, -4.58);
      halo.scale.set(1.1, 1.4, 1);
      halo.renderOrder = 4;
      this.group.add(halo);
      const pool = new T.Mesh(
        new T.CircleGeometry(0.9, 12),
        new T.MeshBasicMaterial({
          map: A.radialTexture(),
          color: lampColor,
          transparent: true,
          opacity: 0.11,
          depthWrite: false,
          blending: T.AdditiveBlending
        })
      );
      pool.rotation.x = -Math.PI / 2;
      pool.position.set(x, 0.03, -4.0);
      pool.scale.set(1.7, 1.1, 1);
      this.group.add(pool);
      this.animated.push({ type: "lantern", mesh: lamp, baseY: 2.95, phase: i * 0.9 });
    }

    // Bamboo
    for (let i = 0; i < 18; i++) {
      const x = A.rand(rng, 2, wallEnd);
      const z = -7.2 + A.rand(rng, -0.7, 0.7);
      const h = A.rand(rng, 4, 7);
      const stalk = A.cylinder(0.06, 0.08, h, 5, A.standard(0x3f5a2c, 0.85), x, h / 2, z);
      this.group.add(stalk);
      for (let k = 0; k < 3; k++) {
        const leaf = A.box(0.7, 0.05, 0.16, A.standard(0x4c6b34, 0.85), 0, 0, 0);
        leaf.position.set(x + A.rand(rng, -0.3, 0.3), h * 0.55 + k * 0.5, z + A.rand(rng, -0.4, 0.4));
        leaf.rotation.z = A.rand(rng, -0.5, 0.5);
        leaf.rotation.y = A.rand(rng, 0, 3);
        this.group.add(leaf);
      }
    }
  };

  Level.prototype.buildFoundryBackdrop = function (wallEnd) {
    const rng = this.rng;
    // Pipes
    const pipeMat = A.standard(0x4b423a, 0.55, 0.55);
    for (let y = 1.6; y < 5.6; y += 1.35) {
      const p = A.cylinder(0.16, 0.16, wallEnd - 2, 7, pipeMat, wallEnd / 2, y, -5.0);
      p.rotation.z = Math.PI / 2;
      this.group.add(p);
      for (let x = 6; x < wallEnd; x += 14) {
        const joint = A.cylinder(0.23, 0.23, 0.32, 7, A.standard(0x6a5c4e, 0.5, 0.6), x, y, -5.0);
        joint.rotation.z = Math.PI / 2;
        this.group.add(joint);
      }
    }
    // Support beams
    for (let x = 3; x < wallEnd; x += 9.5) {
      const beam = A.box(0.45, 5.4, 0.5, A.standard(0x3a322a, 0.7, 0.4), x, 2.7, -4.7);
      this.group.add(beam);
      const brace = A.box(2.4, 0.18, 0.3, A.standard(0x453b31, 0.75, 0.35), x + 1.2, 5.1, -4.7);
      brace.rotation.z = -0.35;
      this.group.add(brace);
    }
    // Containers / machinery behind
    for (let x = 7; x < wallEnd - 2; x += A.rand(rng, 11, 17)) {
      const cw = A.rand(rng, 3.4, 5.6);
      const ch = A.rand(rng, 2.2, 3.6);
      const color = A.pick(rng, [0x4b3a2c, 0x3c4a46, 0x5a3a2a, 0x2f3d3a]);
      const c = A.box(cw, ch, 2.2, A.standard(color, 0.72, 0.35), x, ch / 2, -7.4);
      this.group.add(c);
      for (let i = 0; i < 3; i++) {
        const rib = A.box(0.1, ch * 0.9, 2.26, A.standard(0x211c17, 0.8, 0.3), x - cw / 2 + 0.5 + i * (cw - 1) / 2, ch / 2, -7.4);
        this.group.add(rib);
      }
      if (rng() > 0.45) {
        const glow = A.box(0.5, 0.25, 0.05, A.emissive(0xff7a2f, 1.8), x, ch * 0.55, -6.24);
        this.group.add(glow);
      }
    }
    // Hanging cables
    for (let i = 0; i < 10; i++) {
      const x0 = A.rand(rng, 2, wallEnd - 2);
      const y0 = A.rand(rng, 4.4, 5.4);
      const cable = new T.Mesh(
        new T.TubeGeometry(new T.CatmullRomCurve3([
          new T.Vector3(x0, y0, -4.6),
          new T.Vector3(x0 + 1.2, y0 - 0.7, -4.6),
          new T.Vector3(x0 + 2.6, y0 - 0.2, -4.6),
          new T.Vector3(x0 + 4.0, y0 - 0.9, -4.6)
        ]), 10, 0.025, 4, false),
        A.standard(0x1b1713, 0.9, 0.1)
      );
      this.group.add(cable);
    }
    // Furnace glow seams
    for (let x = 16; x < wallEnd; x += 24) {
      const seam = new T.Mesh(
        new T.PlaneGeometry(6, 0.16),
        new T.MeshBasicMaterial({ color: 0xff8a3c, transparent: true, opacity: 0.6 })
      );
      seam.position.set(x, 0.35, -4.82);
      this.group.add(seam);
      this.animated.push({ type: "ember", mesh: seam, phase: x });
    }

    // Open furnace doors: the main heat focal points on the wall.
    if (!this.furnaceTex) {
      const fr = A.makeRng(3301);
      this.furnaceTex = A.canvasTexture(256, 192, (ctx, w, h) => {
        ctx.fillStyle = "#1a0a04";
        ctx.fillRect(0, 0, w, h);
        const g = ctx.createRadialGradient(w / 2, h * 0.8, 6, w / 2, h * 0.8, w * 0.62);
        g.addColorStop(0, "#fff6cf");
        g.addColorStop(0.24, "#ffca63");
        g.addColorStop(0.52, "#f07a1f");
        g.addColorStop(0.8, "#8f2d08");
        g.addColorStop(1, "#1f0903");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = "rgba(16, 9, 5, 0.9)";
        for (let x = 14; x < w; x += 34) ctx.fillRect(x, 0, 7, h);
        ctx.fillStyle = "rgba(28, 13, 6, 0.92)";
        ctx.fillRect(0, h * 0.46, w, 7);
        ctx.strokeStyle = "#0b0603";
        ctx.lineWidth = 16;
        ctx.strokeRect(0, 0, w, h);
        for (let i = 0; i < 24; i++) {
          ctx.fillStyle = "rgba(255, " + Math.floor(A.rand(fr, 170, 240)) + ", 120, " + A.rand(fr, 0.35, 0.8) + ")";
          ctx.fillRect(A.rand(fr, 8, w - 8), A.rand(fr, 8, h - 8), 2, 2);
        }
      }, { linear: true });
    }
    const furnaceIron = A.standard(0x2b2723, 0.55, 0.7);
    const furnaceGlowMat = new T.MeshBasicMaterial({ map: this.furnaceTex });
    for (const fx of [8, 27, 46, 65]) {
      if (fx > wallEnd - 4) break;
      const frame = A.box(3.3, 2.55, 0.26, furnaceIron, fx, 1.35, -5.14);
      frame.castShadow = false;
      this.group.add(frame);
      const glow = new T.Mesh(new T.PlaneGeometry(2.5, 1.72), furnaceGlowMat);
      glow.position.set(fx, 1.21, -4.995);
      this.group.add(glow);
      const hood = A.box(3.6, 0.3, 0.62, furnaceIron, fx, 2.74, -5.06);
      hood.castShadow = false;
      this.group.add(hood);
      const stack = A.cylinder(0.2, 0.24, 0.8, 7, furnaceIron, fx, 3.24, -5.12);
      this.group.add(stack);
      const halo = new T.Sprite(new T.SpriteMaterial({
        map: A.radialTexture(),
        color: 0xff8a3c,
        transparent: true,
        opacity: 0.26,
        depthWrite: false,
        blending: T.AdditiveBlending
      }));
      halo.position.set(fx, 1.25, -4.9);
      halo.scale.set(5.2, 3.5, 1);
      this.group.add(halo);
      const pool = new T.Mesh(
        new T.CircleGeometry(1.35, 14),
        new T.MeshBasicMaterial({
          map: A.radialTexture(),
          color: 0xff7a2a,
          transparent: true,
          opacity: 0.13,
          depthWrite: false,
          blending: T.AdditiveBlending
        })
      );
      pool.rotation.x = -Math.PI / 2;
      pool.position.set(fx, 0.034, -2.6);
      pool.scale.set(1.9, 1.1, 1);
      this.group.add(pool);
    }

    // Wall-mounted maintenance catwalk above the furnace line.
    const catwalkMat = A.standard(0x2d3339, 0.6, 0.55);
    const deck = A.box(Math.max(4, wallEnd), 0.14, 1.1, catwalkMat, wallEnd / 2 - 1, 4.3, -6.3);
    deck.castShadow = false;
    this.group.add(deck);
    for (let x = 3; x < wallEnd; x += 3.6) {
      const post = A.box(0.055, 1.1, 0.055, catwalkMat, x, 4.85, -5.72);
      post.castShadow = false;
      this.group.add(post);
      const bracket = A.box(0.7, 0.09, 0.09, catwalkMat, x, 4.24, -5.61);
      bracket.castShadow = false;
      this.group.add(bracket);
    }
    const railTop = A.box(Math.max(4, wallEnd), 0.06, 0.06, catwalkMat, wallEnd / 2 - 1, 5.3, -5.72);
    const railMid = A.box(Math.max(4, wallEnd), 0.04, 0.04, catwalkMat, wallEnd / 2 - 1, 4.85, -5.72);
    railTop.castShadow = false;
    railMid.castShadow = false;
    this.group.add(railTop);
    this.group.add(railMid);

    // Caged work lamps under the catwalk: warm anchors in the upper dark band.
    for (const lx of [16, 38, 58, 76]) {
      if (lx > wallEnd - 2) break;
      const arm = A.box(0.06, 0.06, 0.42, catwalkMat, lx, 4.3, -5.58);
      arm.castShadow = false;
      this.group.add(arm);
      const cord = A.cylinder(0.014, 0.014, 0.5, 4, A.basic(0x17120d), lx, 4.05, -5.38);
      this.group.add(cord);
      const cage = A.cylinder(0.19, 0.22, 0.1, 7, A.standard(0x1d1712, 0.65, 0.5), lx, 3.74, -5.38);
      this.group.add(cage);
      const bulb = new T.Mesh(new T.SphereGeometry(0.14, 8, 6), A.emissive(0xffb347, 1.8));
      bulb.position.set(lx, 3.68, -5.38);
      this.group.add(bulb);
      const lampGlow = new T.Sprite(new T.SpriteMaterial({
        map: A.radialTexture(),
        color: 0xffbe6a,
        transparent: true,
        opacity: 0.28,
        depthWrite: false,
        blending: T.AdditiveBlending
      }));
      lampGlow.position.set(lx, 3.68, -5.3);
      lampGlow.scale.set(1.9, 1.9, 1);
      this.group.add(lampGlow);
      const spill = new T.Mesh(
        new T.CircleGeometry(1.1, 12),
        new T.MeshBasicMaterial({
          map: A.radialTexture(),
          color: 0xffb45e,
          transparent: true,
          opacity: 0.08,
          depthWrite: false,
          blending: T.AdditiveBlending
        })
      );
      spill.rotation.x = -Math.PI / 2;
      spill.position.set(lx, 0.033, -2.35);
      spill.scale.set(2.4, 1.2, 1);
      this.group.add(spill);
    }
  };

  Level.prototype.buildStreet = function () {
    const rng = this.rng;
    const len = this.def.length;
    // Street lamps near the sidewalk
    for (let x = 8; x < len - 8; x += 15) {
      const pole = A.cylinder(0.07, 0.1, 4.4, 6, A.standard(0x1c2026, 0.55, 0.5), x, 2.2, -3.3);
      this.group.add(pole);
      const arm = A.box(0.9, 0.08, 0.08, A.standard(0x1c2026, 0.55, 0.5), x + 0.42, 4.35, -3.3);
      this.group.add(arm);
      const lamp = A.box(0.34, 0.14, 0.24, A.emissive(0xffe0a0, 1.5), x + 0.8, 4.26, -3.3);
      this.group.add(lamp);
      const glow = new T.Mesh(
        new T.PlaneGeometry(2.4, 2.4),
        new T.MeshBasicMaterial({ map: A.radialTexture(), color: 0xffdca0, transparent: true, opacity: 0.18, depthWrite: false, blending: T.AdditiveBlending })
      );
      glow.position.set(x + 0.8, 4.1, -3.2);
      this.group.add(glow);
    }
    // Puddles
    for (let i = 0; i < 14; i++) {
      const px = A.rand(rng, 2, len - 2);
      const pz = A.rand(rng, -2.4, 2.4);
      const pr = A.rand(rng, 0.4, 1.15);
      const puddle = new T.Mesh(
        new T.CircleGeometry(pr, 12),
        new T.MeshStandardMaterial({ color: 0x1a2531, roughness: 0.15, metalness: 0.5, transparent: true, opacity: 0.62 })
      );
      puddle.rotation.x = -Math.PI / 2;
      puddle.position.set(px, 0.02, pz);
      this.group.add(puddle);
      // Additive colour slick: reads as a neon reflection on wet asphalt.
      const slick = new T.Mesh(
        new T.CircleGeometry(pr * 0.82, 12),
        new T.MeshBasicMaterial({
          color: i % 3 === 0 ? 0x7ce6ff : i % 3 === 1 ? 0xff6f8f : 0xffd36a,
          transparent: true,
          opacity: 0.1,
          depthWrite: false,
          blending: T.AdditiveBlending
        })
      );
      slick.rotation.x = -Math.PI / 2;
      slick.position.set(px + pr * 0.12, 0.024, pz - pr * 0.08);
      slick.scale.set(0.72, 0.42, 1);
      this.group.add(slick);
    }
    // Road cones
    for (let i = 0; i < 8; i++) {
      const x = A.rand(rng, 5, len - 5);
      const z = A.pick(rng, [-2.3, 2.3]);
      const cone = A.cone(0.19, 0.5, 6, A.standard(0xd06a2a, 0.7, 0.05), x, 0.25, z);
      this.group.add(cone);
      const band = A.cylinder(0.13, 0.16, 0.07, 6, A.standard(0xd8d8d0, 0.6), x, 0.32, z);
      this.group.add(band);
    }
  };

  Level.prototype.buildDojo = function () {
    const rng = this.rng;
    const len = this.def.length;
    // Training dummies
    for (let i = 0; i < 5; i++) {
      const x = 10 + i * 13 + A.rand(rng, -2, 2);
      const z = A.pick(rng, [-3.1, 3.1]);
      const base = A.cylinder(0.38, 0.42, 0.14, 8, A.standard(0x2f2418, 0.8), x, 0.07, z);
      this.group.add(base);
      const post = A.cylinder(0.1, 0.12, 1.5, 6, A.standard(0x4d3722, 0.8), x, 0.8, z);
      this.group.add(post);
      const pad = A.box(0.42, 0.6, 0.34, A.standard(0x6d4a2a, 0.9), x + 0.14, 1.25, z);
      this.group.add(pad);
      const arm = A.box(0.8, 0.1, 0.1, A.standard(0x4d3722, 0.8), x, 1.35, z);
      this.group.add(arm);
    }
    // Stone lanterns
    for (let i = 0; i < 6; i++) {
      const x = 12 + i * 11;
      const z = -3.2;
      const base = A.box(0.5, 0.18, 0.5, A.standard(0x555149, 0.9), x, 0.09, z);
      const post = A.cylinder(0.1, 0.13, 0.75, 6, A.standard(0x555149, 0.9), x, 0.55, z);
      const cap = A.box(0.44, 0.1, 0.44, A.standard(0x44413a, 0.9), x, 1.05, z);
      const light = A.box(0.26, 0.26, 0.26, A.emissive(0xffb45e, 1.4), x, 0.92, z);
      this.group.add(base);
      this.group.add(post);
      this.group.add(cap);
      this.group.add(light);
    }
    // Floor mats and training marks
    for (let i = 0; i < 9; i++) {
      const ring = new T.Mesh(
        new T.RingGeometry(0.8, 0.88, 22),
        new T.MeshBasicMaterial({ color: 0x2c2317, transparent: true, opacity: 0.35, side: T.DoubleSide })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(16 + i * 6.2, 0.021, 0);
      this.group.add(ring);
    }
  };

  Level.prototype.buildFoundry = function () {
    const rng = this.rng;
    const len = this.def.length;
    // Machine drums: kept on the wall side only so nothing occludes the near
    // edge of the playfield where enemies close in.
    for (let i = 0; i < 9; i++) {
      const x = A.rand(rng, 6, len - 8);
      const z = -4.15 + A.rand(rng, -0.35, 0.35);
      const drum = A.cylinder(0.44, 0.5, 0.86, 9, A.standard(0x3b352e, 0.6, 0.5), x, 0.43, z);
      this.group.add(drum);
      const rim = A.cylinder(0.49, 0.49, 0.08, 9, A.standard(0x5a5047, 0.5, 0.55), x, 0.86, z);
      this.group.add(rim);
      const glow = A.box(0.16, 0.08, 0.05, A.emissive(0xff7a2f, 1.6), x, 0.56, z + 0.48);
      this.group.add(glow);
    }

    // Oil and coolant stains catch the furnace light and break up the floor.
    for (let i = 0; i < 6; i++) {
      const px = A.rand(rng, 10, len - 10);
      const pz = A.rand(rng, -2.1, 2.1);
      const pr = A.rand(rng, 0.38, 0.95);
      const stain = new T.Mesh(
        new T.CircleGeometry(pr, 14),
        new T.MeshStandardMaterial({ color: 0x0b0c0e, roughness: 0.26, metalness: 0.6, transparent: true, opacity: 0.66 })
      );
      stain.rotation.x = -Math.PI / 2;
      stain.position.set(px, 0.012, pz);
      this.group.add(stain);
      const sheen = new T.Mesh(
        new T.CircleGeometry(pr * 0.74, 14),
        new T.MeshBasicMaterial({
          color: 0xff8a3c,
          transparent: true,
          opacity: 0.06,
          depthWrite: false,
          blending: T.AdditiveBlending
        })
      );
      sheen.rotation.x = -Math.PI / 2;
      sheen.position.set(px + pr * 0.08, 0.014, pz - pr * 0.06);
      sheen.scale.set(0.82, 0.46, 1);
      this.group.add(sheen);
    }
    // Overhead chain hoists
    for (let i = 0; i < 6; i++) {
      const x = 14 + i * 13;
      const chain = A.cylinder(0.02, 0.02, 2.6, 4, A.standard(0x2a2a2c, 0.6, 0.7), x, 5.3, -2.8);
      this.group.add(chain);
      const hook = A.box(0.3, 0.26, 0.1, A.standard(0x3f4144, 0.5, 0.65), x, 4.0, -2.8);
      this.group.add(hook);
      this.animated.push({ type: "hoist", mesh: hook, baseX: x, phase: i * 0.7 });
    }
    // Steam vents
    this.spawnPoints = [];
    for (let i = 0; i < 5; i++) {
      const x = 18 + i * 15;
      this.spawnPoints.push(new T.Vector3(x, 0.15, -4.3));
      const vent = A.box(0.6, 0.16, 0.4, A.standard(0x2a2620, 0.7, 0.4), x, 0.08, -4.2);
      this.group.add(vent);
    }
  };

  Level.prototype.buildProps = function () {
    const rng = this.rng;
    const len = this.def.length;

    const crateSpots = [
      { x: 20.5, z: -2.25, bonus: false },
      { x: 22.0, z: 2.2, bonus: true },
      { x: 35.0, z: -2.2, bonus: false },
      { x: 52.0, z: 2.2, bonus: false },
      { x: 54.0, z: -2.35, bonus: true }
    ];
    if (len > 85) crateSpots.push({ x: 76, z: 2.25, bonus: false });
    for (const spot of crateSpots) {
      if (spot.x > len - 12) continue;
      this.addCrate(spot.x, spot.z, { bonus: spot.bonus });
    }

    const barrelSpots = [
      { x: 16.5, z: 2.3 },
      { x: 30.0, z: -2.3 },
      { x: 47.5, z: 2.28 },
      { x: len - 18, z: -2.25 }
    ];
    for (const spot of barrelSpots) {
      if (spot.x > len - 13) continue;
      this.addBarrel(spot.x, spot.z);
    }

    // Non-breakable scenery obstacles
    if (this.theme === "street") {
      this.addBlockObstacle(12.5, 2.45, 0.7, 0.9, 0x263039, "planter");
      this.addBlockObstacle(len - 22, 2.4, 0.8, 0.8, 0x2a333c, "bench");
    } else if (this.theme === "dojo") {
      this.addBlockObstacle(17, -2.35, 0.5, 1.1, 0x4a3420, "pedestal");
      this.addBlockObstacle(len - 20, 2.35, 0.6, 0.9, 0x4a3420, "pedestal");
    } else {
      this.addBlockObstacle(24, 2.35, 0.7, 1.0, 0x3d3730, "crate");
      this.addBlockObstacle(len - 24, -2.35, 0.7, 1.2, 0x3d3730, "crate");
    }

    // Coins and pickups
    const coinRuns = [
      [7, 1.0, 5],
      [18, -1.2, 4],
      [31, 0.8, 5],
      [42, -0.8, 4],
      [57, 1.1, 5],
      [68, -1.0, 4]
    ];
    for (const run of coinRuns) {
      if (run[0] > len - 12) continue;
      this.addCoinRun(run[0], run[1], run[2]);
    }
    this.addPickup("health", 26, 1.8);
    this.addPickup("focus", 49, -1.9);
    this.addPickup("gem", 38, 1.6);

    // Hand-placed extra coins near secrets
    for (let i = 0; i < 6; i++) {
      const r = rng() * 2 - 1;
      this.addPickup("coin", 33 + i * 0.65, -1.9 + r * 0.5);
    }
  };

  Level.prototype.addBlockObstacle = function (x, z, radius, height, color, kind) {
    const g = new T.Group();
    let mesh;
    if (kind === "pedestal") {
      mesh = A.box(0.6, height, 0.6, A.standard(color, 0.85, 0.05), 0, height / 2, 0);
      const top = A.box(0.74, 0.08, 0.74, A.standard(0x6a4d2e, 0.7), 0, height + 0.04, 0);
      g.add(top);
    } else if (kind === "planter") {
      mesh = A.box(1.2, 0.7, 0.8, A.standard(color, 0.8, 0.05), 0, 0.35, 0);
      const bush = A.sphere(0.4, A.standard(0x2c4630, 0.9), 0, 0.85, 0, 1);
      bush.scale.set(1.3, 0.8, 1);
      g.add(bush);
    } else {
      mesh = A.box(1.1, height, 0.8, A.standard(color, 0.8, 0.1), 0, height / 2, 0);
    }
    g.add(mesh);
    g.position.set(x, 0, z);
    g.rotation.y = A.rand(this.rng, -0.2, 0.2);
    this.group.add(g);
    this.obstacles.push({ x: x, z: z, radius: radius, solid: true, mesh: g, breakable: false, broken: false });
  };

  Level.prototype.addCrate = function (x, z, opts) {
    const o = opts || {};
    const g = new T.Group();
    const tex = A.crateTexture();
    const mat = new T.MeshStandardMaterial({ map: tex, roughness: 0.82, metalness: 0.05 });
    const box = A.box(0.82, 0.82, 0.82, mat, 0, 0.41, 0);
    g.add(box);
    const strapMat = A.standard(0x2b2e32, 0.6, 0.3);
    const strap1 = A.box(0.86, 0.08, 0.86, strapMat, 0, 0.41, 0);
    g.add(strap1);
    if (o.bonus) {
      const glow = new T.Mesh(
        new T.PlaneGeometry(1.3, 1.3),
        new T.MeshBasicMaterial({ map: A.radialTexture(), color: 0xffd36a, transparent: true, opacity: 0.28, depthWrite: false, blending: T.AdditiveBlending })
      );
      glow.rotation.x = -Math.PI / 2;
      glow.position.set(0, 0.03, 0);
      g.add(glow);
    }
    g.position.set(x, 0, z);
    g.rotation.y = A.rand(this.rng, -0.35, 0.35);
    this.group.add(g);
    const ob = {
      x: x,
      z: z,
      radius: 0.52,
      solid: true,
      mesh: g,
      breakable: true,
      broken: false,
      health: 3,
      maxHealth: 3,
      kind: "crate",
      bonus: !!o.bonus,
      loot: o.bonus ? "bonus" : "coins",
      wobble: 0,
      baseRot: g.rotation.y
    };
    this.obstacles.push(ob);
    this.breakables.push(ob);
    return ob;
  };

  Level.prototype.addBarrel = function (x, z) {
    const g = new T.Group();
    const metalTex = A.metalTexture();
    const mat = new T.MeshStandardMaterial({ map: metalTex, color: 0x8a5a33, roughness: 0.6, metalness: 0.35 });
    const body = A.cylinder(0.33, 0.36, 0.8, 9, mat, 0, 0.4, 0);
    g.add(body);
    const ringMat = A.standard(0x2b2a28, 0.55, 0.5);
    for (const y of [0.16, 0.64]) {
      const ring = A.cylinder(0.37, 0.37, 0.06, 9, ringMat, 0, y, 0);
      g.add(ring);
    }
    const top = A.cylinder(0.31, 0.31, 0.04, 9, A.standard(0x6d4a2a, 0.7, 0.3), 0, 0.81, 0);
    g.add(top);
    g.position.set(x, 0, z);
    g.rotation.y = A.rand(this.rng, 0, Math.PI);
    this.group.add(g);
    const ob = {
      x: x,
      z: z,
      radius: 0.4,
      solid: true,
      mesh: g,
      breakable: true,
      broken: false,
      health: 2,
      maxHealth: 2,
      kind: "barrel",
      bonus: false,
      loot: "coins",
      wobble: 0,
      baseRot: g.rotation.y
    };
    this.obstacles.push(ob);
    this.breakables.push(ob);
    return ob;
  };

  Level.prototype.buildSecret = function () {
    const len = this.def.length;
    const x = this.theme === "street" ? 33 : this.theme === "dojo" ? 36 : 51;
    const z = -2.1;
    const g = new T.Group();
    const tex = A.crateTexture();
    const mat = new T.MeshStandardMaterial({ map: tex, color: 0xd8c9a0, roughness: 0.7, metalness: 0.1, emissive: 0x3a2c10, emissiveIntensity: 0.5 });
    const box = A.box(0.9, 0.9, 0.9, mat, 0, 0.45, 0);
    g.add(box);
    const runeMat = A.emissive(0xffd36a, 1.6);
    for (let i = 0; i < 4; i++) {
      const rune = A.box(0.12, 0.02, 0.02, runeMat, -0.25 + i * 0.16, 0.62, 0.46);
      g.add(rune);
    }
    const glow = new T.Mesh(
      new T.PlaneGeometry(2.2, 2.2),
      new T.MeshBasicMaterial({ map: A.radialTexture(), color: 0xffd36a, transparent: true, opacity: 0.22, depthWrite: false, blending: T.AdditiveBlending })
    );
    glow.rotation.x = -Math.PI / 2;
    glow.position.set(0, 0.03, 0);
    g.add(glow);
    g.position.set(x, 0, z);
    g.rotation.y = A.rand(this.rng, -0.2, 0.2);
    this.group.add(g);
    const ob = {
      x: x,
      z: z,
      radius: 0.58,
      solid: true,
      mesh: g,
      breakable: true,
      broken: false,
      health: 5,
      maxHealth: 5,
      kind: "secret",
      bonus: false,
      loot: "secret",
      wobble: 0,
      baseRot: g.rotation.y
    };
    this.obstacles.push(ob);
    this.breakables.push(ob);
    this.secretCrate = ob;
    this.secretX = x;
    this.secretZ = z;

    // Visible relic hint (dim until broken)
    const relic = this.makePickupMesh("relic");
    relic.position.set(x, 0.55, z);
    relic.visible = false;
    this.pickupGroup.add(relic);
    this.secretRelic = relic;
    this.secretRelicMesh = relic;
  };

  Level.prototype.buildFlagAndCastle = function () {
    const len = this.def.length;
    const flagX = len - 6.2;
    const poleGroup = new T.Group();
    poleGroup.position.set(flagX, 0, 0.15);
    const poleMat = A.standard(0x2b2f33, 0.45, 0.6);
    const pole = A.cylinder(0.06, 0.08, 4.6, 7, poleMat, 0, 2.3, 0);
    poleGroup.add(pole);
    const base = A.cylinder(0.35, 0.42, 0.18, 8, A.standard(0x24272a, 0.6, 0.4), 0, 0.09, 0);
    poleGroup.add(base);
    const finial = A.sphere(0.11, A.emissive(0xe7b84d, 1.2), 0, 4.62, 0, 0);
    poleGroup.add(finial);

    const flagTex = A.flagTexture();
    const flagMat = new T.MeshStandardMaterial({ map: flagTex, side: T.DoubleSide, roughness: 0.85, metalness: 0.05, emissive: 0x2a2310, emissiveIntensity: 0.4 });
    const flag = new T.Mesh(new T.PlaneGeometry(2.1, 1.3, 8, 4), flagMat);
    flag.position.set(1.1, 1.5, 0);
    flag.castShadow = true;
    poleGroup.add(flag);
    this.flagMesh = flag;
    this.flagGroup = poleGroup;
    this.flagBaseY = 1.5;
    this.flagX = flagX;
    this.flagZ = 0.15;
    this.group.add(poleGroup);

    const lamp = new T.Mesh(
      new T.PlaneGeometry(3.4, 3.4),
      new T.MeshBasicMaterial({ map: A.radialTexture(), color: 0xe7b84d, transparent: true, opacity: 0.16, depthWrite: false, blending: T.AdditiveBlending })
    );
    lamp.rotation.x = -Math.PI / 2;
    lamp.position.set(flagX, 0.05, 0.15);
    this.group.add(lamp);
    this.flagGlow = lamp;

    // Castle & gate
    const castle = new T.Group();
    castle.position.set(len - 2.2, 0, -8.2);
    const stone = A.standard(0x2c2c31, 0.86, 0.08);
    const stoneHi = A.standard(0x3a3a40, 0.82, 0.1);
    const keep = A.box(11, 8, 5, stone, 0, 4, 0);
    castle.add(keep);
    const keepTop = A.box(12.2, 0.5, 5.6, stoneHi, 0, 8.1, 0);
    castle.add(keepTop);
    for (let i = 0; i < 6; i++) {
      const merlon = A.box(0.9, 0.9, 1.1, stoneHi, -5.2 + i * 2.05, 8.7, 0);
      castle.add(merlon);
    }
    for (let side = -1; side <= 1; side += 2) {
      const tower = A.cylinder(1.65, 1.9, 11, 8, stone, side * 6.2, 5.5, 0.6);
      castle.add(tower);
      const cone = A.cone(1.85, 2.6, 8, A.standard(0x1e2428, 0.75, 0.1), side * 6.2, 12.3, 0.6);
      castle.add(cone);
      const windowGlow = A.box(0.4, 1.0, 0.1, A.emissive(0xffb45e, 1.2), side * 6.2, 7.4, 2.3);
      castle.add(windowGlow);
    }
    for (let i = -1; i <= 1; i++) {
      if (i === 0) continue;
      const win = A.box(0.7, 1.5, 0.1, A.emissive(0xffc069, 1.1), i * 3.0, 6.0, 2.56);
      castle.add(win);
    }
    const gateFrame = A.box(4.4, 4.2, 0.5, stoneHi, 0, 2.1, 2.7);
    castle.add(gateFrame);
    const gate = new T.Group();
    gate.position.set(0, 2.05, 3.05);
    const barMat = A.standard(0x4a4d52, 0.4, 0.65);
    for (let i = -4; i <= 4; i++) {
      const bar = A.cylinder(0.055, 0.055, 3.9, 5, barMat, i * 0.4, 0, 0);
      gate.add(bar);
    }
    for (let i = -1; i <= 1; i++) {
      const cross = A.box(3.7, 0.09, 0.09, barMat, 0, i * 1.15, 0);
      gate.add(cross);
    }
    castle.add(gate);
    this.gate = gate;
    this.gateClosedY = 2.05;
    this.gateOpenY = 4.35;
    this.group.add(castle);
    this.castle = castle;

    const banner = new T.Mesh(
      new T.PlaneGeometry(2.6, 4.2),
      new T.MeshStandardMaterial({ map: A.flagTexture(), side: T.DoubleSide, roughness: 0.9, emissive: 0x221d0c, emissiveIntensity: 0.3 })
    );
    banner.position.set(0, 5.8, 3.2);
    banner.scale.set(0.9, 1.2, 1);
    castle.add(banner);

    // End-of-stage ambient glow
    const endGlow = new T.Mesh(
      new T.PlaneGeometry(20, 10),
      new T.MeshBasicMaterial({ map: A.radialTexture(), color: this.def.accent, transparent: true, opacity: 0.08, depthWrite: false, blending: T.AdditiveBlending })
    );
    endGlow.position.set(len - 5, 4, -3.5);
    this.group.add(endGlow);
  };

  Level.prototype.buildLightProps = function () {
    if (this.theme === "foundry") {
      const glowMat = new T.MeshBasicMaterial({ map: A.radialTexture(), color: 0xff7a2f, transparent: true, opacity: 0.12, depthWrite: false, blending: T.AdditiveBlending });
      for (let i = 0; i < 4; i++) {
        const glow = new T.Mesh(new T.PlaneGeometry(7, 4), glowMat);
        glow.position.set(24 + i * 20, 1.8, -3.6);
        this.group.add(glow);
      }
    }
  };

  Level.prototype.makePickupMesh = function (type) {
    const g = new T.Group();
    if (type === "coin") {
      const coin = A.cylinder(0.2, 0.2, 0.05, 12, A.emissive(0xffce58, 1.2, { metalness: 0.7, roughness: 0.25 }), 0, 0, 0);
      coin.rotation.x = Math.PI / 2;
      g.add(coin);
      const rim = A.cylinder(0.205, 0.205, 0.035, 12, A.standard(0xb98a2a, 0.35, 0.7), 0, 0, 0);
      rim.rotation.x = Math.PI / 2;
      g.add(rim);
    } else if (type === "health") {
      const mat = A.emissive(0x6cff8a, 1.3);
      const a = A.box(0.34, 0.12, 0.14, mat, 0, 0, 0);
      const b = A.box(0.12, 0.34, 0.14, mat, 0, 0, 0);
      g.add(a);
      g.add(b);
    } else if (type === "focus") {
      const orb = A.sphere(0.2, A.emissive(0x6fc3ff, 1.6), 0, 0, 0, 1);
      g.add(orb);
      const ring = new T.Mesh(
        new T.RingGeometry(0.27, 0.32, 20),
        new T.MeshBasicMaterial({ color: 0x9fe0ff, transparent: true, opacity: 0.7, side: T.DoubleSide })
      );
      g.add(ring);
      g.userData.ring = ring;
    } else if (type === "life") {
      const mat = A.emissive(0xff6f9a, 1.4);
      const a = A.sphere(0.13, mat, -0.09, 0.08, 0, 0);
      const b = A.sphere(0.13, mat, 0.09, 0.08, 0, 0);
      const c = A.cone(0.19, 0.3, 4, mat, 0, -0.11, 0);
      c.rotation.z = Math.PI;
      g.add(a);
      g.add(b);
      g.add(c);
    } else if (type === "gem") {
      const gem = A.sphere(0.22, A.emissive(0xc48dff, 1.5, { metalness: 0.35, roughness: 0.2 }), 0, 0, 0, 0);
      gem.scale.set(0.8, 1.3, 0.8);
      g.add(gem);
    } else {
      const relic = A.sphere(0.26, A.emissive(0xffd36a, 1.8, { metalness: 0.4, roughness: 0.2 }), 0, 0, 0, 0);
      relic.scale.set(0.8, 1.35, 0.8);
      g.add(relic);
      const ring = new T.Mesh(
        new T.RingGeometry(0.33, 0.4, 22),
        new T.MeshBasicMaterial({ color: 0xffe49a, transparent: true, opacity: 0.85, side: T.DoubleSide })
      );
      g.add(ring);
      g.userData.ring = ring;
    }
    const halo = new T.Sprite(new T.SpriteMaterial({
      map: A.radialTexture(),
      color: type === "coin" ? 0xffce58 : type === "health" ? 0x6cff8a : type === "focus" ? 0x6fc3ff : 0xffd36a,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      blending: T.AdditiveBlending
    }));
    halo.scale.set(1.15, 1.15, 1);
    halo.position.set(0, 0, -0.03);
    g.add(halo);
    g.userData.halo = halo;
    return g;
  };

  Level.prototype.addPickup = function (type, x, z, options) {
    const o = options || {};
    const mesh = this.makePickupMesh(type);
    const y = o.y !== undefined ? o.y : 0.48;
    mesh.position.set(x, y, z);
    if (o.hidden) mesh.visible = false;
    this.pickupGroup.add(mesh);
    const pickup = {
      type: type,
      x: x,
      z: z,
      baseY: y,
      y: y,
      mesh: mesh,
      alive: true,
      bob: Math.random() * Math.PI * 2,
      spin: Math.random() * 2,
      hidden: !!o.hidden,
      secret: !!o.secret,
      phase: Math.random() * 6.28
    };
    this.pickups.push(pickup);
    return pickup;
  };

  Level.prototype.addCoinRun = function (x0, z, count) {
    for (let i = 0; i < count; i++) {
      this.addPickup("coin", x0 + i * 0.72, z + Math.sin(i * 0.9) * 0.35);
    }
  };

  Level.prototype.spawnEnemy = function (type, x, z, waveId, bossIndex) {
    const enemy = new NF.Enemy(this.game, type, x, z, {
      waveId: waveId,
      levelIndex: this.index,
      bossIndex: bossIndex
    });
    this.game.enemies.push(enemy);
    this.game.scene.add(enemy.root);
    this.waveEnemies.push(enemy);
    if (enemy.isBoss) {
      this.bossEnemy = enemy;
      this.bossSpawned = true;
      this.game.ui.showBoss(enemy.label, enemy.health, enemy.maxHealth);
      this.bossUI = true;
      this.game.audio.play("bossRoar");
      this.game.shake(0.4, 0.5);
    }
    this.game.particles.burst(new T.Vector3(x, 0.5, z), "#d8e3ee", 16, {
      speed: 2.6, up: 0.4, life: 0.4, spread: 0.5, gravity: -3, depth: 1
    });
    this.game.audio.play("spawn", { pan: this.game.combat.panFor(x) });
    return enemy;
  };

  Level.prototype.startWave = function () {
    const wave = this.waves[this.waveIndex];
    if (!wave) return;
    this.waveActive = true;
    this.currentWave = wave;
    this.waveSerial++;
    this.waveEnemies = [];
    this.activeMinX = wave.arena[0];
    this.activeMaxX = wave.arena[1];

    const hero = this.game.hero;
    const mid = (wave.arena[0] + wave.arena[1]) * 0.5;
    const fromRight = hero.x < mid;
    const spawns = wave.spawns || [];
    const count = spawns.length + (wave.boss ? 1 : 0);
    const zSlots = [-1.75, -0.6, 0.6, 1.75, 0];
    let totalIndex = 0;
    for (let i = 0; i < spawns.length; i++) {
      const edgeX = fromRight ? wave.arena[1] - 1.4 - (i % 2) * 0.9 : wave.arena[0] + 1.4 + (i % 2) * 0.9;
      const z = zSlots[(i + this.waveSerial) % zSlots.length] * 0.92;
      this.spawnEnemy(spawns[i], edgeX, z, this.waveSerial, -1);
      totalIndex++;
    }
    if (wave.boss) {
      const edgeX = fromRight ? wave.arena[1] - 2.6 : wave.arena[0] + 2.6;
      this.spawnEnemy("boss", edgeX, 0, this.waveSerial, this.def.bossIndex);
    }

    if (wave.boss) {
      this.setObjective("obj.defeatBoss", { name: this.bossEnemy ? this.bossEnemy.label : I18n.t("boss.harbormaster") });
    } else {
      this.setObjective("obj.clearAmbush");
    }
    this.game.ui.toast(I18n.t(wave.boss ? "toast.boss" : "toast.ambush"), 1400);
    this.game.audio.play("gate");
    this.game.shake(0.14, 0.2);
    void count;
    void totalIndex;
  };

  Level.prototype.completeWave = function () {
    const wave = this.currentWave;
    this.waveActive = false;
    this.activeMinX = 0;
    this.activeMaxX = this.def.length;
    this.respawnX = Math.max(this.respawnX, Math.min(this.def.length - 8, wave.arena[1] - 2));
    this.checkpointX = this.respawnX;
    this.game.score += 250;
    this.game.ui.setScore(this.game.score);
    this.game.audio.play("focus");
    this.game.ui.toast(I18n.t("toast.waveCleared"), 1500);
    if (this.bossUI) {
      this.bossUI = false;
      this.game.ui.hideBoss();
    }

    // Reward coins
    const cx = A.clamp(this.game.hero.x, wave.arena[0] + 2, wave.arena[1] - 2);
    for (let i = 0; i < 4; i++) {
      const p = this.addPickup("coin", cx + (i - 1.5) * 0.6, 1.0);
      p.vy = 2.2;
      p.baseY = 0.48;
      p.y = 1.2;
    }

    if (wave.boss) {
      this.flagActive = true;
      this.waveIndex++;
      this.gateOpen = true;
      this.setObjective("obj.raiseFlag");
      this.game.ui.toast(I18n.t("toast.gate"), 2400);
      this.game.audio.play("gate");
      for (let i = 0; i < 10; i++) {
        const p = this.addPickup("coin", this.flagX + (Math.random() - 0.5) * 4, this.flagZ + (Math.random() - 0.5) * 2.5);
        p.vy = 2.6;
        p.y = 1.4;
      }
    } else {
      this.setObjective("obj.pushForward");
      this.waveIndex++;
    }
  };

  Level.prototype.hitBreakables = function (kind, hero, opts) {
    const o = opts || {};
    const range = o.range || 1.1;
    const zRange = o.zRange || 0.7;
    let hits = 0;
    const dmg = kind === "pounce" ? 3 : kind === "bite" ? 2 : 1;
    const list = this.breakables.slice();
    for (const b of list) {
      if (b.broken) continue;
      const dx = (b.x - hero.x) * hero.facing;
      const dz = b.z - hero.z;
      if (!o.radial) {
        if (dx < -0.4 || dx > range) continue;
        if (Math.abs(dz) > zRange) continue;
      } else {
        if (Math.hypot(b.x - hero.x, b.z - hero.z) > range) continue;
      }
      if (hits >= (o.radial ? 4 : 1)) break;
      this.damageBreakable(b, dmg, hero);
      hits++;
    }
    return hits;
  };

  Level.prototype.damageBreakable = function (b, dmg, hero) {
    b.health -= dmg;
    b.wobble = 0.22;
    this.game.audio.play("hit", { pan: this.game.combat.panFor(b.x) });
    this.game.particles.burst(new T.Vector3(b.x, 0.6, b.z), b.kind === "barrel" ? "#c99a5f" : "#c89458", 8, {
      speed: 2.8, up: 0.5, life: 0.32, spread: 0.3, gravity: -9
    });
    this.game.addHitstop(0.03);
    this.game.shake(0.08, 0.12);
    if (b.health <= 0) this.breakBreakable(b);
  };

  Level.prototype.breakBreakable = function (b) {
    if (b.broken) return;
    b.broken = true;
    b.solid = false;
    this.game.score += 25;
    this.game.ui.setScore(this.game.score);
    this.game.particles.burst(new T.Vector3(b.x, 0.45, b.z), b.kind === "barrel" ? "#b8865a" : "#b5844e", 20, {
      speed: 4.2, up: 0.75, life: 0.55, spread: 0.4, gravity: -11
    });
    this.game.particles.dust(new T.Vector3(b.x, 0.1, b.z), "#b9ad97");
    this.game.audio.play(b.kind === "secret" ? "secret" : "enemyDown", { pan: this.game.combat.panFor(b.x) });
    if (b.mesh && b.mesh.parent) {
      this.group.remove(b.mesh);
      A.disposeObject(b.mesh);
    }

    if (b.kind === "secret") {
      if (this.secretRelic) {
        this.secretRelic.visible = true;
      }
      this.addPickup("gem", b.x - 0.7, b.z, { hidden: false });
      this.game.ui.toast(I18n.t("toast.hiddenCache"), 2000);
      return;
    }

    let coinCount = 2 + Math.floor(Math.random() * 2);
    if (b.loot === "bonus") coinCount = 5;
    for (let i = 0; i < coinCount; i++) {
      const p = this.addPickup("coin", b.x + (Math.random() - 0.5) * 1.2, b.z + (Math.random() - 0.5) * 1.0);
      p.vy = 2.8;
      p.y = 1.1;
    }
    if (b.loot === "bonus") {
      const roll = Math.random();
      if (roll < 0.5) this.addPickup("health", b.x + 0.5, b.z + 0.4);
      else this.addPickup("focus", b.x - 0.5, b.z + 0.4);
      this.game.ui.toast(I18n.t("toast.supplyCache"), 1200);
    } else if (Math.random() < 0.18) {
      this.addPickup("health", b.x, b.z + 0.4);
    }
  };

  Level.prototype.collectPickup = function (p) {
    if (!p.alive) return;
    p.alive = false;
    const g = this.game;
    if (p.type === "coin") {
      g.addCoins(1);
      g.audio.play("coin", { pan: g.combat.panFor(p.x) });
      g.particles.coin(new T.Vector3(p.x, p.y, p.z));
    } else if (p.type === "health") {
      g.addHealth(25);
      g.audio.play("health");
      g.ui.toast(I18n.t("toast.vitality"), 1200);
      g.particles.burst(new T.Vector3(p.x, p.y, p.z), "#6cff8a", 14, { speed: 2.4, up: 0.7, life: 0.45, spread: 0.2, gravity: -4 });
    } else if (p.type === "focus") {
      g.hero.buff = 10;
      g.audio.play("focus");
      g.ui.toast(I18n.t("toast.focus"), 1500);
      g.particles.burst(new T.Vector3(p.x, p.y, p.z), "#6fc3ff", 16, { speed: 3, up: 0.6, life: 0.5, spread: 0.2, gravity: -4 });
    } else if (p.type === "life") {
      g.hero.lives += 1;
      g.ui.setLives(g.hero.lives);
      g.audio.play("life");
      g.ui.toast(I18n.t("toast.extraLife"), 1500);
      g.particles.burst(new T.Vector3(p.x, p.y, p.z), "#ff6f9a", 18, { speed: 3, up: 0.8, life: 0.55, spread: 0.2, gravity: -4 });
    } else if (p.type === "gem") {
      g.score += 300;
      g.ui.setScore(g.score);
      g.audio.play("coin");
      g.ui.toast(I18n.t("toast.gem"), 900);
      g.particles.burst(new T.Vector3(p.x, p.y, p.z), "#c48dff", 14, { speed: 2.8, up: 0.7, life: 0.4, spread: 0.2, gravity: -5 });
    } else if (p.type === "relic") {
      this.discoverSecret();
      g.particles.burst(new T.Vector3(p.x, p.y, p.z), "#ffd36a", 30, { speed: 5, up: 0.8, life: 0.7, spread: 0.3, gravity: -5 });
    }
    if (p.mesh && p.mesh.parent) {
      p.mesh.parent.remove(p.mesh);
      A.disposeObject(p.mesh);
    }
  };

  Level.prototype.discoverSecret = function () {
    if (this.secretFound) return;
    this.secretFound = true;
    const g = this.game;
    g.score += 500;
    g.ui.setScore(g.score);
    g.hero.buff = Math.max(g.hero.buff, 12);
    g.ui.showSecret();
    g.audio.play("secret");
    g.shake(0.2, 0.3);
    g.ui.toast(I18n.t("toast.secret"), 2600);
  };

  Level.prototype.finishLevel = function () {
    if (this.completed) return;
    this.completed = true;
    this.game.completeLevel();
  };

  Level.prototype.raiseFlag = function () {
    if (this.flagRaised) return;
    this.flagRaised = true;
    this.clearTimer = 0;
    this.game.audio.play("flag");
    this.game.ui.toast(I18n.t("toast.flag"), 2200);
    this.game.shake(0.16, 0.3);
    for (let i = 0; i < 16; i++) {
      const p = this.addPickup("coin", this.flagX + (Math.random() - 0.5) * 5, this.flagZ + (Math.random() - 0.5) * 3);
      p.vy = 3.4;
      p.y = 2.2;
    }
  };

  Level.prototype.update = function (dt) {
    const hero = this.game.hero;
    if (!hero) return;

    // Pickups animation & collection
    for (const p of this.pickups) {
      if (!p.alive) continue;
      if (p.hidden) continue;
      p.bob += dt * 2.6;
      p.spin += dt * (p.type === "coin" ? 2.4 : 1.4);
      if (p.vy !== undefined) {
        p.y += p.vy * dt;
        p.vy -= 11 * dt;
        if (p.y <= p.baseY) {
          p.y = p.baseY;
          p.vy = undefined;
        }
      }
      const bobY = p.y + Math.sin(p.bob) * 0.05;
      p.mesh.position.set(p.x, bobY, p.z);
      p.mesh.rotation.y = p.spin;
      if (p.mesh.userData.ring) {
        p.mesh.userData.ring.rotation.z += dt * 1.6;
        p.mesh.userData.ring.rotation.x = Math.sin(p.bob * 0.6) * 0.5;
      }
      if (p.type === "coin" && Math.hypot(hero.x - p.x, hero.z - p.z) < 2.4) {
        p.x += (hero.x - p.x) * Math.min(1, dt * 4.2);
        p.z += (hero.z - p.z) * Math.min(1, dt * 4.2);
      }
      if (Math.abs(hero.x - p.x) < 0.58 && Math.abs(hero.z - p.z) < 0.62 && hero.y < 1.25) {
        this.collectPickup(p);
      }
    }

    // Breakable wobble
    for (const b of this.breakables) {
      if (b.broken || !b.mesh) continue;
      if (b.wobble > 0) {
        b.wobble -= dt;
        b.mesh.rotation.y = b.baseRot + Math.sin(b.wobble * 55) * 0.05 * (b.wobble / 0.22);
        b.mesh.position.y = Math.abs(Math.sin(b.wobble * 42)) * 0.03;
      } else {
        b.mesh.rotation.y = b.baseRot;
        b.mesh.position.y = 0;
      }
    }

    // Secret crate pulse
    if (this.secretCrate && !this.secretCrate.broken && this.secretCrate.mesh) {
      const pulse = 0.45 + Math.sin(performance.now() * 0.003) * 0.15;
      this.secretCrate.mesh.traverse((obj) => {
        if (obj.isMesh && obj.material && obj.material.emissive && obj.material.emissiveIntensity > 0) {
          obj.material.emissiveIntensity = pulse;
        }
      });
    }
    if (this.secretRelic && this.secretRelic.visible && this.secretCrate) {
      // The relic is a pickup proxy; the actual pickup is spawned as a gem when broken.
      this.secretRelic.rotation.y += dt * 2.2;
      this.secretRelic.position.y = 0.62 + Math.sin(performance.now() * 0.004) * 0.08;
      const dx = hero.x - this.secretRelic.position.x;
      const dz = hero.z - this.secretRelic.position.z;
      if (Math.hypot(dx, dz) < 0.7 && !this.secretFound) {
        this.secretRelic.visible = false;
        this.discoverSecret();
      }
    }

    // Ambient animated props
    const t = performance.now() * 0.001;
    for (const a of this.animated) {
      if (a.type === "lantern") {
        a.mesh.position.y = a.baseY + Math.sin(t * 1.3 + a.phase) * 0.035;
        a.mesh.rotation.z = Math.sin(t * 1.1 + a.phase) * 0.08;
      } else if (a.type === "ember") {
        a.mesh.material.opacity = 0.32 + Math.sin(t * 2.4 + a.phase) * 0.22;
      } else if (a.type === "hoist") {
        a.mesh.position.x = a.baseX + Math.sin(t * 0.7 + a.phase) * 0.35;
        a.mesh.rotation.z = Math.sin(t * 0.5 + a.phase) * 0.1;
      }
    }

    // Steam
    if (this.theme === "foundry" && this.spawnPoints.length) {
      this.dustTimer -= dt;
      if (this.dustTimer <= 0) {
        this.dustTimer = 0.55 + Math.random() * 0.9;
        const p = A.pick(this.rng, this.spawnPoints);
        this.game.particles.burst(new T.Vector3(p.x, p.y, p.z), "#c6b49a", 4, {
          speed: 1.4, up: 1.8, life: 0.9, spread: 0.16, gravity: 0.8, drag: 0.9
        });
      }
    }

    // Gate opening
    if (this.gate) {
      const target = this.gateOpen ? this.gateOpenY : this.gateClosedY;
      this.gate.position.y += (target - this.gate.position.y) * Math.min(1, dt * 2.4);
    }

    // Flag animation and raising
    const targetRaise = this.flagRaised ? 2.3 : 0;
    this.flagRaise += (targetRaise - this.flagRaise) * Math.min(1, dt * 1.8);
    if (this.flagMesh) {
      this.flagMesh.position.y = this.flagBaseY + this.flagRaise;
      this.flagMesh.rotation.y = Math.sin(t * 2.6) * 0.16;
      this.flagMesh.rotation.z = Math.sin(t * 3.2) * 0.02;
      const geo = this.flagMesh.geometry;
      const pos = geo.attributes.position;
      if (!geo.userData.waveBase) {
        geo.userData.waveBase = new Float32Array(pos.array);
      }
      const base = geo.userData.waveBase;
      for (let i = 0; i < pos.count; i++) {
        const bx = base[i * 3];
        const by = base[i * 3 + 1];
        const factor = (bx + 1.05) / 2.1;
        pos.setZ(i, Math.sin(t * 5.4 + bx * 2.4 + by * 1.4) * 0.1 * factor);
        pos.setY(i, by + Math.sin(t * 3.8 + bx * 2.0) * 0.03 * factor);
      }
      pos.needsUpdate = true;
      geo.computeVertexNormals();
    }

    // Wave logic
    if (!this.waveActive && !this.flagRaised && !this.flagActive) {
      const wave = this.waves[this.waveIndex];
      if (wave && hero.x >= wave.trigger) {
        this.startWave();
      }
    }

    if (this.waveActive) {
      let alive = 0;
      for (const e of this.waveEnemies) {
        if (e && !e.dead) alive++;
      }
      const boss = this.bossEnemy;
      if (boss && !boss.dead) {
        this.game.ui.updateBoss(boss.health, boss.maxHealth);
      }
      if (alive === 0) {
        this.completeWave();
      }
    }

    // Flag touch
    if (this.flagActive && !this.flagRaised) {
      if (Math.abs(hero.x - this.flagX) < 1.3 && Math.abs(hero.z - this.flagZ) < 1.5) {
        this.raiseFlag();
      }
    }
    if (this.flagRaised) {
      this.clearTimer += dt;
      if (this.flagGlow) {
        this.flagGlow.material.opacity = 0.2 + Math.sin(t * 3) * 0.07;
      }
      if (this.clearTimer > 2.2) {
        this.finishLevel();
      }
    }

    if (this.flagActive && !this.flagRaised) {
      this.flagGlow.material.opacity = 0.16 + Math.sin(t * 4) * 0.08;
    }
  };

  Level.prototype.moveEntity = function (entity, dx, dz) {
    const r = entity.radius || 0.4;
    let nx = entity.x + dx;
    let nz = entity.z + dz;
    const zLim = entity.isBoss ? 2.3 : 2.55;
    nz = A.clamp(nz, -zLim, zLim);
    nx = A.clamp(nx, this.activeMinX + r + 0.25, this.activeMaxX - r - 0.25);
    for (const o of this.obstacles) {
      if (o.broken || o.solid === false) continue;
      const ox = nx - o.x;
      const oz = nz - o.z;
      const min = r + o.radius;
      const d2 = ox * ox + oz * oz;
      if (d2 < min * min) {
        const d = Math.sqrt(d2) || 0.0001;
        nx = o.x + (ox / d) * min;
        nz = o.z + (oz / d) * min;
      }
    }
    nx = A.clamp(nx, this.activeMinX + r + 0.2, this.activeMaxX - r - 0.2);
    nz = A.clamp(nz, -zLim, zLim);
    entity.x = nx;
    entity.z = nz;
  };

  Level.prototype.clampEntity = function (entity) {
    const r = entity.radius || 0.4;
    const zLim = entity.isBoss ? 2.3 : 2.55;
    entity.x = A.clamp(entity.x, this.activeMinX + r + 0.2, this.activeMaxX - r - 0.2);
    entity.z = A.clamp(entity.z, -zLim, zLim);
    for (const o of this.obstacles) {
      if (o.broken || o.solid === false) continue;
      const ox = entity.x - o.x;
      const oz = entity.z - o.z;
      const min = r + o.radius;
      const d2 = ox * ox + oz * oz;
      if (d2 < min * min) {
        const d = Math.sqrt(d2) || 0.0001;
        entity.x = o.x + (ox / d) * min;
        entity.z = o.z + (oz / d) * min;
      }
    }
    entity.x = A.clamp(entity.x, this.activeMinX + r + 0.2, this.activeMaxX - r - 0.2);
    entity.z = A.clamp(entity.z, -zLim, zLim);
  };

  Level.prototype.hitsObstacle = function (entity) {
    const r = entity.radius || 0.4;
    for (const o of this.obstacles) {
      if (o.broken || o.solid === false) continue;
      const min = r + o.radius;
      const dx = entity.x - o.x;
      const dz = entity.z - o.z;
      if (dx * dx + dz * dz < min * min) return true;
    }
    return false;
  };

  Level.prototype.getCameraBounds = function () {
    return {
      min: this.activeMinX + 4.8,
      max: this.activeMaxX - 4.8,
      center: (this.activeMinX + this.activeMaxX) * 0.5
    };
  };

  Level.prototype.onRespawn = function () {
    for (const e of this.game.enemies.slice()) {
      if (!e || e.dead) continue;
      if (e.waveId === this.waveSerial) {
        e.health = Math.min(e.health, Math.ceil(e.maxHealth * 0.5));
        e.attackCooldown = Math.max(e.attackCooldown, 1.6);
        e.state = "idle";
        e.stateTime = 0;
        e.vx = 0;
        e.vz = 0;
        e.y = 0;
        e.x = A.clamp(e.x, this.activeMinX + 1.5, this.activeMaxX - 1.5);
        e.syncRoot();
      }
    }
    this.game.hero.x = this.respawnX;
    this.game.hero.z = 0;
    this.game.hero.y = 0;
    this.game.hero.root.position.set(this.respawnX, 0, 0);
  };

  Level.prototype.dispose = function () {
    if (this.group.parent) this.group.parent.remove(this.group);
    A.disposeObject(this.group);
    this.obstacles = [];
    this.breakables = [];
    this.pickups = [];
    this.animated = [];
  };

  NF.Level = Level;
  NF.LEVEL_DEFS = LEVEL_DEFS;
})();
