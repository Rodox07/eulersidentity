// js/records.js
import { loadPosts, renderPostsSidebar } from "./posts.js";

const POSTS_URL = "/assets/data/records.json";


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

export async function renderRecords({ mainEl, asideEl }) {
  // Sidebar global (posts)
  const posts = await loadPosts();
  renderPostsSidebar(asideEl, {
    allPosts: posts,
    state: { q:"", tag:"" },
    onChange: () => location.hash = "#/"
  });

  const data = await fetchJSON(RECORDS_URL);
  let items = parseItems(data);

  const generos = uniq(items.map(r => r.genero)).sort((a,b)=>String(a).localeCompare(String(b)));

  mainEl.innerHTML = `
    <h1>Discos</h1>
    <div class="lede">Biblioteca del año: lo que escuché y lo que me dejó.</div>
    <div class="divider"></div>

    <div class="records-controls">
      <div class="field">
        <label>Buscar</label>
        <input id="r-q" type="text" placeholder="artista, álbum, tag...">
      </div>
      <div class="field">
        <label>Género</label>
        <select id="r-gen">
          <option value="">(todos)</option>
          ${generos.map(g => `<option value="${esc(g)}">${esc(g)}</option>`).join("")}
        </select>
      </div>
      <div class="field">
        <label>Orden</label>
        <select id="r-order">
          <option value="recientes">recientes</option>
          <option value="nota">nota</option>
          <option value="anio">año</option>
          <option value="az">A → Z</option>
        </select>
      </div>
    </div>

    <div class="hr"></div>

    <div class="records-grid" id="r-grid"></div>
  `;

  const qEl = mainEl.querySelector("#r-q");
  const genEl = mainEl.querySelector("#r-gen");
  const ordEl = mainEl.querySelector("#r-order");
  const gridEl = mainEl.querySelector("#r-grid");

  function scoreFill(nota){
    const n = Math.max(0, Math.min(10, Number(nota)||0));
    return (n/10)*100;
  }

  function apply(){
    const q = (qEl.value||"").trim().toLowerCase();
    const gen = genEl.value || "";
    const ord = ordEl.value;

    let list = items.slice();

    if(gen) list = list.filter(r => String(r.genero||"") === gen);

    if(q){
      list = list.filter(r => {
        const hay = [
          r.album, r.artista, r.genero,
          (r.tags||[]).join(" "),
          (r.chips||[]).join(" "),
          r.notas
        ].join(" ").toLowerCase();
        return hay.includes(q);
      });
    }

    if(ord === "recientes"){
      list.sort((a,b)=> (Date.parse(b.escuchado||"")||0) - (Date.parse(a.escuchado||"")||0));
    } else if(ord === "nota"){
      list.sort((a,b)=> (Number(b.nota)||0) - (Number(a.nota)||0));
    } else if(ord === "anio"){
      list.sort((a,b)=> (Number(b.anio)||0) - (Number(a.anio)||0));
    } else if(ord === "az"){
      list.sort((a,b)=> String(a.album||"").localeCompare(String(b.album||"")));
    }

    gridEl.innerHTML = list.map(r => `
      <div class="record-card">
        <div class="record-cover">
          <img src="${esc(r.cover || "")}" alt="" onerror="this.style.display='none'">
        </div>

        <div class="record-body">
          <div class="record-title"><a href="javascript:void(0)">${esc(r.album || "(sin álbum)")}</a></div>
          <div class="record-artist">${esc(r.artista || "")}${r.anio ? ` • ${esc(r.anio)}` : ""}</div>

          <div class="record-score">${esc(r.nota ?? "")}/10</div>

          <div class="rating">
            <div class="rating__fill" style="width:${scoreFill(r.nota)}%"></div>
          </div>

          ${r.escuchado ? `<div class="badge">escuchado: ${esc(r.escuchado)}</div>` : ""}

          <div class="record-chips">
            ${(r.chips||[]).map(c => `<span class="chip">${esc(c)}</span>`).join("")}
            ${(r.tags||[]).map(t => `<span class="chip chip--tag">#${esc(t)}</span>`).join("")}
          </div>

          ${r.notas ? `<div class="record-notes">${esc(r.notas)}</div>` : ""}
        </div>
      </div>
    `).join("");

    if(!list.length){
      gridEl.innerHTML = `<div class="postitem">No hay resultados con esos filtros.</div>`;
    }
  }

  qEl.addEventListener("input", apply);
  genEl.addEventListener("change", apply);
  ordEl.addEventListener("change", apply);

  apply();
}

