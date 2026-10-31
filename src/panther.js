(function () {
  "use strict";

  const NF = (window.NF = window.NF || {});
  const T = window.THREE;
  const A = NF.Assets;
  const I18n = NF.I18n || { t: function (key) { return key; } };

  const BODY_Y = 0.63;
  const FRONT_HIP_X = 0.39;
  const HIND_HIP_X = -0.35;
  const LEG_Z = 0.155;
  const WALK_SPEED = 2.55;
  const RUN_SPEED = 4.35;
  const DEPTH_SPEED = 2.25;
  const GRAVITY = 18;
  const JUMP_V = 6.15;

  const STATE_DURATION = {
    idle: 0,
    walk: 0,
    run: 0,
    jump: 0,
    swipe: 0.36,
    bite: 0.52,
    pounce: 0,
    grab: 0.45,
    grabHold: 0,
    throw: 0.55,
    hit: 0.28,
    hitHeavy: 0.45,
    down: 0.75,
    getup: 0.5,
    dead: 1.6,
    victory: 0
  };

  function Panther(game) {
    this.game = game;
    this.name = "Nightfang";
    this.maxHealth = 100;
    this.health = 100;
    this.lives = 3;
    this.x = 3;
    this.z = 0;
    this.y = 0;
    this.vy = 0;
    this.vx = 0;
    this.vz = 0;
    this.radius = 0.45;
    this.height = 0.95;
    this.facing = 1;
    this.rootYaw = 0;
    this.state = "idle";
    this.stateTime = 0;
    this.stateDuration = 0;
    this.animTime = 0;
    this.gait = 0;
    this.gaitBlend = 0;
    this.invuln = 0;
    this.flash = 0;
    this.blinkTimer = 3;
    this.earTimer = 4;
    this.specialCooldown = 0;
    this.specialMax = 4;
    this.grabCooldown = 0;
    this.grabMaxCooldown = 3;
    this.jumpStamina = 100;
    this.maxJumpStamina = 100;
    this.jumpCost = 50;
    this.jumpCount = 0;
    this.buff = 0;
    this.comboInputCount = 0;
    this.comboTimer = 0;
    this.bufferAction = "";
    this.bufferTime = 0;
    this.autoFaceTimer = 0;
    this.attackFired = false;
    this.swipeSide = 0;
    this.grabbed = null;
    this.grabHoldTime = 0;
    this.dead = false;
    this.deathHandled = false;
    this.pouncePhase = "";
    this.pounceHitSet = null;
    this.pounceImpactDone = false;
    this.pounceLandTime = 0;
    this.clawsOut = false;
    this.stateLabel = "idle";
    this.root = new T.Group();
    this.root.name = "Nightfang";
    this.model = {};
    this.materials = {};
    this.frontLegs = [];
    this.hindLegs = [];
    this.tail = [];
    this.eyes = [];
    this.claws = [];
    this.buildModel();
    this.reset(this.x, this.z);
  }

  // ---------------------------------------------------------------------------
  // GLB hero model + procedural skeleton animation
  // ---------------------------------------------------------------------------

  const HERO_MODEL_URL = "black panther.glb";
  const HERO_TARGET_HEIGHT = 0.95;

  const RIG_FRONT = {
    L: ["Bip001_L_UpperArm", "Bip001_L_Forearm", "Bip001_L_Hand"],
    R: ["Bip001_R_UpperArm", "Bip001_R_Forearm", "Bip001_R_Hand"]
  };
  const RIG_HIND = {
    L: ["Bip001_L_Thigh", "Bip001_L_Calf", "Bip001_L_HorseLink", "Bip001_L_Foot"],
    R: ["Bip001_R_Thigh", "Bip001_R_Calf", "Bip001_R_HorseLink", "Bip001_R_Foot"]
  };
  const RIG_TAIL = ["Bone001", "Bone002", "Bone003", "Bone004", "Bone005", "Bone006"];
  const RIG_POSED = [
    "Bip001",
    "Bip001_Spine", "Bip001_Spine1", "Bip001_Spine2", "Bip001_Spine3",
    "Bip001_Neck", "Bip001_Neck1", "Bip001_Neck2", "Bip001_Head", "Bip001_Xtra02",
    "Bip001_L_UpperArm", "Bip001_L_Forearm", "Bip001_L_Hand",
    "Bip001_R_UpperArm", "Bip001_R_Forearm", "Bip001_R_Hand",
    "Bip001_L_Thigh", "Bip001_L_Calf", "Bip001_L_HorseLink", "Bip001_L_Foot",
    "Bip001_R_Thigh", "Bip001_R_Calf", "Bip001_R_HorseLink", "Bip001_R_Foot"
  ].concat(RIG_TAIL);

  function base64ToArrayBuffer(b64) {
    const bin = window.atob(b64);
    const len = bin.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
    return bytes.buffer;
  }

  function measureSkinnedModel(model) {
    const box = new T.Box3();
    const local = new T.Box3();
    model.updateMatrixWorld(true);
    model.traverse(function (obj) {
      if (!obj.isSkinnedMesh) return;
      obj.skeleton.update();
      obj.computeBoundingBox();
      if (!obj.boundingBox) return;
      local.copy(obj.boundingBox).applyMatrix4(obj.matrixWorld);
      box.union(local);
    });
    if (box.isEmpty()) box.setFromObject(model);
    return box;
  }

  Panther.prototype.buildShadow = function () {
    const shadow = A.plane(1.5, 0.92, new T.MeshBasicMaterial({
      map: A.blobTexture(),
      transparent: true,
      opacity: 0.58,
      depthWrite: false,
      depthTest: true
    }), 0, 0.012, 0);
    shadow.rotation.x = -Math.PI / 2;
    shadow.renderOrder = 2;
    this.root.add(shadow);
    this.shadow = shadow;
  };

  Panther.prototype.buildModel = function () {
    const self = this;
    this.rig = null;
    this.rigMaterials = [];
    this.model = {};
    this.materials = {};
    this.frontLegs = [];
    this.hindLegs = [];
    this.tail = [];
    this.eyes = [];
    this.claws = [];
    this.buildShadow();

    this.modelReady = new Promise(function (resolve) { self._modelReady = resolve; });

    const fail = function (err) {
      if (self.rig) return;
      console.warn("[Nightfang] Hero GLB unavailable, using the procedural panther.", err);
      self.buildFallbackModel();
      if (self._modelReady) {
        const done = self._modelReady;
        self._modelReady = null;
        done();
      }
    };

    if (!NF.GLTFLoader) {
      fail(new Error("GLTFLoader is not loaded"));
      return;
    }

    const loader = new NF.GLTFLoader();
    const onLoad = function (gltf) {
      try {
        self.setupRig(gltf);
        self.updatePose(0);
        if (self._modelReady) {
          const done = self._modelReady;
          self._modelReady = null;
          done();
        }
      } catch (err) {
        fail(err);
      }
    };

    if (NF.PANTHER_GLB_BASE64) {
      try {
        loader.parse(base64ToArrayBuffer(NF.PANTHER_GLB_BASE64), "", onLoad, fail);
      } catch (err) {
        fail(err);
      }
    } else {
      loader.load(HERO_MODEL_URL, onLoad, undefined, fail);
    }
  };

  Panther.prototype.setupRig = function (gltf) {
    const model = gltf.scene;
    const self = this;

    const bounds = measureSkinnedModel(model);
    const size = bounds.getSize(new T.Vector3());
    const scale = HERO_TARGET_HEIGHT / Math.max(0.001, size.y);

    model.scale.setScalar(scale);
    model.rotation.y = Math.PI / 2;
    // The rig faces +Z. After the +90 degree yaw its nose points along +X, so
    // centre the body on the gameplay origin and rest the paws on the floor.
    model.position.set(
      -(bounds.min.z + bounds.max.z) * 0.5 * scale,
      -bounds.min.y * scale,
      (bounds.min.x + bounds.max.x) * 0.5 * scale
    );

    const visual = new T.Group();
    visual.name = "NightfangVisual";
    visual.add(model);
    this.root.add(visual);
    this.visual = visual;
    this.visualModel = model;

    const bones = {};
    model.traverse(function (obj) {
      if (obj.isBone) bones[obj.name] = obj;
    });

    for (const name of RIG_POSED) {
      if (!bones[name]) throw new Error("Missing hero bone " + name);
    }

    const rig = {
      bones: bones,
      order: [],
      bindQ: new Map(),
      bindP: new Map(),
      worldQ: new Map(),
      unit: 0.01 * scale,
      bip: bones["Bip001"],
      tmpQ: new T.Quaternion(),
      tmpE: new T.Euler(),
      rootQ: new T.Quaternion()
    };

    (function walk(bone) {
      rig.order.push(bone);
      for (const child of bone.children) {
        if (child.isBone) walk(child);
      }
    })(rig.bip);

    for (const bone of rig.order) {
      rig.bindQ.set(bone, bone.quaternion.clone());
      rig.bindP.set(bone, bone.position.clone());
      rig.worldQ.set(bone, new T.Quaternion());
    }

    this.rig = rig;

    this._pose = {};
    for (const name of RIG_POSED) this._pose[name] = [0, 0, 0];

    const seen = new Set();
    model.traverse(function (obj) {
      if (!obj.isMesh) return;
      obj.castShadow = true;
      obj.receiveShadow = true;
      obj.frustumCulled = false;
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const mat of mats) {
        if (!mat || seen.has(mat)) continue;
        seen.add(mat);
        self.rigMaterials.push({
          mat: mat,
          color: mat.color ? mat.color.clone() : null,
          emissive: mat.emissive ? mat.emissive.clone() : null,
          emissiveIntensity: mat.emissiveIntensity
        });
      }
    });

    this.model.body = null;
    this.model.head = bones["Bip001_Head"];
  };

  Panther.prototype.applyRigPose = function (pose, rootDrop) {
    const rig = this.rig;
    if (!rig) return;
    const q = rig.tmpQ;
    const e = rig.tmpE;

    for (const bone of rig.order) {
      const parent = bone.parent;
      const parentQ = parent && parent.isBone ? rig.worldQ.get(parent) : rig.rootQ;
      const bind = rig.bindQ.get(bone);
      const delta = pose[bone.name];
      if (delta && (delta[0] || delta[1] || delta[2])) {
        e.set(delta[0], delta[1], delta[2], "XYZ");
        rig.tmpQ2 = rig.tmpQ2 || new T.Quaternion();
        rig.tmpQ2.setFromEuler(e);
        q.copy(parentQ).invert().multiply(rig.tmpQ2).multiply(parentQ).multiply(bind);
        bone.quaternion.copy(q);
      } else {
        bone.quaternion.copy(bind);
      }
      bone.position.copy(rig.bindP.get(bone));
      rig.worldQ.get(bone).copy(parentQ).multiply(bone.quaternion);
    }

    if (rootDrop) {
      rig.bip.position.y += rootDrop / rig.unit;
    }
  };

  Panther.prototype.updateRigPose = function (dt) {
    const rig = this.rig;
    if (!rig) return;
    const pose = this._pose;
    for (const key in pose) {
      const a = pose[key];
      a[0] = 0;
      a[1] = 0;
      a[2] = 0;
    }

    const state = this.state;
    const t = this.animTime;
    const moving = state === "walk" || state === "run";
    const run = state === "run";
    const motion = this.gaitBlend;
    const phase = this.gait * Math.PI * 2;
    const ampF = (run ? 0.95 : 0.5) * motion;
    const ampH = (run ? 1.05 : 0.58) * motion;
    let bodyY = 0;
    let bodyPitch = 0;
    let bodyYaw = 0;
    let bodyRoll = 0;
    let jaw = 0;

    const set = function (name, x, y, z) {
      const a = pose[name];
      if (!a) return;
      a[0] = x || 0;
      a[1] = y || 0;
      a[2] = z || 0;
    };
    const front = function (side, up, fore, hand) {
      const b = RIG_FRONT[side];
      set(b[0], up, 0, 0);
      set(b[1], fore, 0, 0);
      set(b[2], hand, 0, 0);
    };
    const hind = function (side, thigh, calf, hock, foot) {
      const b = RIG_HIND[side];
      set(b[0], thigh, 0, 0);
      set(b[1], calf, 0, 0);
      set(b[2], hock, 0, 0);
      set(b[3], foot, 0, 0);
    };

    // Locomotion: diagonal pairs, mirroring the original panther gait.
    const phaseF = { L: 0, R: Math.PI };
    const phaseH = { L: Math.PI, R: 0 };
    for (const side of ["L", "R"]) {
      const sF = Math.sin(phase + phaseF[side]);
      const sH = Math.sin(phase + phaseH[side]);
      const liftF = Math.max(0, sF);
      const liftH = Math.max(0, sH);
      front(
        side,
        -sF * ampF,
        0.08 + liftF * (0.32 + 0.25 * (run ? 1 : 0)) * motion,
        -0.05 * liftF * motion
      );
      hind(
        side,
        -sH * ampH,
        0.1 + liftH * (0.4 + 0.3 * (run ? 1 : 0)) * motion,
        -0.08 - liftH * 0.2 * motion,
        -0.05 * liftH * motion
      );
    }

    if (moving) {
      bodyY = Math.sin(phase * 2) * (run ? 0.026 : 0.014);
      bodyPitch = run ? -0.055 : -0.02;
      bodyYaw = Math.sin(phase) * (run ? 0.05 : 0.025);
      bodyRoll = Math.sin(phase + 0.8) * (run ? 0.03 : 0.015);
      set("Bip001_Spine1", run ? -0.02 : 0, bodyYaw * -0.35, 0);
      set("Bip001_Spine2", run ? -0.02 : 0, bodyYaw * -0.25, 0);
      set("Bip001_Spine3", 0, bodyYaw * -0.2, 0);
      set("Bip001_Neck", 0.02, bodyYaw * 0.35, 0);
      set("Bip001_Head", 0, bodyYaw * 0.55, 0);
    } else {
      bodyY = Math.sin(t * (Math.PI * 2 / 2.8)) * 0.009;
      set("Bip001_Spine1", Math.sin(t * 1.6) * 0.008, 0, 0);
      set("Bip001_Spine2", Math.sin(t * 1.6 + 0.4) * 0.008, 0, 0);
      set("Bip001_Neck", Math.sin(t * 0.7) * 0.03, Math.sin(t * 0.43) * 0.05, 0);
      set("Bip001_Neck1", Math.sin(t * 0.7 + 0.3) * 0.02, Math.sin(t * 0.43 + 0.4) * 0.04, 0);
      set("Bip001_Head", Math.sin(t * 0.5) * 0.03, Math.sin(t * 0.31) * 0.12, 0);
    }

    if (state === "jump") {
      const up = Math.max(-1, Math.min(1, this.vy / JUMP_V));
      bodyPitch = -0.12 - up * 0.08;
      bodyY += 0.02;
      front("L", -1.0, 0.95, 0.2);
      front("R", -1.0, 0.95, 0.2);
      hind("L", 0.8, 1.15, -0.55, -0.25);
      hind("R", 0.8, 1.15, -0.55, -0.25);
    } else if (state === "swipe") {
      const p = Math.min(1, this.stateTime / this.stateDuration);
      const arc = Math.sin(p * Math.PI);
      const side = this.swipeSide ? "R" : "L";
      const other = side === "L" ? "R" : "L";
      front(side, -1.62 * arc, 0.68 * arc, -0.14 * arc);
      front(other, 0.32 * arc, 0.25 * arc, 0);
      hind("L", 0.12 * arc, 0.15 * arc, -0.1 * arc, 0);
      hind("R", 0.12 * arc, 0.15 * arc, -0.1 * arc, 0);
      bodyYaw = -this.facing * 0.1 + (side === "L" ? 0.14 : -0.14) * arc;
      bodyRoll = (side === "L" ? 1 : -1) * 0.1 * arc;
      bodyPitch = -0.03 - 0.06 * arc;
      bodyY += 0.02 * arc;
      set("Bip001_Neck", 0, -this.facing * 0.12 * arc, 0);
      set("Bip001_Head", 0, -this.facing * 0.22 * arc, 0);
      jaw = 0.3 * arc;
    } else if (state === "bite") {
      const p = Math.min(1, this.stateTime / this.stateDuration);
      const open = A.smoothstep(0.1, 0.36, p) * (1 - A.smoothstep(0.7, 1, p));
      const extend = A.smoothstep(0.08, 0.36, p) * (1 - A.smoothstep(0.66, 1, p));
      bodyPitch = -0.08 - 0.1 * open;
      bodyYaw = -this.facing * 0.05 * open;
      bodyY += 0.03 * open;
      set("Bip001_Neck", 0.16 * extend, -this.facing * 0.08 * open, 0);
      set("Bip001_Neck1", 0.12 * extend, 0, 0);
      set("Bip001_Neck2", 0.08 * extend, 0, 0);
      set("Bip001_Head", 0.06 * extend, -this.facing * 0.1 * open, 0);
      front("L", -0.18 * open, -0.12 * open, 0);
      front("R", -0.18 * open, -0.12 * open, 0);
      hind("L", -0.14 * open, 0.18 * open, -0.1 * open, 0);
      hind("R", -0.14 * open, 0.18 * open, -0.1 * open, 0);
      jaw = 0.95 * open;
    } else if (state === "pounce") {
      if (this.pouncePhase === "crouch") {
        const p = Math.min(1, this.stateTime / 0.2);
        bodyY -= 0.1 * p;
        bodyPitch = 0.05 * p;
        front("L", 0.32 * p, 0.35 * p, 0);
        front("R", 0.32 * p, 0.35 * p, 0);
        hind("L", -0.28 * p, 0.62 * p, -0.34 * p, 0);
        hind("R", -0.28 * p, 0.62 * p, -0.34 * p, 0);
        jaw = 0.3 * p;
      } else if (this.pouncePhase === "air") {
        bodyPitch = -0.16;
        bodyY += 0.03;
        front("L", -1.4, 0.45, -0.12);
        front("R", -1.4, 0.45, -0.12);
        hind("L", 1.0, -0.2, 0.1, 0);
        hind("R", 1.0, -0.2, 0.1, 0);
        set("Bip001_Neck", -0.1, 0, 0);
        set("Bip001_Head", -0.06, 0, 0);
        jaw = 0.7;
      } else {
        const p = Math.min(1, this.pounceLandTime / 0.43);
        const crouch = Math.sin(Math.min(1, p * 1.6) * Math.PI * 0.75);
        bodyY -= 0.09 * (1 - p) * crouch;
        bodyPitch = 0.05 * crouch;
        front("L", 0.28 * crouch, 0.32 * crouch, 0);
        front("R", 0.28 * crouch, 0.32 * crouch, 0);
        hind("L", -0.25 * crouch, 0.55 * crouch, -0.3 * crouch, 0);
        hind("R", -0.25 * crouch, 0.55 * crouch, -0.3 * crouch, 0);
      }
    } else if (state === "grab" || state === "grabHold") {
      const shiver = state === "grabHold" ? Math.sin(t * 28) * 0.015 : 0;
      bodyPitch = -0.05;
      bodyY += 0.03;
      front("L", -1.35, 0.42, -0.12);
      front("R", -1.35, 0.42, -0.12);
      hind("L", 0.18, -0.12, 0.05, 0);
      hind("R", 0.18, -0.12, 0.05, 0);
      bodyYaw = shiver;
      set("Bip001_Neck", 0.12, shiver * 2, 0);
      jaw = 0.5;
    } else if (state === "throw") {
      const p = Math.min(1, this.stateTime / this.stateDuration);
      const swing = Math.sin(p * Math.PI);
      bodyYaw = -this.facing * 0.55 * swing;
      bodyRoll = 0.1 * swing;
      bodyY += 0.02 * swing;
      set("Bip001_Neck", 0, -this.facing * 0.3 * swing, 0);
      set("Bip001_Head", 0, -this.facing * 0.4 * swing, 0);
      front("L", -1.15 * (1 - p), 0.35 * (1 - p), 0);
      front("R", -1.15 * (1 - p), 0.35 * (1 - p), 0);
      jaw = 0.15 * (1 - p);
    } else if (state === "hit" || state === "hitHeavy") {
      const p = Math.min(1, this.stateTime / this.stateDuration);
      const recoil = Math.sin(p * Math.PI);
      bodyPitch = 0.05 * recoil;
      bodyRoll = -0.1 * recoil * this.facing;
      bodyYaw = 0.14 * recoil * this.facing;
      set("Bip001_Neck", 0.12 * recoil, 0.16 * recoil, 0);
      set("Bip001_Head", 0.1 * recoil, 0.2 * recoil, -0.08 * recoil);
      front("L", 0.22 * recoil, 0.16 * recoil, 0);
      front("R", 0.22 * recoil, 0.16 * recoil, 0);
      jaw = 0.2 * recoil;
    } else if (state === "down" || state === "getup") {
      const p = state === "down"
        ? Math.min(1, this.stateTime / 0.35)
        : 1 - Math.min(1, this.stateTime / this.stateDuration);
      const roll = A.smoothstep(0, 1, p);
      bodyRoll = -1.25 * roll;
      bodyY -= 0.24 * roll;
      bodyPitch = 0.05 * roll;
      front("L", 0.2 * roll, 0.35 * roll, 0);
      front("R", -0.15 * roll, 0.25 * roll, 0);
      hind("L", 0.25 * roll, 0.35 * roll, -0.2 * roll, 0);
      hind("R", 0.1 * roll, 0.25 * roll, -0.15 * roll, 0);
      jaw = 0.15 * roll;
    } else if (state === "dead") {
      const p = Math.min(1, this.stateTime / 1.2);
      const fall = A.smoothstep(0, 1, p);
      bodyRoll = -1.45 * fall;
      bodyY -= 0.3 * fall;
      bodyPitch = 0.03 * fall;
      set("Bip001_Neck", 0.12 * fall, 0.2 * fall, 0);
      set("Bip001_Head", 0.1 * fall, 0.3 * fall, 0);
      front("L", 0.3 * fall, 0.4 * fall, 0);
      front("R", 0.1 * fall, 0.3 * fall, 0);
      hind("L", 0.35 * fall, 0.4 * fall, -0.25 * fall, 0);
      hind("R", 0.2 * fall, 0.3 * fall, -0.2 * fall, 0);
      jaw = 0.25 * fall;
    }

    // Tail: idle sway, gait wave, whip on attacks.
    const tailAmp = run ? 0.16 : moving ? 0.09 : 0.035;
    const tailSpeed = run ? 7.5 : moving ? 4.6 : 1.3;
    const tailPhase = moving ? phase * 2 : t * tailSpeed;
    const whip = state === "swipe" ? Math.sin(Math.min(1, this.stateTime / this.stateDuration) * Math.PI) * 0.4
      : state === "bite" ? Math.sin(Math.min(1, this.stateTime / this.stateDuration) * Math.PI) * 0.3
      : state === "pounce" && this.pouncePhase === "air" ? 0.4
      : state === "grab" || state === "grabHold" ? 0.28
      : state === "throw" ? Math.sin(Math.min(1, this.stateTime / this.stateDuration) * Math.PI) * 0.35
      : state === "hit" || state === "hitHeavy" ? Math.sin(Math.min(1, this.stateTime / this.stateDuration) * Math.PI) * 0.2
      : 0;
    for (let i = 0; i < RIG_TAIL.length; i++) {
      const sway = Math.sin(tailPhase + i * 0.6) * tailAmp * (0.4 + i * 0.12);
      const curl = Math.sin(t * 1.1 + i * 0.35) * 0.02;
      set(RIG_TAIL[i], curl + (state === "pounce" && this.pouncePhase === "air" ? -0.06 : 0), sway + whip * (0.3 + i * 0.1), 0);
    }

    pose.Bip001[0] += bodyPitch;
    pose.Bip001[1] += bodyYaw;
    pose.Bip001[2] += bodyRoll;
    pose.Bip001_Xtra02[0] += jaw;

    this.applyRigPose(pose, bodyY);

    if (this.flash > 0) {
      for (const entry of this.rigMaterials) {
        if (entry.color) entry.mat.color.setHex(0xff8080);
        if (entry.emissive) {
          entry.mat.emissive.setHex(0x5a1717);
          entry.mat.emissiveIntensity = 1.4;
        }
      }
    } else {
      for (const entry of this.rigMaterials) {
        if (entry.color) entry.mat.color.copy(entry.color);
        if (entry.emissive) {
          entry.mat.emissive.copy(entry.emissive);
          entry.mat.emissiveIntensity = entry.emissiveIntensity;
        }
      }
    }

    if (this.invuln > 0 && this.state !== "dead") {
      this.root.visible = Math.floor(this.animTime * 18) % 2 === 0;
    } else {
      this.root.visible = true;
    }
  };

  Panther.prototype.buildFallbackModel = function () {
    const mat = {
      fur: A.standard(0x11171f, 0.5, 0.14),
      furHi: A.standard(0x2b3948, 0.4, 0.18),
      belly: A.standard(0x1b232c, 0.58, 0.08),
      paw: A.standard(0x0e1319, 0.46, 0.12),
      nose: A.standard(0x070708, 0.35, 0.2),
      innerEar: A.standard(0x2c1a20, 0.7, 0.02),
      eye: new T.MeshStandardMaterial({
        color: 0xdcff58,
        emissive: 0xcaff44,
        emissiveIntensity: 3.6,
        roughness: 0.16,
        metalness: 0.02
      }),
      eyeSlit: new T.MeshBasicMaterial({ color: 0x050604 }),
      claw: A.standard(0xe6e4d2, 0.28, 0.16)
    };
    this.materials = mat;

    const body = new T.Group();
    body.position.set(0, BODY_Y, 0);
    this.root.add(body);
    this.model.body = body;

    const torsoGeo = new T.IcosahedronGeometry(1, 1);
    const torso = new T.Mesh(torsoGeo, mat.fur);
    torso.scale.set(0.515, 0.246, 0.204);
    torso.position.set(0.01, 0.015, 0);
    torso.castShadow = true;
    torso.receiveShadow = true;
    body.add(torso);
    this.model.torso = torso;

    const chest = new T.Mesh(new T.IcosahedronGeometry(1, 1), mat.fur);
    chest.scale.set(0.262, 0.288, 0.206);
    chest.position.set(0.315, 0.018, 0);
    chest.castShadow = true;
    body.add(chest);
    this.model.chest = chest;

    const hips = new T.Mesh(new T.IcosahedronGeometry(1, 1), mat.fur);
    hips.scale.set(0.238, 0.242, 0.196);
    hips.position.set(-0.325, 0.018, 0);
    hips.castShadow = true;
    body.add(hips);
    this.model.hips = hips;

    // Shoulder and haunch masses break the tubular silhouette into a feline
    // curve: heavy at both ends, tucked at the waist.
    for (let side = -1; side <= 1; side += 2) {
      const shoulder = new T.Mesh(new T.IcosahedronGeometry(1, 1), mat.fur);
      shoulder.scale.set(0.13, 0.168, 0.105);
      shoulder.position.set(0.30, 0.055, side * 0.118);
      shoulder.castShadow = true;
      body.add(shoulder);
      const haunch = new T.Mesh(new T.IcosahedronGeometry(1, 1), mat.fur);
      haunch.scale.set(0.152, 0.188, 0.112);
      haunch.position.set(-0.315, 0.035, side * 0.122);
      haunch.castShadow = true;
      body.add(haunch);
    }

    const belly = new T.Mesh(new T.IcosahedronGeometry(1, 1), mat.belly);
    belly.scale.set(0.45, 0.092, 0.16);
    belly.position.set(0.02, -0.16, 0);
    body.add(belly);

    const chestRuff = new T.Mesh(new T.IcosahedronGeometry(1, 1), mat.fur);
    chestRuff.scale.set(0.118, 0.142, 0.158);
    chestRuff.position.set(0.40, -0.088, 0);
    body.add(chestRuff);

    const backPlate = new T.Mesh(new T.IcosahedronGeometry(1, 1), mat.fur);
    backPlate.scale.set(0.42, 0.04, 0.11);
    backPlate.position.set(-0.02, 0.206, 0);
    body.add(backPlate);
    this.model.backPlate = backPlate;

    // Three low spine tufts sharpen the dorsal silhouette without spikes.
    for (let i = 0; i < 3; i++) {
      const tuft = new T.Mesh(new T.ConeGeometry(0.028, 0.062, 4), mat.furHi);
      tuft.position.set(0.29 - i * 0.19, 0.224 - i * 0.006, 0);
      tuft.rotation.z = 0.72 + i * 0.08;
      tuft.castShadow = true;
      body.add(tuft);
    }

    // Very faint rosettes: only catch light at grazing angles.
    const rosetteMat = new T.MeshStandardMaterial({
      color: 0x33475a,
      roughness: 0.7,
      metalness: 0.05,
      transparent: true,
      opacity: 0.17,
      depthWrite: false
    });
    const rosetteGeo = new T.TorusGeometry(0.042, 0.0075, 4, 8);
    for (let side = -1; side <= 1; side += 2) {
      for (let i = 0; i < 3; i++) {
        const ring = new T.Mesh(rosetteGeo, rosetteMat);
        ring.position.set(0.06 - i * 0.15, 0.075 - (i % 2) * 0.045, side * 0.198);
        ring.scale.set(1, 0.82, 1);
        ring.rotation.z = i * 0.7;
        ring.renderOrder = 1;
        body.add(ring);
      }
    }

    const neck = new T.Group();
    neck.position.set(0.485, 0.072, 0);
    neck.rotation.z = -0.1;
    body.add(neck);
    this.model.neck = neck;

    const neckMesh = new T.Mesh(new T.CylinderGeometry(0.102, 0.138, 0.31, 7), mat.fur);
    neckMesh.rotation.z = Math.PI / 2;
    neckMesh.position.x = 0.11;
    neckMesh.castShadow = true;
    neck.add(neckMesh);

    const head = new T.Group();
    head.position.set(0.285, 0.10, 0);
    neck.add(head);
    this.model.head = head;

    const skull = new T.Mesh(new T.IcosahedronGeometry(0.158, 1), mat.fur);
    skull.scale.set(1.2, 0.9, 0.96);
    skull.position.set(0.045, 0.012, 0);
    skull.castShadow = true;
    head.add(skull);
    this.model.skull = skull;

    const cheekL = new T.Mesh(new T.IcosahedronGeometry(0.062, 1), mat.furHi);
    cheekL.scale.set(1.2, 0.62, 0.78);
    cheekL.position.set(0.048, -0.032, 0.094);
    head.add(cheekL);
    const cheekR = cheekL.clone();
    cheekR.position.z = -0.094;
    head.add(cheekR);

    const muzzle = new T.Mesh(new T.CylinderGeometry(0.054, 0.076, 0.15, 6), mat.furHi);
    muzzle.rotation.z = -Math.PI / 2;
    muzzle.position.set(0.188, -0.032, 0);
    muzzle.castShadow = true;
    head.add(muzzle);
    this.model.muzzle = muzzle;

    const nose = new T.Mesh(new T.IcosahedronGeometry(0.028, 1), mat.nose);
    nose.scale.set(1.18, 0.68, 1.12);
    nose.position.set(0.272, -0.029, 0);
    head.add(nose);

    // Angular brow ridges give the panther a focused, predatory expression.
    for (let side = -1; side <= 1; side += 2) {
      const brow = new T.Mesh(new T.BoxGeometry(0.085, 0.028, 0.06), mat.furHi);
      brow.position.set(0.118, 0.064, side * 0.116);
      brow.rotation.z = -0.28;
      brow.rotation.y = side * 0.24;
      brow.castShadow = true;
      head.add(brow);
    }

    const jaw = new T.Group();
    jaw.position.set(0.12, -0.065, 0);
    head.add(jaw);
    this.model.jaw = jaw;
    const jawMesh = new T.Mesh(new T.BoxGeometry(0.17, 0.032, 0.10), mat.belly);
    jawMesh.position.set(0.092, -0.014, 0);
    jawMesh.castShadow = true;
    jaw.add(jawMesh);
    const chin = new T.Mesh(new T.IcosahedronGeometry(0.035, 1), mat.furHi);
    chin.position.set(0.172, -0.018, 0);
    jaw.add(chin);

    const mouth = new T.Mesh(new T.BoxGeometry(0.13, 0.011, 0.066), mat.innerEar);
    mouth.position.set(0.178, -0.062, 0);
    head.add(mouth);

    this.model.ears = [];
    for (let side = -1; side <= 1; side += 2) {
      const ear = new T.Group();
      ear.position.set(-0.005, 0.136, side * 0.096);
      ear.rotation.z = side * 0.13;
      ear.rotation.x = side * 0.2;
      const outer = new T.Mesh(new T.ConeGeometry(0.064, 0.17, 4), mat.fur);
      outer.position.y = 0.078;
      outer.castShadow = true;
      ear.add(outer);
      const inner = new T.Mesh(new T.ConeGeometry(0.038, 0.112, 4), mat.innerEar);
      inner.position.set(0.012, 0.075, side * -0.008);
      inner.scale.z = 0.42;
      ear.add(inner);
      head.add(ear);
      this.model.ears.push(ear);
    }

    for (let side = -1; side <= 1; side += 2) {
      const eye = new T.Mesh(new T.SphereGeometry(0.021, 8, 6), mat.eye);
      eye.position.set(0.12, 0.032, side * 0.13);
      eye.scale.set(0.78, 1.06, 0.38);
      head.add(eye);
      const slit = new T.Mesh(new T.BoxGeometry(0.006, 0.029, 0.005), mat.eyeSlit);
      slit.position.set(0.123, 0.032, side * 0.146);
      slit.scale.set(1, 1, 0.5);
      head.add(slit);
      const halo = new T.Sprite(new T.SpriteMaterial({
        map: A.radialTexture(),
        color: 0xe2ff46,
        transparent: true,
        opacity: 0.11,
        depthWrite: false,
        blending: T.AdditiveBlending
      }));
      halo.position.set(0.121, 0.033, side * 0.151);
      halo.scale.set(0.078, 0.078, 1);
      halo.renderOrder = 6;
      head.add(halo);
      this.eyes.push(eye);
      this.eyeHalos = this.eyeHalos || [];
      this.eyeHalos.push(halo);
    }

    this.buildFrontLeg(1);
    this.buildFrontLeg(-1);
    this.buildHindLeg(1);
    this.buildHindLeg(-1);
    this.buildTail();

    this.root.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
  };

  Panther.prototype.buildFrontLeg = function (zSign) {
    const body = this.model.body;
    const hip = new T.Group();
    hip.position.set(FRONT_HIP_X, -0.01, zSign * LEG_Z);
    hip.rotation.z = zSign > 0 ? -0.16 : -0.12;
    body.add(hip);

    const upper = A.limb(0.29, 0.072, 0.058, this.materials.fur, 6);
    hip.add(upper);

    const knee = new T.Group();
    knee.position.y = -0.29;
    knee.rotation.z = 0.38;
    hip.add(knee);
    const lower = A.limb(0.25, 0.054, 0.041, this.materials.fur, 6);
    knee.add(lower);

    const ankle = new T.Group();
    ankle.position.y = -0.25;
    ankle.rotation.z = -0.22;
    knee.add(ankle);

    const paw = A.box(0.162, 0.05, 0.122, this.materials.paw, 0.048, -0.022, 0);
    ankle.add(paw);

    const clawGroup = new T.Group();
    clawGroup.position.set(0.112, -0.016, 0);
    ankle.add(clawGroup);
    for (let i = -1; i <= 1; i++) {
      const claw = A.cone(0.013, 0.058, 4, this.materials.claw, 0, 0, i * 0.032);
      claw.rotation.z = -Math.PI / 2;
      claw.castShadow = false;
      claw.visible = false;
      clawGroup.add(claw);
      this.claws.push(claw);
    }

    const leg = {
      hip: hip,
      knee: knee,
      ankle: ankle,
      paw: paw,
      clawGroup: clawGroup,
      zSign: zSign,
      baseHip: hip.rotation.z,
      baseKnee: knee.rotation.z,
      baseAnkle: ankle.rotation.z
    };
    this.frontLegs.push(leg);
    return leg;
  };

  Panther.prototype.buildHindLeg = function (zSign) {
    const body = this.model.body;
    const hip = new T.Group();
    hip.position.set(HIND_HIP_X, -0.005, zSign * LEG_Z);
    hip.rotation.z = zSign > 0 ? 0.44 : 0.38;
    body.add(hip);

    const thigh = A.limb(0.305, 0.094, 0.064, this.materials.fur, 6);
    hip.add(thigh);

    const knee = new T.Group();
    knee.position.y = -0.305;
    knee.rotation.z = -0.72;
    hip.add(knee);
    const shin = A.limb(0.25, 0.057, 0.041, this.materials.fur, 6);
    knee.add(shin);

    const hock = new T.Group();
    hock.position.y = -0.25;
    hock.rotation.z = 0.42;
    knee.add(hock);
    const foot = A.limb(0.09, 0.042, 0.05, this.materials.paw, 5);
    hock.add(foot);

    const paw = A.box(0.165, 0.05, 0.122, this.materials.paw, 0.052, -0.095, 0);
    hock.add(paw);

    const clawGroup = new T.Group();
    clawGroup.position.set(0.116, -0.09, 0);
    hock.add(clawGroup);
    for (let i = -1; i <= 1; i++) {
      const claw = A.cone(0.013, 0.055, 4, this.materials.claw, 0, 0, i * 0.032);
      claw.rotation.z = -Math.PI / 2;
      claw.castShadow = false;
      claw.visible = false;
      clawGroup.add(claw);
      this.claws.push(claw);
    }

    const leg = {
      hip: hip,
      knee: knee,
      hock: hock,
      paw: paw,
      clawGroup: clawGroup,
      zSign: zSign,
      baseHip: hip.rotation.z,
      baseKnee: knee.rotation.z,
      baseHock: hock.rotation.z
    };
    this.hindLegs.push(leg);
    return leg;
  };

  Panther.prototype.buildTail = function () {
    const lengths = [0.20, 0.19, 0.18, 0.17, 0.16, 0.15];
    const radii = [0.065, 0.056, 0.048, 0.040, 0.032, 0.024, 0.012];
    const base = new T.Group();
    base.position.set(-0.52, 0.09, 0);
    this.model.body.add(base);
    this.model.tailBase = base;
    let parent = base;
    for (let i = 0; i < lengths.length; i++) {
      const g = new T.Group();
      g.position.x = i === 0 ? 0 : -lengths[i - 1];
      g.rotation.z = i === 0 ? 0.25 : i === 1 ? 0.16 : i === 2 ? 0.08 : i === 3 ? -0.02 : i === 4 ? -0.12 : -0.17;
      const geo = new T.CylinderGeometry(radii[i + 1], radii[i], lengths[i], 5);
      geo.rotateZ(Math.PI / 2);
      geo.translate(-lengths[i] / 2, 0, 0);
      const mesh = new T.Mesh(geo, this.materials.fur);
      mesh.castShadow = true;
      g.add(mesh);
      parent.add(g);
      this.tail.push(g);
      parent = g;
    }
    const tip = new T.Mesh(new T.IcosahedronGeometry(0.024, 1), this.materials.fur);
    tip.position.x = -lengths[lengths.length - 1];
    parent.add(tip);
  };

  Panther.prototype.reset = function (x, z) {
    this.health = this.maxHealth;
    this.x = x;
    this.z = z;
    this.y = 0;
    this.vy = 0;
    this.vx = 0;
    this.vz = 0;
    this.facing = 1;
    this.rootYaw = 0;
    this.state = "idle";
    this.stateTime = 0;
    this.stateDuration = 0;
    this.invuln = 0;
    this.flash = 0;
    this.blinkTimer = 3;
    this.earTimer = 4;
    this.specialCooldown = 0;
    this.grabCooldown = 0;
    this.jumpStamina = this.maxJumpStamina;
    this.jumpCount = 0;
    this.buff = 0;
    this.comboInputCount = 0;
    this.comboTimer = 0;
    this.bufferAction = "";
    this.bufferTime = 0;
    this.autoFaceTimer = 0;
    this.grabbed = null;
    this.grabHoldTime = 0;
    this.dead = false;
    this.deathHandled = false;
    this.pouncePhase = "";
    this.pounceHitSet = null;
    this.pounceImpactDone = false;
    this.pounceLandTime = 0;
    this.clawsOut = false;
    this.root.visible = true;
    this.root.position.set(x, 0, z);
    this.root.rotation.set(0, 0, 0);
    this.rootYaw = 0;
    this.updatePose(0);
  };

  Panther.prototype.getForward = function () {
    return this.facing;
  };

  Panther.prototype.isGrounded = function () {
    return this.y <= 0.001 && this.state !== "pounce";
  };

  Panther.prototype.canAct = function () {
    if (!this.isGrounded()) return false;
    return this.state === "idle" || this.state === "walk" || this.state === "run";
  };

  Panther.prototype.setPosition = function (x, z) {
    this.x = x;
    this.z = z;
    this.root.position.x = x;
    this.root.position.z = z;
  };

  Panther.prototype.move = function (dx, dz) {
    if (this.game.level) {
      this.game.level.moveEntity(this, dx, dz);
    } else {
      this.x += dx;
      this.z += dz;
    }
    this.root.position.x = this.x;
    this.root.position.z = this.z;
  };

  Panther.prototype.startJump = function () {
    if (!this.isGrounded() || !this.canAct()) return;
    if (this.jumpStamina < this.jumpCost) {
      this.game.ui.toast(I18n.t("toast.jump"), 700);
      return;
    }
    this.jumpStamina -= this.jumpCost;
    this.jumpCount = 1;
    this.airJumpTime = 0;
    this.state = "jump";
    this.stateTime = 0;
    this.vy = JUMP_V;
    this.y = 0.01;
    this.vx *= 0.4;
    this.game.audio.play("jump");
    this.game.particles.dust(new T.Vector3(this.x, 0.05, this.z), "#8d8775");
  };

  Panther.prototype.startAirJump = function () {
    if (this.state !== "jump") return;
    if (this.jumpCount >= 2) return;
    if (this.jumpStamina < this.jumpCost) return;
    this.jumpStamina -= this.jumpCost;
    this.jumpCount = 2;
    this.airJumpTime = 0;
    this.vy = JUMP_V * 0.94;
    this.y = Math.max(this.y, 0.12);
    this.game.audio.play("jump");
    this.game.audio.play("swipe");
  };

  Panther.prototype.startLight = function () {
    const cancelWindow = this.state === "swipe" && this.stateTime / Math.max(0.001, this.stateDuration) > 0.55;
    if (!this.canAct() && !cancelWindow && !(this.state === "jump" && this.y > 0.05)) return;
    this.faceNearestTarget(2.0, 1.25);
    if (this.comboInputCount >= 2) {
      this.startBite(true);
      this.comboInputCount = 0;
      this.comboTimer = 0;
    } else {
      this.startSwipe(this.comboInputCount);
      this.comboInputCount++;
      this.comboTimer = 1.05;
    }
  };

  // Soft lock-on: a melee press turns the panther toward the closest foe in
  // front of / beside her. Without this, every attack made while facing away
  // is a guaranteed whiff and the game reads as broken.
  Panther.prototype.nearestTarget = function (maxDx, maxDz) {
    if (!this.game || !this.game.enemies) return null;
    const dxLimit = maxDx || 2.0;
    const dzLimit = maxDz || 1.25;
    let best = null;
    let bestD = Infinity;
    for (const e of this.game.enemies) {
      if (!e || e.dead || e.removable) continue;
      if (e.state === "grabbed" || e.state === "thrown") continue;
      const dx = e.x - this.x;
      const dz = e.z - this.z;
      if (Math.abs(dz) > dzLimit) continue;
      const adx = Math.abs(dx);
      if (adx > dxLimit) continue;
      const d = adx + Math.abs(dz) * 0.6;
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  };

  Panther.prototype.faceNearestTarget = function (maxDx, maxDz) {
    const target = this.nearestTarget(maxDx, maxDz);
    if (!target) return false;
    this.facing = target.x >= this.x ? 1 : -1;
    return true;
  };

  Panther.prototype.setBuffered = function (action) {
    this.bufferAction = action;
    this.bufferTime = 0.16;
  };

  Panther.prototype.takeBuffered = function (action) {
    if (this.bufferAction !== action || this.bufferTime <= 0) return false;
    this.bufferAction = "";
    this.bufferTime = 0;
    return true;
  };

  Panther.prototype.updateBuffer = function (input) {
    if (!input || !input.wasPressed) return;
    if (input.wasPressed("jump")) this.setBuffered("jump");
    if (input.wasPressed("swipe")) this.setBuffered("swipe");
    if (input.wasPressed("bite")) this.setBuffered("bite");
    if (input.wasPressed("pounce")) this.setBuffered("pounce");
    if (input.wasPressed("grab")) this.setBuffered("grab");
  };

  Panther.prototype.startSwipe = function (index) {
    this.state = "swipe";
    this.stateLabel = "forepaw swipe";
    this.stateTime = 0;
    this.stateDuration = STATE_DURATION.swipe;
    this.attackFired = false;
    this.swipeSide = index % 2;
    this.vx *= 0.2;
    this.vz *= 0.2;
    this.grabbed = null;
  };

  Panther.prototype.startBite = function (finisher) {
    if (!this.canAct() && !(this.state === "jump" && this.y > 0.05)) return;
    this.faceNearestTarget(1.9, 1.2);
    this.state = "bite";
    this.stateLabel = "bite";
    this.stateTime = 0;
    this.stateDuration = STATE_DURATION.bite;
    this.attackFired = false;
    this.vx = this.facing * (finisher ? 2.8 : 2.2);
    this.vz = 0;
    this.grabbed = null;
    this.finisher = !!finisher;
  };

  Panther.prototype.startPounce = function () {
    if (!this.canAct() && !(this.state === "jump" && this.y > 0.1)) return;
    if (this.specialCooldown > 0.01) {
      this.game.ui.toast(I18n.t("toast.pounce", { s: this.specialCooldown.toFixed(1) }), 1100);
      return;
    }
    this.faceNearestTarget(2.6, 1.2);
    this.state = "pounce";
    this.stateLabel = "pounce";
    this.stateTime = 0;
    this.pouncePhase = "crouch";
    this.pounceHitSet = new Set();
    this.pounceImpactDone = false;
    this.pounceLandTime = 0;
    this.specialCooldown = this.specialMax;
    this.vx = 0;
    this.vz = 0;
    this.vy = 0;
    this.finisher = false;
    this.game.audio.play("pounce");
    this.game.ui.toast(I18n.t("toast.pounceNow"), 600);
  };

  Panther.prototype.tryGrab = function () {
    if (!this.canAct() || this.grabbed) return;
    if (this.grabCooldown > 0) {
      this.game.ui.toast(I18n.t("toast.grab", { s: this.grabCooldown.toFixed(1) }), 1000);
      return;
    }
    let best = null;
    let bestD = 2.2;
    for (const enemy of this.game.enemies) {
      if (!enemy || enemy.dead || enemy.state === "grabbed" || enemy.isBoss) continue;
      if (!enemy.canBeGrabbed()) continue;
      const dx = enemy.x - this.x;
      const dz = enemy.z - this.z;
      const d = Math.hypot(dx, dz);
      if (d < bestD && Math.abs(dx) < 2.0) {
        bestD = d;
        best = enemy;
      }
    }
    if (!best) {
      this.game.ui.toast(I18n.t("toast.noGrab"), 1000);
      return;
    }
    this.grabbed = best;
    this.facing = best.x >= this.x ? 1 : -1;
    best.beginGrabbed(this);
    this.state = "grab";
    this.stateLabel = "grab";
    this.stateTime = 0;
    this.stateDuration = STATE_DURATION.grab;
    this.vx = 0;
    this.vz = 0;
    this.grabCooldown = this.grabMaxCooldown;
    this.game.audio.play("bite", { pan: 0 });
  };

  Panther.prototype.throwGrabbed = function () {
    if (!this.grabbed || this.state !== "grabHold") return;
    const enemy = this.grabbed;
    enemy.throwFrom(this);
    this.grabbed = null;
    this.state = "throw";
    this.stateLabel = "throw";
    this.stateTime = 0;
    this.stateDuration = STATE_DURATION.throw;
    this.game.audio.play("swipe");
    this.game.particles.burst(
      new T.Vector3(this.x + this.facing * 0.8, 0.7, this.z),
      "#ffcf63", 14, { speed: 4.5, up: 0.9, life: 0.34, spread: 0.18, gravity: -8 }
    );
    this.game.shake(0.16, 0.18);
  };

  Panther.prototype.takeDamage = function (amount, sourceX, opts) {
    const o = opts || {};
    if (this.dead || this.invuln > 0 || this.state === "pounce" && this.pouncePhase === "air") return false;
    this.health = Math.max(0, this.health - amount);
    this.flash = 0.16;
    this.invuln = o.invuln || 0.85;
    this.game.resetCombo();
    this.game.audio.play(o.heavy ? "heavyHit" : "hit");
    this.game.particles.impact(new T.Vector3(this.x, this.y + 0.65, this.z), "#ff6b5c");
    this.game.shake(o.heavy ? 0.34 : 0.22, 0.2);
    if (this.grabbed) {
      this.grabbed.releaseGrabbed();
      this.grabbed = null;
    }
    if (this.health <= 0) {
      this.die();
      return true;
    }
    const dir = sourceX === undefined ? -this.facing : (this.x < sourceX ? -1 : 1);
    this.state = o.heavy ? "hitHeavy" : "hit";
    this.stateLabel = "hit";
    this.stateTime = 0;
    this.stateDuration = o.heavy ? STATE_DURATION.hitHeavy : STATE_DURATION.hit;
    this.vx = dir * (o.knockback || 2.8);
    this.vz = (Math.random() - 0.5) * 0.7;
    if (o.knockdown) {
      this.state = "down";
      this.stateDuration = STATE_DURATION.down;
      this.vy = 2.6;
    }
    return true;
  };

  Panther.prototype.unstuck = function () {
    // Teleport to center of visible screen (camera center) with blink/invulnerability
    this.state = "idle";
    this.stateTime = 0;
    this.stateDuration = 0;
    this.pouncePhase = "";
    this.pounceHitSet = null;
    this.pounceImpactDone = false;
    this.grabbed = null;
    this.grabHoldTime = 0;
    this.jumpCount = 0;
    this.jumpStamina = this.maxJumpStamina;
    this.airJumpTime = 0;
    this.vx = 0;
    this.vy = 0;
    this.vz = 0;
    this.invuln = 2.5;
    this.flash = 0.3;
    // Center of visible screen (camera position) clamped to level bounds
    const camX = this.game.camX !== undefined ? this.game.camX : (this.game.camera ? this.game.camera.position.x : 3);
    const cx = this.game.level ? Math.max(this.game.level.activeMinX || 0, Math.min(camX, this.game.level.activeMaxX || 84)) : camX;
    this.x = cx;
    this.z = 0;
    this.y = 0;
    this.root.position.set(cx, 0, 0);
    this.root.rotation.set(0, 0, 0);
    this.rootYaw = 0;
    this.facing = 1;
    this.dead = false;
    this.deathHandled = false;
    this.updatePose(0);
    this.syncRoot();
    this.game.camera.position.set(cx + 1.15, 2.62, 8.35);
    this.game.camX = cx + 1.15;
    this.game.camInit = true;
    this.game.audio.play("jump");
    this.game.particles.burst(new T.Vector3(cx, 0.5, 0), "#c8ff55", 20, {
      speed: 4, up: 0.8, life: 0.6, spread: 0.4, gravity: -6
    });
    this.game.shake(0.15, 0.2);
    this.game.ui.toast(I18n.t("toast.reset"), 1200);
  };

  Panther.prototype.die = function () {
    if (this.dead) return;
    this.dead = true;
    this.deathHandled = false;
    this.state = "dead";
    this.stateLabel = "defeated";
    this.stateTime = 0;
    this.stateDuration = STATE_DURATION.dead;
    this.vx = -this.facing * 1.8;
    this.vy = 1.2;
    this.invuln = 99;
    this.game.audio.play("death");
    this.game.shake(0.4, 0.5);
    this.game.onHeroDeathStart();
  };

  Panther.prototype.respawnAt = function (x, z) {
    this.dead = false;
    this.deathHandled = false;
    this.health = this.maxHealth;
    this.x = x;
    this.z = z;
    this.y = 0;
    this.vy = 0;
    this.vx = 0;
    this.vz = 0;
    this.state = "idle";
    this.stateTime = 0;
    this.stateDuration = 0;
    this.invuln = 2.2;
    this.flash = 0;
    this.bufferAction = "";
    this.bufferTime = 0;
    this.jumpStamina = this.maxJumpStamina;
    this.grabCooldown = 0;
    this.jumpCount = 0;
    this.grabbed = null;
    this.grabHoldTime = 0;
    this.pouncePhase = "";
    this.pounceHitSet = null;
    this.root.position.set(x, 0, z);
    this.root.visible = true;
    this.game.resetCombo();
    this.updatePose(0);
  };

  Panther.prototype.releaseGrabbed = function () {
    if (this.grabbed) {
      this.grabbed.releaseGrabbed();
      this.grabbed = null;
    }
  };

  Panther.prototype.damageMultiplier = function () {
    return this.buff > 0 ? 1.5 : 1;
  };

  Panther.prototype.update = function (dt, input) {
    if (!this.game) return;
    this.animTime += dt;
    this.updateBuffer(input);
    if (this.bufferTime > 0) {
      this.bufferTime -= dt;
      if (this.bufferTime <= 0) this.bufferAction = "";
    }
    if (this.invuln > 0) this.invuln -= dt;
    if (this.flash > 0) this.flash -= dt;
    if (this.buff > 0) this.buff -= dt;
    if (this.specialCooldown > 0) this.specialCooldown = Math.max(0, this.specialCooldown - dt);
    if (this.grabCooldown > 0) this.grabCooldown = Math.max(0, this.grabCooldown - dt);
    // Jump charges recover at exactly the pounce cooldown rate, in the air or
    // on the ground. A double jump followed by an instant pounce can never
    // leave the player waiting longer than the pounce itself.
    if (this.jumpStamina < this.maxJumpStamina) {
      const jumpRecovery = this.maxJumpStamina / Math.max(0.001, this.specialMax);
      this.jumpStamina = Math.min(this.maxJumpStamina, this.jumpStamina + dt * jumpRecovery);
    }
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.comboInputCount = 0;
    }

    this.root.rotation.y = A.lerpAngle(this.root.rotation.y, this.facing > 0 ? 0 : Math.PI, 1 - Math.exp(-16 * dt));
    this.root.position.y = this.y;
    this.shadow.position.y = -this.y + 0.012;
    const shadowScale = 1 - Math.min(0.55, this.y * 0.12);
    this.shadow.scale.set(shadowScale, shadowScale, 1);

    if (this.state === "dead") {
      this.stateTime += dt;
      this.y += this.vy * dt;
      this.vy -= GRAVITY * dt;
      if (this.y <= 0) { this.y = 0; this.vy = 0; }
      this.x += this.vx * dt;
      this.vx *= Math.pow(0.02, dt);
      this.root.position.x = this.x;
      this.root.position.y = this.y;
      this.updatePose(dt);
      if (this.stateTime >= 1.6 && !this.deathHandled) {
        this.deathHandled = true;
        this.game.onHeroDeathComplete();
      }
      return;
    }

    if (this.state === "hit" || this.state === "hitHeavy" || this.state === "down" || this.state === "getup") {
      this.updateHitState(dt);
      this.updatePose(dt);
      this.syncRoot();
      return;
    }

    if (this.state === "swipe") {
      this.updateSwipe(dt);
      this.updatePose(dt);
      this.syncRoot();
      return;
    }
    if (this.state === "bite") {
      this.updateBite(dt);
      this.updatePose(dt);
      this.syncRoot();
      return;
    }
    if (this.state === "pounce") {
      this.updatePounce(dt);
      this.updatePose(dt);
      this.syncRoot();
      return;
    }
    if (this.state === "grab") {
      this.updateGrab(dt);
      this.updatePose(dt);
      this.syncRoot();
      return;
    }
    if (this.state === "grabHold") {
      this.grabHoldTime += dt;
      if (this.grabbed) {
        this.grabbed.x = this.x + this.facing * 0.58;
        this.grabbed.z = this.z;
        this.grabbed.root.position.set(this.grabbed.x, 0.18, this.grabbed.z);
        this.grabbed.root.rotation.y = this.facing > 0 ? Math.PI : 0;
      }
      if (input.wasPressed("swipe") || input.wasPressed("grab") || input.wasPressed("bite")) {
        this.throwGrabbed();
      } else if (this.grabHoldTime > 1.4) {
        this.throwGrabbed();
      }
      this.updatePose(dt);
      this.syncRoot();
      return;
    }
    if (this.state === "throw") {
      this.stateTime += dt;
      this.vx *= Math.pow(0.05, dt);
      this.updatePose(dt);
      if (this.stateTime >= this.stateDuration) {
        this.state = "idle";
        this.stateTime = 0;
      }
      this.syncRoot();
      return;
    }
    if (this.state === "jump") {
      this.updateJump(dt, input);
      this.updatePose(dt);
      this.syncRoot();
      return;
    }

    this.updateLocomotion(dt, input);
    this.updatePose(dt);
    this.syncRoot();
  };

  Panther.prototype.syncRoot = function () {
    this.root.position.x = this.x;
    this.root.position.y = this.y;
    this.root.position.z = this.z;
  };

  Panther.prototype.updateLocomotion = function (dt, input) {
    let mx = input.getMoveX();
    let mz = input.getMoveZ();
    const wantsMove = Math.abs(mx) > 0.08 || Math.abs(mz) > 0.08;
    const running = input.isRunning() && wantsMove;
    let len = Math.hypot(mx, mz);
    if (len > 1) { mx /= len; mz /= len; }
    if (Math.abs(mx) > 0.08) this.facing = mx > 0 ? 1 : -1;
    if (Math.abs(mx) < 0.08) {
      this.autoFaceTimer += dt;
      if (this.autoFaceTimer > 0.3) this.faceNearestTarget(2.6, 1.5);
    } else {
      this.autoFaceTimer = 0;
    }
    const sx = running ? RUN_SPEED : WALK_SPEED;
    const sz = running ? 3.5 : DEPTH_SPEED;
    this.vx = A.damp(this.vx, mx * sx, 13, dt);
    this.vz = A.damp(this.vz, mz * sz, 13, dt);
    if (Math.abs(this.vx) < 0.03) this.vx = 0;
    if (Math.abs(this.vz) < 0.03) this.vz = 0;
    this.move(this.vx * dt, this.vz * dt);
    if (wantsMove) {
      this.state = running ? "run" : "walk";
      this.gait += dt * (running ? 1.85 : 1.15);
      this.gaitBlend = A.damp(this.gaitBlend, 1, 7, dt);
    } else {
      this.state = "idle";
      this.gaitBlend = A.damp(this.gaitBlend, 0, 5.5, dt);
    }

    if (this.takeBuffered("jump")) {
      this.startJump();
      return;
    }
    if (this.takeBuffered("swipe")) {
      this.startLight();
      return;
    }
    if (this.takeBuffered("bite")) {
      this.startBite(false);
      return;
    }
    if (this.takeBuffered("pounce")) {
      this.startPounce();
      return;
    }
    if (this.takeBuffered("grab")) {
      if (this.state === "idle" || this.state === "walk" || this.state === "run") this.tryGrab();
    }
  };

  Panther.prototype.updateJump = function (dt, input) {
    this.stateTime += dt;
    this.airJumpTime = (this.airJumpTime || 0) + dt;
    if (input.wasPressed("jump")) {
      this.startAirJump();
    }
    // Air attacks during jump
    if (input.wasPressed("swipe")) {
      this.startLight();
      return;
    }
    if (input.wasPressed("bite")) {
      this.startBite(false);
      return;
    }
    if (input.wasPressed("pounce")) {
      this.startPounce();
      return;
    }
    this.y += this.vy * dt;
    this.vy -= GRAVITY * dt;
    const mx = input.getMoveX();
    const mz = input.getMoveZ();
    this.vx = A.damp(this.vx, mx * WALK_SPEED * 0.75, 7, dt);
    this.vz = A.damp(this.vz, mz * DEPTH_SPEED * 0.75, 7, dt);
    this.move(this.vx * dt, this.vz * dt);
    if (this.y <= 0) {
      this.y = 0;
      this.vy = 0;
      this.state = "idle";
      this.stateTime = 0;
      this.jumpCount = 0;
      this.jumpStamina = this.maxJumpStamina;
      this.airJumpTime = 0;
      this.game.audio.play("land");
      this.game.particles.dust(new T.Vector3(this.x, 0.04, this.z), "#8d8775");
      this.game.shake(0.06, 0.1);
    }
  };

  Panther.prototype.updateHitState = function (dt) {
    this.stateTime += dt;
    this.x += this.vx * dt;
    this.z += this.vz * dt;
    this.y += this.vy * dt;
    this.vy -= GRAVITY * dt;
    if (this.y <= 0) {
      this.y = 0;
      if (this.vy < -2.4) this.game.particles.dust(new T.Vector3(this.x, 0.04, this.z), "#8d8775");
      this.vy = 0;
    }
    this.vx *= Math.pow(0.12, dt);
    this.vz *= Math.pow(0.12, dt);
    if (this.game.level) this.game.level.clampEntity(this);
    if (this.stateTime >= this.stateDuration) {
      if (this.state === "down") {
        this.state = "getup";
        this.stateTime = 0;
        this.stateDuration = STATE_DURATION.getup;
      } else {
        if (this.y > 0.001) {
          // Still airborne after hit: keep falling via jump state
          this.state = "jump";
          this.stateTime = 0;
          this.stateDuration = 0;
        } else {
          this.state = "idle";
          this.stateTime = 0;
          this.stateDuration = 0;
          this.jumpCount = 0;
          this.jumpStamina = this.maxJumpStamina;
          this.airJumpTime = 0;
        }
      }
    }
  };

  Panther.prototype.updateSwipe = function (dt) {
    this.stateTime += dt;
    const p = this.stateTime / this.stateDuration;
    if (!this.attackFired && p >= 0.24) {
      this.attackFired = true;
      this.game.audio.play("swipe", { pan: this.game.combat.panFor(this.x + this.facing * 0.9) });
      this.game.audio.play("scratch", { pan: this.game.combat.panFor(this.x + this.facing * 0.9) });
      this.game.combat.heroMelee("swipe", this, {
        damage: 9 * this.damageMultiplier(),
        knockback: 1.4,
        hitstop: 0.05,
        range: 1.15,
        radius: 0.9,
        y: 0.62
      });
      this.game.particles.burst(
        new T.Vector3(this.x + this.facing * 0.75, 0.6, this.z),
        "#d8ffb0", 4, { speed: 1.8, up: 0.2, life: 0.2, spread: 0.1, gravity: -2, radial: 1 }
      );
      // Claw scratch visual: short quick claw marks
      this.game.particles.burst(
        new T.Vector3(this.x + this.facing * 1.05, 0.65, this.z),
        "#e0e0e0", 6, { speed: 4.5, up: 0.1, life: 0.12, spread: 0.15, gravity: -1, radial: 1 }
      );
    }
    if (p > 0.2 && p < 0.58) {
      this.move(this.facing * 0.65 * dt, 0);
    }
    // Keep gravity while airborne so the panther doesn't hang mid-air
    if (this.y > 0.001) {
      this.y += this.vy * dt;
      this.vy -= GRAVITY * dt;
      if (this.y <= 0) {
        this.y = 0;
        this.vy = 0;
        this.state = "idle";
        this.stateTime = 0;
        this.stateDuration = 0;
        this.jumpCount = 0;
        this.jumpStamina = this.maxJumpStamina;
        this.airJumpTime = 0;
      }
    }
    if (p > 0.58 && this.takeBuffered("swipe")) {
      this.startLight();
      return;
    }
    if (p >= 1) {
      if (this.y > 0.001) {
        // Still airborne: keep falling via jump state
        this.state = "jump";
        this.stateTime = 0;
        this.stateDuration = 0;
      } else {
        this.state = "idle";
        this.stateTime = 0;
        this.stateDuration = 0;
        this.jumpCount = 0;
        this.jumpStamina = this.maxJumpStamina;
        this.airJumpTime = 0;
      }
    }
  };

  Panther.prototype.updateBite = function (dt) {
    this.stateTime += dt;
    const p = this.stateTime / this.stateDuration;
    if (!this.attackFired && p >= 0.3) {
      this.attackFired = true;
      this.game.audio.play("bite");
      this.game.combat.heroMelee("bite", this, {
        damage: 11 * this.damageMultiplier(),
        knockback: 3.0,
        hitstop: 0.07,
        range: 1.15,
        radius: 0.72,
        y: 0.75,
        stagger: true
      });
    }
    if (p > 0.12 && p < 0.42) {
      this.move(this.facing * 2.1 * dt, 0);
    }
    // Keep gravity while airborne so the panther doesn't hang mid-air
    if (this.y > 0.001) {
      this.y += this.vy * dt;
      this.vy -= GRAVITY * dt;
      if (this.y <= 0) {
        this.y = 0;
        this.vy = 0;
        this.state = "idle";
        this.stateTime = 0;
        this.stateDuration = 0;
        this.jumpCount = 0;
        this.jumpStamina = this.maxJumpStamina;
        this.airJumpTime = 0;
      }
    }
    if (p >= 1) {
      if (this.y > 0.001) {
        this.state = "jump";
        this.stateTime = 0;
        this.stateDuration = 0;
      } else {
        this.state = "idle";
        this.stateTime = 0;
        this.stateDuration = 0;
        this.jumpCount = 0;
        this.jumpStamina = this.maxJumpStamina;
        this.airJumpTime = 0;
      }
    }
  };

  Panther.prototype.updatePounce = function (dt) {
    this.stateTime += dt;
    if (this.pouncePhase === "crouch") {
      this.vx = 0;
      this.vz = 0;
      if (this.stateTime >= 0.2) {
        this.pouncePhase = "air";
        this.stateTime = 0;
        this.vy = 5.35;
        this.vx = this.facing * 8.7;
        this.vz = 0;
        this.game.audio.play("swipe");
      }
      return;
    }
    if (this.pouncePhase === "air") {
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.vy -= 16 * dt;
      if (this.game.level) {
        this.game.level.clampEntity(this);
        // Smash through breakables (crates/barrels) instead of bouncing off them
        const breakList = this.game.level.breakables;
        const r = this.radius || 0.45;
        for (const b of breakList) {
          if (b.broken || !b.mesh) continue;
          const dx = b.x - this.x;
          const dz = b.z - this.z;
          if (dx * dx + dz * dz < (r + b.radius) * (r + b.radius)) {
            this.game.level.breakBreakable(b);
          }
        }
      }
      this.checkPounceHits();
      if (this.y <= 0) {
        this.landPounce();
      }
      return;
    }
    if (this.pouncePhase === "recover") {
      this.pounceLandTime += dt;
      this.vx *= Math.pow(0.02, dt);
      this.vz *= Math.pow(0.02, dt);
      if (this.pounceLandTime >= 0.43) {
        this.state = "idle";
        this.stateTime = 0;
        this.stateDuration = 0;
        this.pouncePhase = "";
      }
    }
  };

  Panther.prototype.checkPounceHits = function () {
    const baseReach = 1.05;
    for (const enemy of this.game.enemies) {
      if (!enemy || enemy.dead || this.pounceHitSet.has(enemy.id)) continue;
      const dx = enemy.x - this.x;
      const dz = enemy.z - this.z;
      const reach = baseReach + Math.min(0.35, enemy.radius * 0.55);
      const zReach = 0.95 + enemy.radius * 0.3;
      if (Math.abs(dx) < reach && Math.abs(dz) < zReach && this.y < 1.45) {
        this.pounceHitSet.add(enemy.id);
        const result = enemy.takeDamage(18 * this.damageMultiplier(), this.x, {
          knockback: 6.0,
          hitstop: 0.09,
          heavy: true,
          knockdown: true,
          source: "pounce"
        });
        if (result) {
          this.game.audio.play("heavyHit");
          this.game.particles.impact(new T.Vector3(enemy.x, 0.8, enemy.z), "#d6ff8a");
          this.game.shake(0.3, 0.22);
          this.game.registerHit(enemy, 2);
        }
      }
    }
  };

  Panther.prototype.landPounce = function () {
    this.y = 0;
    this.vy = 0;
    this.vx = 0;
    this.pouncePhase = "recover";
    this.pounceLandTime = 0;
    this.game.audio.play("land");
    this.game.particles.dust(new T.Vector3(this.x, 0.04, this.z), "#a69b83");
    this.game.particles.impact(new T.Vector3(this.x, 0.25, this.z), "#d8ff9b");
    this.game.shake(0.3, 0.24);
    if (!this.pounceImpactDone) {
      this.pounceImpactDone = true;
      for (const enemy of this.game.enemies) {
        if (!enemy || enemy.dead || this.pounceHitSet.has(enemy.id)) continue;
        const dx = enemy.x - this.x;
        const dz = enemy.z - this.z;
        const reach = 1.25 + Math.min(0.3, enemy.radius * 0.5);
        const zReach = 1.0 + enemy.radius * 0.3;
        if (Math.abs(dx) < reach && Math.abs(dz) < zReach) {
          this.pounceHitSet.add(enemy.id);
          const hit = enemy.takeDamage(8 * this.damageMultiplier(), this.x, {
            knockback: 4.2,
            hitstop: 0.06,
            heavy: true,
            knockdown: true,
            source: "pounceImpact"
          });
          if (hit) this.game.registerHit(enemy, 1);
        }
      }
    }
  };

  Panther.prototype.updateGrab = function (dt) {
    this.stateTime += dt;
    if (this.grabbed) {
      this.grabbed.x = this.x + this.facing * 0.58;
      this.grabbed.z = this.z;
      this.grabbed.root.position.set(this.grabbed.x, 0.18, this.grabbed.z);
      this.grabbed.root.rotation.y = this.facing > 0 ? Math.PI : 0;
      this.grabbed.state = "grabbed";
    }
    if (this.stateTime >= this.stateDuration) {
      this.state = "grabHold";
      this.stateTime = 0;
      this.grabHoldTime = 0;
      this.game.ui.toast(I18n.t("toast.throw"), 1300);
    }
  };

  Panther.prototype.updatePose = function (dt) {
    if (this.rig) {
      this.updateRigPose(dt);
      return;
    }
    if (this.model && this.model.body) this.updatePoseFallback(dt);
  };

  Panther.prototype.updatePoseFallback = function (dt) {
    const m = this.model;
    if (!m.body) return;
    const state = this.state;
    const t = this.animTime;
    const moving = state === "walk" || state === "run";
    const run = state === "run";
    const gaitAmp = (run ? 0.78 : 0.46) * this.gaitBlend;
    const motion = this.gaitBlend;
    const phase = this.gait * Math.PI * 2;
    let bodyBob = 0;
    let bodyPitch = 0;
    let bodyRoll = 0;
    let bodyYaw = 0;
    let bodyY = BODY_Y;

    this.clawsOut = state === "swipe" || state === "bite" || state === "pounce" || state === "grab" || state === "grabHold";
    for (const c of this.claws) c.visible = this.clawsOut;

    // Blink and ear flicks are deliberately slow so the idle reads as alive.
    this.blinkTimer -= dt;
    if (this.blinkTimer <= 0) {
      this.blinkTimer = 3.5 + Math.random() * 3.5;
      this.blinkPulse = 0.12;
    }
    if (this.blinkPulse > 0) this.blinkPulse -= dt;
    const blink = this.blinkPulse > 0 ? 0.12 : 1;
    for (const eye of this.eyes) eye.scale.y = blink;
    if (this.eyeHalos) {
      for (const halo of this.eyeHalos) {
        halo.material.opacity = 0.11 * blink;
        halo.scale.y = 0.078 * (0.5 + blink * 0.5);
      }
    }

    // Base pose.
    this.frontLegs.forEach((leg, i) => {
      const off = i === 0 ? 0.08 : 0.58;
      const swing = motion > 0.002 ? Math.sin(phase + off * Math.PI * 2) * gaitAmp : 0;
      const lift = motion > 0.002 ? Math.max(0, Math.cos(phase + off * Math.PI * 2)) * 0.26 * motion : 0;
      leg.hip.rotation.z = leg.baseHip - swing * 0.58 - lift * 0.12;
      leg.knee.rotation.z = leg.baseKnee + Math.max(0, swing) * 0.52 + lift * 0.5;
      leg.ankle.rotation.z = leg.baseAnkle - Math.max(0, swing) * 0.2;
      leg.hip.rotation.y = motion > 0.002 ? Math.sin(phase + off * Math.PI * 2) * 0.026 : 0;
    });
    this.hindLegs.forEach((leg, i) => {
      const off = i === 0 ? 0.36 : 0.86;
      const swing = motion > 0.002 ? Math.sin(phase + off * Math.PI * 2) * gaitAmp : 0;
      const lift = motion > 0.002 ? Math.max(0, Math.cos(phase + off * Math.PI * 2)) * 0.2 * motion : 0;
      leg.hip.rotation.z = leg.baseHip - swing * 0.62 - lift * 0.15;
      leg.knee.rotation.z = leg.baseKnee + Math.max(0, swing) * 0.56 + lift * 0.52;
      leg.hock.rotation.z = leg.baseHock - Math.max(0, swing) * 0.23;
      leg.hip.rotation.y = motion > 0.002 ? Math.sin(phase + off * Math.PI * 2) * 0.026 : 0;
    });
    m.jaw.rotation.z = -0.045;
    m.neck.rotation.z = -0.1;
    m.head.rotation.y = Math.sin(t * 0.43) * 0.025;
    m.head.rotation.z = 0;
    m.neck.position.x = 0.485;
    m.head.position.x = 0.285;

    if (moving) {
      bodyBob = Math.sin(phase * 2) * (run ? 0.025 : 0.012);
      bodyPitch = run ? -0.06 : -0.025;
      bodyYaw = Math.sin(phase) * (run ? 0.055 : 0.028);
      bodyRoll = Math.sin(phase + 0.8) * (run ? 0.025 : 0.012);
    } else {
      bodyBob = Math.sin(t * (Math.PI * 2 / 2.8)) * 0.008;
      m.body.scale.set(1, 1 + Math.sin(t * 2.2) * 0.006, 1.01);
    }

    // State-specific overlay.
    if (state === "jump") {
      const up = Math.max(-1, Math.min(1, this.vy / JUMP_V));
      bodyPitch = -0.1 - up * 0.08;
      this.frontLegs.forEach((leg) => {
        leg.hip.rotation.z = -0.95;
        leg.knee.rotation.z = 0.95;
      });
      this.hindLegs.forEach((leg) => {
        leg.hip.rotation.z = 1.05;
        leg.knee.rotation.z = -1.2;
      });
      bodyY += 0.02;
    } else if (state === "swipe") {
      const p = Math.min(1, this.stateTime / this.stateDuration);
      const arc = Math.sin(p * Math.PI);
      const chosen = this.frontLegs[this.swipeSide];
      if (chosen) {
        const dir = chosen.zSign > 0 ? 1 : -1;
        // Paw reaches up and FORWARD (extend leg forward, not back)
        chosen.hip.rotation.z = chosen.baseHip + 1.3 * arc;
        chosen.hip.rotation.y = dir * 0.5 * arc;
        chosen.knee.rotation.z = chosen.baseKnee - 0.6 * arc;
        chosen.ankle.rotation.z = chosen.baseAnkle - 0.4 * arc;
      }
      const support = this.frontLegs[1 - this.swipeSide];
      if (support) {
        support.hip.rotation.z = support.baseHip + 0.4 * arc;
        support.knee.rotation.z = support.baseKnee - 0.22 * arc;
      }
      bodyYaw = -this.facing * 0.08 + (this.swipeSide ? -0.14 : 0.14) * arc;
      bodyRoll = (this.swipeSide ? -1 : 1) * 0.075 * arc;
      bodyPitch = -0.03 - 0.06 * arc;
      bodyY += 0.02 * arc;
      m.head.rotation.y = -this.facing * 0.18 * arc;
      m.jaw.rotation.z = -0.12 * arc;
    } else if (state === "bite") {
      const p = Math.min(1, this.stateTime / this.stateDuration);
      const open = A.smoothstep(0.12, 0.36, p) * (1 - A.smoothstep(0.7, 1, p));
      const extend = A.smoothstep(0.1, 0.36, p) * (1 - A.smoothstep(0.66, 1, p));
      bodyPitch = -0.08 - 0.1 * open;
      bodyYaw = -this.facing * 0.06 * open;
      bodyY += 0.03 * open;
      m.neck.position.x = 0.485 + 0.09 * extend;
      m.head.position.x = 0.285 + 0.06 * extend;
      m.neck.rotation.z = -0.14 - 0.1 * open;
      m.head.rotation.z = 0.1 * open;
      m.jaw.rotation.z = -0.55 * open - 0.04;
      this.frontLegs.forEach((leg) => {
        leg.hip.rotation.z = leg.baseHip + 0.17 * open;
        leg.knee.rotation.z = leg.baseKnee - 0.1 * open;
      });
      this.hindLegs.forEach((leg) => {
        leg.hip.rotation.z = leg.baseHip - 0.16 * open;
      });
      m.head.rotation.y = -this.facing * 0.12 * open;
    } else if (state === "pounce") {
      if (this.pouncePhase === "crouch") {
        const p = Math.min(1, this.stateTime / 0.2);
        bodyY -= 0.1 * p;
        bodyPitch = 0.05 * p;
        this.frontLegs.forEach((leg) => {
          leg.hip.rotation.z = leg.baseHip - 0.42 * p;
          leg.knee.rotation.z = leg.baseKnee + 0.55 * p;
        });
        this.hindLegs.forEach((leg) => {
          leg.hip.rotation.z = leg.baseHip + 0.55 * p;
          leg.knee.rotation.z = leg.baseKnee - 0.85 * p;
        });
        m.jaw.rotation.z = -0.16 * p;
      } else if (this.pouncePhase === "air") {
        bodyPitch = -0.16;
        bodyY += 0.03;
        this.frontLegs.forEach((leg) => {
          leg.hip.rotation.z = -1.15;
          leg.knee.rotation.z = 0.7;
          leg.ankle.rotation.z = -0.5;
        });
        this.hindLegs.forEach((leg) => {
          leg.hip.rotation.z = 1.1;
          leg.knee.rotation.z = -1.3;
        });
        m.jaw.rotation.z = -0.55;
        m.neck.rotation.z = -0.16;
        m.head.rotation.z = 0.08;
      } else {
        const p = Math.min(1, this.pounceLandTime / 0.43);
        const crouch = Math.sin(Math.min(1, p * 1.6) * Math.PI * 0.75);
        bodyY -= 0.1 * (1 - p) * crouch;
        bodyPitch = 0.06 * crouch;
        this.frontLegs.forEach((leg) => {
          leg.hip.rotation.z = leg.baseHip - 0.3 * crouch;
          leg.knee.rotation.z = leg.baseKnee + 0.4 * crouch;
        });
        this.hindLegs.forEach((leg) => {
          leg.hip.rotation.z = leg.baseHip + 0.4 * crouch;
          leg.knee.rotation.z = leg.baseKnee - 0.55 * crouch;
        });
      }
    } else if (state === "grab" || state === "grabHold") {
      const shiver = state === "grabHold" ? Math.sin(t * 28) * 0.018 : 0;
      bodyPitch = -0.06;
      bodyY += 0.03;
      m.jaw.rotation.z = -0.42;
      m.neck.rotation.z = -0.12;
      this.frontLegs.forEach((leg) => {
        leg.hip.rotation.z = -1.0;
        leg.knee.rotation.z = 0.8;
      });
      this.hindLegs.forEach((leg) => {
        leg.hip.rotation.z = leg.baseHip + 0.2;
        leg.knee.rotation.z = leg.baseKnee - 0.2;
      });
      bodyYaw = shiver;
      m.head.rotation.y = shiver * 2;
    } else if (state === "throw") {
      const p = Math.min(1, this.stateTime / this.stateDuration);
      const swing = Math.sin(p * Math.PI);
      bodyYaw = -this.facing * 0.55 * swing;
      bodyRoll = 0.1 * swing;
      m.head.rotation.y = -this.facing * 0.4 * swing;
      m.jaw.rotation.z = -0.15 * (1 - p) - 0.04;
      this.frontLegs.forEach((leg) => {
        leg.hip.rotation.z = leg.baseHip - 0.9 * (1 - p);
        leg.knee.rotation.z = leg.baseKnee + 0.7 * (1 - p);
      });
      bodyY += 0.02 * swing;
    } else if (state === "hit" || state === "hitHeavy") {
      const p = Math.min(1, this.stateTime / this.stateDuration);
      const recoil = Math.sin(p * Math.PI);
      bodyPitch = 0.05 * recoil;
      bodyRoll = -0.08 * recoil * this.facing;
      bodyYaw = 0.12 * recoil * this.facing;
      m.head.rotation.y = 0.16 * recoil;
      m.head.rotation.z = -0.08 * recoil;
      m.jaw.rotation.z = -0.16 * recoil;
      m.ears.forEach((ear) => { ear.rotation.x += (ear === m.ears[0] ? 0.2 : -0.2) * recoil; });
      this.frontLegs.forEach((leg) => {
        leg.hip.rotation.z = leg.baseHip + 0.2 * recoil;
      });
    } else if (state === "down" || state === "getup") {
      const p = state === "down"
        ? Math.min(1, this.stateTime / 0.35)
        : 1 - Math.min(1, this.stateTime / this.stateDuration);
      const roll = A.smoothstep(0, 1, p);
      m.body.rotation.x = -1.22 * roll;
      bodyY = BODY_Y - 0.25 * roll;
      bodyPitch = 0.04 * roll;
      this.frontLegs.forEach((leg) => {
        leg.hip.rotation.z = leg.baseHip - 0.2 * roll;
      });
      this.hindLegs.forEach((leg) => {
        leg.hip.rotation.z = leg.baseHip + 0.3 * roll;
      });
    } else if (state === "dead") {
      const p = Math.min(1, this.stateTime / 1.2);
      m.body.rotation.x = -1.45 * A.smoothstep(0, 1, p);
      bodyY = BODY_Y - 0.3 * p;
      bodyPitch = 0.02;
      m.jaw.rotation.z = -0.1;
      this.frontLegs.forEach((leg) => { leg.hip.rotation.z = leg.baseHip - 0.5 * p; });
      this.hindLegs.forEach((leg) => { leg.hip.rotation.z = leg.baseHip + 0.5 * p; });
      m.ears.forEach((ear) => { ear.rotation.x = 0.35 * p; });
    }

    // Apply body base.
    m.body.position.y = bodyY + bodyBob;
    m.body.rotation.z = bodyPitch;
    m.body.rotation.y = bodyYaw;
    m.body.rotation.x = state === "down" || state === "getup" || state === "dead" ? m.body.rotation.x : bodyRoll;

    // Tail secondary motion: idle sway, gait-driven motion when moving, whips on attacks.
    const tailAmp = state === "run" ? 0.17 : state === "walk" ? 0.1 : state === "idle" ? 0.032 : state === "hit" || state === "hitHeavy" ? 0.11 : 0.055;
    const tailSpeed = state === "run" ? 8.5 : state === "walk" ? 5.2 : state === "idle" ? 1.25 : 2.6;
    const tailPhase = moving ? phase * 2 : t * tailSpeed * 2;
    for (let i = 0; i < this.tail.length; i++) {
      const seg = this.tail[i];
      const baseY = Math.sin(tailPhase + i * 0.58) * tailAmp * (0.35 + i * 0.11);
      const whip = state === "swipe" ? Math.sin(Math.min(1, this.stateTime / this.stateDuration) * Math.PI) * 0.5
        : state === "bite" ? Math.sin(Math.min(1, this.stateTime / this.stateDuration) * Math.PI) * 0.34
        : state === "pounce" && this.pouncePhase === "air" ? 0.5
        : state === "grab" || state === "grabHold" ? 0.32
        : state === "throw" ? Math.sin(Math.min(1, this.stateTime / this.stateDuration) * Math.PI) * 0.4
        : state === "hit" || state === "hitHeavy" ? Math.sin(Math.min(1, this.stateTime / this.stateDuration) * Math.PI) * 0.22
        : 0;
      seg.rotation.y = baseY + whip + (state === "pounce" && this.pouncePhase === "air" ? 0.04 : 0);
      const baseZ = i === 0 ? 0.25 : i === 1 ? 0.16 : i === 2 ? 0.08 : i === 3 ? -0.02 : i === 4 ? -0.12 : -0.17;
      seg.rotation.z = baseZ + Math.sin(t * 1.1 + i * 0.35) * 0.018 + whip * 0.5;
      if (state === "pounce" && this.pouncePhase === "air") {
        seg.rotation.z = baseZ * 0.18 + Math.sin(t * 4 + i * 0.4) * 0.03;
      }
    }

    // Ear idle flick.
    this.earTimer -= dt;
    if (this.earTimer <= 0) {
      this.earTimer = 4.0 + Math.random() * 4.5;
      this.earFlick = 0.25;
    }
    if (this.earFlick > 0) this.earFlick -= dt;
    const flick = this.earFlick > 0 ? Math.sin((0.25 - this.earFlick) * 45) * 0.18 : 0;
    m.ears[0].rotation.z = 0.13 + flick;
    m.ears[1].rotation.z = -0.13 - flick;

    // Invulnerability blink and damage flash.
    if (this.flash > 0) {
      this.materials.fur.emissive.setHex(0x5a1717);
      this.materials.fur.emissiveIntensity = 1.2;
      this.materials.furHi.emissive.setHex(0x4a1111);
      this.materials.furHi.emissiveIntensity = 0.9;
    } else {
      this.materials.fur.emissive.setHex(0x000000);
      this.materials.fur.emissiveIntensity = 0;
      this.materials.furHi.emissive.setHex(0x000000);
      this.materials.furHi.emissiveIntensity = 0;
    }
    if (this.invuln > 0 && this.state !== "dead") {
      this.root.visible = Math.floor(this.animTime * 18) % 2 === 0;
    } else {
      this.root.visible = true;
    }
  };

  Panther.prototype.statusText = function () {
    if (this.state === "pounce") return "POUNCE";
    if (this.state === "grab" || this.state === "grabHold") return "GRAB";
    if (this.state === "throw") return "THROW";
    return this.stateLabel.toUpperCase();
  };

  NF.Panther = Panther;
})();
