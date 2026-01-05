import fs from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import matter from "gray-matter";
import { marked } from "marked";

const OUT_DIR = "assets/data";

async function ensureDir(p){
  await fs.mkdir(p, { recursive: true });
}

function slugFromFile(file){
  return path.basename(file, path.extname(file));
}

function normTags(tags){
  if (!tags) return [];
  if (Array.isArray(tags)) return tags.map(String);
  return String(tags).split(",").map(s=>s.trim()).filter(Boolean);
}

async function buildPosts(){
  const files = await fg("content/posts/*.md");
  const posts = [];

  for (const file of files){
    const raw = await fs.readFile(file, "utf8");
    const { data, content } = matter(raw);

    posts.push({
      id: slugFromFile(file),
      title: data.title || slugFromFile(file),
      date: data.date || "",
      lede: data.lede || "",
      tags: normTags(data.tags),
      cover: data.cover || "",
      coverAlt: data.coverAlt || "",
      content: marked.parse(content || "")
    });
  }

  posts.sort((a,b)=> (b.date||"").localeCompare(a.date||""));
  return posts;
}

async function buildVideos(){
  const files = await fg("content/videos/*.md");
  const videos = [];

  for (const file of files){
    const raw = await fs.readFile(file, "utf8");
    const { data, content } = matter(raw);

    videos.push({
      id: slugFromFile(file),
      title: data.title || slugFromFile(file),
      date: data.date || "",
      tags: normTags(data.tags),
      cover: data.cover || "",
      type: data.type || "youtube",
      youtubeId: data.youtubeId || "",
      mp4: data.mp4 || "",
      notesHtml: marked.parse(content || "")
    });
  }

  videos.sort((a,b)=> (b.date||"").localeCompare(a.date||""));
  return videos;
}

async function buildRecords(){
  const files = await fg("content/records/*.json");
  const records = [];

  for (const file of files){
    const raw = await fs.readFile(file, "utf8");
    const data = JSON.parse(raw);

    records.push({
      id: slugFromFile(file),
      ...data
    });
  }

  // opcional: ordenar por fecha escuchado desc
  records.sort((a,b)=> (b.listened||"").localeCompare(a.listened||""));
  return records;
}

async function writeJson(name, data){
  await ensureDir(OUT_DIR);
  await fs.writeFile(path.join(OUT_DIR, name), JSON.stringify(data, null, 2), "utf8");
}

(async function main(){
  const [posts, videos, records] = await Promise.all([
    buildPosts(),
    buildVideos(),
    buildRecords()
  ]);

  await writeJson("posts.json", posts);
  await writeJson("videos.json", videos);
  await writeJson("records.json", records);

  console.log("OK: assets/data/*.json generado");
})();
