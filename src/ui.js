(function () {
  "use strict";

  const NF = (window.NF = window.NF || {});
  const I18n = NF.I18n || { t: function (key) { return key; }, applyStatic: function () {} };

  function $(id) {
    return document.getElementById(id);
  }

  function UI() {
    this.refs = {
      loading: $("loading-screen"),
      menu: $("menu-screen"),
      hud: $("hud"),
      pause: $("pause-screen"),
      gameover: $("gameover-screen"),
      levelclear: $("levelclear-screen"),
      victory: $("victory-screen"),
      fatal: $("fatal-error"),
      menuControls: $("menu-controls"),
      btnMenuControls: $("btn-menu-controls"),
      menuBest: $("menu-best"),
      healthFill: $("health-fill"),
      healthText: $("health-text"),
      livesText: $("lives-text"),
      scoreText: $("score-text"),
      coinText: $("coin-text"),
      levelLabel: $("level-label"),
      objective: $("objective"),
      bossWrap: $("boss-wrap"),
      bossName: $("boss-name"),
      bossFill: $("boss-fill"),
      comboWrap: $("combo-wrap"),
      comboCount: $("combo-count"),
      grabHint: $("grab-hint"),
      specialFill: $("special-fill"),
      specialText: $("special-text"),
      jumpFill: $("jump-fill"),
      jumpText: $("jump-text"),
      grabFill: $("grab-fill"),
      grabText: $("grab-text"),
      buffTag: $("buff-tag"),
      hintBar: $("hint-bar"),
      toast: $("toast"),
      secret: $("secret-banner"),
      pauseMute: $("pause-mute-state"),
      gameoverScore: $("gameover-score"),
      gameoverCoins: $("gameover-coins"),
      levelclearCopy: $("levelclear-copy"),
      victoryScore: $("victory-score"),
      victoryCoins: $("victory-coins"),
      fatalCopy: $("fatal-copy")
    };
    this.callbacks = {};
    this.toastTimer = null;
    this.secretTimer = null;
    this.comboTimer = null;
    this.bossVisible = false;
    this.binding();
  }

  UI.prototype.binding = function () {
    const self = this;
    function on(id, event, fn) {
      const el = $(id);
      if (!el) return;
      el.addEventListener(event, function (e) {
        if (fn) fn(e);
      });
    }
    on("btn-start", "click", function () { if (self.callbacks.start) self.callbacks.start(); });
    on("btn-menu-controls", "click", function () {
      self.refs.menuControls.classList.toggle("hidden");
    });
    on("btn-resume", "click", function () { if (self.callbacks.resume) self.callbacks.resume(); });
    on("btn-pause-restart", "click", function () { if (self.callbacks.restart) self.callbacks.restart(); });
    on("btn-pause-menu", "click", function () { if (self.callbacks.menu) self.callbacks.menu(); });
    on("btn-retry", "click", function () { if (self.callbacks.retry) self.callbacks.retry(); });
    on("btn-gameover-menu", "click", function () { if (self.callbacks.menu) self.callbacks.menu(); });
    on("btn-continue", "click", function () { if (self.callbacks.continue) self.callbacks.continue(); });
    on("btn-play-again", "click", function () { if (self.callbacks.playAgain) self.callbacks.playAgain(); });
    on("btn-victory-menu", "click", function () { if (self.callbacks.menu) self.callbacks.menu(); });
    on("touch-pause", "click", function () { if (self.callbacks.pause) self.callbacks.pause(); });

    document.querySelectorAll(".lang-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const lang = btn.getAttribute("data-lang");
        if (lang) I18n.setLang(lang);
      });
    });
  };

  UI.prototype.on = function (name, fn) {
    this.callbacks[name] = fn;
    return this;
  };

  UI.prototype.finishLoading = function () {
    this.refs.loading.classList.add("fade");
    setTimeout(() => {
      this.refs.loading.classList.add("hidden");
    }, 500);
  };

  UI.prototype.hideAllOverlays = function () {
    this.refs.menu.classList.add("hidden");
    this.refs.pause.classList.add("hidden");
    this.refs.gameover.classList.add("hidden");
    this.refs.levelclear.classList.add("hidden");
    this.refs.victory.classList.add("hidden");
  };

  UI.prototype.showMenu = function (best) {
    this.hideAllOverlays();
    this.refs.hud.classList.add("hidden");
    this.refs.menu.classList.remove("hidden");
    this.refs.menuControls.classList.add("hidden");
    if (best !== undefined) this.refs.menuBest.textContent = String(best || 0);
    this.hideToast();
    this.hideSecret();
  };

  UI.prototype.hideMenu = function () {
    this.refs.menu.classList.add("hidden");
  };

  UI.prototype.showHud = function () {
    this.refs.hud.classList.remove("hidden");
    this.refs.hintBar.classList.remove("fade");
  };

  UI.prototype.fadeHint = function () {
    this.refs.hintBar.classList.add("fade");
  };

  UI.prototype.setHealth = function (health, max) {
    const pct = Math.max(0, Math.min(1, health / Math.max(1, max)));
    this.refs.healthFill.style.width = (pct * 100).toFixed(1) + "%";
    this.refs.healthText.textContent = Math.max(0, Math.ceil(health)) + " / " + max;
    this.refs.healthFill.classList.toggle("low", pct <= 0.25);
    this.refs.healthFill.classList.toggle("mid", pct > 0.25 && pct <= 0.5);
  };

  UI.prototype.setLives = function (lives) {
    this.refs.livesText.textContent = String(lives);
  };

  UI.prototype.setScore = function (score) {
    this.refs.scoreText.textContent = String(Math.floor(score));
  };

  UI.prototype.setCoins = function (coins) {
    this.refs.coinText.textContent = String(coins);
  };

  UI.prototype.setLevel = function (index, name) {
    this.refs.levelLabel.textContent = I18n.t("hud.district", { n: index + 1 }) + " · " + name.toUpperCase();
  };

  UI.prototype.setObjective = function (text) {
    this.refs.objective.textContent = text;
  };

  UI.prototype.showBoss = function (name, health, max) {
    this.bossVisible = true;
    this.refs.bossWrap.classList.remove("hidden");
    this.refs.bossName.textContent = name;
    this.refs.bossFill.style.width = "100%";
    this.updateBoss(health, max);
  };

  UI.prototype.setBossName = function (name) {
    this.refs.bossName.textContent = name;
  };

  UI.prototype.updateBoss = function (health, max) {
    const pct = Math.max(0, Math.min(1, health / Math.max(1, max)));
    this.refs.bossFill.style.width = (pct * 100).toFixed(1) + "%";
  };

  UI.prototype.hideBoss = function () {
    this.bossVisible = false;
    this.refs.bossWrap.classList.add("hidden");
  };

  UI.prototype.setCombo = function (count) {
    if (count > 1) {
      this.refs.comboWrap.classList.remove("hidden");
      this.refs.comboCount.textContent = String(count);
      this.refs.comboWrap.style.animation = "none";
      void this.refs.comboWrap.offsetWidth;
      this.refs.comboWrap.style.animation = "";
    } else {
      this.refs.comboWrap.classList.add("hidden");
    }
  };

  UI.prototype.setSpecial = function (cooldown, max) {
    const pct = Math.max(0, Math.min(1, 1 - cooldown / max));
    this.refs.specialFill.style.width = (pct * 100).toFixed(1) + "%";
    if (cooldown <= 0.01) {
      this.refs.specialText.textContent = I18n.t("hud.ready");
      this.refs.specialText.classList.remove("cooling");
    } else {
      this.refs.specialText.textContent = cooldown.toFixed(1) + "s";
      this.refs.specialText.classList.add("cooling");
    }
  };

  UI.prototype.setJump = function (stamina, max) {
    const pct = Math.max(0, Math.min(1, stamina / Math.max(1, max)));
    this.refs.jumpFill.style.width = (pct * 100).toFixed(1) + "%";
    const charges = Math.floor(stamina / 50);
    this.refs.jumpText.textContent = charges + " / 2";
    this.refs.jumpText.classList.toggle("cooling", charges <= 0);
  };

  UI.prototype.setGrab = function (cooldown, max) {
    const pct = Math.max(0, Math.min(1, 1 - cooldown / max));
    this.refs.grabFill.style.width = (pct * 100).toFixed(1) + "%";
    if (cooldown <= 0.01) {
      this.refs.grabText.textContent = I18n.t("hud.ready");
      this.refs.grabText.classList.remove("cooling");
    } else {
      this.refs.grabText.textContent = cooldown.toFixed(1) + "s";
      this.refs.grabText.classList.add("cooling");
    }
  };

  UI.prototype.setBuff = function (active) {
    this.refs.buffTag.classList.toggle("hidden", !active);
  };

  UI.prototype.showGrabHint = function (visible) {
    this.refs.grabHint.classList.toggle("hidden", !visible);
  };

  UI.prototype.toast = function (text, duration) {
    const el = this.refs.toast;
    el.textContent = text;
    el.classList.remove("hidden");
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      el.classList.add("hidden");
    }, duration || 2200);
  };

  UI.prototype.hideToast = function () {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.refs.toast.classList.add("hidden");
  };

  UI.prototype.showSecret = function () {
    const el = this.refs.secret;
    el.classList.remove("hidden");
    if (this.secretTimer) clearTimeout(this.secretTimer);
    this.secretTimer = setTimeout(() => el.classList.add("hidden"), 2600);
  };

  UI.prototype.hideSecret = function () {
    if (this.secretTimer) clearTimeout(this.secretTimer);
    this.refs.secret.classList.add("hidden");
  };

  UI.prototype.showPause = function (muted) {
    this.refs.pause.classList.remove("hidden");
    this.setMuteState(muted);
  };

  UI.prototype.hidePause = function () {
    this.refs.pause.classList.add("hidden");
  };

  UI.prototype.showGameOver = function (score, coins) {
    this.refs.gameoverScore.textContent = String(Math.floor(score));
    this.refs.gameoverCoins.textContent = String(coins);
    this.refs.gameover.classList.remove("hidden");
  };

  UI.prototype.showLevelClear = function (score, coins) {
    this.refs.levelclearCopy.textContent = I18n.t("clear.copy", {
      score: Math.floor(score),
      coins: coins
    });
    this.refs.levelclear.classList.remove("hidden");
  };

  UI.prototype.showVictory = function (score, coins) {
    this.refs.victoryScore.textContent = String(Math.floor(score));
    this.refs.victoryCoins.textContent = String(coins);
    this.refs.victory.classList.remove("hidden");
  };

  UI.prototype.setMuteState = function (muted) {
    this.refs.pauseMute.textContent = I18n.t(muted ? "common.off" : "common.on");
  };

  UI.prototype.refreshLanguage = function () {
    const ready = I18n.t("hud.ready");
    if (!this.refs.specialText.classList.contains("cooling")) this.refs.specialText.textContent = ready;
    if (!this.refs.grabText.classList.contains("cooling")) this.refs.grabText.textContent = ready;
    this.setMuteState(NF.game && NF.game.audio ? NF.game.audio.muted : false);
  };

  UI.prototype.showFatal = function (message) {
    this.refs.fatalCopy.textContent = message;
    this.refs.fatal.classList.remove("hidden");
    this.refs.loading.classList.add("hidden");
  };

  UI.prototype.setTouchVisible = function (visible) {
    const el = document.getElementById("touch-controls");
    if (el) el.style.display = visible ? "" : "none";
  };

  NF.UI = UI;
})();
