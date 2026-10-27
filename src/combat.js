(function () {
  "use strict";

  const NF = (window.NF = window.NF || {});
  const T = window.THREE;

  function Combat(game) {
    this.game = game;
    this.hitLog = [];
  }

  Combat.prototype.addHitLog = function (target, amount) {
    this.hitLog.push({ target: target, amount: amount, at: performance.now() });
    if (this.hitLog.length > 40) this.hitLog.shift();
  };

  Combat.prototype.heroMelee = function (kind, hero, opts) {
    const game = this.game;
    if (!hero || hero.dead) return;
    const o = opts || {};
    const facing = hero.facing || 1;
    const range = o.range || 1.0;
    const zRange = o.radius || 0.7;
    const attackY = o.y || 0.65;
    const hitX = hero.x + facing * range * 0.58;
    let hits = 0;

    const targets = game.enemies.slice();
    for (const enemy of targets) {
      if (!enemy || enemy.dead) continue;
      const dx = (enemy.x - hero.x) * facing;
      const dz = enemy.z - hero.z;
      let reach = range + Math.min(0.34, enemy.radius * 0.55);
      let zReach = zRange + enemy.radius * 0.55;
      if (enemy.isBoss) {
        reach += kind === "bite" ? 0.45 : 0.24;
        zReach += 0.14;
      }
      if (dx < -0.35 || dx > reach) continue;
      if (Math.abs(dz) > zReach) continue;
      if (hero.y > 1.25 && kind !== "pounce") continue;

      if (enemy.tryDodge(kind)) {
        game.particles.dust(new T.Vector3(enemy.x, 0.1, enemy.z), "#b8c8d6");
        game.audio.play("swipe", { pan: this.panFor(hero.x) });
        continue;
      }

      const blocked = enemy.tryBlock(kind);
      const result = enemy.takeDamage(o.damage, hero.x, {
        knockback: o.knockback,
        knockdown: o.knockdown || false,
        stagger: o.stagger && !blocked,
        heavy: o.heavy || false,
        blocked: blocked,
        guardBreak: kind === "bite" || kind === "pounce",
        source: kind
      });

      if (!result) continue;
      hits++;
      this.addHitLog(enemy, o.damage);

      if (blocked) {
        game.audio.play("block", { pan: this.panFor(enemy.x) });
        game.particles.burst(new T.Vector3(enemy.x, attackY, enemy.z), "#bcd7ff", 10, {
          speed: 3.2, up: 0.55, life: 0.22, spread: 0.2, gravity: -9
        });
        game.ui.toast((NF.I18n && NF.I18n.t ? NF.I18n.t("toast.blocked") : "BLOCKED"), 450);
        game.addHitstop(0.025);
        game.registerHit(enemy, 0.35);
      } else {
        game.audio.play(o.heavy ? "heavyHit" : "hit", { pan: this.panFor(enemy.x) });
        game.particles.impact(new T.Vector3(enemy.x, attackY + 0.1, enemy.z), kind === "bite" ? "#ffd36a" : "#ffffff");
        if (kind === "bite") {
          game.particles.burst(new T.Vector3(enemy.x, attackY, enemy.z), "#ff8b6a", 8, {
            speed: 3.0, up: 0.4, life: 0.3, spread: 0.24, gravity: -8
          });
        }
        game.addHitstop(o.hitstop || 0.045);
        game.shake(o.heavy ? 0.3 : 0.16, 0.16);
        game.registerHit(enemy, kind === "bite" ? 2 : 1);
        if (hero.buff > 0 && Math.random() < 0.35) {
          game.particles.spark(new T.Vector3(enemy.x, attackY, enemy.z), "#7fd6ff");
        }
      }
    }

    // Environment breakables.
    if (game.level && game.level.hitBreakables) {
      const broke = game.level.hitBreakables(kind, hero, { range: range + 0.15, zRange: zRange });
      if (broke) {
        hits += broke;
      }
    }

    // Light whiff feedback.
    if (hits === 0) {
      game.particles.burst(new T.Vector3(hero.x + facing * range * 0.7, attackY, hero.z), "#cdd6df", 3, {
        speed: 1.2, up: 0.2, life: 0.16, spread: 0.1, gravity: -2, radial: 1
      });
    }
    return hits;
  };

  Combat.prototype.enemyMelee = function (enemy, opts) {
    const game = this.game;
    const hero = game.hero;
    if (!enemy || enemy.dead || !hero || hero.dead) return false;
    if (hero.state === "pounce" && hero.pouncePhase === "air") return false;
    const o = opts || {};
    const range = o.range || 1.2;
    const width = o.width || 0.9;
    const dx = (hero.x - enemy.x) * (enemy.facing || 1);
    const dz = hero.z - enemy.z;
    const dy = Math.abs(hero.y - enemy.y);
    if (dx < -0.3 || dx > range) return false;
    if (Math.abs(dz) > width) return false;
    if (dy > 1.0) return false;

    const hit = hero.takeDamage(o.damage, enemy.x, {
      heavy: o.heavy,
      knockback: o.knockback,
      knockdown: o.knockdown,
      invuln: 0.75
    });
    if (hit) {
      this.addHitLog(hero, o.damage);
      game.particles.burst(new T.Vector3(hero.x, 0.6, hero.z), "#ff9b7a", 8, {
        speed: 2.6, up: 0.5, life: 0.28, spread: 0.25, gravity: -8
      });
      if (o.heavy) game.shake(0.28, 0.2);
    } else {
      game.particles.burst(new T.Vector3(hero.x + (enemy.facing || 1) * 0.5, 0.55, hero.z), "#8d95a0", 3, {
        speed: 1.4, up: 0.2, life: 0.18, spread: 0.1, gravity: -3
      });
    }
    return hit;
  };

  Combat.prototype.heroShockwave = function (hero, opts) {
    const o = opts || {};
    const game = this.game;
    const radius = o.radius || 2.0;
    for (const enemy of game.enemies) {
      if (!enemy || enemy.dead) continue;
      const d = Math.hypot(enemy.x - hero.x, enemy.z - hero.z);
      if (d < radius) {
        const hit = enemy.takeDamage(o.damage || 8, hero.x, {
          knockback: o.knockback || 3.5,
          knockdown: true,
          heavy: true,
          source: "shockwave"
        });
        if (hit) game.registerHit(enemy, 1);
      }
    }
    game.particles.burst(new T.Vector3(hero.x, 0.15, hero.z), "#d8ff9b", 24, {
      speed: 6, up: 0.18, life: 0.4, spread: 0.4, gravity: -5, depth: 1
    });
    game.audio.play("shockwave");
    game.shake(0.4, 0.3);
    if (game.level && game.level.hitBreakables) {
      game.level.hitBreakables("pounce", hero, { range: radius, zRange: 2.4, radial: true });
    }
  };

  Combat.prototype.panFor = function (x) {
    const hero = this.game.hero;
    if (!hero) return 0;
    return Math.max(-0.75, Math.min(0.75, (x - hero.x) * 0.08));
  };

  NF.Combat = Combat;
})();
