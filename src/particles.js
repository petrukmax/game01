(function () {
  "use strict";

  const NF = (window.NF = window.NF || {});
  const T = window.THREE;
  const A = NF.Assets;

  const SPARK_MAX = 300;
  const PUFF_MAX = 140;

  // A crisp core with a short soft falloff: reads as a hot spark at small
  // sizes, and as a soft mote when scaled up for dust.
  function particleTexture() {
    return A.canvasTexture(64, 64, (ctx, w, h) => {
      const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      g.addColorStop(0, "rgba(255,255,255,1)");
      g.addColorStop(0.4, "rgba(255,255,255,0.94)");
      g.addColorStop(0.68, "rgba(255,255,255,0.34)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }, { repeat: [1, 1] });
  }

  // A soft round sprite means every particle reads as a glow or a dust mote
  // instead of a hard square pixel.
  function makeCloud(group, max, size, opacity, order, tex) {
    const positions = new Float32Array(max * 3);
    const colors = new Float32Array(max * 3);
    const geom = new T.BufferGeometry();
    geom.setAttribute("position", new T.BufferAttribute(positions, 3));
    geom.setAttribute("color", new T.BufferAttribute(colors, 3));
    const mat = new T.PointsMaterial({
      size: size,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: opacity,
      depthWrite: false,
      blending: T.AdditiveBlending,
      map: tex
    });
    const points = new T.Points(geom, mat);
    points.frustumCulled = false;
    points.renderOrder = order;
    group.add(points);
    for (let i = 0; i < max; i++) positions[i * 3 + 1] = -999;
    return {
      points: points,
      geometry: geom,
      positions: positions,
      colors: colors,
      vel: new Float32Array(max * 3),
      life: new Float32Array(max),
      maxLife: new Float32Array(max),
      gravity: new Float32Array(max),
      drag: new Float32Array(max),
      max: max,
      cursor: 0
    };
  }

  function Particles(scene) {
    this.group = new T.Group();
    this.group.name = "particles";
    scene.add(this.group);
    const tex = particleTexture();
    this.sparks = makeCloud(this.group, SPARK_MAX, 0.13, 0.98, 8, tex);
    this.puffs = makeCloud(this.group, PUFF_MAX, 0.32, 0.42, 9, tex);
    this._color = new T.Color();
  }

  Particles.prototype.spawnInto = function (cloud, x, y, z, color, opts) {
    const o = opts || {};
    const i = cloud.cursor;
    cloud.cursor = (cloud.cursor + 1) % cloud.max;
    const ix = i * 3;
    cloud.positions[ix] = x + (Math.random() - 0.5) * (o.spread || 0.1);
    cloud.positions[ix + 1] = y + (Math.random() - 0.5) * (o.spread || 0.1);
    cloud.positions[ix + 2] = z + (Math.random() - 0.5) * (o.spread || 0.1);
    const speed = o.speed === undefined ? 2.2 : o.speed;
    const angle = Math.random() * Math.PI * 2;
    const up = o.up === undefined ? 0.7 : o.up;
    const radial = (o.radial === undefined ? 1 : o.radial) * Math.random();
    cloud.vel[ix] = Math.cos(angle) * speed * radial;
    cloud.vel[ix + 1] = speed * up * (0.35 + Math.random() * 0.9);
    cloud.vel[ix + 2] = Math.sin(angle) * speed * radial * (o.depth || 0.55);
    this._color.set(color);
    cloud.colors[ix] = this._color.r;
    cloud.colors[ix + 1] = this._color.g;
    cloud.colors[ix + 2] = this._color.b;
    const life = (o.life || 0.45) * (0.7 + Math.random() * 0.6);
    cloud.life[i] = life;
    cloud.maxLife[i] = life;
    cloud.gravity[i] = o.gravity === undefined ? -9.5 : o.gravity;
    cloud.drag[i] = o.drag === undefined ? 0.92 : o.drag;
  };

  Particles.prototype.spawn = function (x, y, z, color, opts) {
    this.spawnInto(this.sparks, x, y, z, color, opts);
  };

  Particles.prototype.burst = function (pos, color, count, opts) {
    const n = count || 8;
    for (let i = 0; i < n; i++) {
      this.spawnInto(this.sparks, pos.x, pos.y, pos.z, color, opts);
    }
  };

  Particles.prototype.burstPuffs = function (pos, color, count, opts) {
    const n = count || 6;
    for (let i = 0; i < n; i++) {
      this.spawnInto(this.puffs, pos.x, pos.y, pos.z, color, opts);
    }
  };

  Particles.prototype.spark = function (pos, color) {
    this.burst(pos, color || "#ffd86a", 9, {
      speed: 3.8,
      up: 0.55,
      life: 0.28,
      spread: 0.16,
      gravity: -10,
      radial: 1
    });
  };

  Particles.prototype.dust = function (pos, color) {
    this.burstPuffs(pos, color || "#9b9383", 7, {
      speed: 1.25,
      up: 0.4,
      life: 0.55,
      spread: 0.3,
      gravity: -1.4,
      radial: 1.2,
      drag: 0.84
    });
  };

  Particles.prototype.coin = function (pos) {
    this.burst(pos, "#ffd45c", 7, {
      speed: 2.2,
      up: 1.25,
      life: 0.45,
      spread: 0.08,
      gravity: -5.5,
      radial: 0.25
    });
  };

  Particles.prototype.impact = function (pos, color) {
    this.burst(pos, color || "#ffffff", 16, {
      speed: 5.2,
      up: 0.55,
      life: 0.34,
      spread: 0.1,
      gravity: -12,
      radial: 1.2
    });
  };

  function updateCloud(cloud, dt) {
    const pos = cloud.positions;
    const col = cloud.colors;
    const vel = cloud.vel;
    for (let i = 0; i < cloud.max; i++) {
      if (cloud.life[i] <= 0) {
        if (pos[i * 3 + 1] > -900) {
          pos[i * 3 + 1] = -999;
        }
        continue;
      }
      const ix = i * 3;
      cloud.life[i] -= dt;
      if (cloud.life[i] <= 0) {
        pos[ix + 1] = -999;
        col[ix] = 0;
        col[ix + 1] = 0;
        col[ix + 2] = 0;
        continue;
      }
      const drag = Math.pow(cloud.drag[i], dt * 60);
      vel[ix] *= drag;
      vel[ix + 2] *= drag;
      vel[ix + 1] += cloud.gravity[i] * dt;
      pos[ix] += vel[ix] * dt;
      pos[ix + 1] += vel[ix + 1] * dt;
      pos[ix + 2] += vel[ix + 2] * dt;
      if (pos[ix + 1] < 0.02) {
        pos[ix + 1] = 0.02;
        vel[ix + 1] *= -0.28;
        vel[ix] *= 0.7;
        vel[ix + 2] *= 0.7;
      }
      const fade = Math.max(0, cloud.life[i] / cloud.maxLife[i]);
      const fade2 = fade * fade;
      col[ix] *= 0.985;
      col[ix + 1] *= 0.985;
      col[ix + 2] *= 0.985;
      if (fade < 0.55) {
        col[ix] *= 0.94;
        col[ix + 1] *= 0.94;
        col[ix + 2] *= 0.94;
      }
      if (fade2 < 0.05) {
        col[ix] *= 0.9;
        col[ix + 1] *= 0.9;
        col[ix + 2] *= 0.9;
      }
    }
    cloud.geometry.attributes.position.needsUpdate = true;
    cloud.geometry.attributes.color.needsUpdate = true;
  }

  Particles.prototype.update = function (dt) {
    updateCloud(this.sparks, dt);
    updateCloud(this.puffs, dt);
  };

  function clearCloud(cloud) {
    for (let i = 0; i < cloud.max; i++) {
      cloud.life[i] = 0;
      cloud.positions[i * 3 + 1] = -999;
      cloud.colors[i * 3] = 0;
      cloud.colors[i * 3 + 1] = 0;
      cloud.colors[i * 3 + 2] = 0;
    }
    cloud.geometry.attributes.position.needsUpdate = true;
    cloud.geometry.attributes.color.needsUpdate = true;
  }

  Particles.prototype.clear = function () {
    clearCloud(this.sparks);
    clearCloud(this.puffs);
  };

  NF.Particles = Particles;
})();
