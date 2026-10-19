// Funções partilhadas entre a página do operador e o ranking
(function () {
  const cfg = window.CRONO_CONFIG || {};
  const params = new URLSearchParams(location.search);
  const PROVA = (params.get("prova") || cfg.PROVA || "Geral").trim();
  const DEMO = !cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY;
  const sb = DEMO ? null : window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  const DEMO_KEY = "crono_demo_tempos";

  // mm:ss.mmm
  function fmt(ms) {
    ms = Math.max(0, Math.floor(ms));
    const m = Math.floor(ms / 60000);
    const s = Math.floor(ms / 1000) % 60;
    const mil = ms % 1000;
    return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0") + "." + String(mil).padStart(3, "0");
  }

  function esc(t) {
    return String(t).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  // "João  Silva" e "joao silva" contam como o mesmo atleta
  function norm(n) {
    return String(n).trim().replace(/\s+/g, " ").toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === "x" ? r : (r & 3 | 8)).toString(16);
    });
  }

  async function listarTempos() {
    if (DEMO) return store.get(DEMO_KEY, []).filter(t => t.prova === PROVA);
    const { data, error } = await sb.from("tempos")
      .select("id,prova,atleta,tempo_ms,criado_em")
      .eq("prova", PROVA)
      .order("criado_em", { ascending: false })
      .limit(5000);
    if (error) throw error;
    return data;
  }

  // Estado das pistas em tempo real ("Em prova")
  const DEMO_VIVO = "crono_demo_aovivo";
  async function listarAoVivo() {
    if (DEMO) return Object.values(store.get(DEMO_VIVO, {})).filter(r => r.prova === PROVA);
    const { data, error } = await sb.from("ao_vivo").select("*").eq("prova", PROVA);
    if (error) throw error;
    return data;
  }

  // Melhor tempo de cada atleta (mais rápido = melhor)
  function calcularRanking(tempos) {
    const m = new Map();
    for (const t of tempos) {
      const k = norm(t.atleta);
      const r = m.get(k);
      if (!r) {
        m.set(k, { chave: k, atleta: t.atleta, melhor: t.tempo_ms, tentativas: 1 });
      } else {
        r.tentativas++;
        if (t.tempo_ms < r.melhor) { r.melhor = t.tempo_ms; r.atleta = t.atleta; }
      }
    }
    const lista = [...m.values()].sort((a, b) => a.melhor - b.melhor);
    // empates ficam com a mesma posição
    lista.forEach((r, i) => { r.pos = i > 0 && r.melhor === lista[i - 1].melhor ? lista[i - 1].pos : i + 1; });
    return lista;
  }

  // Verifica os requisitos para o browser permitir "Instalar app" (e não só atalho)
  async function diagnosticoInstalacao() {
    const L = [];
    const ok = (bom, txt) => L.push(`<li class="${bom ? "d-ok" : "d-ko"}">${bom ? "✔" : "✖"} ${txt}</li>`);
    const ua = navigator.userAgent;
    const inApp = /; wv\)|FBAN|FBAV|Instagram|WhatsApp|Line\//i.test(ua);
    const chrome = /Chrome\//.test(ua) && !/SamsungBrowser|Firefox|OPR\//.test(ua);
    ok(location.protocol === "https:" || location.hostname === "localhost", "Ligação segura (https)");
    ok(!inApp, inApp ? "Aberto dentro de outra app (WhatsApp/Facebook…) — abre no Chrome" : "Aberto num browser normal");
    ok(chrome || /Edg\//.test(ua), chrome ? "Browser: Chrome" : "Browser: não é o Chrome (no Android usa o Chrome)");
    const link = document.querySelector('link[rel="manifest"]');
    let man = null;
    try {
      const r = await fetch(link.href, { cache: "no-store" });
      man = r.ok ? await r.json() : null;
      ok(!!man, man ? "Manifesto encontrado" : `Manifesto em falta (${r.status}) — carrega o ${link.getAttribute("href")}`);
    } catch (e) { ok(false, "Manifesto inválido ou em falta"); }
    if (man && man.icons) {
      for (const ic of man.icons) {
        let st = 0;
        try { st = (await fetch(new URL(ic.src, link.href), { cache: "no-store" })).status; } catch (e) {}
        ok(st === 200, st === 200 ? `Ícone ${ic.src}` : `Ícone em falta: ${ic.src} — carrega este ficheiro no GitHub`);
      }
    }
    let sw = false;
    try { sw = !!(navigator.serviceWorker && (await navigator.serviceWorker.getRegistration())); } catch (e) {}
    ok(sw, sw ? "Service worker ativo" : "Service worker em falta — carrega o sw.js e recarrega a página");
    const tudoOk = !L.some(x => x.includes("d-ko"));
    return `<ul class="diag">${L.join("")}</ul>` + (tudoOk
      ? `<p class="d-nota">Está tudo certo. Se o Chrome ainda só oferecer atalho: fecha a página, abre-a de novo, espera 30 s e tenta outra vez. Se já tinhas criado um atalho, apaga-o primeiro.</p>`
      : `<p class="d-nota">Corrige os pontos com ✖ e recarrega a página.</p>`);
  }

  window.Crono = { cfg, PROVA, DEMO, DEMO_KEY, DEMO_VIVO, sb, fmt, esc, norm, store, uuid, listarTempos, listarAoVivo, calcularRanking, diagnosticoInstalacao };
})();
