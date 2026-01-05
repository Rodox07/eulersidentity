import { loadItems, escapeHTML, formatDate, pickRandom } from "./data.js";

const POSTS_URL = "/assets/data/posts.json";

function collectTags(posts) {
  const set = new Set();
  for (const p of posts) {
    (p.tags || []).forEach(t => set.add(String(t)));
  }
  return Array.from(set).sort((a,b) => a.localeCompare(b, "es"));
}

function sidebarHTML({ total, q = "", tag = "" }, tags) {
  const opts = [`<option value="">(todos)</option>`]
    .concat(tags.map(t => `<option value="${escapeHTML(t)}"${t===tag?" selected":""}>${escapeHTML(t)}</option>`))
    .join("");

  return `
    <div class="content">
      <div class="side-title">Barra de búsqueda : ${total}</div>

      <div class="field">
        <label>Buscar en posts</label>
        <input id="post-q" type="text" placeholder="palabras, título, tags..." value="${escapeHTML(q)}">
      </div>

      <div class="field">
        <label>Filtrar por tag</label>
        <select id="post-tag">${opts}</select>
      </div>

      <div class="btnrow">
        <button id="post-clear" type="button">Limpiar</button>
        <button id="post-random" type="button">Azar</button>
      </div>

      <div class="hr"></div>

      <div class="side-title">Yo { ._ .:3</div>
      <div class="badge">Correo</div>
      <div style="margin-top:6px">${escapeHTML("rodolfo.galaz@pregrado.uoh.cl")}</div>
    </div>
  `;
}

function postListItem(p) {
  const title = escapeHTML(p.titulo || "(sin título)");
  const slug = escapeHTML(p.slug || "");
  const date = escapeHTML(formatDate(p.fecha));
  const resumen = escapeHTML(p.resumen || "");
  const tags = (p.tags || []).slice(0, 8);

  const cover = p.portada
    ? `
      <a class="coverlink" href="#/post/${encodeURIComponent(p.slug)}">
        <img class="postcover" src="${escapeHTML(p.portada)}" alt="">
      </a>
    `
    : "";

  const tagsHTML = tags.map(t => `<span class="tag">#${escapeHTML(t)}</span>`).join(" ");

  return `
    <div class="postitem">
      ${cover}
      <a href="#/post/${encodeURIComponent(p.slug)}">${title}</a>
      <div class="sub">${resumen}</div>
      <div class="small">
        <span class="badge">${date}</span>
        ${tagsHTML}
      </div>
    </div>
  `;
}

function renderList(mainEl, posts) {
  const list = posts.map(postListItem).join("");
  mainEl.innerHTML = `
    <div class="content">
      <h1>Posts</h1>
      <div class="lede">Tengo sueño, probablemente.</div>
      <div class="divider"></div>

      <div class="badge">posts: ${posts.length}/${posts.length}</div>
      <div class="postlist">${list || `<div class="postitem">No hay resultados con esos filtros.</div>`}</div>
    </div>
  `;
}

function renderDetail(mainEl, post) {
  if (!post) {
    mainEl.innerHTML = `
      <div class="content">
        <h1>Ruta desconocida</h1>
        <p>Prueba volver a Inicio.</p>
        <p><a href="#/">← Inicio</a></p>
      </div>
    `;
    return;
  }

  const title = escapeHTML(post.titulo || "");
  const date = escapeHTML(formatDate(post.fecha));
  const tags = (post.tags || []).map(t => `<span class="tag">#${escapeHTML(t)}</span>`).join(" ");
  const cover = post.portada
    ? `<figure class="posthero"><img src="${escapeHTML(post.portada)}" alt=""></figure>`
    : "";

  // contenido viene como markdown; sin parser lo dejamos como texto (simple y seguro).
  // Si quieres markdown real, te digo cómo poner marked en 1 línea.
  const content = `<pre style="white-space:pre-wrap;margin-top:12px">${escapeHTML(post.contenido || "")}</pre>`;

  mainEl.innerHTML = `
    <div class="content">
      <h1>${title}</h1>
      <div class="meta">
        <span class="badge">${date}</span>
        ${tags}
      </div>
      ${cover}
      ${content}
      <div class="hr"></div>
      <a href="#/">← Volver</a>
    </div>
  `;
}

export async function renderPosts({ mainEl, asideEl }, state = {}) {
  const all = (await loadItems(POSTS_URL)).filter(p => p?.publicado !== false);
  const tags = collectTags(all);

  const q = (state.q || "").trim().toLowerCase();
  const tag = (state.tag || "").trim();

  const filtered = all.filter(p => {
    const hayTag = !tag || (p.tags || []).includes(tag);
    if (!hayTag) return false;
    if (!q) return true;
    const blob = `${p.titulo||""} ${p.resumen||""} ${(p.tags||[]).join(" ")} ${p.contenido||""}`.toLowerCase();
    return blob.includes(q);
  });

  // Sidebar
  if (asideEl) {
    asideEl.innerHTML = sidebarHTML({ total: all.length, q: state.q || "", tag: state.tag || "" }, tags);

    const qEl = asideEl.querySelector("#post-q");
    const tagEl = asideEl.querySelector("#post-tag");
    const clearBtn = asideEl.querySelector("#post-clear");
    const randomBtn = asideEl.querySelector("#post-random");

    qEl?.addEventListener("input", () => {
      state.q = qEl.value;
      renderPosts({ mainEl, asideEl }, state);
    });
    tagEl?.addEventListener("change", () => {
      state.tag = tagEl.value;
      renderPosts({ mainEl, asideEl }, state);
    });
    clearBtn?.addEventListener("click", () => {
      state.q = "";
      state.tag = "";
      renderPosts({ mainEl, asideEl }, state);
    });
    randomBtn?.addEventListener("click", () => {
      const picked = pickRandom(filtered.length ? filtered : all);
      if (picked?.slug) location.hash = `#/post/${encodeURIComponent(picked.slug)}`;
    });
  }

  renderList(mainEl, filtered);
}

export async function renderPostDetail({ mainEl, asideEl }, slug) {
  const all = (await loadItems(POSTS_URL)).filter(p => p?.publicado !== false);
  const post = all.find(p => String(p.slug) === String(slug));
  if (asideEl) asideEl.innerHTML = ""; // opcional: sidebar vacío en detalle
  renderDetail(mainEl, post);
}
