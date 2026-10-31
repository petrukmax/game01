(function () {
  "use strict";

  const NF = (window.NF = window.NF || {});
  const STORAGE_KEY = "nightfang-language";

  const DICT = {
    en: {
      "app.title": "NIGHTFANG — Black Panther Beat 'Em Up",
      "loading.text": "WAKING THE PANTHER…",

      "menu.eyebrow": "AN ORIGINAL 2.5D BEAT 'EM UP",
      "menu.tagline": "One panther. Three districts. No mercy.",
      "menu.rotate": "Best played in landscape — rotate your device",
      "menu.start": "BEGIN THE HUNT",
      "menu.controls": "CONTROLS",
      "menu.settings": "SETTINGS",
      "menu.intro": "WATCH INTRO",
      "menu.language": "LANGUAGE",
      "menu.difficulty": "DIFFICULTY",
      "menu.volume": "VOLUME",
      "menu.music": "MUSIC",
      "menu.fullscreen": "FULLSCREEN",
      "menu.best": "BEST SCORE",
      "menu.footer": "KEYBOARD + GAMEPAD + TOUCH",
      "diff.easy": "EASY",
      "diff.normal": "NORMAL",
      "diff.hard": "HARD",
      "diff.easy.note": "Forgiving: more health, softer foes.",
      "diff.normal.note": "The intended hunt.",
      "diff.hard.note": "Fewer lives, angrier foes.",
      "settings.title": "SETTINGS",
      "settings.close": "CLOSE",
      "settings.audio": "AUDIO",
      "fullscreen.enter": "FULLSCREEN",
      "fullscreen.exit": "EXIT FULLSCREEN",
      "lang.ru": "Russian",
      "lang.en": "English",

      "ctrl.move": "Move / stalk",
      "ctrl.depth": "Move in depth",
      "ctrl.jump": "Jump · press again in air for a double jump",
      "ctrl.swipe": "Forepaw swipe combo",
      "ctrl.bite": "Bite",
      "ctrl.pounce": "Pounce (special)",
      "ctrl.grab": "Grab / throw a stunned enemy · cooldown bar",
      "ctrl.run": "Run",
      "ctrl.pause": "Pause",
      "ctrl.mute": "Mute sound",
      "ctrl.fullscreen": "Fullscreen",

      "hud.vitality": "VITALITY",
      "hud.lives": "LIVES",
      "hud.score": "SCORE",
      "hud.coins": "COINS",
      "hud.pounce": "POUNCE",
      "hud.jump": "JUMP",
      "hud.grab": "GRAB",
      "hud.ready": "READY",
      "hud.focus": "FOCUS SURGE",
      "hud.combo": "HIT COMBO",
      "hud.grabHint": "GRAB STAGGERED FOE",
      "hud.swipe": "SWIPE",
      "hud.bite": "BITE",
      "hud.pounceShort": "POUNCE",
      "hud.jumpShort": "JUMP ×2",
      "hud.grabShort": "GRAB STAGGERED",
      "hud.district": "DISTRICT {n}",
      "hud.wave": "WAVE {n}/{total}",
      "hud.waveShort": "WAVE {n}",

      "pause.kicker": "THE HUNT PAUSES",
      "pause.title": "PAUSED",
      "pause.resume": "RESUME",
      "pause.restart": "RESTART LEVEL",
      "pause.menu": "MAIN MENU",
      "pause.sound": "SOUND:",
      "pause.toggle": "M TO TOGGLE",
      "common.on": "ON",
      "common.off": "OFF",

      "gameover.kicker": "THE NIGHT CLAIMS YOU",
      "gameover.title": "GAME OVER",
      "gameover.final": "Final score:",
      "gameover.coins": "Coins:",
      "gameover.retry": "RISE AGAIN",
      "gameover.menu": "MAIN MENU",

      "clear.kicker": "DISTRICT CLEARED",
      "clear.title": "LEVEL COMPLETE",
      "clear.copy": "Score: {score} · Coins: {coins}",
      "clear.continue": "ENTER THE NEXT DISTRICT",

      "victory.kicker": "THE CITY BREATHES",
      "victory.title": "VICTORY",
      "victory.copy": "Every district is free. The panther fades into the dark.",
      "victory.final": "Final score:",
      "victory.coins": "Coins:",
      "victory.again": "HUNT AGAIN",
      "victory.menu": "MAIN MENU",

      "fatal.kicker": "RENDERER OFFLINE",
      "fatal.title": "WEBGL UNAVAILABLE",
      "fatal.copy": "This game needs WebGL. Try a current Chrome, Edge, or Firefox build.",
      "fatal.three": "Three.js could not be loaded from vendor/three.min.js. Check that the file exists.",
      "fatal.modules": "One of the game modules failed to load. Check the src/ folder and reload.",
      "fatal.webgl": "WebGL could not start. Enable hardware acceleration or try another current browser.",

      "level.1.name": "NEON QUAY",
      "level.1.district": "DISTRICT 1",
      "level.1.objective": "STALK ALONG THE QUAY",
      "level.2.name": "JADE DOJO",
      "level.2.district": "DISTRICT 2",
      "level.2.objective": "ENTER THE JADE DOJO",
      "level.3.name": "IRON FOUNDRY",
      "level.3.district": "DISTRICT 3",
      "level.3.objective": "DESCEND INTO THE FOUNDRY",

      "obj.defeatBoss": "DEFEAT {name}",
      "obj.clearAmbush": "CLEAR THE AMBUSH",
      "obj.raiseFlag": "RAISE THE NIGHTFANG FLAG",
      "obj.pushForward": "PUSH FORWARD",

      "toast.boss": "BOSS APPROACHES",
      "toast.ambush": "AMBUSH",
      "toast.waveCleared": "WAVE CLEARED · +250",
      "toast.gate": "THE GATE OPENS · REACH THE FLAG",
      "toast.hiddenCache": "A HIDDEN CACHE OPENS",
      "toast.supplyCache": "SUPPLY CACHE",
      "toast.vitality": "VITALITY +25",
      "toast.focus": "FOCUS SURGE · DAMAGE UP",
      "toast.extraLife": "EXTRA LIFE",
      "toast.gem": "+300",
      "toast.secret": "SECRET FOUND · +500",
      "toast.flag": "THE NIGHTFANG FLAG RISES",
      "toast.soundOn": "SOUND ON",
      "toast.soundOff": "SOUND OFF",
      "toast.combo": "{n} HIT COMBO",
      "toast.defeated": "{name} DEFEATED",
      "toast.lives": "THE HUNT CONTINUES · {n} LIVES LEFT",
      "toast.jump": "JUMP RECHARGING",
      "toast.pounce": "POUNCE RECHARGING · {s}s",
      "toast.pounceNow": "POUNCE!",
      "toast.grab": "GRAB RECHARGING · {s}s",
      "toast.noGrab": "NO ENEMY IN GRAB RANGE",
      "toast.reset": "PANTHER RESET",
      "toast.throw": "J / E · THROW",
      "toast.blocked": "BLOCKED",
      "toast.shockwave": "SHOCKWAVE INCOMING",
      "toast.waveStart": "WAVE {n} OF {total}",
      "toast.difficulty": "DIFFICULTY: {name}",
      "toast.focusInfo": "FOCUS SURGE · +50% DAMAGE",
      "toast.grabInfo": "STAGGER A FOE, THEN PRESS I",
      "toast.pounceInfo": "POUNCE BREAKS GUARDS",
      "toast.autoTarget": "ATTACKS TURN TOWARD THE NEAREST FOE",
      "toast.fullscreenUnsupported": "FULLSCREEN IS NOT AVAILABLE IN THIS BROWSER",

      "secret.kicker": "HIDDEN CACHE",
      "secret.found": "SECRET FOUND",

      "enemy.grunt": "QUAY THUG",
      "enemy.brute": "STEEL BRUTE",
      "enemy.agile": "NIGHT RUNNER",
      "boss.harbormaster": "THE HARBORMASTER",
      "boss.sensei": "SENSEI VOID",
      "boss.forgemaster": "THE FORGEMASTER",

      "touch.jump": "JUMP",
      "touch.grab": "GRAB",
      "touch.swipe": "SWIPE",
      "touch.bite": "BITE",
      "touch.pounce": "POUNCE",
      "touch.pause": "Pause",
      "touch.up": "Move up",
      "touch.down": "Move down",
      "touch.left": "Move left",
      "touch.right": "Move right",

      "trailer.teaser1": "BORN IN THE RAIN.",
      "trailer.teaser2": "TAKEN BY THE LAB.",
      "trailer.teaser3": "REBUILT INTO A WEAPON.",
      "trailer.teaser4": "THEY MADE A MONSTER.",
      "trailer.teaser5": "IT BROKE FREE.",
      "trailer.teaser6": "NOW IT HUNTS.",
      "trailer.sub1a": "They threw him out at birth, into the cold rain.",
      "trailer.sub1b": "People decided a black cat brings only misfortune.",
      "trailer.sub2a": "Salvation seemed near when the people of Verdant Beauty came.",
      "trailer.sub2b": "They promised a home and care — then took him to a laboratory.",
      "trailer.sub3a": "They tested a hair-growth treatment for humans on him.",
      "trailer.sub3b": "They expected a cosmetic effect — they created a monster.",
      "trailer.sub4a": "The serum rebuilt his body: a weak kitten grew into a ferocious panther.",
      "trailer.sub4b": "The one who had been a defenseless victim became the threat.",
      "trailer.sub5a": "He broke out into the rainy night, throwing off the laboratory's chains.",
      "trailer.sub5b": "Verdant Beauty sent its hounds after him to bury the truth.",
      "trailer.sub6a": "He is free, but other cages remain behind the laboratory walls.",
      "trailer.sub6b": "Now the time has come to return and set them free.",
      "trailer.presents": "VERDANT BEAUTY PRESENTS",
      "trailer.origin": "A NIGHTFANG ORIGIN STORY",
      "trailer.skip": "SKIP"
    },

    ru: {
      "app.title": "NIGHTFANG — beat 'em up о чёрной пантере",
      "loading.text": "ПРОБУЖДАЕМ ПАНТЕРУ…",

      "menu.eyebrow": "ОРИГИНАЛЬНЫЙ 2.5D BEAT 'EM UP",
      "menu.tagline": "Одна пантера. Три района. Без пощады.",
      "menu.rotate": "Лучше в горизонтальном режиме — поверните устройство",
      "menu.start": "НАЧАТЬ ОХОТУ",
      "menu.controls": "УПРАВЛЕНИЕ",
      "menu.settings": "НАСТРОЙКИ",
      "menu.intro": "СМОТРЕТЬ ТИЗЕР",
      "menu.language": "ЯЗЫК",
      "menu.difficulty": "СЛОЖНОСТЬ",
      "menu.volume": "ГРОМКОСТЬ",
      "menu.music": "МУЗЫКА",
      "menu.fullscreen": "НА ВЕСЬ ЭКРАН",
      "menu.best": "ЛУЧШИЙ СЧЁТ",
      "menu.footer": "КЛАВИАТУРА + ГЕЙМПАД + ТАЧ",
      "diff.easy": "ЛЁГКАЯ",
      "diff.normal": "ОБЫЧНАЯ",
      "diff.hard": "ТЯЖЁЛАЯ",
      "diff.easy.note": "Щадяще: больше здоровья, враги мягче.",
      "diff.normal.note": "Охота, какой она задумана.",
      "diff.hard.note": "Меньше жизней, злее враги.",
      "settings.title": "НАСТРОЙКИ",
      "settings.close": "ЗАКРЫТЬ",
      "settings.audio": "ЗВУК",
      "fullscreen.enter": "НА ВЕСЬ ЭКРАН",
      "fullscreen.exit": "ВЫЙТИ ИЗ ПОЛНОЭКРАННОГО",
      "lang.ru": "Русский",
      "lang.en": "English",

      "ctrl.move": "Движение / красться",
      "ctrl.depth": "Движение в глубину",
      "ctrl.jump": "Прыжок · нажми в воздухе для двойного прыжка",
      "ctrl.swipe": "Серия ударов передней лапой",
      "ctrl.bite": "Укус",
      "ctrl.pounce": "Рывок (спецприём)",
      "ctrl.grab": "Захват / бросок оглушённого врага · шкала перезарядки",
      "ctrl.run": "Бег",
      "ctrl.pause": "Пауза",
      "ctrl.mute": "Выключить звук",
      "ctrl.fullscreen": "Полный экран",

      "hud.vitality": "ЖИЗНЬ",
      "hud.lives": "ЖИЗНИ",
      "hud.score": "СЧЁТ",
      "hud.coins": "МОНЕТЫ",
      "hud.pounce": "РЫВОК",
      "hud.jump": "ПРЫЖОК",
      "hud.grab": "ЗАХВАТ",
      "hud.ready": "ГОТОВО",
      "hud.focus": "ПРИЛИВ СИЛЫ",
      "hud.combo": "СЕРИЯ УДАРОВ",
      "hud.grabHint": "ЗАХВАТ ОГЛУШЁННОГО",
      "hud.swipe": "УДАР",
      "hud.bite": "УКУС",
      "hud.pounceShort": "РЫВОК",
      "hud.jumpShort": "ПРЫЖОК ×2",
      "hud.grabShort": "ЗАХВАТ ОГЛУШЁННОГО",
      "hud.district": "РАЙОН {n}",
      "hud.wave": "ВОЛНА {n}/{total}",
      "hud.waveShort": "ВОЛНА {n}",

      "pause.kicker": "ОХОТА ЗАМИРАЕТ",
      "pause.title": "ПАУЗА",
      "pause.resume": "ПРОДОЛЖИТЬ",
      "pause.restart": "НАЧАТЬ УРОВЕНЬ ЗАНОВО",
      "pause.menu": "ГЛАВНОЕ МЕНЮ",
      "pause.sound": "ЗВУК:",
      "pause.toggle": "M — ПЕРЕКЛЮЧИТЬ",
      "common.on": "ВКЛ",
      "common.off": "ВЫКЛ",

      "gameover.kicker": "НОЧЬ ЗАБИРАЕТ ТЕБЯ",
      "gameover.title": "ИГРА ОКОНЧЕНА",
      "gameover.final": "Итоговый счёт:",
      "gameover.coins": "Монеты:",
      "gameover.retry": "ВОССТАТЬ СНОВА",
      "gameover.menu": "ГЛАВНОЕ МЕНЮ",

      "clear.kicker": "РАЙОН ЗАЧИЩЕН",
      "clear.title": "УРОВЕНЬ ПРОЙДЕН",
      "clear.copy": "Счёт: {score} · Монеты: {coins}",
      "clear.continue": "В СЛЕДУЮЩИЙ РАЙОН",

      "victory.kicker": "ГОРОД ДЫШИТ",
      "victory.title": "ПОБЕДА",
      "victory.copy": "Все районы свободны. Пантера растворяется в темноте.",
      "victory.final": "Итоговый счёт:",
      "victory.coins": "Монеты:",
      "victory.again": "ОХОТИТЬСЯ СНОВА",
      "victory.menu": "ГЛАВНОЕ МЕНЮ",

      "fatal.kicker": "РЕНДЕР НЕДОСТУПЕН",
      "fatal.title": "WEBGL НЕДОСТУПЕН",
      "fatal.copy": "Игре нужен WebGL. Попробуйте актуальные Chrome, Edge или Firefox.",
      "fatal.three": "Не удалось загрузить Three.js из vendor/three.min.js. Проверьте, что файл существует.",
      "fatal.modules": "Один из модулей игры не загрузился. Проверьте папку src/ и перезагрузите страницу.",
      "fatal.webgl": "WebGL не запустился. Включите аппаратное ускорение или попробуйте другой современный браузер.",

      "level.1.name": "НЕОНОВАЯ НАБЕРЕЖНАЯ",
      "level.1.district": "РАЙОН 1",
      "level.1.objective": "ИДИ ВДОЛЬ НАБЕРЕЖНОЙ",
      "level.2.name": "НЕФРИТОВОЕ ДОДЗЁ",
      "level.2.district": "РАЙОН 2",
      "level.2.objective": "ВОЙДИ В НЕФРИТОВОЕ ДОДЗЁ",
      "level.3.name": "ЖЕЛЕЗНАЯ ЛИТЕЙНЯ",
      "level.3.district": "РАЙОН 3",
      "level.3.objective": "СПУСТИСЬ В ЛИТЕЙНЮ",

      "obj.defeatBoss": "ПОБЕДИ {name}",
      "obj.clearAmbush": "ЗАЧИСТИ ЗАСАДУ",
      "obj.raiseFlag": "ПОДНЯТЬ ФЛАГ NIGHTFANG",
      "obj.pushForward": "ПРОДВИГАЙСЯ ВПЕРЁД",

      "toast.boss": "БОСС ПРИБЛИЖАЕТСЯ",
      "toast.ambush": "ЗАСАДА",
      "toast.waveCleared": "ВОЛНА ЗАЧИЩЕНА · +250",
      "toast.gate": "ВОРОТА ОТКРЫВАЮТСЯ · ДОБЕРИСЬ ДО ФЛАГА",
      "toast.hiddenCache": "ОТКРЫТ СКРЫТЫЙ ТАЙНИК",
      "toast.supplyCache": "ТАЙНИК С ПРИПАСАМИ",
      "toast.vitality": "ЖИЗНЬ +25",
      "toast.focus": "ПРИЛИВ СИЛЫ · УРОН ПОВЫШЕН",
      "toast.extraLife": "ДОПОЛНИТЕЛЬНАЯ ЖИЗНЬ",
      "toast.gem": "+300",
      "toast.secret": "СЕКРЕТ НАЙДЕН · +500",
      "toast.flag": "ФЛАГ NIGHTFANG ПОДНЯТ",
      "toast.soundOn": "ЗВУК ВКЛЮЧЁН",
      "toast.soundOff": "ЗВУК ВЫКЛЮЧЕН",
      "toast.combo": "СЕРИЯ {n} УДАРОВ",
      "toast.defeated": "{name} ПОВЕРЖЕН",
      "toast.lives": "ОХОТА ПРОДОЛЖАЕТСЯ · ЖИЗНЕЙ: {n}",
      "toast.jump": "ПРЫЖОК ВОССТАНАВЛИВАЕТСЯ",
      "toast.pounce": "РЫВОК ВОССТАНАВЛИВАЕТСЯ · {s}с",
      "toast.pounceNow": "РЫВОК!",
      "toast.grab": "ЗАХВАТ ВОССТАНАВЛИВАЕТСЯ · {s}с",
      "toast.noGrab": "НЕТ ВРАГА В ЗОНЕ ЗАХВАТА",
      "toast.reset": "ПАНТЕРА СБРОШЕНА",
      "toast.throw": "J / E · БРОСОК",
      "toast.blocked": "БЛОК",
      "toast.shockwave": "УДАРНАЯ ВОЛНА",
      "toast.waveStart": "ВОЛНА {n} ИЗ {total}",
      "toast.difficulty": "СЛОЖНОСТЬ: {name}",
      "toast.focusInfo": "ПРИЛИВ СИЛЫ · +50% К УРОНУ",
      "toast.grabInfo": "ОГЛУШИ ВРАГА И НАЖМИ I",
      "toast.pounceInfo": "РЫВОК ПРОБИВАЕТ БЛОК",
      "toast.autoTarget": "АТАКИ ПОВОРАЧИВАЮТСЯ К БЛИЖАЙШЕМУ ВРАГУ",
      "toast.fullscreenUnsupported": "ПОЛНОЭКРАННЫЙ РЕЖИМ НЕДОСТУПЕН В ЭТОМ БРАУЗЕРЕ",

      "secret.kicker": "СКРЫТЫЙ ТАЙНИК",
      "secret.found": "СЕКРЕТ НАЙДЕН",

      "enemy.grunt": "ПРИЧАЛЬНЫЙ БАНДИТ",
      "enemy.brute": "СТАЛЬНОЙ ГРОМИЛА",
      "enemy.agile": "НОЧНОЙ БЕГУН",
      "boss.harbormaster": "ПОРТОВЫЙ ХОЗЯИН",
      "boss.sensei": "СЭНСЭЙ ПУСТОТА",
      "boss.forgemaster": "ХОЗЯИН КУЗНИ",

      "touch.jump": "ПРЫЖОК",
      "touch.grab": "ЗАХВАТ",
      "touch.swipe": "УДАР",
      "touch.bite": "УКУС",
      "touch.pounce": "РЫВОК",
      "touch.pause": "Пауза",
      "touch.up": "Вверх",
      "touch.down": "Вниз",
      "touch.left": "Влево",
      "touch.right": "Вправо",

      "trailer.teaser1": "РОЖДЁН ПОД ДОЖДЁМ.",
      "trailer.teaser2": "ЗАБРАН В ЛАБОРАТОРИЮ.",
      "trailer.teaser3": "ПЕРЕДЕЛАН В ОРУЖИЕ.",
      "trailer.teaser4": "ОНИ СОЗДАЛИ ЧУДОВИЩЕ.",
      "trailer.teaser5": "ОН ВЫРВАЛСЯ.",
      "trailer.teaser6": "ТЕПЕРЬ ОН ОХОТИТСЯ.",
      "trailer.sub1a": "Его выбросили с рождения под холодный дождь.",
      "trailer.sub1b": "Люди решили, что чёрный кот приносит лишь несчастья.",
      "trailer.sub2a": "Спасение казалось близким, когда пришли люди из Verdant Beauty.",
      "trailer.sub2b": "Они обещали дом и заботу, но увезли в лабораторию.",
      "trailer.sub3a": "На нём тестировали средство для роста волос у людей.",
      "trailer.sub3b": "Ждали косметический эффект — создали чудовище.",
      "trailer.sub4a": "Препарат перестроил его тело: слабый котёнок вырос в свирепую пантеру.",
      "trailer.sub4b": "Тот, кто был беззащитной жертвой, сам стал угрозой.",
      "trailer.sub5a": "Он вырвался в дождливую ночь, сбросив оковы лаборатории.",
      "trailer.sub5b": "Verdant Beauty бросила ищеек по следам, чтобы похоронить правду.",
      "trailer.sub6a": "Он свободен, но за стенами лаборатории остались другие клетки.",
      "trailer.sub6b": "Теперь пришло его время вернуться и вызволить их.",
      "trailer.presents": "VERDANT BEAUTY ПРЕДСТАВЛЯЕТ",
      "trailer.origin": "ИСТОРИЯ ПРОИСХОЖДЕНИЯ NIGHTFANG",
      "trailer.skip": "ПРОПУСТИТЬ"
    }
  };

  const I18n = {
    lang: "en",
    initialized: false,
    listeners: [],

    t: function (key, vars) {
      const dict = DICT[this.lang] || DICT.en;
      let str = dict[key];
      if (str === undefined) str = DICT.en[key];
      if (str === undefined) return key;
      if (vars) {
        str = str.replace(/\{(\w+)\}/g, function (match, name) {
          return vars[name] !== undefined ? String(vars[name]) : match;
        });
      }
      return str;
    },

    applyStatic: function (root) {
      const scope = root || document;
      const self = this;
      scope.querySelectorAll("[data-i18n]").forEach(function (el) {
        el.textContent = self.t(el.getAttribute("data-i18n"));
      });
      scope.querySelectorAll("[data-i18n-aria]").forEach(function (el) {
        el.setAttribute("aria-label", self.t(el.getAttribute("data-i18n-aria")));
      });
      scope.querySelectorAll("[data-i18n-title]").forEach(function (el) {
        el.setAttribute("title", self.t(el.getAttribute("data-i18n-title")));
      });
      document.title = this.t("app.title");
    },

    setLang: function (lang) {
      if (lang !== "ru" && lang !== "en") lang = "en";
      this.lang = lang;
      try {
        localStorage.setItem(STORAGE_KEY, lang);
      } catch (err) { /* private mode */ }
      document.documentElement.lang = lang;
      this.applyStatic();
      document.querySelectorAll(".lang-btn").forEach(function (btn) {
        const active = btn.getAttribute("data-lang") === lang;
        btn.classList.toggle("active", active);
        btn.setAttribute("aria-pressed", active ? "true" : "false");
      });
      const list = this.listeners.slice();
      for (const fn of list) {
        try { fn(lang); } catch (err) { console.error("[Nightfang] i18n listener failed", err); }
      }
    },

    onChange: function (fn) {
      if (typeof fn === "function") this.listeners.push(fn);
      return this;
    },

    init: function () {
      if (this.initialized) return;
      this.initialized = true;
      let saved = null;
      try { saved = localStorage.getItem(STORAGE_KEY); } catch (err) { saved = null; }
      const browser = (navigator.language || navigator.userLanguage || "en").toLowerCase();
      const lang = saved === "ru" || saved === "en" ? saved : (browser.indexOf("ru") === 0 ? "ru" : "en");
      this.lang = lang;
      document.documentElement.lang = lang;
      this.applyStatic();
      document.querySelectorAll(".lang-btn").forEach(function (btn) {
        const active = btn.getAttribute("data-lang") === lang;
        btn.classList.toggle("active", active);
        btn.setAttribute("aria-pressed", active ? "true" : "false");
      });
    }
  };

  NF.I18n = I18n;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { I18n.init(); });
  } else {
    I18n.init();
  }
})();
