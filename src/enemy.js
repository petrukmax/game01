(function () {
  "use strict";

  const NF = (window.NF = window.NF || {});
  const T = window.THREE;
  const A = NF.Assets;
  const I18n = NF.I18n || { t: function (key) { return key; } };

  let NEXT_ID = 1;

  const TYPES = {
    grunt: {
      labelKey: "enemy.grunt",
      health: 52,
      speed: 1.85,
      damage: 6,
      score: 60,
      radius: 0.4,
      height: 1.72,
      scale: 1,
      bulk: 1,
      weapon: "baton",
      attackRange: 1.22,
      windup: 0.4,
      attackDuration: 0.34,
      recover: 0.5,
      cooldown: [1.0, 1.9],
      blockChance: 0.18,
      dodgeChance: 0.05,
      poise: 0,
      palette: {
        coat: 0x2d455c,
        coatHi: 0x3b5b75,
        pants: 0x1a2430,
        skin: 0xb4865f,
        accent: 0xd9a23e,
        hair: 0x1a120c,
        boot: 0x11141a,
        metal: 0x8d949c,
        eye: 0xffe1a0
      }
    },
    brute: {
      labelKey: "enemy.brute",
      health: 110,
      speed: 1.18,
      damage: 11,
      score: 130,
      radius: 0.56,
      height: 2.0,
      scale: 1.16,
      bulk: 1.34,
      weapon: "pipe",
      attackRange: 1.42,
      windup: 0.58,
      attackDuration: 0.44,
      recover: 0.72,
      cooldown: [1.7, 2.8],
      blockChance: 0.3,
      dodgeChance: 0,
      poise: 5,
      palette: {
        coat: 0x4c2a26,
        coatHi: 0x673a32,
        pants: 0x261917,
        skin: 0x966a4a,
        accent: 0xc9472f,
        hair: 0x120b08,
        boot: 0x0e0f12,
        metal: 0x787d84,
        eye: 0xffb37a
      }
    },
    agile: {
      labelKey: "enemy.agile",
      health: 40,
      speed: 2.7,
      damage: 5,
      score: 90,
      radius: 0.35,
      height: 1.6,
      scale: 0.94,
      bulk: 0.88,
      weapon: "claws",
      attackRange: 1.12,
      windup: 0.28,
      attackDuration: 0.28,
      recover: 0.38,
      cooldown: [0.8, 1.5],
      blockChance: 0.06,
      dodgeChance: 0.26,
      poise: 0,
      palette: {
        coat: 0x1c2230,
        coatHi: 0x2b3448,
        pants: 0x111621,
        skin: 0xbf8d66,
        accent: 0x5ed4ff,
        hair: 0x090b10,
        boot: 0x0a0c11,
        metal: 0xc3d5df,
        eye: 0x9fe8ff
      }
    }
  };

  const BOSSES = [
    {
      nameKey: "boss.harbormaster",
      base: "brute",
      health: 320,
      damage: 13,
      speed: 1.3,
      scale: 1.42,
      score: 800,
      palette: { coat: 0x213a44, coatHi: 0x2e5260, accent: 0xe1b84c, pants: 0x131b20, metal: 0x9da7ad, skin: 0x8e6549 }
    },
    {
      nameKey: "boss.sensei",
      base: "agile",
      health: 300,
      damage: 11,
      speed: 2.35,
      scale: 1.24,
      score: 1000,
      palette: { coat: 0x2a1d24, coatHi: 0x3b2832, accent: 0xb43246, pants: 0x140e13, metal: 0xd2b06a, skin: 0xb08262 }
    },
    {
      nameKey: "boss.forgemaster",
      base: "brute",
      health: 460,
      damage: 16,
      speed: 1.18,
      scale: 1.62,
      score: 1400,
      palette: { coat: 0x3a3226, coatHi: 0x554832, accent: 0xff7a2f, pants: 0x1a1712, metal: 0x9aa2a8, skin: 0x8a6248 }
    }
  ];

  function Enemy(game, typeName, x, z, options) {
    const o = options || {};
    this.game = game;
    this.id = NEXT_ID++;
    this.type = typeName;
    this.isBoss = typeName === "boss";
    this.waveId = o.waveId || 0;
    this.levelIndex = o.levelIndex || 0;
    this.bossIndex = this.isBoss ? (o.bossIndex || 0) : -1;

    const bossDef = this.isBoss ? BOSSES[this.bossIndex] : null;
    let def = this.isBoss
      ? Object.assign({}, TYPES[bossDef.base], bossDef, { labelKey: bossDef.nameKey })
      : TYPES[typeName];
    if (!def) def = TYPES.grunt;
    this.def = def;
    this.labelKey = def.labelKey || "enemy.grunt";
    this.label = I18n.t(this.labelKey);
    const mods = (game && typeof game.difficultyMods === "function")
      ? game.difficultyMods()
      : { enemyHealth: 1, enemyDamage: 1 };
    this.maxHealth = Math.max(1, Math.round(def.health * (mods.enemyHealth || 1)));
    this.health = this.maxHealth;
    this.speed = def.speed;
    this.damage = def.damage * (mods.enemyDamage || 1);
    this.scoreValue = def.score;
    this.radius = def.radius * (this.isBoss ? 1.08 : 1);
    this.height = def.height * (def.scale || 1);
    this.scale = def.scale || 1;
    this.bulk = def.bulk || 1;
    this.attackRange = def.attackRange;
    this.windup = def.windup;
    this.attackDuration = def.attackDuration;
    this.recoverTime = def.recover;
    this.blockChance = def.blockChance;
    this.dodgeChance = def.dodgeChance;
    this.poise = def.poise || 0;
    this.palette = Object.assign({}, def.palette);
    this.weaponType = def.weapon;

    this.x = x;
    this.z = z;
    this.y = 0;
    this.vx = 0;
    this.vz = 0;
    this.vy = 0;
    this.facing = -1;
    this.state = "spawn";
    this.stateTime = 0;
    this.animTime = Math.random() * 4;
    this.walkPhase = Math.random() * Math.PI * 2;
    this.attackCooldown = 0.65 + Math.random() * 0.8;
    this.attackFired = false;
    this.attackKind = "swing";
    this.hitFlash = 0;
    this.dead = false;
    this.deadTimer = 0;
    this.removable = false;
    this.staggerTimer = 0;
    this.invuln = 0;
    this.thrownByHero = false;
    this.thrownHitSet = null;
    this.grabbedBy = null;
    this.barTimer = 0;
    this.spawnTimer = 0;
    this.dodgeDir = 1;
    this.blockedHit = false;
    this.roarTimer = 4;
    this.shockwaveCooldown = 6;
    this.shockwaveTimer = 0;
    this.bossPhase = false;
    this.floatOffset = 0;

    this.root = new T.Group();
    this.root.name = "enemy-" + this.id;
    this.root.position.set(x, 0, z);
    this.root.rotation.y = Math.PI;
    this.model = {};
    this.materials = {};
    this.buildModel();
    this.buildHealthBar();
    this.buildTelegraph();
    this.syncRoot();
  }

  Enemy.prototype.makeMats = function () {
    const p = this.palette;
    // Sleeve colour is a muted version of the accent: enough hue to identify
    // the archetype, not enough brightness to outshine the hero.
    const sleeveHex = new T.Color(p.accent).multiplyScalar(0.62).getHex();
    const mats = {
      coat: A.standard(p.coat, 0.72, 0.06),
      coatHi: A.standard(p.coatHi, 0.66, 0.08),
      pants: A.standard(p.pants, 0.8, 0.03),
      skin: A.standard(p.skin, 0.82, 0.01),
      accent: new T.MeshStandardMaterial({
        color: p.accent,
        emissive: p.accent,
        emissiveIntensity: 0.24,
        roughness: 0.58,
        metalness: 0.1,
        flatShading: true
      }),
      sleeve: new T.MeshStandardMaterial({
        color: sleeveHex,
        emissive: sleeveHex,
        emissiveIntensity: 0.12,
        roughness: 0.64,
        metalness: 0.08,
        flatShading: true
      }),
      trim: new T.MeshStandardMaterial({
        color: p.accent,
        emissive: p.accent,
        emissiveIntensity: 0.42,
        roughness: 0.42,
        metalness: 0.2,
        flatShading: true
      }),
      hair: A.standard(p.hair, 0.86, 0.02),
      boot: A.standard(p.boot, 0.68, 0.08),
      metal: A.standard(p.metal, 0.36, 0.62),
      eye: new T.MeshStandardMaterial({ color: p.eye, emissive: p.eye, emissiveIntensity: this.isBoss ? 3.0 : 2.6, roughness: 0.3 })
    };
    this.materials = mats;
    return mats;
  };

  Enemy.prototype.buildModel = function () {
    const mats = this.makeMats();
    const s = this.scale;
    const bulk = this.bulk;
    const root = this.root;
    const body = new T.Group();
    root.add(body);
    this.model.body = body;

    const hipY = 0.84 * s;
    const shoulderY = hipY + 0.55 * s;
    this.hipY = hipY;
    this.shoulderY = shoulderY;

    const hips = A.box(0.3 * s * bulk, 0.22 * s, 0.36 * s * bulk, mats.pants, 0, hipY, 0);
    body.add(hips);
    this.model.hips = hips;

    const torso = A.box(0.34 * s * bulk, 0.56 * s, 0.46 * s * bulk, mats.coat, 0, hipY + 0.35 * s, 0);
    torso.scale.z = 1;
    body.add(torso);
    this.model.torso = torso;

    const chest = A.box(0.36 * s * bulk, 0.2 * s, 0.5 * s * bulk, mats.coatHi, 0.005, shoulderY - 0.02 * s, 0);
    body.add(chest);

    // Narrow accent placket and belt plate: each archetype keeps a readable
    // colour signature without turning the whole torso into a glowing block.
    const collar = A.box(0.04 * s, 0.05 * s, 0.3 * s, mats.accent, 0.17 * s * bulk, shoulderY + 0.03 * s, 0);
    collar.castShadow = false;
    body.add(collar);

    const belt = A.box(0.36 * s * bulk, 0.07 * s, 0.44 * s * bulk, mats.boot, 0, hipY + 0.1 * s, 0);
    body.add(belt);
    const buckle = A.box(0.05 * s, 0.06 * s, 0.1 * s, mats.trim, 0.19 * s * bulk, hipY + 0.1 * s, 0);
    buckle.castShadow = false;
    body.add(buckle);

    if (this.isBoss) {
      const padL = A.box(0.26 * s, 0.16 * s, 0.2 * s, mats.metal, 0, shoulderY + 0.04 * s, 0.3 * s * bulk);
      const padR = padL.clone();
      padR.position.z = -0.3 * s * bulk;
      body.add(padL);
      body.add(padR);
      const crest = A.box(0.1 * s, 0.22 * s, 0.14 * s, mats.accent, 0.02 * s, shoulderY + 0.2 * s, 0);
      body.add(crest);
    }

    const neck = A.cylinder(0.075 * s, 0.09 * s, 0.12 * s, 6, mats.skin, 0, shoulderY + 0.1 * s, 0);
    body.add(neck);

    const head = new T.Group();
    head.position.set(0.015 * s, shoulderY + 0.26 * s, 0);
    body.add(head);
    this.model.head = head;

    const skull = A.box(0.24 * s, 0.24 * s, 0.24 * s, mats.skin, 0.01 * s, 0, 0);
    skull.geometry = new T.IcosahedronGeometry(0.125 * s, 1);
    skull.scale.set(1.05, 1.1, 0.95);
    head.add(skull);
    this.model.skull = skull;

    const hair = A.box(0.24 * s, 0.11 * s, 0.25 * s, mats.hair, 0.005 * s, 0.1 * s, 0);
    head.add(hair);

    const eyeL = A.box(0.038 * s, 0.042 * s, 0.05 * s, mats.eye, 0.125 * s, 0.02 * s, 0.08 * s);
    const eyeR = eyeL.clone();
    eyeR.position.z = -0.08 * s;
    eyeL.castShadow = false;
    eyeR.castShadow = false;
    head.add(eyeL);
    head.add(eyeR);
    this.model.eyes = [eyeL, eyeR];

    if (this.type === "agile" || (this.isBoss && this.bossIndex === 1)) {
      const mask = A.box(0.16 * s, 0.1 * s, 0.26 * s, mats.coatHi, 0.1 * s, -0.02 * s, 0);
      head.add(mask);
      const scarf = A.box(0.08 * s, 0.1 * s, 0.34 * s, mats.accent, -0.14 * s, -0.05 * s, 0);
      head.add(scarf);
      this.model.scarf = scarf;
    }

    if (this.isBoss && this.bossIndex === 0) {
      const hat = A.cylinder(0.26 * s, 0.26 * s, 0.05 * s, 8, mats.coatHi, 0, 0.18 * s, 0);
      const crown = A.cylinder(0.15 * s, 0.17 * s, 0.13 * s, 8, mats.coatHi, 0, 0.24 * s, 0);
      head.add(hat);
      head.add(crown);
    }

    if (this.isBoss && this.bossIndex === 2) {
      const helm = A.cylinder(0.2 * s, 0.22 * s, 0.12 * s, 6, mats.metal, 0, 0.13 * s, 0);
      head.add(helm);
      const hornL = A.cone(0.045 * s, 0.22 * s, 4, mats.accent, 0, 0.24 * s, 0.13 * s);
      const hornR = hornL.clone();
      hornR.position.z = -0.13 * s;
      hornL.rotation.z = 0.3;
      hornR.rotation.z = 0.3;
      head.add(hornL);
      head.add(hornR);
      const mask = A.box(0.06 * s, 0.1 * s, 0.28 * s, mats.boot, 0.12 * s, 0, 0);
      head.add(mask);
    }

    // Arms
    this.model.arms = [];
    for (let side = -1; side <= 1; side += 2) {
      const shoulder = new T.Group();
      shoulder.position.set(0, shoulderY, side * 0.27 * s * bulk);
      shoulder.rotation.z = side > 0 ? 0.04 : -0.04;
      body.add(shoulder);
      // Muted accent sleeve on the upper arm: the archetype colour reads in
      // silhouette without extra geometry or extra glow.
      const upper = A.limb(0.32 * s, 0.075 * s, 0.062 * s, mats.sleeve, 6);
      shoulder.add(upper);
      const elbow = new T.Group();
      elbow.position.y = -0.31 * s;
      shoulder.add(elbow);
      const forearm = A.limb(0.3 * s, 0.055 * s, 0.045 * s, mats.skin, 6);
      elbow.add(forearm);
      const hand = A.sphere(0.055 * s, mats.skin, 0, -0.3 * s, 0, 0);
      elbow.add(hand);
      const arm = { shoulder: shoulder, elbow: elbow, hand: hand, side: side, upper: upper, forearm: forearm };
      this.model.arms.push(arm);
      if (side > 0 || this.weaponType === "claws") this.buildWeapon(arm);
    }

    // Legs
    this.model.legs = [];
    for (let side = -1; side <= 1; side += 2) {
      const hip = new T.Group();
      hip.position.set(0, hipY, side * 0.15 * s * bulk);
      body.add(hip);
      const thigh = A.limb(0.4 * s, 0.1 * s, 0.075 * s, mats.pants, 6);
      hip.add(thigh);
      const knee = new T.Group();
      knee.position.y = -0.4 * s;
      hip.add(knee);
      const shin = A.limb(0.38 * s, 0.07 * s, 0.055 * s, mats.pants, 6);
      knee.add(shin);
      const foot = A.box(0.28 * s, 0.1 * s, 0.16 * s, mats.boot, 0.08 * s, -0.81 * s, 0);
      hip.add(foot);
      this.model.legs.push({ hip: hip, knee: knee, foot: foot, side: side });
    }

    // Shadow blob
    const shadow = A.plane(1.25 * s * this.bulk, 0.7 * s, new T.MeshBasicMaterial({
      map: A.blobTexture(),
      transparent: true,
      opacity: 0.5,
      depthWrite: false
    }), 0, 0.012, 0);
    shadow.rotation.x = -Math.PI / 2;
    shadow.renderOrder = 2;
    root.add(shadow);
    this.shadow = shadow;

    root.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
  };

  Enemy.prototype.buildWeapon = function (arm) {
    const mats = this.materials;
    const s = this.scale;
    const holder = new T.Group();
    holder.position.set(0.03 * s, -0.29 * s, 0);
    arm.elbow.add(holder);
    arm.weapon = holder;
    if (this.weaponType === "baton") {
      const stick = A.cylinder(0.028 * s, 0.035 * s, 0.62 * s, 5, mats.metal, 0.24 * s, 0, 0);
      stick.rotation.z = Math.PI / 2;
      holder.add(stick);
      const tip = A.cylinder(0.036 * s, 0.036 * s, 0.07 * s, 5, mats.accent, 0.55 * s, 0, 0);
      tip.rotation.z = Math.PI / 2;
      holder.add(tip);
    } else if (this.weaponType === "pipe") {
      const stick = A.cylinder(0.045 * s, 0.05 * s, 0.85 * s, 6, mats.metal, 0.35 * s, 0, 0);
      stick.rotation.z = Math.PI / 2;
      holder.add(stick);
      const band = A.cylinder(0.058 * s, 0.058 * s, 0.06 * s, 6, mats.trim, 0.52 * s, 0, 0);
      band.rotation.z = Math.PI / 2;
      band.castShadow = false;
      holder.add(band);
      const head = A.box(0.16 * s, 0.16 * s, 0.16 * s, mats.metal, 0.78 * s, 0, 0);
      holder.add(head);
      if (this.isBoss) {
        const spike = A.cone(0.06 * s, 0.16 * s, 4, mats.accent, 0.9 * s, 0, 0);
        spike.rotation.z = -Math.PI / 2;
        holder.add(spike);
      }
    } else {
      for (let i = -1; i <= 1; i++) {
        const claw = A.cone(0.018 * s, 0.1 * s, 4, mats.metal, 0.06 * s, -0.02 * s, i * 0.035 * s);
        claw.rotation.z = -Math.PI / 2;
        holder.add(claw);
      }
    }
  };

  Enemy.prototype.buildTelegraph = function () {
    const mat = new T.MeshBasicMaterial({
      color: 0xff7a3c,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: T.DoubleSide
    });
    const ring = new T.Mesh(new T.RingGeometry(0.56, 0.74, 28), mat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.02;
    ring.visible = false;
    this.root.add(ring);
    this.telegraph = ring;
    this.telegraphMat = mat;
  };

  Enemy.prototype.updateTelegraph = function () {
    const ring = this.telegraph;
    if (!ring) return;
    const show = this.state === "attackWindup" && this.windup > 0.12;
    if (!show) {
      ring.visible = false;
      return;
    }
    const p = Math.min(1, this.stateTime / Math.max(0.01, this.windup));
    const shock = this.attackKind === "shockwave";
    ring.visible = true;
    const s = shock ? (1.9 + p * 1.4) : (0.72 + p * 0.55);
    ring.scale.set(s, s, s);
    this.telegraphMat.color.setHex(shock ? 0xffb347 : 0xff7a3c);
    this.telegraphMat.opacity = (shock ? 0.16 : 0.12) + p * (shock ? 0.4 : 0.5);
  };

  Enemy.prototype.buildHealthBar = function () {
    const bar = new T.Group();
    const width = this.isBoss ? 1.5 : 0.92;
    bar.position.set(0, this.height + 0.32, 0);
    const bgMat = new T.MeshBasicMaterial({ color: 0x090b0e, transparent: true, opacity: 0.75, depthTest: false, depthWrite: false });
    const fillMat = new T.MeshBasicMaterial({ color: this.isBoss ? 0xff5757 : 0xc8ff55, transparent: true, opacity: 0.95, depthTest: false, depthWrite: false });
    const bg = new T.Mesh(new T.PlaneGeometry(width, 0.11), bgMat);
    bg.renderOrder = 40;
    bar.add(bg);
    const fill = new T.Mesh(new T.PlaneGeometry(width - 0.06, 0.065), fillMat);
    fill.position.z = 0.002;
    fill.renderOrder = 41;
    bar.add(fill);
    bar.visible = false;
    this.root.add(bar);
    this.healthBar = bar;
    this.healthFill = fill;
    this.healthBarWidth = width - 0.06;
    this.healthBarMats = [bgMat, fillMat];
  };

  Enemy.prototype.syncRoot = function () {
    this.root.position.set(this.x, this.y, this.z);
    this.root.rotation.y = this.facing > 0 ? 0 : Math.PI;
    if (this.healthBar) this.healthBar.rotation.y = -this.root.rotation.y;
    if (this.shadow) {
      this.shadow.position.y = -this.y + 0.012;
      const sc = Math.max(0.55, 1 - this.y * 0.12);
      this.shadow.scale.set(sc, sc, 1);
    }
  };

  Enemy.prototype.move = function (dx, dz) {
    if (this.game.level) {
      this.game.level.moveEntity(this, dx, dz);
    } else {
      this.x += dx;
      this.z += dz;
    }
    this.syncRoot();
  };

  Enemy.prototype.canBeGrabbed = function () {
    if (this.dead || this.isBoss || this.state === "grabbed" || this.state === "thrown") return false;
    return this.state === "stagger" || this.staggerTimer > 0;
  };

  Enemy.prototype.beginGrabbed = function (hero) {
    if (this.dead) return;
    this.state = "grabbed";
    this.stateTime = 0;
    this.grabbedBy = hero;
    this.vx = 0;
    this.vz = 0;
    this.vy = 0;
    this.y = 0.18;
    this.attackCooldown = 1.4;
    this.staggerTimer = 0;
    this.syncRoot();
  };

  Enemy.prototype.releaseGrabbed = function () {
    if (this.state !== "grabbed") return;
    this.state = "stagger";
    this.stateTime = 0;
    this.staggerTimer = 0.5;
    this.grabbedBy = null;
    this.y = 0;
    this.syncRoot();
  };

  Enemy.prototype.throwFrom = function (hero) {
    if (this.dead) return;
    this.state = "thrown";
    this.stateTime = 0;
    this.grabbedBy = null;
    this.thrownByHero = true;
    this.thrownHitSet = new Set();
    const dir = hero.facing;
    this.vx = dir * 8.2;
    this.vz = (Math.random() - 0.5) * 1.8;
    this.vy = 4.4;
    this.y = 0.4;
    this.facing = -dir;
    this.syncRoot();
    this.game.particles.burst(new T.Vector3(this.x, 1.0, this.z), "#ffd36a", 12, {
      speed: 3.4, up: 0.7, life: 0.4, spread: 0.4, gravity: -7
    });
  };

  Enemy.prototype.tryBlock = function (kind) {
    if (this.dead) return false;
    if (kind === "bite" || kind === "pounce" || kind === "throw") return false;
    if (this.state === "attack" || this.state === "attackWindup" || this.state === "hit" || this.state === "down" || this.state === "stagger") return false;
    if (this.attackCooldown < 0.25) return false;
    if (Math.random() < this.blockChance) {
      this.state = "guard";
      this.stateTime = 0;
      this.vx *= 0.3;
      this.vz *= 0.3;
      return true;
    }
    return false;
  };

  Enemy.prototype.tryDodge = function (kind) {
    if (this.dead) return false;
    if (this.state === "hit" || this.state === "down" || this.state === "stagger" || this.state === "attack") return false;
    if (kind === "pounce") return false;
    if (Math.random() < this.dodgeChance) {
      this.state = "dodge";
      this.stateTime = 0;
      this.dodgeDir = Math.random() < 0.5 ? -1 : 1;
      this.vx = this.dodgeDir * 3.4;
      this.vz = (Math.random() - 0.5) * 2.2;
      this.vy = 1.6;
      this.y = 0.01;
      return true;
    }
    return false;
  };

  Enemy.prototype.takeDamage = function (amount, sourceX, opts) {
    if (this.dead) return false;
    if (this.invuln > 0) return false;
    const o = opts || {};
    if (this.state === "grabbed") {
      this.releaseGrabbed();
    }
    let dmg = amount;
    if (o.blocked) dmg *= 0.2;
    this.health -= dmg;
    this.hitFlash = 0.18;
    this.invuln = 0.045;
    this.barTimer = 3.2;
    if (this.health <= 0) {
      this.health = 0;
      this.die(o);
      return true;
    }
    const dir = sourceX === undefined ? -this.facing : (this.x < sourceX ? -1 : 1);
    const poiseHold = !o.knockdown && !o.stagger && this.poise >= amount && !o.blocked;
    if (poiseHold) {
      this.vx += dir * Math.min(1.4, (o.knockback || 1) * 0.25);
      this.vz += (Math.random() - 0.5) * 0.6;
      return true;
    }
    if (o.knockdown) {
      this.state = "down";
      this.stateTime = 0;
      this.y = Math.max(this.y, 0.05);
      this.vy = 2.9;
      this.vx = dir * (o.knockback || 3);
      this.vz = (Math.random() - 0.5) * 1.1;
      this.staggerTimer = 1.0;
    } else if (o.stagger) {
      this.state = "stagger";
      this.stateTime = 0;
      this.staggerTimer = 0.95;
      this.vx = dir * (o.knockback || 2);
      this.vz = (Math.random() - 0.5) * 0.8;
    } else {
      this.state = "hit";
      this.stateTime = 0;
      this.vx = dir * (o.knockback || 1.4);
      this.vz = (Math.random() - 0.5) * 0.5;
      this.staggerTimer = 0;
    }
    if (o.blocked) {
      this.state = "guard";
      this.stateTime = 0;
      this.vx = dir * 0.6;
    }
    this.attackCooldown = Math.max(this.attackCooldown, 0.35);
    return true;
  };

  Enemy.prototype.die = function (opts) {
    this.dead = true;
    this.deadTimer = 0;
    this.state = "dead";
    this.stateTime = 0;
    this.vx = -this.facing * 1.4;
    this.vz = 0;
    this.vy = 1.4;
    this.attackFired = true;
    this.healthBar.visible = false;
    this.game.particles.impact(new T.Vector3(this.x, 0.9, this.z), "#ffb35e");
    this.game.particles.burst(new T.Vector3(this.x, 0.8, this.z), "#ff8c4a", 12, {
      speed: 3.2, up: 0.9, life: 0.5, spread: 0.3, gravity: -8
    });
    this.game.audio.play(this.isBoss ? "bossRoar" : "enemyDown");
    this.game.shake(this.isBoss ? 0.5 : 0.16, this.isBoss ? 0.5 : 0.16);
    this.game.onEnemyDefeated(this);
  };

  Enemy.prototype.update = function (dt, hero) {
    this.animTime += dt;
    if (this.stateTime !== undefined) this.stateTime += dt;
    if (this.attackCooldown > 0) this.attackCooldown -= dt;
    if (this.hitFlash > 0) this.hitFlash -= dt;
    if (this.staggerTimer > 0) this.staggerTimer -= dt;
    if (this.invuln > 0) this.invuln -= dt;
    if (this.barTimer > 0) this.barTimer -= dt;
    if (this.shockwaveCooldown > 0) this.shockwaveCooldown -= dt;
    if (this.shockwaveTimer > 0) {
      this.shockwaveTimer -= dt;
      if (this.shockwaveTimer <= 0) this.fireShockwave();
    }

    this.updateTelegraph();
    this.applyFlash();

    if (this.state === "dead") {
      this.deadTimer += dt;
      this.y += this.vy * dt;
      this.vy -= 16 * dt;
      if (this.y <= 0) { this.y = 0; this.vy = 0; }
      this.x += this.vx * dt;
      this.vx *= Math.pow(0.1, dt);
      if (this.game.level) this.game.level.clampEntity(this);
      this.syncRoot();
      this.animateDeath(dt);
      if (this.deadTimer > (this.isBoss ? 3.2 : 2.1)) this.removable = true;
      return;
    }

    if (this.state === "grabbed") {
      this.y = 0.18;
      this.animate(dt);
      return;
    }

    if (this.state === "thrown") {
      this.updateThrown(dt);
      this.animate(dt);
      this.syncRoot();
      return;
    }

    if (this.state === "spawn") {
      this.spawnTimer += dt;
      if (this.spawnTimer > 0.5) {
        this.state = "idle";
        this.stateTime = 0;
      }
      this.syncRoot();
      this.animate(dt);
      return;
    }

    if (this.state === "hit") {
      this.x += this.vx * dt;
      this.z += this.vz * dt;
      this.vx *= Math.pow(0.08, dt);
      this.vz *= Math.pow(0.08, dt);
      if (this.game.level) this.game.level.clampEntity(this);
      if (this.stateTime > 0.32) {
        this.state = "idle";
        this.stateTime = 0;
      }
      this.syncRoot();
      this.animate(dt);
      return;
    }

    if (this.state === "down") {
      this.y += this.vy * dt;
      this.vy -= 16 * dt;
      if (this.y <= 0) { this.y = 0; this.vy = 0; }
      this.x += this.vx * dt;
      this.z += this.vz * dt;
      this.vx *= Math.pow(0.1, dt);
      this.vz *= Math.pow(0.1, dt);
      if (this.game.level) this.game.level.clampEntity(this);
      if (this.stateTime > 1.05) {
        this.state = "getup";
        this.stateTime = 0;
        this.y = 0;
      }
      this.syncRoot();
      this.animate(dt);
      return;
    }

    if (this.state === "getup") {
      if (this.stateTime > 0.55) {
        this.state = "idle";
        this.stateTime = 0;
        this.attackCooldown = Math.max(this.attackCooldown, 0.3);
      }
      this.syncRoot();
      this.animate(dt);
      return;
    }

    if (this.state === "dodge") {
      this.x += this.vx * dt;
      this.z += this.vz * dt;
      this.y += this.vy * dt;
      this.vy -= 14 * dt;
      if (this.y <= 0) { this.y = 0; this.vy = 0; }
      this.vx *= Math.pow(0.03, dt);
      if (this.game.level) this.game.level.clampEntity(this);
      if (this.stateTime > 0.36) {
        this.state = "idle";
        this.stateTime = 0;
      }
      this.syncRoot();
      this.animate(dt);
      return;
    }

    if (this.state === "stagger") {
      this.x += this.vx * dt;
      this.z += this.vz * dt;
      this.vx *= Math.pow(0.05, dt);
      this.vz *= Math.pow(0.05, dt);
      if (this.game.level) this.game.level.clampEntity(this);
      if (this.stateTime > this.staggerTimer) {
        this.state = "idle";
        this.stateTime = 0;
        this.staggerTimer = 0;
      }
      this.syncRoot();
      this.animate(dt);
      return;
    }

    if (this.state === "guard") {
      this.vx *= Math.pow(0.05, dt);
      this.vz *= Math.pow(0.05, dt);
      if (this.game.level) this.game.level.clampEntity(this);
      if (this.stateTime > 0.55) {
        this.state = "idle";
        this.stateTime = 0;
        this.attackCooldown = Math.max(this.attackCooldown, 0.35);
      }
      this.syncRoot();
      this.animate(dt);
      return;
    }

    if (this.state === "attackWindup") {
      this.vx *= Math.pow(0.001, dt);
      this.vz *= Math.pow(0.001, dt);
      if (this.game.level) this.game.level.clampEntity(this);
      if (this.stateTime >= this.windup) {
        this.state = "attack";
        this.stateTime = 0;
        this.attackFired = false;
        this.game.audio.play("swipe", { pan: this.panFor(hero) });
      }
      this.syncRoot();
      this.animate(dt);
      return;
    }

    if (this.state === "attack") {
      if (!this.attackFired && this.stateTime >= 0.08) {
        this.attackFired = true;
        this.performAttack(hero);
      }
      if (this.stateTime >= this.attackDuration + 0.12) {
        this.state = "recover";
        this.stateTime = 0;
      }
      this.syncRoot();
      this.animate(dt);
      return;
    }

    if (this.state === "recover") {
      this.vx *= Math.pow(0.02, dt);
      this.vz *= Math.pow(0.02, dt);
      if (this.game.level) this.game.level.clampEntity(this);
      if (this.stateTime >= this.recoverTime) {
        this.state = "idle";
        this.stateTime = 0;
        this.attackCooldown = this.def.cooldown[0] + Math.random() * (this.def.cooldown[1] - this.def.cooldown[0]);
      }
      this.syncRoot();
      this.animate(dt);
      return;
    }

    this.think(dt, hero);
    this.syncRoot();
    this.animate(dt);
  };

  Enemy.prototype.panFor = function (hero) {
    if (!hero) return 0;
    return Math.max(-0.7, Math.min(0.7, (this.x - hero.x) * 0.1));
  };

  Enemy.prototype.think = function (dt, hero) {
    if (!hero || hero.dead) {
      this.state = "idle";
      this.stateTime = 0;
      this.vx = 0;
      this.vz = 0;
      this.syncRoot();
      this.animate(dt);
      return;
    }
    const dx = hero.x - this.x;
    const dz = hero.z - this.z;
    const adx = Math.abs(dx);
    const adz = Math.abs(dz);
    if (Math.abs(dx) > 0.08) this.facing = dx > 0 ? 1 : -1;

    if (this.isBoss && this.health < this.maxHealth * 0.45) this.bossPhase = true;
    if (this.isBoss && this.bossPhase && this.shockwaveCooldown <= 0 && adx < 3.4) {
      this.startShockwave(hero);
      return;
    }

    const attackReach = this.attackRange * (this.isBoss ? 1.1 : 1);
    if (adx <= attackReach && adz < 0.52 && Math.abs(hero.y - this.y) < 1.1 && this.attackCooldown <= 0) {
      this.startAttack(hero);
      return;
    }

    let targetX;
    let targetZ;
    if (adx > attackReach * 0.92) {
      targetX = Math.sign(dx);
    } else if (adx < attackReach * 0.62) {
      targetX = -Math.sign(dx) * 0.55;
    } else {
      targetX = Math.sin(this.animTime * 1.1 + this.id) * 0.35;
    }
    if (adz > 0.28) {
      targetZ = Math.sign(dz) * Math.min(1, adz * 1.4);
    } else {
      targetZ = Math.sin(this.animTime * 1.7 + this.id * 2) * 0.24;
    }
    let len = Math.hypot(targetX, targetZ);
    if (len > 1) {
      targetX /= len;
      targetZ /= len;
    }
    const speed = this.speed * (this.state === "idle" ? 1 : 0.9);
    this.state = "walk";
    this.stateTime = 0;
    this.move(targetX * speed * dt, targetZ * speed * 0.8 * dt);
    this.walkPhase += dt * (5 + speed * 1.4);
  };

  Enemy.prototype.startAttack = function (hero) {
    const dx = hero.x - this.x;
    this.facing = dx > 0 ? 1 : -1;
    this.state = "attackWindup";
    this.stateTime = 0;
    this.attackFired = false;
    this.vx = 0;
    this.vz = 0;
    this.attackKind = this.isBoss && this.bossPhase && Math.random() < 0.45 ? "smash" : this.isBoss ? "smash" : (this.type === "agile" ? "slash" : (this.type === "brute" ? "smash" : "swing"));
    this.windup = this.def.windup * (this.attackKind === "smash" && this.isBoss ? 0.9 : 1);
    this.attackDuration = this.def.attackDuration;
    if (this.isBoss) this.game.audio.play("bossRoar", { pan: this.panFor(hero) });
    this.game.particles.burst(new T.Vector3(this.x + this.facing * 0.3, 0.2, this.z), this.palette.accent, 4, {
      speed: 1.2, up: 0.5, life: 0.3, spread: 0.3, gravity: -2
    });
  };

  Enemy.prototype.performAttack = function (hero) {
    const heavy = this.attackKind === "smash";
    const reach = this.attackRange + 0.3;
    const opts = {
      damage: this.damage * (heavy ? 1.15 : 1),
      range: reach,
      width: 0.9,
      knockback: heavy ? 4.8 : 2.0,
      heavy: heavy,
      knockdown: heavy && this.isBoss && this.bossPhase,
      source: this.attackKind
    };
    this.game.combat.enemyMelee(this, opts);
    if (heavy) {
      this.game.shake(0.18, 0.16);
      if (this.isBoss && this.bossPhase) {
        this.game.particles.dust(new T.Vector3(this.x + this.facing * 0.9, 0.12, this.z), "#c9b18a");
      }
    }
  };

  Enemy.prototype.startShockwave = function (hero) {
    this.state = "attackWindup";
    this.stateTime = 0;
    this.attackFired = true;
    this.attackKind = "shockwave";
    this.windup = 0.7;
    this.shockwaveCooldown = 7.5;
    this.shockwaveTimer = 0.52;
    this.vx = 0;
    this.vz = 0;
    this.facing = hero.x > this.x ? 1 : -1;
    this.game.audio.play("bossRoar");
    this.game.ui.toast(I18n.t("toast.shockwave"), 900);
  };

  Enemy.prototype.fireShockwave = function () {
    if (this.dead || this.state === "grabbed") return;
    this.shockwaveTimer = 0;
    const cx = this.x;
    const cz = this.z;
    this.game.particles.burst(new T.Vector3(cx, 0.2, cz), "#ffb35e", 26, {
      speed: 7.5, up: 0.15, life: 0.5, spread: 0.6, gravity: -4, depth: 1
    });
    this.game.particles.dust(new T.Vector3(cx, 0.1, cz), "#c8bda6");
    this.game.audio.play("shockwave");
    this.game.shake(0.55, 0.4);
    const hero = this.game.hero;
    if (hero && !hero.dead) {
      const hx = hero.x - cx;
      const hz = hero.z - cz;
      if (Math.hypot(hx, hz) < 2.3) {
        const mods = (this.game && typeof this.game.difficultyMods === "function")
          ? this.game.difficultyMods()
          : { enemyDamage: 1 };
        hero.takeDamage(10 * (mods.enemyDamage || 1), cx, { knockback: 5, knockdown: true, heavy: true });
      }
    }
    for (const other of this.game.enemies) {
      if (!other || other === this || other.dead) continue;
      if (Math.hypot(other.x - cx, other.z - cz) < 2.0) {
        other.takeDamage(4, cx, { knockback: 2.4 });
      }
    }
  };

  Enemy.prototype.updateThrown = function (dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.z += this.vz * dt;
    this.vy -= 17 * dt;
    this.root.rotation.z += dt * 9 * (this.vx > 0 ? 1 : -1);
    if (this.game.level) {
      this.game.level.clampEntity(this);
      if (this.game.level.hitsObstacle(this) && this.y < 0.7) {
        this.vx *= -0.25;
        this.vy = Math.max(this.vy, 1.8);
        this.game.particles.impact(new T.Vector3(this.x, 0.9, this.z), "#ffb35e");
        this.game.audio.play("hit");
      }
    }
    for (const other of this.game.enemies) {
      if (!other || other === this || other.dead || this.thrownHitSet.has(other.id)) continue;
      if (Math.hypot(other.x - this.x, other.z - this.z) < 0.95) {
        this.thrownHitSet.add(other.id);
        other.takeDamage(9, this.x, { knockback: 4.4, knockdown: true, heavy: true });
        this.game.registerHit(other, 1);
        this.game.particles.impact(new T.Vector3(other.x, 0.9, other.z), "#ffd36a");
        this.game.audio.play("heavyHit");
      }
    }
    if (this.y <= 0) {
      this.y = 0;
      this.vy = 0;
      this.vx *= 0.2;
      this.vz *= 0.2;
      this.root.rotation.z = 0;
      this.state = "down";
      this.stateTime = 0;
      this.staggerTimer = 1.0;
      this.health = Math.max(1, this.health - 8);
      this.barTimer = 3;
      this.game.particles.dust(new T.Vector3(this.x, 0.1, this.z), "#a69b83");
      this.game.audio.play("land");
      this.game.shake(0.2, 0.16);
    }
  };

  Enemy.prototype.applyFlash = function () {
    const mats = this.materials;
    if (!mats.coat) return;
    if (this.hitFlash > 0) {
      mats.coat.emissive.setHex(0x7a2218);
      mats.coat.emissiveIntensity = 1.5;
      mats.coatHi.emissive.setHex(0x6a1d14);
      mats.coatHi.emissiveIntensity = 1.1;
      mats.skin.emissive.setHex(0x552015);
      mats.skin.emissiveIntensity = 0.8;
    } else if (this.state === "attackWindup") {
      mats.coat.emissive.setHex(0x201206);
      mats.coat.emissiveIntensity = 0.6;
      mats.coatHi.emissive.setHex(0x2a1708);
      mats.coatHi.emissiveIntensity = 0.6;
      mats.skin.emissive.setHex(0x000000);
      mats.skin.emissiveIntensity = 0;
    } else if (this.state === "stagger") {
      mats.coat.emissive.setHex(0x28302c);
      mats.coat.emissiveIntensity = 0.7;
      mats.coatHi.emissive.setHex(0x303a34);
      mats.coatHi.emissiveIntensity = 0.7;
      mats.skin.emissive.setHex(0x000000);
      mats.skin.emissiveIntensity = 0;
    } else {
      mats.coat.emissive.setHex(0x000000);
      mats.coat.emissiveIntensity = 0;
      mats.coatHi.emissive.setHex(0x000000);
      mats.coatHi.emissiveIntensity = 0;
      mats.skin.emissive.setHex(0x000000);
      mats.skin.emissiveIntensity = 0;
    }
  };

  Enemy.prototype.animate = function (dt) {
    const m = this.model;
    if (!m.body) return;
    const state = this.state;
    let lean = 0;
    let bob = 0;
    let armR = 0;
    let armL = 0;
    let elbowR = 0;
    let elbowL = 0;
    let legSwing = 0;

    const walking = state === "walk" || (state === "idle" && false);
    if (walking) {
      const p = this.walkPhase;
      legSwing = Math.sin(p) * 0.62;
      armR = Math.sin(p + Math.PI) * 0.5;
      armL = Math.sin(p) * 0.5;
      bob = Math.abs(Math.sin(p)) * 0.035;
      lean = 0.03;
    } else if (state === "idle") {
      bob = Math.sin(this.animTime * 2.1) * 0.012;
      armR = Math.sin(this.animTime * 1.4) * 0.05;
      armL = -Math.sin(this.animTime * 1.4) * 0.05;
    }

    if (state === "attackWindup") {
      const p = Math.min(1, this.stateTime / Math.max(0.001, this.windup));
      const back = Math.sin(p * Math.PI * 0.5);
      armR = 0.9 * back;
      elbowR = -0.9 * back;
      lean = -0.08 * back;
      if (this.attackKind === "shockwave") {
        armR = 1.4 * back;
        armL = 1.4 * back;
        lean = -0.14 * back;
      }
    } else if (state === "attack") {
      const p = Math.min(1, this.stateTime / Math.max(0.001, this.attackDuration));
      const swing = Math.sin(Math.min(1, p * 1.15) * Math.PI);
      armR = 0.9 - 2.5 * swing;
      elbowR = -0.9 + 1.1 * swing;
      armL = -0.3 * swing;
      lean = 0.16 * swing;
      if (this.attackKind === "shockwave") {
        armR = 1.4 - 2.8 * swing;
        armL = 1.4 - 2.8 * swing;
        lean = 0.24 * swing;
      }
    } else if (state === "recover") {
      const p = Math.min(1, this.stateTime / Math.max(0.001, this.recoverTime));
      armR = -0.35 * (1 - p);
      elbowR = -0.2 * (1 - p);
    } else if (state === "guard") {
      armR = 1.15;
      armL = 1.15;
      elbowR = -1.35;
      elbowL = -1.35;
      lean = -0.05;
    } else if (state === "hit") {
      const p = Math.min(1, this.stateTime / 0.32);
      lean = -0.35 * Math.sin(p * Math.PI);
      armR = 0.5 * Math.sin(p * Math.PI);
      armL = 0.4 * Math.sin(p * Math.PI);
    } else if (state === "stagger") {
      const wob = Math.sin(this.animTime * 12) * 0.06;
      lean = -0.12 + wob;
      armR = 0.15;
      armL = -0.1;
      const headWob = Math.sin(this.animTime * 11) * 0.14;
      if (m.head) m.head.rotation.z = headWob;
    } else if (state === "dodge") {
      lean = -0.3;
      armR = 0.8;
      armL = 0.6;
    } else if (state === "spawn") {
      lean = 0;
    }

    if (m.head && state !== "stagger") m.head.rotation.z = lean * 0.25;

    const legs = m.legs;
    const arms = m.arms;
    if (legs) {
      legs.forEach((leg, i) => {
        if (state === "down" || state === "getup" || state === "dead" || state === "grabbed" || state === "thrown") return;
        const sgn = i === 0 ? 1 : -1;
        leg.hip.rotation.z = legSwing * sgn;
        leg.knee.rotation.z = Math.max(0, -legSwing * sgn) * 0.9;
        leg.hip.rotation.y = 0;
      });
    }
    if (arms) {
      arms.forEach((arm, i) => {
        const isR = arm.side > 0;
        if (state === "grabbed" || state === "thrown" || state === "dead") {
          arm.shoulder.rotation.z = isR ? 0.5 : 0.35;
          arm.elbow.rotation.z = -0.4;
          return;
        }
        arm.shoulder.rotation.z = isR ? -armR : -armL;
        arm.elbow.rotation.z = isR ? elbowR : elbowL;
      });
    }

    m.body.position.y = bob;
    m.body.rotation.z = lean;
    m.body.rotation.y = Math.sin(this.animTime * 1.2) * 0.015;

    if (state === "down") {
      const p = Math.min(1, this.stateTime / 0.3);
      this.root.rotation.z = -1.32 * p;
    } else if (state === "getup") {
      const p = Math.min(1, this.stateTime / 0.55);
      this.root.rotation.z = -1.32 * (1 - p);
    } else if (state === "dead") {
      this.root.rotation.z = Math.max(-1.5, this.root.rotation.z - dt * 4);
    } else if (state !== "thrown") {
      this.root.rotation.z = 0;
    }

    if (state === "grabbed") {
      m.body.rotation.z = 0.1 + Math.sin(this.animTime * 20) * 0.03;
    }

    if (m.scarf) {
      m.scarf.rotation.z = Math.sin(this.animTime * (state === "walk" ? 7 : 3)) * 0.24 - 0.1;
      m.scarf.position.x = -0.14 * this.scale - Math.abs(Math.sin(this.animTime * 6)) * 0.05;
    }

    if (this.healthBar) {
      this.healthBar.position.y = this.height + 0.32 + (this.y > 0 ? 0 : 0);
      this.healthBar.visible = this.barTimer > 0 || this.isBoss;
      if (this.healthBar.visible) {
        const pct = Math.max(0, this.health / this.maxHealth);
        this.healthFill.scale.x = Math.max(0.001, pct);
        this.healthFill.position.x = -this.healthBarWidth * (1 - pct) * 0.5;
        this.healthMatUpdate(pct);
      }
    }
  };

  Enemy.prototype.healthMatUpdate = function (pct) {
    if (!this.healthBarMats) return;
    const mat = this.healthBarMats[1];
    if (this.isBoss) {
      mat.color.setHex(pct < 0.35 ? 0xff3b3b : 0xff5757);
    } else {
      mat.color.setHex(pct < 0.3 ? 0xff5a4a : pct < 0.6 ? 0xffc94d : 0xc8ff55);
    }
    const targetOpacity = this.barTimer > 0 || this.isBoss ? 0.95 : 0;
    if (this.state === "dead") {
      mat.opacity = 0;
      this.healthBarMats[0].opacity = 0;
    } else {
      mat.opacity = targetOpacity;
      this.healthBarMats[0].opacity = targetOpacity * 0.78;
    }
  };

  Enemy.prototype.animateDeath = function (dt) {
    const m = this.model;
    if (!m.body) return;
    this.root.rotation.z = Math.max(-1.55, this.root.rotation.z - dt * 3.5);
    if (this.deadTimer > 1.2) {
      const fade = Math.max(0, 1 - (this.deadTimer - 1.2) / (this.isBoss ? 2.0 : 0.9));
      this.root.traverse((obj) => {
        if (obj.isMesh && obj.material) {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          for (const mm of mats) {
            if (!mm) continue;
            mm.transparent = true;
            mm.opacity = fade;
          }
        }
      });
    }
    if (m.arms) {
      m.arms.forEach((arm) => {
        arm.shoulder.rotation.z += (0.4 - arm.shoulder.rotation.z) * Math.min(1, dt * 6);
        arm.elbow.rotation.z = -0.35;
      });
    }
  };

  Enemy.prototype.refreshLabel = function () {
    this.label = I18n.t(this.labelKey || "enemy.grunt");
  };

  Enemy.prototype.serialize = function () {
    return {
      id: this.id,
      type: this.type,
      label: this.label,
      health: this.health,
      maxHealth: this.maxHealth,
      dead: this.dead,
      isBoss: this.isBoss
    };
  };

  Enemy.prototype.dispose = function () {
    if (this.root && this.root.parent) this.root.parent.remove(this.root);
    A.disposeObject(this.root);
  };

  NF.Enemy = Enemy;
  NF.ENEMY_TYPES = TYPES;
  NF.BOSSES = BOSSES;
})();
