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

  window.Crono = { cfg, PROVA, DEMO, DEMO_KEY, sb, fmt, esc, norm, store, uuid, listarTempos, calcularRanking };
})();
