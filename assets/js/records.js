import { loadItems, escapeHTML, formatDate } from "./data.js";

const RECORDS_URL = "/assets/data/records.json";

function recordCard(r) {
  const album = escapeHTML(r.album || "(sin álbum)");
  const artista = escapeHTML(r.artista || "");
  const anio = r.anio ? ` • ${escapeHTML(String(r.anio))}` : "";
  const cover = r.cover
    ? `<div class="record-cover"><img src="${escapeHTML(r.cover)}" alt=""></div>`
    : `<div class="record-nocover">sin portada</div>`;

  const nota = Number.isFinite(Number(r.nota)) ? Number(r.nota) : 0;
  const pct = Math.max(0, Math.min(100, (nota / 10) * 100));

  const escuchado = r.escuchado ? `escuchado: ${escapeHTML(formatDate(r.escuchado))}` : "";
  const chips = (r.chips || []).map(c => `<span class="chip">${escapeHTML(c)}</span>`).join(" ");
  const tags = (r.tags || []).map(t => `<span class="chip chip--tag">#${escapeHTML(t)}</span>`).join(" ");

  return `
    <div class="record-card">
      ${cover}
      <div class="record-body">
        <div class="record-top">
          <div>
            <div class="record-title"><a href="#/discos">${album}</a></div>
            <div class="record-artist">${artista}${anio}</div>
          </div>
          <div class="record-score">${escapeHTML(String(nota))}/10</div>
        </div>

        <div class="rating"><div class="rating__fill" style="width:${pct}%"></div></div>

        ${escuchado ? `<div class="badge">${escuchado}</div>` : ""}

        <div class="record-chips" style="margin-top:10px">
          ${chips} ${tags}
        </div>

        ${r.notas ? `<div class="record-notes">${escapeHTML(r.notas)}</div>` : ""}
      </div>
    </div>
  `;
}

export async function renderRecords({ mainEl, asideEl }) {
  const items = (await loadItems(RECORDS_URL)).filter(r => r?.publicado !== false);

  if (asideEl) {
    asideEl.innerHTML = `
      <div class="content">
        <div class="side-title">Discos</div>
        <div class="muted">Ahora mismo: ${items.length} items</div>
        <div class="hr"></div>
        <div class="muted">Tip: edítalos en <code>/admin</code> (colección Discos).</div>
      </div>
    `;
  }

  mainEl.innerHTML = `
    <div class="content">
      <h1>Discos</h1>
      <div class="lede">Biblioteca del año: lo que escuché y lo que me dejó.</div>
      <div class="divider"></div>

      <div class="records-grid">
        ${items.map(recordCard).join("") || `<div class="postitem">No hay discos todavía.</div>`}
      </div>
    </div>
  `;
}
