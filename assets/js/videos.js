// js/videos.js
import { loadPosts, renderPostsSidebar } from "./posts.js";

const POSTS_URL = "/assets/data/videos.json";

function esc(s=""){return String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;");}

async function fetchJSON(urlObj){
  const url = new URL(urlObj);
  url.searchParams.set("v", Date.now().toString());
  const res = await fetch(url.toString(), { cache:"no-store" });
  if(!res.ok) throw new Error(`No pude cargar ${url.pathname} (${res.status})`);
  return res.json();
}
function parseItems(json){
  if(Array.isArray(json)) return json;
  return Array.isArray(json?.items) ? json.items : [];
}
function uniq(arr){ return [...new Set(arr.filter(Boolean))]; }

export async function renderVideos({ mainEl, asideEl }) {
  // Sidebar global (posts)
  const posts = await loadPosts();
  renderPostsSidebar(asideEl, {
    allPosts: posts,
    state: { q:"", tag:"" },
    onChange: () => location.hash = "#/"
  });

  const data = await fetchJSON(VIDEOS_URL);
  let items = parseItems(data)
    .map(v => ({ ...v, publicado: v?.publicado !== false }))
    .filter(v => v.publicado);

  // orden por fecha desc
  items.sort((a,b)=> (Date.parse(b.date||"")||0) - (Date.parse(a.date||"")||0));

  const tags = uniq(items.flatMap(v => v.tags||[])).sort((a,b)=>String(a).localeCompare(String(b)));

  mainEl.innerHTML = `
    <h1>Videos</h1>
    <div class="lede">MP4 subidos y ordenados en tarjetas.</div>
    <div class="divider"></div>

    <div class="records-controls">
      <div class="field">
        <label>Buscar</label>
        <input id="v-q" type="text" placeholder="título, tags...">
      </div>
      <div class="field">
        <label>Filtrar por tag</label>
        <select id="v-tag">
          <option value="">(todos)</option>
          ${tags.map(t => `<option value="${esc(t)}">${esc(t)}</option>`).join("")}
        </select>
      </div>
      <div class="field">
        <label>Orden</label>
        <select id="v-order">
          <option value="recientes">recientes</option>
          <option value="az">A → Z</option>
        </select>
      </div>
    </div>

    <div class="hr"></div>

    <div class="records-grid" id="v-grid"></div>
  `;

  const qEl = mainEl.querySelector("#v-q");
  const tagEl = mainEl.querySelector("#v-tag");
  const ordEl = mainEl.querySelector("#v-order");
  const gridEl = mainEl.querySelector("#v-grid");

  function apply(){
    const q = (qEl.value||"").trim().toLowerCase();
    const tag = tagEl.value || "";
    const ord = ordEl.value;

    let list = items.slice();

    if(tag) list = list.filter(v => (v.tags||[]).includes(tag));
    if(q){
      list = list.filter(v => {
        const hay = [v.title, (v.tags||[]).join(" "), v.desc].join(" ").toLowerCase();
        return hay.includes(q);
      });
    }

    if(ord === "az") list.sort((a,b)=>String(a.title||"").localeCompare(String(b.title||"")));

    gridEl.innerHTML = list.map(v => `
      <div class="record-card">
        <div class="record-body">
          <div class="record-title"><a href="javascript:void(0)">${esc(v.title || "(sin título)")}</a></div>
          <div class="record-artist">${esc(v.date || "")}</div>

          <div class="divider"></div>

          <video
            controls
            preload="metadata"
            style="width:100%; border-radius:12px; border:1px solid var(--b1); background:#fff;"
            ${v.poster ? `poster="${esc(v.poster)}"` : ""}
          >
            <source src="${esc(v.src || "")}" type="video/mp4">
          </video>

          <div class="record-chips" style="margin-top:10px;">
            ${(v.tags||[]).map(t => `<span class="chip chip--tag">#${esc(t)}</span>`).join("")}
          </div>

          ${v.desc ? `<div class="record-notes">${esc(v.desc)}</div>` : ""}
        </div>
      </div>
    `).join("");

    if(!list.length){
      gridEl.innerHTML = `<div class="postitem">No hay resultados con esos filtros.</div>`;
    }
  }

  qEl.addEventListener("input", apply);
  tagEl.addEventListener("change", apply);
  ordEl.addEventListener("change", apply);
  apply();
}

