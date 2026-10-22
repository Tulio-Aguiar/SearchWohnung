(function () {
  var KEY = "casa-a-dois-busca-v1";
  var TETO = 1200;
  var STATUS = [
    "Novo",
    "Mensagem enviada",
    "Visita marcada",
    "Visitado",
    "Candidatura enviada",
    "Sem resposta",
    "Recusado",
  ];
  var state = { checks: {}, rows: [], next: 2 };
  var saved = false;
  var body = document.body;
  var reduce = false;
  try {
    reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch (e) {}

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var s = JSON.parse(raw);
        if (s && s.rows) {
          state = s;
          saved = true;
        }
      }
    } catch (e) {}
    if (!saved) {
      state.rows = [
        {
          id: 1,
          date: "2026-10-20",
          portal: "Exemplo",
          addr: "Exemplo: apague esta linha",
          zimmer: "2",
          warm: "",
          kaution: "",
          visita: "",
          status: "Novo",
        },
      ];
    }
  }
  function persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {}
  }
  function esc(v) {
    return String(v == null ? "" : v)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;");
  }

  function flag(warm) {
    var n = parseFloat(warm);
    if (!isFinite(n) || warm === "")
      return '<span class="flag none">sem valor</span>';
    return n > TETO
      ? '<span class="flag over">acima do teto</span>'
      : '<span class="flag fine">dentro do teto</span>';
  }

  function renderRows() {
    var tb = document.getElementById("rows");
    if (!state.rows.length) {
      tb.innerHTML =
        '<tr><td colspan="10" class="empty">Nenhum anúncio registrado. Use Adicionar anúncio quando encontrarem um apartamento.</td></tr>';
      return;
    }
    tb.innerHTML = state.rows
      .map(function (r) {
        var p = "r" + r.id + "-";
        var opts = STATUS.map(function (s) {
          return (
            "<option" +
            (s === r.status ? " selected" : "") +
            ">" +
            s +
            "</option>"
          );
        }).join("");
        return (
          '<tr data-id="' +
          r.id +
          '">' +
          '<td data-l="Data"><input type="date" id="' +
          p +
          'date" data-f="date" aria-label="Data" value="' +
          esc(r.date) +
          '"></td>' +
          '<td data-l="Portal"><input type="text" id="' +
          p +
          'portal" data-f="portal" aria-label="Portal" value="' +
          esc(r.portal) +
          '"></td>' +
          '<td class="addr" data-l="Endereço ou bairro"><input type="text" id="' +
          p +
          'addr" data-f="addr" aria-label="Endereço ou bairro" value="' +
          esc(r.addr) +
          '"></td>' +
          '<td data-l="Zimmer"><input type="number" min="1" step="0.5" id="' +
          p +
          'zimmer" data-f="zimmer" aria-label="Zimmer" value="' +
          esc(r.zimmer) +
          '"></td>' +
          '<td data-l="Warmmiete €"><input type="number" min="0" id="' +
          p +
          'warm" data-f="warm" aria-label="Warmmiete em euros" value="' +
          esc(r.warm) +
          '"></td>' +
          '<td data-l="Kaution €"><input type="number" min="0" id="' +
          p +
          'kaution" data-f="kaution" aria-label="Kaution em euros" value="' +
          esc(r.kaution) +
          '"></td>' +
          '<td data-l="Visita"><input type="date" id="' +
          p +
          'visita" data-f="visita" aria-label="Data da visita" value="' +
          esc(r.visita) +
          '"></td>' +
          '<td data-l="Situação"><select id="' +
          p +
          'status" data-f="status" aria-label="Situação">' +
          opts +
          "</select></td>" +
          '<td data-l="Teto" data-flag>' +
          flag(r.warm) +
          "</td>" +
          '<td class="act"><button type="button" class="quiet" data-del aria-label="Remover anúncio">Remover</button></td>' +
          "</tr>"
        );
      })
      .join("");
  }

  function updateProgress() {
    var boxes = document.querySelectorAll("[data-alert]");
    var done = 0;
    for (var i = 0; i < boxes.length; i++) if (boxes[i].checked) done++;
    var el = document.getElementById("progress");
    if (el) el.textContent = done + " de " + boxes.length + " alertas criados";
  }

  load();
  var boxes = document.querySelectorAll("[data-alert]");
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
  renderRows();

  var tbody = document.getElementById("rows");
  function onEdit(e) {
    var el = e.target,
      f = el.getAttribute && el.getAttribute("data-f");
    if (!f) return;
    var tr = el.closest("tr");
    var row = state.rows.filter(function (r) {
      return String(r.id) === tr.getAttribute("data-id");
    })[0];
    if (!row) return;
    row[f] = el.value;
    if (f === "warm")
      tr.querySelector("[data-flag]").innerHTML = flag(el.value);
    persist();
  }
  tbody.addEventListener("input", onEdit);
  tbody.addEventListener("change", onEdit);
  tbody.addEventListener("click", function (e) {
    if (!e.target.hasAttribute("data-del")) return;
    var id = e.target.closest("tr").getAttribute("data-id");
    state.rows = state.rows.filter(function (r) {
      return String(r.id) !== id;
    });
    persist();
    renderRows();
  });
  document.getElementById("add").addEventListener("click", function () {
    var d = new Date(),
      pad = function (n) {
        return (n < 10 ? "0" : "") + n;
      };
    var today =
      d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
    state.rows.push({
      id: state.next++,
      date: today,
      portal: "",
      addr: "",
      zimmer: "",
      warm: "",
      kaution: "",
      visita: "",
      status: "Novo",
    });
    persist();
    renderRows();
    var last = state.rows[state.rows.length - 1];
    var first = document.getElementById("r" + last.id + "-portal");
    if (first) first.focus();
  });

  /* Navegação: barra do topo, painel lateral e rolagem até as seções */
  var toggle = document.getElementById("menuToggle");
  var panelNav = document.querySelector("#navPanel nav");
  var links = document.querySelectorAll("#nav a");
  var html = "";
  for (var j = 0; j < links.length; j++) {
    html +=
      '<a class="link depth-0" href="' +
      links[j].getAttribute("href") +
      '">' +
      links[j].textContent +
      "</a>";
  }
  panelNav.innerHTML = html;

  function setPanel(open) {
    body.classList.toggle("navPanel-visible", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    toggle.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
  }
  toggle.addEventListener("click", function (e) {
    e.stopPropagation();
    setPanel(!body.classList.contains("navPanel-visible"));
  });
  document.addEventListener("click", function (e) {
    if (
      body.classList.contains("navPanel-visible") &&
      !e.target.closest("#navPanel")
    )
      setPanel(false);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") setPanel(false);
  });

  function scrollToId(id) {
    var el = document.getElementById(id);
    if (!el) return;
    try {
      el.scrollIntoView({
        behavior: reduce ? "auto" : "smooth",
        block: "start",
      });
    } catch (err) {
      el.scrollIntoView();
    }
  }
  document.addEventListener("click", function (e) {
    var a = e.target.closest ? e.target.closest("a[href^='#']") : null;
    if (!a) return;
    var id = a.getAttribute("href").slice(1);
    if (!id || !document.getElementById(id)) return;
    e.preventDefault();
    var wasOpen = body.classList.contains("navPanel-visible");
    setPanel(false);
    window.setTimeout(
      function () {
        scrollToId(id);
      },
      wasOpen ? 350 : 0,
    );
  });
})();
