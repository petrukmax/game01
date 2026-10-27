(function () {
  "use strict";

  const NF = (window.NF = window.NF || {});
  const T = window.THREE;

  function makeRng(seed) {
    let s = seed >>> 0;
    return function () {
      s += 0x6d2b79f5;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function rand(rng, a, b) {
    return a + (b - a) * rng();
  }

  function pick(rng, list) {
    return list[Math.floor(rng() * list.length) % list.length];
  }

  function clamp(v, a, b) {
    return v < a ? a : v > b ? b : v;
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function damp(current, target, lambda, dt) {
    return lerp(current, target, 1 - Math.exp(-lambda * dt));
  }

  function smoothstep(a, b, x) {
    const t = clamp((x - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  }

  function lerpAngle(a, b, t) {
    let diff = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
    if (diff < -Math.PI) diff += Math.PI * 2;
    return a + diff * t;
  }

  function canvasTexture(width, height, draw, options) {
    const opts = options || {};
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    draw(ctx, width, height);
    const tex = new T.CanvasTexture(canvas);
    tex.colorSpace = opts.linear ? T.NoColorSpace : T.SRGBColorSpace;
    tex.wrapS = T.RepeatWrapping;
    tex.wrapT = T.RepeatWrapping;
    const repeat = opts.repeat || [1, 1];
    tex.repeat.set(repeat[0], repeat[1]);
    if (opts.offset) tex.offset.set(opts.offset[0], opts.offset[1]);
    tex.anisotropy = 4;
    tex.needsUpdate = true;
    return tex;
  }

  function noiseFill(ctx, w, h, rng, base, count, alphaMax) {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < count; i++) {
      const x = Math.floor(rng() * w);
      const y = Math.floor(rng() * h);
      const a = rng() * alphaMax;
      const shade = rng() > 0.5 ? 255 : 0;
      ctx.fillStyle = "rgba(" + shade + "," + shade + "," + shade + "," + a + ")";
      ctx.fillRect(x, y, 1 + Math.floor(rng() * 3), 1 + Math.floor(rng() * 3));
    }
  }

  function asphaltTexture() {
    return canvasTexture(256, 256, (ctx, w, h) => {
      const rng = makeRng(1201);
      noiseFill(ctx, w, h, rng, "#1b2027", 5200, 0.09);
      ctx.globalAlpha = 0.25;
      for (let i = 0; i < 14; i++) {
        ctx.strokeStyle = i % 2 ? "#0c0e12" : "#333942";
        ctx.lineWidth = rand(rng, 0.5, 1.8);
        ctx.beginPath();
        let x = rand(rng, 0, w);
        let y = rand(rng, 0, h);
        ctx.moveTo(x, y);
        for (let j = 0; j < 4; j++) {
          x += rand(rng, -28, 28);
          y += rand(rng, 8, 34);
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 0.16;
      for (let i = 0; i < 8; i++) {
        ctx.fillStyle = "#7a8088";
        ctx.beginPath();
        ctx.ellipse(rand(rng, 0, w), rand(rng, 0, h), rand(rng, 8, 30), rand(rng, 2, 7), rng() * 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }, { repeat: [7, 2] });
  }

  function sidewalkTexture() {
    return canvasTexture(256, 256, (ctx, w, h) => {
      const rng = makeRng(1202);
      noiseFill(ctx, w, h, rng, "#3a3e44", 3200, 0.08);
      ctx.strokeStyle = "rgba(10,12,15,0.65)";
      ctx.lineWidth = 3;
      for (let x = 0; x <= w; x += 64) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y <= h; y += 64) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      ctx.strokeStyle = "rgba(255,255,255,0.05)";
      ctx.lineWidth = 1;
      for (let x = 2; x < w; x += 64) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
    }, { repeat: [8, 2] });
  }

  function woodTexture() {
    return canvasTexture(512, 256, (ctx, w, h) => {
      const rng = makeRng(1203);
      ctx.fillStyle = "#5a3b25";
      ctx.fillRect(0, 0, w, h);
      const plank = 42;
      for (let y = 0; y < h; y += plank) {
        const shade = 49 + Math.floor(rng() * 20);
        ctx.fillStyle = "rgb(" + (shade + 18) + "," + shade + "," + Math.floor(shade * 0.62) + ")";
        ctx.fillRect(0, y, w, plank - 3);
        ctx.fillStyle = "rgba(20,10,4,0.55)";
        ctx.fillRect(0, y + plank - 3, w, 3);
        for (let i = 0; i < 22; i++) {
          ctx.strokeStyle = "rgba(" + (25 + rng() * 40) + "," + (14 + rng() * 18) + ",8," + rand(rng, 0.05, 0.18) + ")";
          ctx.lineWidth = rand(rng, 0.5, 1.3);
          const yy = y + rand(rng, 4, plank - 6);
          ctx.beginPath();
          ctx.moveTo(0, yy);
          for (let x = 0; x <= w; x += 32) {
            ctx.lineTo(x, yy + Math.sin((x + i * 17) * 0.035) * 1.7 + rand(rng, -1.2, 1.2));
          }
          ctx.stroke();
        }
      }
      ctx.strokeStyle = "rgba(0,0,0,0.28)";
      for (let x = 0; x < w; x += 128) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
    }, { repeat: [4, 2] });
  }

  function tatamiTexture() {
    return canvasTexture(256, 256, (ctx, w, h) => {
      const rng = makeRng(1204);
      ctx.fillStyle = "#8f8458";
      ctx.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 4) {
        ctx.fillStyle = y % 8 === 0 ? "rgba(45,40,22,0.22)" : "rgba(255,245,190,0.055)";
        ctx.fillRect(0, y, w, 1);
      }
      for (let x = 0; x < w; x += 3) {
        ctx.fillStyle = "rgba(35,30,15,0.09)";
        ctx.fillRect(x, 0, 1, h);
      }
      ctx.strokeStyle = "#37301e";
      ctx.lineWidth = 8;
      ctx.strokeRect(0, 0, w, h);
      ctx.strokeStyle = "rgba(230,220,170,0.18)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 90; i++) {
        ctx.beginPath();
        ctx.moveTo(rand(rng, 0, w), rand(rng, 0, h));
        ctx.lineTo(rand(rng, 0, w), rand(rng, 0, h));
        ctx.stroke();
      }
    }, { repeat: [4, 4] });
  }

  function metalTexture() {
    return canvasTexture(256, 256, (ctx, w, h) => {
      const rng = makeRng(1205);
      ctx.fillStyle = "#343c42";
      ctx.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 64) {
        for (let x = 0; x < w; x += 64) {
          const shade = 44 + Math.floor(rng() * 14);
          ctx.fillStyle = "rgb(" + shade + "," + (shade + 5) + "," + (shade + 8) + ")";
          ctx.fillRect(x + 2, y + 2, 60, 60);
          ctx.fillStyle = "rgba(255,255,255,0.035)";
          ctx.fillRect(x + 3, y + 3, 58, 2);
          ctx.fillStyle = "rgba(0,0,0,0.28)";
          ctx.fillRect(x + 2, y + 58, 60, 4);
          for (let i = 0; i < 4; i++) {
            ctx.fillStyle = "rgba(0,0,0,0.4)";
            ctx.beginPath();
            ctx.arc(x + (i % 2 ? 54 : 9), y + (i < 2 ? 9 : 54), 2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      ctx.strokeStyle = "rgba(0,0,0,0.4)";
      ctx.lineWidth = 3;
      ctx.strokeRect(1, 1, w - 2, h - 2);
    }, { repeat: [5, 2] });
  }

  function brickTexture() {
    return canvasTexture(512, 256, (ctx, w, h) => {
      const rng = makeRng(1206);
      ctx.fillStyle = "#2a1a19";
      ctx.fillRect(0, 0, w, h);
      const bw = 64;
      const bh = 30;
      for (let row = 0; row < 9; row++) {
        for (let col = -1; col < 9; col++) {
          const x = col * bw + (row % 2 ? bw / 2 : 0);
          const y = row * bh;
          const shade = 54 + Math.floor(rng() * 26);
          ctx.fillStyle = "rgb(" + (shade + 18) + "," + Math.floor(shade * 0.72) + "," + Math.floor(shade * 0.64) + ")";
          ctx.fillRect(x + 2, y + 2, bw - 4, bh - 4);
          ctx.fillStyle = "rgba(255,200,160,0.04)";
          ctx.fillRect(x + 3, y + 3, bw - 6, 2);
        }
      }
    }, { repeat: [4, 2] });
  }

  function paperTexture() {
    return canvasTexture(256, 256, (ctx, w, h) => {
      const rng = makeRng(1207);
      ctx.fillStyle = "#d8d2bd";
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 900; i++) {
        ctx.fillStyle = "rgba(80,70,50," + rand(rng, 0.015, 0.06) + ")";
        ctx.fillRect(rand(rng, 0, w), rand(rng, 0, h), rand(rng, 0.5, 2), rand(rng, 0.5, 2));
      }
      ctx.strokeStyle = "rgba(80,60,35,0.5)";
      ctx.lineWidth = 5;
      for (let x = 0; x <= w; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y <= h; y += 64) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.strokeStyle = "rgba(80,60,35,0.36)";
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    }, { repeat: [3, 2] });
  }

  function crateTexture() {
    return canvasTexture(256, 256, (ctx, w, h) => {
      const rng = makeRng(1208);
      ctx.fillStyle = "#6b4a2e";
      ctx.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 48) {
        ctx.fillStyle = y % 96 === 0 ? "#7b5837" : "#5c3e26";
        ctx.fillRect(0, y, w, 44);
        ctx.strokeStyle = "rgba(30,16,7,0.55)";
        ctx.lineWidth = 3;
        ctx.strokeRect(0, y, w, 44);
      }
      for (let i = 0; i < 40; i++) {
        ctx.strokeStyle = "rgba(40,22,9," + rand(rng, 0.05, 0.16) + ")";
        ctx.lineWidth = 1;
        const yy = rand(rng, 0, h);
        ctx.beginPath();
        ctx.moveTo(0, yy);
        ctx.bezierCurveTo(w * 0.3, yy + rand(rng, -6, 6), w * 0.7, yy + rand(rng, -6, 6), w, yy);
        ctx.stroke();
      }
      ctx.strokeStyle = "#2a2d30";
      ctx.lineWidth = 14;
      ctx.strokeRect(7, 7, w - 14, h - 14);
      ctx.strokeStyle = "rgba(255,255,255,0.09)";
      ctx.lineWidth = 2;
      ctx.strokeRect(15, 15, w - 30, h - 30);
      ctx.fillStyle = "#c7a13e";
      ctx.font = "900 92px Bahnschrift, Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.globalAlpha = 0.72;
      ctx.fillText("NF", w / 2, h / 2 + 4);
      ctx.globalAlpha = 1;
    }, { repeat: [1, 1] });
  }

  function neonTexture(text, color, bg) {
    return canvasTexture(512, 160, (ctx, w, h) => {
      ctx.fillStyle = bg || "rgba(8,10,14,0.95)";
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = color;
      ctx.lineWidth = 5;
      ctx.strokeRect(10, 10, w - 20, h - 20);
      ctx.font = "900 74px Bahnschrift, Impact, Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = color;
      ctx.shadowBlur = 28;
      ctx.fillStyle = color;
      ctx.fillText(text, w / 2, h / 2 + 4);
      ctx.shadowBlur = 10;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.strokeText(text, w / 2, h / 2 + 4);
      ctx.shadowBlur = 0;
    }, { repeat: [1, 1] });
  }

  function buildingTexture(seed, base, lit) {
    return canvasTexture(128, 256, (ctx, w, h) => {
      const rng = makeRng(seed);
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, w, h);
      for (let y = 12; y < h - 8; y += 24) {
        for (let x = 10; x < w - 8; x += 22) {
          const on = rng() > 0.58;
          ctx.fillStyle = on ? lit : "rgba(4,6,10,0.68)";
          ctx.globalAlpha = on ? rand(rng, 0.35, 0.95) : 0.85;
          ctx.fillRect(x, y, 9, 12);
        }
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = "rgba(0,0,0,0.28)";
      ctx.fillRect(0, h - 6, w, 6);
      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.lineWidth = 1;
      for (let y = 0; y < h; y += 24) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
    }, { repeat: [1, 1] });
  }

  function skylineTexture(seed, palette) {
    return canvasTexture(1024, 320, (ctx, w, h) => {
      const rng = makeRng(seed);
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, palette.sky[0]);
      grad.addColorStop(0.55, palette.sky[1]);
      grad.addColorStop(1, palette.sky[2]);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      if (palette.moon) {
        const mx = w * 0.79;
        const my = h * 0.23;
        const glow = ctx.createRadialGradient(mx, my, 4, mx, my, 74);
        glow.addColorStop(0, "rgba(230,240,255,0.95)");
        glow.addColorStop(0.15, "rgba(200,220,255,0.6)");
        glow.addColorStop(1, "rgba(120,160,255,0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(mx, my, 74, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#dfe9ff";
        ctx.beginPath();
        ctx.arc(mx, my, 18, 0, Math.PI * 2);
        ctx.fill();
      }
      for (let layer = 0; layer < 3; layer++) {
        const baseY = h - 18 - layer * 22;
        const shade = layer === 0 ? "rgba(5,8,12,0.42)" : layer === 1 ? "rgba(6,10,16,0.72)" : "rgba(4,6,10,0.95)";
        ctx.fillStyle = shade;
        let x = -20;
        while (x < w + 20) {
          const bw = rand(rng, 24, 92);
          const bh = rand(rng, 24, 110) + (2 - layer) * 10;
          ctx.fillRect(x, baseY - bh, bw, bh + 30);
          if (layer === 2) {
            for (let wy = baseY - bh + 7; wy < baseY - 8; wy += 14) {
              for (let wx = x + 5; wx < x + bw - 4; wx += 11) {
                if (rng() > 0.7) {
                  ctx.fillStyle = rng() > 0.5 ? palette.windowA : palette.windowB;
                  ctx.globalAlpha = rand(rng, 0.25, 0.8);
                  ctx.fillRect(wx, wy, 3, 5);
                  ctx.globalAlpha = 1;
                  ctx.fillStyle = shade;
                }
              }
            }
          }
          x += bw + rand(rng, 3, 16);
        }
      }
      ctx.fillStyle = palette.haze || "rgba(80,110,130,0.08)";
      ctx.fillRect(0, h * 0.58, w, h * 0.42);
    }, { repeat: [1, 1] });
  }

  function flagTexture() {
    return canvasTexture(512, 320, (ctx, w, h) => {
      const rng = makeRng(1301);
      ctx.fillStyle = "#14251b";
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = "#c8a745";
      ctx.lineWidth = 8;
      ctx.strokeRect(10, 10, w - 20, h - 20);
      ctx.fillStyle = "#c8a745";
      ctx.globalAlpha = 0.14;
      for (let i = 0; i < 18; i++) {
        ctx.beginPath();
        ctx.arc(rand(rng, 30, w - 30), rand(rng, 30, h - 30), rand(rng, 2, 9), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.save();
      ctx.translate(w / 2, h / 2 + 18);
      ctx.scale(2.25, 2.25);
      ctx.fillStyle = "#d8b853";
      ctx.beginPath();
      ctx.moveTo(-36, -30);
      ctx.lineTo(-22, -58);
      ctx.lineTo(-8, -36);
      ctx.lineTo(8, -36);
      ctx.lineTo(22, -58);
      ctx.lineTo(36, -30);
      ctx.lineTo(28, 16);
      ctx.quadraticCurveTo(0, 55, -28, 16);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#14251b";
      ctx.beginPath();
      ctx.moveTo(-17, 0);
      ctx.lineTo(-5, -4);
      ctx.lineTo(-9, 8);
      ctx.closePath();
      ctx.moveTo(17, 0);
      ctx.lineTo(5, -4);
      ctx.lineTo(9, 8);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#14251b";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-12, 20);
      ctx.lineTo(0, 28);
      ctx.lineTo(12, 20);
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = "#8f7530";
      ctx.font = "700 18px Bahnschrift, Arial";
      ctx.textAlign = "center";
      ctx.letterSpacing = "6px";
      ctx.fillText("NIGHTFANG", w / 2, h - 30);
    }, { repeat: [1, 1] });
  }

  function radialTexture() {
    return canvasTexture(64, 64, (ctx, w, h) => {
      const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      g.addColorStop(0, "rgba(255,255,255,1)");
      g.addColorStop(0.25, "rgba(255,255,255,0.8)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }, { repeat: [1, 1] });
  }

  function blobTexture() {
    return canvasTexture(64, 64, (ctx, w, h) => {
      const g = ctx.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2);
      g.addColorStop(0, "rgba(0,0,0,0.55)");
      g.addColorStop(0.55, "rgba(0,0,0,0.28)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }, { repeat: [1, 1] });
  }

  function signTexture(text, fg, bg, border) {
    return canvasTexture(512, 192, (ctx, w, h) => {
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = border;
      ctx.lineWidth = 6;
      ctx.strokeRect(8, 8, w - 16, h - 16);
      ctx.fillStyle = fg;
      ctx.font = "800 54px Bahnschrift, Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = fg;
      ctx.shadowBlur = 18;
      ctx.fillText(text, w / 2, h / 2 + 2);
      ctx.shadowBlur = 0;
    }, { repeat: [1, 1] });
  }

  function paperSignTexture(glyph, fg, bg) {
    return canvasTexture(256, 384, (ctx, w, h) => {
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = "rgba(40,30,20,0.35)";
      ctx.lineWidth = 4;
      ctx.strokeRect(9, 9, w - 18, h - 18);
      ctx.fillStyle = fg;
      ctx.font = "900 150px Georgia, serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(glyph, w / 2, h / 2 - 8);
      ctx.strokeStyle = fg;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2 + 118, 10, 0, Math.PI * 2);
      ctx.stroke();
    }, { repeat: [1, 1] });
  }

  function hazardTexture() {
    return canvasTexture(256, 64, (ctx, w, h) => {
      ctx.fillStyle = "#c69a27";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#1b1c1e";
      for (let x = -h; x < w + h; x += 44) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + 22, 0);
        ctx.lineTo(x + 22 - h, h);
        ctx.lineTo(x - h, h);
        ctx.closePath();
        ctx.fill();
      }
    }, { repeat: [2, 1] });
  }

  function standard(color, roughness, metalness, extra) {
    const params = Object.assign({
      color: color,
      roughness: roughness === undefined ? 0.7 : roughness,
      metalness: metalness === undefined ? 0.05 : metalness,
      flatShading: true
    }, extra || {});
    return new T.MeshStandardMaterial(params);
  }

  function basic(color, extra) {
    return new T.MeshBasicMaterial(Object.assign({ color: color }, extra || {}));
  }

  function emissive(color, intensity, extra) {
    return new T.MeshStandardMaterial(Object.assign({
      color: color,
      emissive: color,
      emissiveIntensity: intensity === undefined ? 1.4 : intensity,
      roughness: 0.46,
      metalness: 0.12,
      flatShading: true
    }, extra || {}));
  }

  function box(w, h, d, mat, x, y, z) {
    const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat);
    m.position.set(x || 0, y || 0, z || 0);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }

  function cylinder(rt, rb, h, seg, mat, x, y, z) {
    const m = new T.Mesh(new T.CylinderGeometry(rt, rb, h, seg || 8), mat);
    m.position.set(x || 0, y || 0, z || 0);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }

  function cone(r, h, seg, mat, x, y, z) {
    const m = new T.Mesh(new T.ConeGeometry(r, h, seg || 6), mat);
    m.position.set(x || 0, y || 0, z || 0);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }

  function plane(w, h, mat, x, y, z) {
    const m = new T.Mesh(new T.PlaneGeometry(w, h), mat);
    m.position.set(x || 0, y || 0, z || 0);
    m.receiveShadow = true;
    return m;
  }

  function sphere(r, mat, x, y, z, detail) {
    const m = new T.Mesh(new T.IcosahedronGeometry(r, detail === undefined ? 1 : detail), mat);
    m.position.set(x || 0, y || 0, z || 0);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }

  function limb(length, rTop, rBottom, mat, seg) {
    const g = new T.CylinderGeometry(rTop, rBottom, length, seg || 6);
    g.translate(0, -length / 2, 0);
    const m = new T.Mesh(g, mat);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }

  function textSprite(text, options) {
    const opts = options || {};
    const pad = opts.pad || 16;
    const font = opts.font || "800 48px Bahnschrift, Arial";
    const color = opts.color || "#ffffff";
    const bg = opts.bg || "rgba(5,7,10,0.82)";
    const border = opts.border || "rgba(231,184,77,0.8)";
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    ctx.font = font;
    const width = Math.ceil(ctx.measureText(text).width) + pad * 2;
    const height = (opts.height || 84);
    canvas.width = Math.max(64, width);
    canvas.height = height;
    const c2 = canvas.getContext("2d");
    c2.fillStyle = bg;
    c2.fillRect(0, 0, canvas.width, canvas.height);
    c2.strokeStyle = border;
    c2.lineWidth = 3;
    c2.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
    c2.font = font;
    c2.fillStyle = color;
    c2.textAlign = "center";
    c2.textBaseline = "middle";
    c2.fillText(text, canvas.width / 2, canvas.height / 2 + 2);
    const tex = new T.CanvasTexture(canvas);
    tex.colorSpace = T.SRGBColorSpace;
    tex.needsUpdate = true;
    const mat = new T.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false });
    const sprite = new T.Sprite(mat);
    const scale = opts.scale || 0.01;
    sprite.scale.set(canvas.width * scale, canvas.height * scale, 1);
    sprite.renderOrder = 30;
    return sprite;
  }

  function disposeObject(obj) {
    if (!obj) return;
    obj.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        for (const m of mats) {
          if (!m) continue;
          if (m.map && m.map.dispose) m.map.dispose();
          if (m.emissiveMap && m.emissiveMap !== m.map && m.emissiveMap.dispose) m.emissiveMap.dispose();
          if (m.alphaMap && m.alphaMap !== m.map && m.alphaMap.dispose) m.alphaMap.dispose();
          m.dispose();
        }
      }
    });
  }

  NF.Assets = {
    makeRng: makeRng,
    rand: rand,
    pick: pick,
    clamp: clamp,
    lerp: lerp,
    damp: damp,
    smoothstep: smoothstep,
    lerpAngle: lerpAngle,
    canvasTexture: canvasTexture,
    asphaltTexture: asphaltTexture,
    sidewalkTexture: sidewalkTexture,
    woodTexture: woodTexture,
    tatamiTexture: tatamiTexture,
    metalTexture: metalTexture,
    brickTexture: brickTexture,
    paperTexture: paperTexture,
    crateTexture: crateTexture,
    neonTexture: neonTexture,
    buildingTexture: buildingTexture,
    skylineTexture: skylineTexture,
    flagTexture: flagTexture,
    radialTexture: radialTexture,
    blobTexture: blobTexture,
    signTexture: signTexture,
    paperSignTexture: paperSignTexture,
    hazardTexture: hazardTexture,
    standard: standard,
    basic: basic,
    emissive: emissive,
    box: box,
    cylinder: cylinder,
    cone: cone,
    plane: plane,
    sphere: sphere,
    limb: limb,
    textSprite: textSprite,
    disposeObject: disposeObject
  };
})();
