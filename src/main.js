(function () {
  "use strict";

  const NF = (window.NF = window.NF || {});
  const T = window.THREE;
  const I18n = NF.I18n || { t: function (key) { return key; } };

  function fatal(ui, message) {
    if (ui && ui.showFatal) ui.showFatal(message);
    const screen = document.getElementById("fatal-error");
    if (screen) screen.classList.remove("hidden");
    const loading = document.getElementById("loading-screen");
    if (loading) loading.classList.add("hidden");
  }

  function boot() {
    const ui = new NF.UI();
    if (!window.THREE || !T.WebGLRenderer) {
      fatal(ui, I18n.t("fatal.three"));
      return;
    }
    if (!NF.Panther || !NF.Level || !NF.Game || !NF.Enemy || !NF.Combat) {
      fatal(ui, I18n.t("fatal.modules"));
      return;
    }

    const canvas = document.getElementById("game-canvas");
    let renderer;
    try {
      renderer = new T.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        powerPreference: "high-performance",
        alpha: false
      });
    } catch (err) {
      fatal(ui, I18n.t("fatal.webgl"));
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.setClearColor(0x080a0e, 1);

    const scene = new T.Scene();
    scene.background = new T.Color(0x080a0e);
    scene.fog = new T.FogExp2(0x080a0e, 0.03);

    const camera = new T.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.1, 90);
    camera.position.set(2.0, 1.6, 5.6);
    camera.lookAt(0.6, 0.72, 0);

    const hemi = new T.HemisphereLight(0x6a86a8, 0x1b1510, 0.9);
    scene.add(hemi);

    const ambient = new T.AmbientLight(0x3c4a60, 0.32);
    scene.add(ambient);

    const key = new T.DirectionalLight(0xbfd6ff, 1.35);
    key.position.set(-5, 11, 7);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -14;
    key.shadow.camera.right = 14;
    key.shadow.camera.top = 10;
    key.shadow.camera.bottom = -8;
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 44;
    key.shadow.bias = -0.0007;
    key.shadow.normalBias = 0.02;
    const keyTarget = new T.Object3D();
    keyTarget.position.set(0, 0, 0);
    scene.add(keyTarget);
    key.target = keyTarget;
    scene.add(key);

    const rim = new T.DirectionalLight(0x5c8cff, 0.6);
    rim.position.set(7, 5, -8);
    scene.add(rim);

    const lights = {
      hemi: hemi,
      ambient: ambient,
      key: key,
      keyTarget: keyTarget,
      rim: rim
    };

    const input = new NF.Input();
    const audio = new NF.AudioSystem();
    const game = new NF.Game(scene, camera, renderer, input, ui, audio, lights);

    input.bindTouch(document.getElementById("touch-controls"));

    // The green play button and the Enter shortcut share one entry point, so
    // both play the origin trailer before the first district.
    const startExperience = function () {
      audio.ensure();
      if (NF.Trailer && NF.Trailer.play) {
        game.state = "trailer";
        game.ui.hideMenu();
        try {
          NF.Trailer.play(function () {
            game.startNewGame();
          });
        } catch (err) {
          console.error("[Nightfang] Trailer failed, starting the game", err);
          game.startNewGame();
        }
      } else {
        game.startNewGame();
      }
    };
    game.onStartRequest = startExperience;

    ui.on("start", function () {
      startExperience();
    });
    ui.on("resume", function () {
      game.resume();
    });
    ui.on("restart", function () {
      audio.ensure();
      game.restartLevel();
    });
    ui.on("menu", function () {
      game.audio.ensure();
      game.showMenu();
    });
    ui.on("retry", function () {
      audio.ensure();
      game.startNewGame();
    });
    ui.on("continue", function () {
      audio.ensure();
      game.nextLevel();
    });
    ui.on("playAgain", function () {
      audio.ensure();
      game.startNewGame();
    });
    ui.on("pause", function () {
      game.togglePause();
    });

    const unlockAudio = function () {
      audio.ensure();
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
    };
    window.addEventListener("pointerdown", unlockAudio);
    window.addEventListener("keydown", unlockAudio);

    window.addEventListener("resize", function () {
      const w = window.innerWidth;
      const h = window.innerHeight;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(w, h, false);
      camera.aspect = w / Math.max(1, h);
      camera.updateProjectionMatrix();
    });

    document.addEventListener("visibilitychange", function () {
      if (document.hidden && game.state === "playing") {
        game.togglePause();
      }
    });

    window.addEventListener("error", function (e) {
      if (e && e.message) console.error("[Nightfang]", e.message);
    });
    window.addEventListener("unhandledrejection", function (e) {
      console.error("[Nightfang] Unhandled promise rejection", e.reason);
    });

    if (window.matchMedia && window.matchMedia("(pointer: coarse)").matches) {
      ui.setTouchVisible(true);
    }

    if (NF.I18n && NF.I18n.onChange) {
      NF.I18n.onChange(function () {
        game.onLanguageChange();
      });
    }

    game.init();

    let last = performance.now();
    let firstFrame = true;

    function frame(now) {
      let dt = (now - last) / 1000;
      last = now;
      if (!isFinite(dt) || dt <= 0) dt = 1 / 60;
      dt = Math.min(dt, 0.05);
      try {
        game.update(dt);
      } catch (err) {
        console.error("[Nightfang] update error", err);
      }
      renderer.render(scene, camera);
      if (firstFrame) {
        firstFrame = false;
        const finishLoading = function () {
          setTimeout(function () {
            ui.finishLoading();
          }, 160);
        };
        if (game.hero && game.hero.modelReady) {
          game.hero.modelReady.then(finishLoading);
        } else {
          finishLoading();
        }
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    window.NF.game = game;
  }

  if (document.readyState === "complete" || document.readyState === "interactive") {
    setTimeout(boot, 0);
  } else {
    window.addEventListener("DOMContentLoaded", boot);
  }
})();
