let POSTS = [];
let RECORDS = [];
let VIDEOS = [];

async function loadJson(url){
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`No pude cargar ${url}`);
  return res.json();
}



/* -----------------------------
   DOM
----------------------------- */
const view = document.getElementById("view");
const q = document.getElementById("q");
const tagFilter = document.getElementById("tagFilter");
const clearFiltersBtn = document.getElementById("clearFilters");
const randomPostBtn = document.getElementById("randomPost");

/* -----------------------------
   MathJax: re-typeset tras cada render
----------------------------- */
async function typesetMath(rootEl = view) {
  const MJ = window.MathJax;

  if (MJ?.typesetPromise) {
    try { await MJ.typesetPromise([rootEl]); }
    catch (e) { console.warn("MathJax typeset error:", e); }
    return;
  }

  if (MJ?.startup?.promise) {
    try {
      await MJ.startup.promise;
      await MJ.typesetPromise([rootEl]);
    } catch (e) {
      console.warn("MathJax startup/typeset error:", e);
    }
  }
}

/* -----------------------------
   Utilidades
----------------------------- */
function escapeHtml(s){
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function uniqueTags(posts){
  const set = new Set();
  posts.forEach(p => (p.tags||[]).forEach(t => set.add(t)));
  return Array.from(set).sort((a,b)=>a.localeCompare(b));
}

function fillTagSelect(tags, selected){
  const current = Array.from(tagFilter.options).map(o=>o.value).join("|");
  const next = ["", ...tags].join("|");
  if (current !== next){
    tagFilter.innerHTML =
      `<option value="">(todos)</option>` +
      tags.map(t=>`<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join("");
  }
  tagFilter.value = selected || "";
}

function setActiveNav(){
  const hash = location.hash || "#/";
  document.querySelectorAll(".navlink").forEach(a => {
    const href = a.getAttribute("href");
    a.classList.toggle("active", hash.startsWith(href));
    if (hash.startsWith("#/post/") && href === "#/") a.classList.add("active");
  });
}
function uniqueValues(list, key){
  const set = new Set();
  list.forEach(item => (item[key] || []).forEach(v => set.add(v)));
  return Array.from(set).sort((a,b)=>a.localeCompare(b));
}

function formatDate(iso){
  // iso: YYYY-MM-DD
  if (!iso) return "";
  const [y,m,d] = iso.split("-").map(Number);
  const dt = new Date(y, (m||1)-1, d||1);
  return dt.toLocaleDateString("es-CL", { year:"numeric", month:"short", day:"2-digit" });
}

function ratingBar(n){
  if (typeof n !== "number") return "";
  const clamped = Math.max(0, Math.min(10, n));
  return `
    <div class="rating" title="Rating: ${clamped}/10">
      <div class="rating__fill" style="width:${clamped*10}%"></div>
    </div>
  `;
}


/* -----------------------------
   Render helpers
----------------------------- */
function renderCoverInList(p){
  if (!p.cover) return "";
  return `
    <a class="coverlink" href="#/post/${encodeURIComponent(p.id)}" aria-label="Abrir ${escapeHtml(p.title)}">
      <img class="postcover" src="${p.cover}" alt="${escapeHtml(p.coverAlt || p.title)}" loading="lazy">
    </a>
  `;
}

function renderHeroInPost(p){
  if (!p.cover) return "";
  return `
    <figure class="posthero">
      <img src="${p.cover}" alt="${escapeHtml(p.coverAlt || p.title)}">
    </figure>
  `;
}

/* -----------------------------
   Render views
----------------------------- */
function renderHome(){
  const query = (q.value || "").trim().toLowerCase();
  const tag = tagFilter.value;

  const filtered = POSTS
    .slice()
    .sort((a,b)=> (b.date || "").localeCompare(a.date || ""))
    .filter(p => {
      const hay = (p.title + " " + (p.lede||"") + " " + (p.tags||[]).join(" ")).toLowerCase();
      const okQ = !query || hay.includes(query);
      const okT = !tag || (p.tags||[]).includes(tag);
      return okQ && okT;
    });

  fillTagSelect(uniqueTags(POSTS), tag);

  view.innerHTML = `
    <h1>Posts</h1>
<p class="lede">Tengo sueño, probablemente.</p>

<figure class="home-hero">
  <img src="assets/img/portada.jpg" alt="Portada" loading="lazy" />
  <!-- opcional:
  <figcaption>retro-net • oscuro • elegante</figcaption>
  -->
</figure>

<div class="divider"></div>


    <div class="meta">
      <span class="badge">posts: ${filtered.length}/${POSTS.length}</span>
    </div>

    <div class="postlist">
      ${
        filtered.length
        ? filtered.map(p => `
          <div class="postitem">
            <a href="#/post/${encodeURIComponent(p.id)}">${escapeHtml(p.title)}</a>
            <div class="sub">${escapeHtml(p.lede || "")}</div>

            ${renderCoverInList(p)}

            <div class="small">
              <span>${escapeHtml(p.date || "")}</span>
              <span>•</span>
              ${(p.tags||[]).map(t => `<a class="tag" href="#/" data-tag="${escapeHtml(t)}">#${escapeHtml(t)}</a>`).join(" ")}
            </div>
          </div>
        `).join("")
        : `<div class="postitem"><div class="sub">No hay resultados con esos filtros.</div></div>`
      }
    </div>
  `;

  // Tags clickeables
  view.querySelectorAll('a.tag[data-tag]').forEach(a => {
    a.addEventListener("click", (e)=>{
      e.preventDefault();
      tagFilter.value = a.getAttribute("data-tag");
      location.hash = "#/";
      renderHome();
    });
  });

  setActiveNav();
  typesetMath(view);
}

function renderPost(id){
  const p = POSTS.find(x => x.id === id);

  if (!p){
    view.innerHTML = `
      <h1>No encontrado</h1>
      <p class="lede">Ese post no existe (o cambió el ID).</p>
      <div class="divider"></div>
      <p><a href="#/">← Volver</a></p>
    `;
    setActiveNav();
    typesetMath(view);
    return;
  }

  view.innerHTML = `
    <div class="meta">
      <a href="#/">← Volver</a>
      <span>•</span>
      <span>${escapeHtml(p.date || "")}</span>
      <span>•</span>
      <span>ID: <code>${escapeHtml(p.id)}</code></span>
    </div>

    <div class="divider"></div>

    <h1>${escapeHtml(p.title)}</h1>
    <p class="lede">${escapeHtml(p.lede || "")}</p>

    <div class="meta">
      ${(p.tags||[]).map(t => `<a class="tag" href="#/" data-tag="${escapeHtml(t)}">#${escapeHtml(t)}</a>`).join(" ")}
    </div>

    ${renderHeroInPost(p)}

    <div class="hr"></div>

    ${p.content}
  `;

  view.querySelectorAll('a.tag[data-tag]').forEach(a => {
    a.addEventListener("click", (e)=>{
      e.preventDefault();
      tagFilter.value = a.getAttribute("data-tag");
      location.hash = "#/";
      renderHome();
    });
  });

  setActiveNav();
  typesetMath(view);
}

function renderAbout(){
  view.innerHTML = `
    <h1>Acerca</h1>
    <p class="lede">Un blog que hice por idea de una amiga, ahora es mi mini proyecto secundario.</p>
    <div class="divider"></div>

    <article>
      <p>Me llamo Rodolfo Galaz, soy un estudiante de ingenieria civil electrica. Hago un poco de todo supongo. Por ahora eso! :333</p>
    </article>
  `;
  setActiveNav();
  typesetMath(view);
}

function renderProjects(){
  const proj = POSTS
    .filter(p => (p.tags||[]).includes("proyecto"))
    .slice()
    .sort((a,b)=> (b.date||"").localeCompare(a.date||""));

  view.innerHTML = `
    <h1>Proyectos</h1>
    <p class="lede">Recortes de avance, decisiones, pruebas, errores útiles.</p>
    <div class="divider"></div>

    <div class="postlist">
      ${
        proj.length
        ? proj.map(p => `
          <div class="postitem">
            <a href="#/post/${encodeURIComponent(p.id)}">${escapeHtml(p.title)}</a>
            <div class="sub">${escapeHtml(p.lede || "")}</div>

            ${renderCoverInList(p)}

            <div class="small">
              <span>${escapeHtml(p.date||"")}</span>
              <span>•</span>
              ${(p.tags||[]).map(t => `<span class="badge">#${escapeHtml(t)}</span>`).join(" ")}
            </div>
          </div>
        `).join("")
        : `<div class="postitem"><div class="sub">Aún no hay posts con tag “proyecto”.</div></div>`
      }
    </div>
  `;

  setActiveNav();
  typesetMath(view);
}

function renderDiscos(){
  const genres = uniqueValues(RECORDS, "genres");

  view.innerHTML = `
    <h1>Discos</h1>
    <p class="lede">Biblioteca del año: lo que escuché y lo que me dejó.</p>
    <div class="divider"></div>

    <div class="records-controls">
      <div class="field" style="margin:0">
        <label for="rq">Buscar</label>
        <input id="rq" type="search" placeholder="artista, álbum, tag…" autocomplete="off">
      </div>

      <div class="field" style="margin:0">
        <label for="rg">Género</label>
        <select id="rg">
          <option value="">(todos)</option>
          ${genres.map(g=>`<option value="${escapeHtml(g)}">${escapeHtml(g)}</option>`).join("")}
        </select>
      </div>

      <div class="field" style="margin:0">
        <label for="rs">Orden</label>
        <select id="rs">
          <option value="recent">recientes</option>
          <option value="old">antiguos</option>
          <option value="rating">mejor rating</option>
          <option value="az">A–Z</option>
        </select>
      </div>
    </div>

    <div class="hr"></div>

    <div class="records-grid" id="recordsGrid"></div>
  `;

  const rq = document.getElementById("rq");
  const rg = document.getElementById("rg");
  const rs = document.getElementById("rs");
  const grid = document.getElementById("recordsGrid");

  function paint(){
    const qx = (rq.value || "").trim().toLowerCase();
    const gx = rg.value;

    let list = RECORDS.slice().filter(r=>{
      const hay = [
        r.artist, r.title, r.year,
        ...(r.genres||[]), ...(r.tags||[]),
        r.notes || ""
      ].join(" ").toLowerCase();

      const okQ = !qx || hay.includes(qx);
      const okG = !gx || (r.genres||[]).includes(gx);
      return okQ && okG;
    });

    switch (rs.value){
      case "old":
        list.sort((a,b)=> (a.listened||"").localeCompare(b.listened||""));
        break;
      case "rating":
        list.sort((a,b)=> (b.rating||0) - (a.rating||0));
        break;
      case "az":
        list.sort((a,b)=> (a.artist+a.title).localeCompare(b.artist+b.title));
        break;
      default: // recent
        list.sort((a,b)=> (b.listened||"").localeCompare(a.listened||""));
    }

    grid.innerHTML = list.length ? list.map(r => `
      <article class="record-card">
        <a class="record-cover" href="#/disco/${encodeURIComponent(r.id)}" aria-label="Abrir ${escapeHtml(r.title)}">
          ${r.cover ? `<img src="${r.cover}" alt="${escapeHtml(r.title)}" loading="lazy">` : `<div class="record-nocover">sin portada</div>`}
        </a>

        <div class="record-body">
          <div class="record-top">
            <div>
              <div class="record-title">
                <a href="#/disco/${encodeURIComponent(r.id)}">${escapeHtml(r.title)}</a>
              </div>
              <div class="record-artist">${escapeHtml(r.artist)} <span class="record-year">• ${escapeHtml(r.year||"")}</span></div>
            </div>
            ${typeof r.rating === "number" ? `<div class="record-score">${escapeHtml(r.rating)}/10</div>` : ""}
          </div>

          ${ratingBar(r.rating)}

          <div class="record-meta">
            <span class="badge">escuchado: ${escapeHtml(formatDate(r.listened))}</span>
          </div>

          <div class="record-chips">
            ${(r.genres||[]).slice(0,6).map(g=>`<button class="chip" data-genre="${escapeHtml(g)}">${escapeHtml(g)}</button>`).join("")}
            ${(r.tags||[]).slice(0,6).map(t=>`<span class="chip chip--tag">#${escapeHtml(t)}</span>`).join("")}
          </div>

          ${r.notes ? `<p class="record-notes">${escapeHtml(r.notes)}</p>` : ""}
        </div>
      </article>
    `).join("") : `<div class="postitem"><div class="sub">No hay resultados.</div></div>`;

    // chips clickeables
    grid.querySelectorAll("button.chip[data-genre]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        rg.value = btn.getAttribute("data-genre");
        paint();
      });
    });
  }

  rq.addEventListener("input", paint);
  rg.addEventListener("change", paint);
  rs.addEventListener("change", paint);

  paint();
  setActiveNav();
  typesetMath(view);
}

function renderDisco(id){
  const r = RECORDS.find(x => x.id === id);
  if (!r){
    view.innerHTML = `
      <h1>No encontrado</h1>
      <p class="lede">Ese disco no existe (o cambió el ID).</p>
      <div class="divider"></div>
      <p><a href="#/discos">← Volver a Discos</a></p>
    `;
    setActiveNav();
    typesetMath(view);
    return;
  }

  view.innerHTML = `
    <div class="meta">
      <a href="#/discos">← Volver</a>
      <span>•</span>
      <span>escuchado: ${escapeHtml(formatDate(r.listened))}</span>
      ${typeof r.rating === "number" ? `<span>•</span><span>${escapeHtml(r.rating)}/10</span>` : ""}
    </div>

    <div class="divider"></div>

    <h1>${escapeHtml(r.title)}</h1>
    <p class="lede">${escapeHtml(r.artist)} • ${escapeHtml(r.year||"")}</p>

    <div class="record-detail">
      <div class="record-detail__cover">
        ${r.cover ? `<img src="${r.cover}" alt="${escapeHtml(r.title)}">` : `<div class="record-nocover">sin portada</div>`}
      </div>

      <div class="record-detail__info">
        ${ratingBar(r.rating)}

        <div class="record-chips">
          ${(r.genres||[]).map(g=>`<span class="chip">${escapeHtml(g)}</span>`).join("")}
          ${(r.tags||[]).map(t=>`<span class="chip chip--tag">#${escapeHtml(t)}</span>`).join("")}
        </div>

        ${r.notes ? `<p class="record-notes" style="margin-top:10px">${escapeHtml(r.notes)}</p>` : `<p class="record-notes" style="margin-top:10px;opacity:.75">Sin notas (por ahora).</p>`}
      </div>
    </div>
  `;

  setActiveNav();
  typesetMath(view);
}

/* -----------------------------
   Router
----------------------------- */
function route(){
  const hash = location.hash || "#/";
  const parts = hash.replace(/^#\//,"").split("/").filter(Boolean);

  if (parts.length === 0){
    renderHome();
    return;
  }
  if (parts[0] === "post" && parts[1]){
    renderPost(decodeURIComponent(parts[1]));
    return;
  }
  if (parts[0] === "projects"){
    renderProjects();
    return;
  }
  if (parts[0] === "about"){
    renderAbout();
    return;
  }
  if (parts[0] === "discos"){
  renderDiscos();
  return;
}
if (parts[0] === "disco" && parts[1]){
  renderDisco(decodeURIComponent(parts[1]));
  return;
}


  view.innerHTML = `
    <h1>Ruta desconocida</h1>
    <p class="lede">Prueba volver a Inicio.</p>
    <div class="divider"></div>
    <p><a href="#/">← Inicio</a></p>
  `;
  setActiveNav();
  typesetMath(view);
}

/* -----------------------------
   Eventos
----------------------------- */
q.addEventListener("input", ()=> {
  if ((location.hash || "#/") !== "#/") location.hash = "#/";
  renderHome();
});

tagFilter.addEventListener("change", ()=> {
  if ((location.hash || "#/") !== "#/") location.hash = "#/";
  renderHome();
});

clearFiltersBtn.addEventListener("click", ()=>{
  q.value = "";
  tagFilter.value = "";
  location.hash = "#/";
  renderHome();
});

randomPostBtn.addEventListener("click", ()=>{
  const pick = POSTS[Math.floor(Math.random() * POSTS.length)];
  location.hash = "#/post/" + encodeURIComponent(pick.id);
});

window.addEventListener("hashchange", route);

/* init */
(async function boot(){
  [POSTS, RECORDS, VIDEOS] = await Promise.all([
    loadJson("./assets/data/posts.json"),
    loadJson("./assets/data/records.json"),
    loadJson("./assets/data/videos.json"),
  ]);

  fillTagSelect(uniqueTags(POSTS), "");
  route();
  setTimeout(() => typesetMath(view), 0);
})();


