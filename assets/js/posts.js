// js/posts.js
const POSTS_URL = "/assets/data/posts.json";

// -------- helpers --------
function esc(s = "") {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function stripMarkdown(md = "") {
  return String(md)
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]*`/g, "")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/[#>*_~-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function mdToHtml(md = "") {
  // Si tienes marked (opcional) en index.html, úsalo.
  if (window.marked?.parse) return window.marked.parse(md);

  // Fallback minimalista (sin dependencias)
  const lines = String(md).split("\n");
  let out = [];
  let inCode = false;

  for (const line of lines) {
    if (line.startsWith("```")) {
      inCode = !inCode;
      out.push(inCode ? "<pre><code>" : "</code></pre>");
      continue;
    }
    if (inCode) {
      out.push(esc(line) + "\n");
      continue;
    }

    if (/^###\s+/.test(line)) out.push(`<h3>${esc(line.replace(/^###\s+/, ""))}</h3>`);
    else if (/^##\s+/.test(line)) out.push(`<h2>${esc(line.replace(/^##\s+/, ""))}</h2>`);
    else if (/^#\s+/.test(line)) out.push(`<h1>${esc(line.replace(/^#\s+/, ""))}</h1>`);
    else if (line.trim() === "") out.push("<br/>");
    else out.push(`<p>${esc(line)}</p>`);
  }
  return out.join("\n");
}

async function fetchJSON(urlObj) {
  const url = new URL(urlObj);
  // cache-bust para Netlify/CDN mientras pruebas
  url.searchParams.set("v", Date.now().toString());

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) throw new Error(`No pude cargar ${url.pathname} (${res.status})`);
  return res.json();
}

function normalizeSlug(s = "") {
  return String(s).trim().toLowerCase();
}

function parseItems(json) {
  if (Array.isArray(json)) return json;
  return Array.isArray(json?.items) ? json.items : [];
}

function sortByDateDesc(items) {
  return [...items].sort((a, b) => {
    const da = Date.parse(a?.fecha || a?.date || "") || 0;
    const db = Date.parse(b?.fecha || b?.date || "") || 0;
    return db - da;
  });
}

function collectTags(items) {
  const set = new Set();
  for (const it of items) {
    for (const t of (it?.tags || [])) set.add(String(t));
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

// -------- data --------
export async function loadPosts() {
  const json = await fetchJSON(POSTS_URL);
  const items = parseItems(json)
    .map(p => ({
      ...p,
      // default publicado=true si no existe
      publicado: p?.publicado !== false,
      slug: p?.slug ?? "",
      titulo: p?.titulo ?? p?.title ?? "",
      fecha: p?.fecha ?? p?.date ?? "",
      portada: p?.portada ?? "",
      resumen: p?.resumen ?? p?.desc ?? "",
      contenido: p?.contenido ?? p?.content ?? "",
      tags: Array.isArray(p?.tags) ? p.tags : [],
    }))
    .filter(p => p.publicado);

  return sortByDateDesc(items);
}

// -------- sidebar (buscador posts) --------
export function renderPostsSidebar(asideEl, { allPosts, state, onChange }) {
  if (!asideEl) return;

  const tags = collectTags(allPosts);
  const count = allPosts.length;

  asideEl.innerHTML = `
    <h2 class="side-title">Barra de búsqueda : ${count}</h2>

    <div class="field">
      <label>Buscar en posts</label>
      <input id="sb-q" type="text" placeholder="palabras, título, tags..." value="${esc(state.q || "")}">
    </div>

    <div class="field">
      <label>Filtrar por tag</label>
      <select id="sb-tag">
        <option value="">(todos)</option>
        ${tags.map(t => `<option value="${esc(t)}" ${state.tag === t ? "selected" : ""}>${esc(t)}</option>`).join("")}
      </select>
    </div>

    <div class="btnrow">
      <button id="sb-clear" type="button">Limpiar</button>
      <button id="sb-random" type="button">Azar</button>
    </div>

    <div class="divider"></div>

    <h2 class="side-title">Yo { ._.:3</h2>
    <div class="badge" style="margin-bottom:8px;">Correo</div>
    <div class="muted">rodolfo.galaz@pregrado.uoh.cl</div>
  `;

  const qEl = asideEl.querySelector("#sb-q");
  const tagEl = asideEl.querySelector("#sb-tag");

  qEl?.addEventListener("input", () => onChange({ q: qEl.value, tag: tagEl.value }));
  tagEl?.addEventListener("change", () => onChange({ q: qEl.value, tag: tagEl.value }));

  asideEl.querySelector("#sb-clear")?.addEventListener("click", () => onChange({ q: "", tag: "" }));

  asideEl.querySelector("#sb-random")?.addEventListener("click", () => {
    const pool = allPosts;
    if (!pool.length) return;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    location.hash = `#/post/${encodeURIComponent(pick.slug)}`;
  });
}

// -------- views --------
function filterPosts(posts, state) {
  const q = (state?.q || "").trim().toLowerCase();
  const tag = (state?.tag || "").trim();

  return posts.filter(p => {
    if (tag && !(p.tags || []).includes(tag)) return false;
    if (!q) return true;

    const hay = [
      p.titulo,
      p.resumen,
      stripMarkdown(p.contenido),
      (p.tags || []).join(" "),
    ].join(" ").toLowerCase();

    return hay.includes(q);
  });
}

export async function renderPosts({ mainEl, asideEl }, state) {
  const allPosts = await loadPosts();

  renderPostsSidebar(asideEl, {
    allPosts,
    state,
    onChange: (next) => {
      state.q = next.q;
      state.tag = next.tag;
      renderPosts({ mainEl, asideEl }, state);
    }
  });

  const visible = filterPosts(allPosts, state);

  mainEl.innerHTML = `
    <h1>Posts</h1>
    <div class="lede">Tengo sueño, probablemente.</div>
    <div class="divider"></div>

    <div class="meta">
      <span class="badge">posts: ${visible.length}/${allPosts.length}</span>
      <span class="muted">ruta: ${esc(location.hash || "#/")}</span>
    </div>

    <div class="postlist" style="margin-top:10px;">
      ${
        visible.length
          ? visible.map(p => {
              const excerpt = p.resumen?.trim() || stripMarkdown(p.contenido).slice(0, 180) + (stripMarkdown(p.contenido).length > 180 ? "…" : "");
              return `
                <div class="postitem">
                  ${p.portada ? `<a class="coverlink" href="#/post/${encodeURIComponent(p.slug)}"><img class="postcover" src="${esc(p.portada)}" alt=""></a>` : ""}
                  <a href="#/post/${encodeURIComponent(p.slug)}">${esc(p.titulo || "(sin título)")}</a>
                  <div class="sub">${esc(p.fecha || "")}</div>
                  <div class="small">
                    ${(p.tags || []).map(t => `<span class="tag">${esc(t)}</span>`).join(" ")}
                  </div>
                  ${excerpt ? `<div class="sub" style="margin-top:8px;">${esc(excerpt)}</div>` : ""}
                </div>
              `;
            }).join("")
          : `<div class="postitem">No hay resultados con esos filtros.</div>`
      }
    </div>
  `;
}

export async function renderPostDetail({ mainEl, asideEl }, slugRaw) {
  const allPosts = await loadPosts();

  // sidebar en detalle también
  renderPostsSidebar(asideEl, {
    allPosts,
    state: { q: "", tag: "" },
    onChange: (next) => {
      // si el usuario busca desde el detalle, vuelve al inicio filtrado
      const qs = new URLSearchParams();
      if (next.q) qs.set("q", next.q);
      if (next.tag) qs.set("tag", next.tag);
      location.hash = "#/"; // vuelve al listado
      // (si quieres, puedes almacenar state global y reusar)
    }
  });

  const slug = normalizeSlug(slugRaw);
  const post = allPosts.find(p => normalizeSlug(p.slug) === slug);

  if (!post) {
    mainEl.innerHTML = `
      <h1>Post no encontrado</h1>
      <div class="divider"></div>
      <a href="#/">← Volver</a>
    `;
    return;
  }

  mainEl.innerHTML = `
    <h1>${esc(post.titulo || "(sin título)")}</h1>
    <div class="meta" style="margin-top:10px;">
      <span class="badge">${esc(post.fecha || "")}</span>
      ${(post.tags || []).map(t => `<span class="tag">${esc(t)}</span>`).join(" ")}
    </div>

    ${post.portada ? `<div class="posthero"><img src="${esc(post.portada)}" alt=""></div>` : ""}

    <div class="divider"></div>

    <article>
      ${mdToHtml(post.contenido || "")}
    </article>

    <div class="divider"></div>
    <a href="#/">← Volver a Posts</a>
  `;
}

