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
  var elCard = $("sel-card");
  var elReset = $("sel-reset"),
    elResetMsg = $("sel-reset-msg");

  /* Lido antes do Supabase limpar o endereço: o link do e-mail de
     recuperação chega com #...type=recovery, ou com o erro se expirou. */
  var hash = location.hash;
  var recovering = /type=recovery/.test(hash);
  var linkError = /error_code=/.test(hash);

  function show(which) {
    elLoading.hidden = which !== "loading";
    elLogin.hidden = which !== "login";
    elReset.hidden = which !== "reset";
    elApp.hidden = which !== "app";
    elPerfil.hidden = which !== "perfil";
    elCard.hidden = which !== "app";
  }

  /* ---------- cadastro: nome e saudação ----------
     Cada pessoa escolhe no primeiro acesso; fica guardado na própria conta
     do Supabase (user_metadata.nome e user_metadata.saudacao). */
  var SAUDACOES = ["Bem-vindo", "Bem-vinda", "Boas-vindas"];
  var elPerfil = $("sel-perfil"),
    elPerfilMsg = $("sel-perfil-msg");

  function profile(user) {
    var meta = (user && user.user_metadata) || {};
    var nome = (meta.nome || "").trim();
    var saudacao = SAUDACOES.indexOf(meta.saudacao) >= 0 ? meta.saudacao : "";
    return nome && saudacao ? { nome: nome, saudacao: saudacao } : null;
  }

  function greet(user) {
    var p = profile(user) || {
      nome: who(user.email),
      saudacao: "Boas-vindas",
    };
    elUser.textContent = p.nome;
    $("sel-greet").textContent = p.saudacao;
    $("sel-avatar").textContent = p.nome.charAt(0);
  }

  function chosen() {
    var r = elPerfil.querySelector("input[name=sel-saudacao]:checked");
    return r ? r.value : "";
  }

  function preview() {
    var nome = $("sel-nome").value.trim();
    var s = chosen();
    $("sel-preview").textContent =
      nome && s ? "Vai aparecer assim: " + s + ", " + nome + "." : "";
  }

  function openPerfil(user, editing) {
    var p = profile(user);
    $("sel-nome").value = p ? p.nome : "";
    Array.prototype.forEach.call(
      elPerfil.querySelectorAll("input[name=sel-saudacao]"),
      function (r) {
        r.checked = !!p && r.value === p.saudacao;
      },
    );
    $("sel-perfil-intro").textContent = editing
      ? "Altere seu nome ou a saudação."
      : "Antes de começar, conte como prefere que o site te receba.";
    $("sel-perfil-cancel").hidden = !editing;
    say(elPerfilMsg, "");
    preview();
    show("perfil");
    $("sel-nome").focus();
  }

  elPerfil.addEventListener("input", preview);
  elPerfil.addEventListener("change", preview);

  elPerfil.addEventListener("submit", function (ev) {
    ev.preventDefault();
    var nome = $("sel-nome").value.trim().replace(/\s+/g, " ");
    var saudacao = chosen();
    if (!nome) {
      say(elPerfilMsg, "Escreva seu nome.", "err");
      $("sel-nome").focus();
      return;
    }
    if (!saudacao) {
      say(elPerfilMsg, "Escolha uma saudação.", "err");
      return;
    }
    var btn = $("sel-perfil-save");
    btn.disabled = true;
    say(elPerfilMsg, "Salvando…");
    db.auth
      .updateUser({ data: { nome: nome, saudacao: saudacao } })
      .then(function (res) {
        btn.disabled = false;
        if (res.error) {
          say(elPerfilMsg, "Não foi possível salvar. Tente de novo.", "err");
          return;
        }
        currentUser = res.data.user;
        greet(currentUser);
        show("app");
      });
  });

  $("sel-perfil-cancel").addEventListener("click", function () {
    show("app");
  });

  $("sel-edit").addEventListener("click", function () {
    if (currentUser) openPerfil(currentUser, true);
  });

  /* ---------- mostrar/ocultar senha ---------- */
  function setVisible(btn, on) {
    var input = $(btn.getAttribute("aria-controls"));
    input.type = on ? "text" : "password";
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    btn.setAttribute("aria-label", on ? "Ocultar senha" : "Mostrar senha");
  }
  var eyes = document.querySelectorAll(".sel-eye");
  function hideAll() {
    Array.prototype.forEach.call(eyes, function (b) {
      setVisible(b, false);
    });
  }
  Array.prototype.forEach.call(eyes, function (btn) {
    btn.addEventListener("click", function () {
      var input = $(btn.getAttribute("aria-controls"));
      var pos = input.selectionStart;
      setVisible(btn, input.type === "password");
      input.focus();
      /* Mantém o cursor onde estava ao trocar o tipo do campo. */
      try {
        input.setSelectionRange(pos, pos);
      } catch (e) {}
    });
  });

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

  /* A sessão vive só na memória desta página: ao sair do painel
     (fechar, recarregar ou ir para outra página) é preciso entrar de novo.
     Apaga também sessões que versões antigas deixaram salvas no navegador. */
  try {
    Object.keys(localStorage).forEach(function (k) {
      if (/^sb-.*-auth-token/.test(k)) localStorage.removeItem(k);
    });
  } catch (e) {}
  var db = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, {
    auth: { persistSession: false },
  });
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
          var code = res.error.code;
          say(
            elLoginMsg,
            code === "email_not_confirmed"
              ? "Este e-mail ainda não foi confirmado. Procure o e-mail de confirmação (veja também o spam)."
              : code === "over_request_rate_limit" || res.error.status === 429
                ? "Muitas tentativas seguidas. Espere alguns minutos e tente de novo."
                : code === "user_banned"
                  ? "Este acesso está bloqueado."
                  : code === "invalid_credentials" || res.error.status === 400
                    ? "E-mail ou senha incorretos."
                    : "Não foi possível entrar agora. Tente de novo.",
            "err",
          );
          return;
        }
        $("sel-pass").value = "";
        hideAll();
        say(elLoginMsg, "");
      });
  });

  /* ---------- recuperar senha ---------- */
  $("sel-forgot").addEventListener("click", function () {
    var email = $("sel-email");
    if (!email.value.trim() || !email.checkValidity()) {
      say(
        elLoginMsg,
        "Digite seu e-mail no campo acima e clique de novo em “Esqueci minha senha”.",
        "err",
      );
      email.focus();
      return;
    }
    var btn = this;
    btn.disabled = true;
    say(elLoginMsg, "Enviando…");
    db.auth
      .resetPasswordForEmail(email.value.trim(), {
        redirectTo: location.origin + location.pathname,
      })
      .then(function (res) {
        btn.disabled = false;
        if (res.error) {
          say(
            elLoginMsg,
            res.error.status === 429
              ? "Muitos pedidos seguidos. Espere alguns minutos e tente de novo."
              : "Não foi possível enviar o e-mail. Tente de novo.",
            "err",
          );
          return;
        }
        say(
          elLoginMsg,
          "Se este e-mail tiver cadastro, chegou um link para criar uma senha nova. Veja também o spam.",
          "ok",
        );
      });
  });

  elReset.addEventListener("submit", function (ev) {
    ev.preventDefault();
    var p1 = $("sel-new-pass").value,
      p2 = $("sel-new-pass2").value;
    if (p1.length < 6) {
      say(elResetMsg, "A senha precisa ter pelo menos 6 caracteres.", "err");
      return;
    }
    if (p1 !== p2) {
      say(elResetMsg, "As duas senhas não são iguais.", "err");
      return;
    }
    var btn = $("sel-reset-save");
    btn.disabled = true;
    say(elResetMsg, "Salvando…");
    db.auth.updateUser({ password: p1 }).then(function (res) {
      btn.disabled = false;
      if (res.error) {
        var code = res.error.code;
        say(
          elResetMsg,
          code === "same_password"
            ? "A senha nova precisa ser diferente da antiga."
            : code === "weak_password"
              ? "Senha fraca demais. Use uma mais longa."
              : "Não foi possível salvar. Peça um link novo e tente de novo.",
          "err",
        );
        return;
      }
      recovering = false;
      elReset.reset();
      hideAll();
      say(elResetMsg, "");
      db.auth.getSession().then(function (r) {
        apply(r.data && r.data.session);
        say(elMsg, "Senha nova salva.", "ok");
      });
    });
  });

  $("sel-logout").addEventListener("click", function () {
    db.auth.signOut();
  });

  function apply(session) {
    if (recovering && session && session.user) {
      currentUser = null;
      $("sel-reset-user").textContent = session.user.email;
      show("reset");
      $("sel-new-pass").focus();
      return;
    }
    if (session && session.user) {
      var firstTime = !currentUser || currentUser.id !== session.user.id;
      currentUser = session.user;
      greet(session.user);
      if (firstTime) load();
      /* Primeiro acesso sem nome e saudação: abre o cadastro antes da lista.
         Durante uma edição, eventos do Supabase não fecham o formulário. */
      if (!elPerfil.hidden) return;
      if (!profile(session.user)) openPerfil(session.user, false);
      else show("app");
    } else {
      currentUser = null;
      elList.textContent = "";
      show("login");
      if (linkError) {
        linkError = false;
        say(
          elLoginMsg,
          "O link de recuperação expirou ou já foi usado. Peça um novo.",
          "err",
        );
      }
    }
  }

  db.auth.onAuthStateChange(function (event, session) {
    if (event === "PASSWORD_RECOVERY") recovering = true;
    /* Adia a chamada para fora do callback, como o Supabase recomenda. */
    setTimeout(function () {
      apply(session);
    }, 0);
  });
  db.auth.getSession().then(function (res) {
    apply(res.data && res.data.session);
  });

  /* Voltar pelo botão "voltar" do navegador pode restaurar a página da
     memória com a sessão aberta; nesse caso, encerra e pede o login. */
  window.addEventListener("pageshow", function (ev) {
    if (ev.persisted && currentUser) db.auth.signOut({ scope: "local" });
  });

  /* Atualiza a lista ao voltar para a aba, para ver o que o outro guardou. */
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden && currentUser) load();
  });
})();
