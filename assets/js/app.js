import { renderPosts, renderPostDetail } from "./posts.js";
import { renderRecords } from "./records.js";
import { renderVideos } from "./videos.js";

function findMainEl() {
  // intenta agarrar el "panel principal" como lo tienes en tu layout
  const sec = document.querySelector("main > section.panel") || document.querySelector("main section") || document.querySelector("main");
  return sec?.querySelector(".content") || sec;
}

function findAsideEl() {
  const as = document.querySelector("main > aside.panel") || document.querySelector("aside");
  return as?.querySelector(".content") || as;
}

function setActiveNav(hash) {
  document.querySelectorAll(".navlink").forEach(a => a.classList.remove("active"));
  const map = {
    "#/": "Inicio",
    "#/proyectos": "Proyectos",
    "#/discos": "Discos",
    "#/videos": "Videos",
    "#/acerca": "Acerca"
  };
  // marca activo por href si existe
  const active = document.querySelector(`a.navlink[href="${hash.split("?")[0]}"]`);
  if (active) active.classList.add("active");
}

const state = { q: "", tag: "" };

async function router() {
  const mainEl = findMainEl();
  const asideEl = findAsideEl();
  if (!mainEl) return;

  const hash = location.hash || "#/";
  setActiveNav(hash);

  try {
    if (hash.startsWith("#/post/")) {
      const slug = decodeURIComponent(hash.replace("#/post/", ""));
      await renderPostDetail({ mainEl, asideEl }, slug);
      return;
    }
    if (hash.startsWith("#/discos")) {
      await renderRecords({ mainEl, asideEl });
      return;
    }
    if (hash.startsWith("#/videos")) {
      await renderVideos({ mainEl, asideEl });
      return;
    }

    // default: inicio (posts)
    await renderPosts({ mainEl, asideEl }, state);
  } catch (e) {
    mainEl.innerHTML = `
      <div class="content">
        <h1>Error</h1>
        <pre style="white-space:pre-wrap">${String(e?.message || e)}</pre>
      </div>
    `;
    if (asideEl) asideEl.innerHTML = "";
  }
}



window.addEventListener("hashchange", router);
window.addEventListener("DOMContentLoaded", router);
