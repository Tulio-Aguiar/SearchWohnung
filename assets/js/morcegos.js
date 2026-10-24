(function () {
  /* Morcegos cruzando a tela ao clicar em "Traz Pão, Batman!".
     Ajuste o efeito pelas constantes abaixo. */
  var COUNT_MIN = 8; // morcegos por clique
  var COUNT_MAX = 14;
  var DUR_MIN = 3500; // duração da travessia, em ms
  var DUR_MAX = 6500;
  var MAX_ON_SCREEN = 24; // limite de morcegos ao mesmo tempo
  var SIZE_MIN = 28; // largura do morcego, em px
  var SIZE_MAX = 72;

  var REDUCED_COUNT = 5; // morcegos parados com movimento reduzido
  var REDUCED_DUR = 1200;
  var DELAY_MAX = 900;
  var FADE = 0.08; // fração inicial e final da animação com opacidade gradual
  var STEPS = 28; // quadros-chave por travessia
  var FLAP_MIN = 0.12; // duração de um bater de asas, em s
  var FLAP_MAX = 0.22;
  var MAX_TILT = 18; // graus

  var button = document.querySelector(".morcegos");
  if (!button || typeof Element.prototype.animate !== "function") return;

  /* Silhueta própria: corpo com cabeça e orelhas pontudas, duas asas
     recortadas. A asa direita é a esquerda espelhada. */
  var WING =
    "M56 23 Q38 6 4 12 Q14 20 15 30 Q22 24 30 36 Q37 31 44 40 Q50 33 56 36Z";
  var BAT_SVG =
    '<svg class="morcego" viewBox="0 0 120 60" aria-hidden="true" focusable="false">' +
    '<g class="asa asa-e"><path d="' +
    WING +
    '"/></g>' +
    '<g class="asa asa-d"><path transform="translate(120 0) scale(-1 1)" d="' +
    WING +
    '"/></g>' +
    '<path d="M54 3 L57 12 Q60 11 63 12 L66 3 L68 17 Q68 22 64 25 L64 34 ' +
    'Q64 44 60 50 Q56 44 56 34 L56 25 Q52 22 52 17Z"/>' +
    "</svg>";

  var mold = document.createElement("template");
  mold.innerHTML = BAT_SVG;

  var layer = null;
  var active = 0;

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }
  function randInt(min, max) {
    return Math.floor(rand(min, max + 1));
  }

  function getLayer() {
    if (!layer) {
      layer = document.createElement("div");
      layer.className = "morcegos-camada";
      layer.setAttribute("aria-hidden", "true");
      document.body.appendChild(layer);
    }
    return layer;
  }

  function createBat(width) {
    var bat = mold.content.firstElementChild.cloneNode(true);
    bat.style.width = width + "px";
    bat.style.height = width / 2 + "px";
    return bat;
  }

  function release(bat) {
    if (!bat.parentNode) return;
    bat.parentNode.removeChild(bat);
    active--;
  }

  function run(bat, keyframes, options) {
    active++;
    getLayer().appendChild(bat);
    var anim = bat.animate(keyframes, options);
    function done() {
      release(bat);
    }
    anim.addEventListener("finish", done);
    anim.addEventListener("cancel", done);
  }

  /* Altura em t (0..1): interpola suavemente entre os pontos sorteados e
     soma uma ondulação. */
  function heightAt(t, ys, wave) {
    var seg = Math.min(Math.floor(t * (ys.length - 1)), ys.length - 2);
    var u = t * (ys.length - 1) - seg;
    var s = u * u * (3 - 2 * u);
    var y = ys[seg] + (ys[seg + 1] - ys[seg]) * s;
    return y + Math.sin(t * wave.freq * Math.PI * 2 + wave.phase) * wave.amp;
  }

  function fly(bat, width, viewW, viewH) {
    var height = width / 2;
    var dir = Math.random() < 0.5 ? 1 : -1; // 1: esquerda -> direita
    var startX = dir > 0 ? -width * 1.3 : viewW + width * 0.3;
    var endX = dir > 0 ? viewW + width * 0.3 : -width * 1.3;

    var top = viewH * 0.04;
    var bottom = Math.max(top, viewH * 0.8 - height);
    var ys = [];
    for (var i = 0, n = randInt(3, 5); i < n; i++) ys.push(rand(top, bottom));
    var wave = {
      freq: rand(3, 5),
      phase: rand(0, Math.PI * 2),
      amp: rand(0.012, 0.03) * viewH,
    };

    var pts = [];
    for (var k = 0; k <= STEPS; k++) {
      var t = k / STEPS;
      pts.push({ x: startX + (endX - startX) * t, y: heightAt(t, ys, wave) });
    }

    var keyframes = pts.map(function (p, k) {
      var a = pts[Math.max(k - 1, 0)];
      var b = pts[Math.min(k + 1, STEPS)];
      var tilt = Math.atan2(b.y - a.y, b.x - a.x) * (180 / Math.PI);
      if (dir < 0) tilt = tilt > 0 ? tilt - 180 : tilt + 180;
      tilt = Math.max(-MAX_TILT, Math.min(MAX_TILT, tilt * 0.5));
      var frame = {
        offset: k / STEPS,
        transform:
          "translate(" +
          p.x.toFixed(1) +
          "px," +
          p.y.toFixed(1) +
          "px) rotate(" +
          tilt.toFixed(1) +
          "deg) scaleX(" +
          dir +
          ")",
      };
      if (k === 0 || k === STEPS) frame.opacity = 0;
      return frame;
    });
    /* Opacidade 1 no voo todo; só as pontas (FADE) entram e saem aos poucos */
    keyframes.push({ offset: FADE, opacity: 1 });
    keyframes.push({ offset: 1 - FADE, opacity: 1 });
    keyframes.sort(function (a, b) {
      return a.offset - b.offset;
    });

    bat.style.setProperty("--bate", rand(FLAP_MIN, FLAP_MAX).toFixed(3) + "s");
    bat.classList.add("voando");
    run(bat, keyframes, {
      duration: rand(DUR_MIN, DUR_MAX),
      delay: rand(0, DELAY_MAX),
      easing: "linear",
      fill: "both",
    });
  }

  function still(bat, width, viewW, viewH) {
    var x = rand(0, Math.max(0, viewW - width));
    var y = rand(0, Math.max(0, viewH - width / 2));
    bat.style.transform = "translate(" + x + "px," + y + "px)";
    run(
      bat,
      [
        { opacity: 0 },
        { opacity: 1, offset: FADE },
        { opacity: 1, offset: 1 - FADE },
        { opacity: 0 },
      ],
      { duration: REDUCED_DUR, fill: "both" },
    );
  }

  button.addEventListener("click", function () {
    var room = MAX_ON_SCREEN - active;
    if (room <= 0) return;

    var reduced =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var count = Math.min(
      room,
      reduced ? REDUCED_COUNT : randInt(COUNT_MIN, COUNT_MAX),
    );
    var box = getLayer();
    var viewW = box.clientWidth;
    var viewH = box.clientHeight;

    for (var i = 0; i < count; i++) {
      var width = rand(SIZE_MIN, SIZE_MAX);
      var bat = createBat(width);
      if (reduced) still(bat, width, viewW, viewH);
      else fly(bat, width, viewW, viewH);
    }
  });
})();
