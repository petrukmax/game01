(function () {
  "use strict";

  const NF = (window.NF = window.NF || {});

  const MAP = {
    left: ["KeyA", "ArrowLeft"],
    right: ["KeyD", "ArrowRight"],
    up: ["KeyW", "ArrowUp"],
    down: ["KeyS", "ArrowDown"],
    jump: ["Space"],
    swipe: ["KeyJ", "KeyZ"],
    bite: ["KeyK", "KeyX"],
    pounce: ["KeyL", "KeyC"],
    grab: ["KeyI", "KeyV"],
    run: ["ShiftLeft", "ShiftRight"],
    pause: ["Escape", "KeyP"],
    mute: ["KeyM"],
    confirm: ["Enter", "NumpadEnter"]
  };

  const CODE_TO_ACTION = {};
  Object.keys(MAP).forEach((action) => {
    MAP[action].forEach((code) => {
      CODE_TO_ACTION[code] = action;
    });
  });

  const PAD_BUTTONS = {
    0: "jump",
    1: "pounce",
    2: "swipe",
    3: "bite",
    4: "grab",
    5: "grab",
    6: "pounce",
    7: "bite",
    8: "pause",
    9: "pause",
    12: "up",
    13: "down",
    14: "left",
    15: "right"
  };

  function Input() {
    this.downMap = Object.create(null);
    this.justPressed = Object.create(null);
    this.anyInput = false;
    this.touchDown = Object.create(null);
    this.padDown = Object.create(null);
    this.padPrev = Object.create(null);
    this.padAxes = { x: 0, z: 0 };
    this.lastMove = { x: 0, z: 0 };
    this._bound = false;
    this._touchCleanup = [];
    this.bind();
  }

  Input.prototype.bind = function () {
    if (this._bound) return;
    this._bound = true;
    const self = this;

    window.addEventListener("keydown", function (e) {
      const action = CODE_TO_ACTION[e.code];
      if (action) {
        e.preventDefault();
        if (!self.downMap[action]) {
          self.justPressed[action] = true;
        }
        self.downMap[action] = true;
        self.anyInput = true;
      }
    }, { passive: false });

    window.addEventListener("keyup", function (e) {
      const action = CODE_TO_ACTION[e.code];
      if (action) {
        e.preventDefault();
        self.downMap[action] = false;
      }
    }, { passive: false });

    window.addEventListener("blur", function () {
      self.downMap = Object.create(null);
      self.justPressed = Object.create(null);
      self.touchDown = Object.create(null);
      self.padDown = Object.create(null);
    });
  };

  Input.prototype.bindTouch = function (root) {
    if (!root) return;
    const self = this;
    const buttons = root.querySelectorAll("[data-action]");
    buttons.forEach((btn) => {
      const action = btn.getAttribute("data-action");
      const down = function (e) {
        e.preventDefault();
        if (btn.setPointerCapture && e.pointerId !== undefined) {
          try { btn.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
        }
        if (!self.touchDown[action]) {
          self.justPressed[action] = true;
        }
        self.touchDown[action] = true;
        btn.classList.add("active");
        self.anyInput = true;
      };
      const up = function (e) {
        if (e) e.preventDefault();
        self.touchDown[action] = false;
        btn.classList.remove("active");
      };
      btn.addEventListener("pointerdown", down, { passive: false });
      btn.addEventListener("pointerup", up, { passive: false });
      btn.addEventListener("pointercancel", up, { passive: false });
      btn.addEventListener("pointerleave", function (e) {
        if (e.pointerType !== "mouse") up(e);
      }, { passive: false });
      self._touchCleanup.push(function () {
        btn.removeEventListener("pointerdown", down);
        btn.removeEventListener("pointerup", up);
        btn.removeEventListener("pointercancel", up);
      });
    });
  };

  Input.prototype.poll = function () {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let pad = null;
    for (let i = 0; i < pads.length; i++) {
      if (pads[i]) { pad = pads[i]; break; }
    }
    const prev = this.padDown;
    this.padDown = Object.create(null);
    this.padAxes.x = 0;
    this.padAxes.z = 0;
    if (!pad) {
      this.padPrev = prev;
      return;
    }
    const axisX = pad.axes[0] || 0;
    const axisZ = pad.axes[1] || 0;
    if (Math.abs(axisX) > 0.22) this.padAxes.x = axisX;
    if (Math.abs(axisZ) > 0.22) this.padAxes.z = axisZ;
    for (const index in PAD_BUTTONS) {
      const action = PAD_BUTTONS[index];
      const b = pad.buttons[Number(index)];
      const isDown = !!(b && (b.pressed || b.value > 0.45));
      if (isDown) {
        this.padDown[action] = true;
        if (!prev[action]) this.justPressed[action] = true;
      }
    }
    if (pad.buttons[10] && pad.buttons[10].pressed) this.padDown.run = true;
    if (pad.buttons[11] && pad.buttons[11].pressed) this.padDown.run = true;
    if (this.padAxes.x !== 0 || this.padAxes.z !== 0) this.anyInput = true;
  };

  Input.prototype.isDown = function (action) {
    return !!(this.downMap[action] || this.touchDown[action] || this.padDown[action]);
  };

  Input.prototype.wasPressed = function (action) {
    return !!this.justPressed[action];
  };

  Input.prototype.getMoveX = function () {
    let v = 0;
    if (this.isDown("left")) v -= 1;
    if (this.isDown("right")) v += 1;
    if (this.padAxes.x) v += this.padAxes.x;
    return Math.max(-1, Math.min(1, v));
  };

  Input.prototype.getMoveZ = function () {
    let v = 0;
    if (this.isDown("up")) v -= 1;
    if (this.isDown("down")) v += 1;
    if (this.padAxes.z) v += this.padAxes.z;
    return Math.max(-1, Math.min(1, v));
  };

  Input.prototype.isRunning = function () {
    return this.isDown("run");
  };

  Input.prototype.endFrame = function () {
    this.justPressed = Object.create(null);
    this.padPrev = this.padDown;
  };

  Input.prototype.reset = function () {
    this.downMap = Object.create(null);
    this.justPressed = Object.create(null);
    this.touchDown = Object.create(null);
    this.padDown = Object.create(null);
    this.padPrev = Object.create(null);
    this.padAxes.x = 0;
    this.padAxes.z = 0;
  };

  Input.prototype.simulate = function (action) {
    this.justPressed[action] = true;
    this.downMap[action] = true;
  };

  NF.Input = Input;
  NF.INPUT_ACTIONS = MAP;
})();
