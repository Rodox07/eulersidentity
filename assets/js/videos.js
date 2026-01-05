import { loadItems, escapeHTML, formatDate } from "./data.js";

const VIDEOS_URL = "/assets/data/videos.json";

function videoCard(v) {
  const title = escapeHTML(v.title || "(sin título)");
  const date = escapeHTML(formatDate(v.date));
  const desc = escapeHTML(v.desc || "");
  const poster = v.poster ? `poster="${escapeHTML(v.poster)}"` : "";
  const src = v.src ? escapeHTML(v.src) : "";

  const tags = (v.tags || []).map(t => `<span class="tag">#${escapeHTML(t)}</span>`).join(" ");

  return `
    <div class="record-card">
      <div class="record-cover">
        ${src
          ? `<video controls preload="metadata" playsinline ${poster} style="width:100%;height:160px;object-fit:cover;display:block">
               <source src="${src}" type="video/mp4">
             </video>`
          : `<div class="record-nocover">sin video</div>`
        }
      </div>
      <div class="record-body">
        <div class="record-top">
          <div>
            <div class="record-title"><a href="#/videos">${title}</a></div>
            <div class="record-artist">${date}</div>
          </div>
        </div>

        ${desc ? `<div class="record-notes">${desc}</div>` : ""}

        <div class="record-chips" style="margin-top:10px">
          ${tags}
        </div>

        ${src ? `<div style="margin-top:10px"><a href="${src}" target="_blank" rel="noopener">Abrir archivo</a></div>` : ""}
      </div>
    </div>
  `;
}

export async function renderVideos({ mainEl, asideEl }) {
  const items = (await loadItems(VIDEOS_URL)).filter(v => v?.publicado !== false);

  if (asideEl) {
    asideEl.innerHTML = `
      <div class="content">
        <div class="side-title">Videos</div>
        <div class="muted">MP4 + poster subidos desde el admin.</div>
        <div class="hr"></div>
        <div class="muted">Items: ${items.length}</div>
      </div>
    `;
  }

  mainEl.innerHTML = `
    <div class="content">
      <h1>Videos</h1>
      <div class="lede">Clips y registros, en orden y con carátula.</div>
      <div class="divider"></div>

      <div class="records-grid">
        ${items.map(videoCard).join("") || `<div class="postitem">No hay videos todavía.</div>`}
      </div>
    </div>
  `;
}
