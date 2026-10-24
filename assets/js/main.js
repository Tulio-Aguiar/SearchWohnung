(function () {
  /* Alertas criados ("X de 6"): continuam neste navegador. A chave guarda
     também as linhas do antigo registro local, que ficam como estão. */
  var KEY = "casa-a-dois-busca-v1";
  var state = { checks: {} };
  var body = document.body;

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var s = JSON.parse(raw);
        if (s && typeof s === "object") state = s;
      }
    } catch (e) {}
    if (!state.checks) state.checks = {};
  }
  function persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {}
  }

  function updateProgress() {
    var boxes = document.querySelectorAll("[data-alert]");
    var done = 0;
    for (var i = 0; i < boxes.length; i++) if (boxes[i].checked) done++;
    var el = document.getElementById("progress");
    if (el) el.textContent = done + " de " + boxes.length + " alertas criados";
  }

  var boxes = document.querySelectorAll("[data-alert]");
  if (boxes.length) {
    load();
    for (var i = 0; i < boxes.length; i++) {
      (function (b) {
        b.checked = !!state.checks[b.id];
        b.addEventListener("change", function () {
          state.checks[b.id] = b.checked;
          persist();
          updateProgress();
        });
      })(boxes[i]);
    }
    updateProgress();
  }

  /* Navegação: botão flutuante e painel lateral */
  var toggle = document.getElementById("menuToggle");
  var panel = document.getElementById("navPanel");
  var panelNav = panel.querySelector("nav");
  var overlay = document.getElementById("navOverlay");
  var links = document.querySelectorAll("#nav a");
  var html = "";
  for (var j = 0; j < links.length; j++) {
    var current = links[j].getAttribute("aria-current");
    html +=
      '<a class="link depth-0" href="' +
      links[j].getAttribute("href") +
      '"' +
      (current ? ' aria-current="' + current + '"' : "") +
      ">" +
      links[j].textContent +
      "</a>";
  }
  panelNav.innerHTML = html;

  function isOpen() {
    return body.classList.contains("navPanel-visible");
  }
  function setPanel(open, focusToggle) {
    body.classList.toggle("navPanel-visible", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    toggle.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
    if (open) {
      var first = panelNav.querySelector("a");
      if (first) first.focus();
    } else if (focusToggle) {
      toggle.focus();
    }
  }
  toggle.addEventListener("click", function () {
    setPanel(!isOpen(), true);
  });
  overlay.addEventListener("click", function () {
    setPanel(false, true);
  });
  panelNav.addEventListener("click", function (e) {
    if (e.target.closest("a")) setPanel(false, false);
  });
  document.addEventListener("keydown", function (e) {
    if (!isOpen()) return;
    if (e.key === "Escape") {
      setPanel(false, true);
      return;
    }
    if (e.key !== "Tab") return;
    /* Foco preso entre o botão e os itens do painel enquanto ele está aberto */
    var items = [toggle].concat(
      Array.prototype.slice.call(panelNav.querySelectorAll("a")),
    );
    var firstItem = items[0],
      lastItem = items[items.length - 1];
    var inside = items.indexOf(document.activeElement) >= 0;
    if (e.shiftKey && (document.activeElement === firstItem || !inside)) {
      e.preventDefault();
      lastItem.focus();
    } else if (
      !e.shiftKey &&
      (document.activeElement === lastItem || !inside)
    ) {
      e.preventDefault();
      firstItem.focus();
    }
  });

  /* A rolagem suave do CSS só vale depois do carregamento, para que a âncora
     vinda de outra página continue instantânea. */
  function ready() {
    requestAnimationFrame(function () {
      document.documentElement.classList.add("is-ready");
    });
  }
  if (document.readyState === "complete") ready();
  else window.addEventListener("load", ready);

  /* Âncoras internas: a rolagem suave fica com o CSS (scroll-behavior).
     Aqui só fechamos o painel e levamos o foco ao destino. */
  document.addEventListener("click", function (e) {
    var a = e.target.closest ? e.target.closest("a[href^='#']") : null;
    if (!a) return;
    var el = document.getElementById(a.getAttribute("href").slice(1));
    if (!el) return;
    if (isOpen()) setPanel(false, false);
    if (!el.matches("a[href], button, input, select, textarea, [tabindex]"))
      el.setAttribute("tabindex", "-1");
    el.focus({ preventScroll: true });
  });
})();
