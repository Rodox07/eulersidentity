export async function loadItems(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`No pude cargar ${url} (${res.status})`);
  const data = await res.json();
  if (Array.isArray(data)) return data;
  return Array.isArray(data?.items) ? data.items : [];
}

export function escapeHTML(s = "") {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function formatDate(iso) {
  if (!iso) return "";
  // iso puede venir "YYYY-MM-DD" o completo; nos quedamos con lo primero
  const d = String(iso).slice(0, 10);
  return d;
}

export function pickRandom(arr) {
  if (!arr?.length) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}
