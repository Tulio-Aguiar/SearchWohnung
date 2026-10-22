/* Nossas Seleções: login (Supabase Auth) e lista compartilhada de links. */
(function () {
  "use strict";

  var cfg = window.CASA_CONFIG || {};
  var $ = function (id) {
    return document.getElementById(id);
  };

  var elLoading = $("sel-loading");
  if (!elLoading) return;

  var elLogin = $("sel-login"),
    elLoginMsg = $("sel-login-msg");
  var elApp = $("sel-app"),
    elUser = $("sel-user");
  var elForm = $("sel-form"),
    elMsg = $("sel-msg");
  var elList = $("sel-list"),
    elEmpty = $("sel-empty");

  function show(which) {
    elLoading.hidden = which !== "loading";
    elLogin.hidden = which !== "login";
    elApp.hidden = which !== "app";
  }

  function say(el, text, kind) {
    el.textContent = text || "";
    el.className = "sel-msg" + (kind ? " " + kind : "");
  }

  var ready =
    window.supabase &&
    cfg.supabaseUrl &&
    cfg.supabaseKey &&
    cfg.supabaseKey.indexOf("COLE_") !== 0;
  if (!ready) {
    elLoading.textContent = "A lista compartilhada ainda não foi configurada.";
    return;
  }

  var db = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey);
  var currentUser = null;

  /* ---------- utilidades ---------- */
  function normalizeUrl(raw) {
    var s = (raw || "").trim();
    if (!s) return null;
    if (!/^[a-z][a-z0-9+.-]*:/i.test(s)) s = "https://" + s;
    try {
      var u = new URL(s);
      if (u.protocol !== "https:") return null;
      if (u.hostname.indexOf(".") < 0) return null;
      return u.href;
    } catch (e) {
      return null;
    }
  }

  function portal(link) {
    try {
      return new URL(link).hostname.replace(/^www\./, "");
    } catch (e) {
      return link;
    }
  }

  function who(email) {
    return (email || "").split("@")[0] || "alguém";
  }

  function day(iso) {
    var d = new Date(iso);
    return isNaN(d) ? "" : d.toLocaleDateString("pt-BR");
  }

  /* ---------- lista ---------- */
  function card(row) {
    var li = document.createElement("li");
    li.className = "sel-item";

    var head = document.createElement("div");
    head.className = "sel-head";
    var a = document.createElement("a");
    a.href = row.link;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = portal(row.link) + " ↗";
    head.appendChild(a);
    li.appendChild(head);

    if (row.comentario) {
      var p = document.createElement("p");
      p.className = "sel-note";
      p.textContent = row.comentario;
      li.appendChild(p);
    }

    var foot = document.createElement("div");
    foot.className = "sel-foot";
    var meta = document.createElement("span");
    meta.className = "sel-meta";
    meta.textContent =
      "por " + who(row.autor_email) + " · " + day(row.criado_em);
    foot.appendChild(meta);

    var del = document.createElement("button");
    del.type = "button";
    del.className = "quiet";
    del.textContent = "Remover";
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
      db.from("selecoes")
        .delete()
        .eq("id", row.id)
        .then(function (res) {
          if (res.error) {
            del.disabled = false;
            armed = false;
            del.textContent = "Remover";
            say(elMsg, "Não foi possível remover. Tente de novo.", "err");
          } else {
            say(elMsg, "Link removido.", "ok");
            load();
          }
        });
    });
    foot.appendChild(del);
    li.appendChild(foot);
    return li;
  }

  function render(rows) {
    elList.textContent = "";
    rows.forEach(function (r) {
      elList.appendChild(card(r));
    });
    elEmpty.hidden = rows.length > 0;
  }

  function load() {
    return db
      .from("selecoes")
      .select("*")
      .order("criado_em", { ascending: false })
      .then(function (res) {
        if (res.error) {
          say(elMsg, "Não foi possível carregar a lista.", "err");
          return;
        }
        render(res.data || []);
      });
  }

  /* ---------- adicionar ---------- */
  elForm.addEventListener("submit", function (ev) {
    ev.preventDefault();
    var link = normalizeUrl($("sel-link").value);
    if (!link) {
      say(elMsg, "Cole um endereço completo que comece com https://", "err");
      return;
    }
    var note = $("sel-comment").value.trim();
    var btn = $("sel-save");
    btn.disabled = true;
    say(elMsg, "Guardando…");
    db.from("selecoes")
      .insert({ link: link, comentario: note || null })
      .then(function (res) {
        btn.disabled = false;
        if (res.error) {
          var code = res.error.code;
          say(
            elMsg,
            code === "23505"
              ? "Este link já está na lista."
              : code === "23514"
                ? "Link ou comentário longo demais."
                : "Não foi possível guardar. Tente de novo.",
            "err",
          );
          return;
        }
        elForm.reset();
        say(elMsg, "Link guardado.", "ok");
        load();
      });
  });

  /* ---------- login ---------- */
  elLogin.addEventListener("submit", function (ev) {
    ev.preventDefault();
    var btn = $("sel-enter");
    btn.disabled = true;
    say(elLoginMsg, "Entrando…");
    db.auth
      .signInWithPassword({
        email: $("sel-email").value.trim(),
        password: $("sel-pass").value,
      })
      .then(function (res) {
        btn.disabled = false;
        if (res.error) {
          say(elLoginMsg, "E-mail ou senha incorretos.", "err");
          return;
        }
        $("sel-pass").value = "";
        say(elLoginMsg, "");
      });
  });

  $("sel-logout").addEventListener("click", function () {
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
      elList.textContent = "";
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

  /* Atualiza a lista ao voltar para a aba, para ver o que o outro guardou. */
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden && currentUser) load();
  });
})();
