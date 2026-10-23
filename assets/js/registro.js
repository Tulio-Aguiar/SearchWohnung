/* Registro de anúncios: login (Supabase Auth) e tabela compartilhada. */
(function () {
  "use strict";

  var cfg = window.CASA_CONFIG || {};
  var $ = function (id) {
    return document.getElementById(id);
  };

  var elLoading = $("reg-loading");
  if (!elLoading) return;

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
  /* Campos numéricos: nome da coluna e limites aceitos pelo banco */
  var NUM = {
    zimmer: { min: 0, max: 20 },
    warmmiete: { min: 0, max: 999999.99 },
    kaution: { min: 0, max: 999999.99 },
  };

  var elLogin = $("reg-login"),
    elLoginMsg = $("reg-login-msg");
  var elApp = $("reg-app"),
    elUser = $("reg-user");
  var elMsg = $("reg-msg"),
    tbody = $("reg-rows");

  function show(which) {
    elLoading.hidden = which !== "loading";
    elLogin.hidden = which !== "login";
    elApp.hidden = which !== "app";
  }

  var msgTimer = null;
  function say(el, text, kind) {
    el.textContent = text || "";
    el.className = "sel-msg" + (kind ? " " + kind : "");
  }
  /* Aviso discreto que some sozinho */
  function notify(text, kind) {
    clearTimeout(msgTimer);
    say(elMsg, text, kind);
    msgTimer = setTimeout(function () {
      say(elMsg, "");
    }, 3000);
  }

  var ready =
    window.supabase &&
    cfg.supabaseUrl &&
    cfg.supabaseKey &&
    cfg.supabaseKey.indexOf("COLE_") !== 0;
  if (!ready) {
    elLoading.textContent = "O registro compartilhado ainda não foi configurado.";
    return;
  }

  var db = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey);
  var currentUser = null;
  var rows = [];

  /* ---------- utilidades ---------- */
  function who(email) {
    return (email || "").split("@")[0] || "alguém";
  }

  function today() {
    var d = new Date(),
      pad = function (n) {
        return (n < 10 ? "0" : "") + n;
      };
    return (
      d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate())
    );
  }

  /* Número escrito em pt-BR ("1.150,50", "2,5") ou com ponto ("1150.5").
     Devolve null para vazio e NaN para texto inválido. */
  function parseNum(raw) {
    var s = String(raw == null ? "" : raw).replace(/\s|€/g, "");
    if (!s) return null;
    if (s.indexOf(",") >= 0) s = s.replace(/\./g, "").replace(",", ".");
    else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
    if (!/^\d+(\.\d+)?$/.test(s)) return NaN;
    return Number(s);
  }

  function fmtNum(n) {
    return n == null ? "" : String(n).replace(".", ",");
  }

  function flag(warm) {
    var span = document.createElement("span");
    if (warm == null || !isFinite(warm)) {
      span.className = "flag none";
      span.textContent = "sem valor";
    } else if (warm > TETO) {
      span.className = "flag over";
      span.textContent = "acima do teto";
    } else {
      span.className = "flag fine";
      span.textContent = "dentro do teto";
    }
    return span;
  }

  function byDate(a, b) {
    if (a.data !== b.data) return a.data < b.data ? 1 : -1;
    return a.criado_em < b.criado_em ? 1 : a.criado_em > b.criado_em ? -1 : 0;
  }

  function find(id) {
    return rows.filter(function (r) {
      return r.id === id;
    })[0];
  }

  /* ---------- tabela ---------- */
  function cell(label, cls) {
    var td = document.createElement("td");
    if (label) td.setAttribute("data-l", label);
    if (cls) td.className = cls;
    return td;
  }

  function field(r, col, type, label, extra) {
    var input = document.createElement("input");
    input.type = type;
    input.id = "r-" + r.id + "-" + col;
    input.setAttribute("data-f", col);
    input.setAttribute("aria-label", label);
    for (var k in extra || {}) input.setAttribute(k, extra[k]);
    input.value = NUM[col] ? fmtNum(r[col]) : r[col] || "";
    return input;
  }

  function numField(r, col, label) {
    return field(r, col, "text", label, { inputmode: "decimal" });
  }

  function line(r) {
    var tr = document.createElement("tr");
    tr.setAttribute("data-id", r.id);
    var td;

    td = cell("Data");
    td.appendChild(field(r, "data", "date", "Data", { required: "" }));
    tr.appendChild(td);
    td = cell("Portal");
    td.appendChild(field(r, "portal", "text", "Portal", { maxlength: "80" }));
    tr.appendChild(td);
    td = cell("Endereço ou bairro", "addr");
    td.appendChild(
      field(r, "endereco", "text", "Endereço ou bairro", { maxlength: "200" }),
    );
    tr.appendChild(td);
    td = cell("Zimmer");
    td.appendChild(numField(r, "zimmer", "Zimmer"));
    tr.appendChild(td);
    td = cell("Warmmiete €");
    td.appendChild(numField(r, "warmmiete", "Warmmiete em euros"));
    tr.appendChild(td);
    td = cell("Kaution €");
    td.appendChild(numField(r, "kaution", "Kaution em euros"));
    tr.appendChild(td);
    td = cell("Visita");
    td.appendChild(field(r, "visita", "date", "Data da visita"));
    tr.appendChild(td);

    td = cell("Situação");
    var sel = document.createElement("select");
    sel.id = "r-" + r.id + "-situacao";
    sel.setAttribute("data-f", "situacao");
    sel.setAttribute("aria-label", "Situação");
    var opts = STATUS.slice();
    if (r.situacao && opts.indexOf(r.situacao) < 0) opts.push(r.situacao);
    opts.forEach(function (s) {
      var o = document.createElement("option");
      o.textContent = s;
      sel.appendChild(o);
    });
    sel.value = r.situacao || STATUS[0];
    td.appendChild(sel);
    tr.appendChild(td);

    td = cell("Teto");
    td.setAttribute("data-flag", "");
    td.appendChild(flag(r.warmmiete));
    tr.appendChild(td);

    td = cell("", "act");
    td.appendChild(removeButton(r));
    tr.appendChild(td);
    return tr;
  }

  function removeButton(r) {
    var del = document.createElement("button");
    del.type = "button";
    del.className = "quiet";
    del.textContent = "Remover";
    del.setAttribute("aria-label", "Remover anúncio");
    var armed = false,
      timer = null;
    del.addEventListener("click", function () {
      if (!armed) {
        armed = true;
        del.textContent = "Confirmar?";
        timer = setTimeout(function () {
          armed = false;
          del.textContent = "Remover";
        }, 4000);
        return;
      }
      clearTimeout(timer);
      del.disabled = true;
      db.from("registro")
        .delete()
        .eq("id", r.id)
        .then(function (res) {
          if (res.error) {
            del.disabled = false;
            armed = false;
            del.textContent = "Remover";
            notify("Não foi possível remover. Tente de novo.", "err");
            return;
          }
          rows = rows.filter(function (x) {
            return x.id !== r.id;
          });
          render();
          notify("Anúncio removido.", "ok");
        });
    });
    return del;
  }

  function render() {
    tbody.textContent = "";
    if (!rows.length) {
      var tr = document.createElement("tr");
      var td = document.createElement("td");
      td.colSpan = 10;
      td.className = "empty";
      td.textContent =
        "Nenhum anúncio registrado. Use Adicionar anúncio quando encontrarem um apartamento.";
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }
    rows.forEach(function (r) {
      tbody.appendChild(line(r));
    });
  }

  function load() {
    return db
      .from("registro")
      .select("*")
      .order("data", { ascending: false })
      .order("criado_em", { ascending: false })
      .then(function (res) {
        if (res.error) {
          notify("Não foi possível carregar o registro.", "err");
          return;
        }
        rows = res.data || [];
        render();
      });
  }

  /* ---------- editar ---------- */
  /* Converte o valor do campo para o banco; undefined quando inválido */
  function readValue(el, col) {
    var v = el.value;
    if (NUM[col]) {
      var n = parseNum(v);
      if (n === null) return null;
      if (isNaN(n) || n < NUM[col].min || n > NUM[col].max) return undefined;
      return n;
    }
    if (col === "data") return v || undefined;
    v = v.trim();
    return v || null;
  }

  function showFlag(tr, warm) {
    var td = tr.querySelector("[data-flag]");
    td.textContent = "";
    td.appendChild(flag(warm));
  }

  /* A coluna Teto acompanha a digitação da Warmmiete */
  tbody.addEventListener("input", function (e) {
    if (e.target.getAttribute("data-f") !== "warmmiete") return;
    var n = parseNum(e.target.value);
    showFlag(e.target.closest("tr"), isNaN(n) ? null : n);
  });

  tbody.addEventListener("change", function (e) {
    var el = e.target,
      col = el.getAttribute && el.getAttribute("data-f");
    if (!col) return;
    var tr = el.closest("tr");
    var row = find(tr.getAttribute("data-id"));
    if (!row) return;

    function revert() {
      el.value = NUM[col] ? fmtNum(row[col]) : row[col] || "";
      if (col === "warmmiete") showFlag(tr, row.warmmiete);
    }

    var value = readValue(el, col);
    if (value === undefined) {
      revert();
      notify("Não foi possível salvar: valor inválido.", "err");
      return;
    }
    if (NUM[col]) el.value = fmtNum(value);
    if (value === row[col]) return;

    var patch = {};
    patch[col] = value;
    db.from("registro")
      .update(patch)
      .eq("id", row.id)
      .select()
      .then(function (res) {
        if (res.error || !res.data || !res.data.length) {
          revert();
          notify("Não foi possível salvar.", "err");
          return;
        }
        row[col] = res.data[0][col];
        row.atualizado_em = res.data[0].atualizado_em;
        /* Mostra o valor como o banco guardou (ex.: arredondado a 2 casas) */
        if (NUM[col]) el.value = fmtNum(row[col]);
        if (col === "warmmiete") showFlag(tr, row.warmmiete);
        notify("Salvo", "ok");
      });
  });

  /* ---------- adicionar ---------- */
  $("reg-add").addEventListener("click", function () {
    var btn = this;
    btn.disabled = true;
    db.from("registro")
      .insert({ data: today(), situacao: STATUS[0] })
      .select()
      .single()
      .then(function (res) {
        btn.disabled = false;
        if (res.error) {
          notify("Não foi possível adicionar. Tente de novo.", "err");
          return;
        }
        rows.push(res.data);
        rows.sort(byDate);
        render();
        var first = $("r-" + res.data.id + "-portal");
        if (first) first.focus();
      });
  });

  /* ---------- login ---------- */
  elLogin.addEventListener("submit", function (ev) {
    ev.preventDefault();
    var btn = $("reg-enter");
    btn.disabled = true;
    say(elLoginMsg, "Entrando…");
    db.auth
      .signInWithPassword({
        email: $("reg-email").value.trim(),
        password: $("reg-pass").value,
      })
      .then(function (res) {
        btn.disabled = false;
        if (res.error) {
          say(elLoginMsg, "E-mail ou senha incorretos.", "err");
          return;
        }
        $("reg-pass").value = "";
        say(elLoginMsg, "");
      });
  });

  $("reg-logout").addEventListener("click", function () {
    db.auth.signOut();
  });

  function apply(session) {
    if (session && session.user) {
      var firstTime = !currentUser || currentUser.id !== session.user.id;
      currentUser = session.user;
      elUser.textContent = who(session.user.email);
      show("app");
      if (firstTime) load();
    } else {
      currentUser = null;
      rows = [];
      tbody.textContent = "";
      show("login");
    }
  }

  db.auth.onAuthStateChange(function (event, session) {
    /* Adia a chamada para fora do callback, como o Supabase recomenda. */
    setTimeout(function () {
      apply(session);
    }, 0);
  });
  db.auth.getSession().then(function (res) {
    apply(res.data && res.data.session);
  });

  /* Atualiza a tabela ao voltar para a aba, para ver o que o outro anotou.
     Não recarrega se houver um campo da tabela em edição. */
  document.addEventListener("visibilitychange", function () {
    if (document.hidden || !currentUser) return;
    if (tbody.contains(document.activeElement)) return;
    load();
  });
})();
