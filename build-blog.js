const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");
const { marked } = require("marked");

const SITE = "https://www.servend.com.br";
const POSTS_DIR = path.join(__dirname, "posts");
const TEMPLATE_PATH = path.join(__dirname, "templates", "post-template.html");
const OUT_DIR = path.join(__dirname, "dist", "blog");

function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDateBR(dateStr) {
  // dateStr pode vir como "2025-04-14"
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr; // fallback
  return new Intl.DateTimeFormat("pt-BR").format(d);
}

function readTimeMinutes(html) {
  const text = html.replace(/<[^>]*>/g, " ");
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const mins = Math.max(1, Math.round(words / 220));
  return `~${mins} min`;
}

function makeJsonLd({ title, description, canonical, datePublished }) {
  const obj = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: title,
    description: description || "",
    mainEntityOfPage: canonical,
    datePublished: datePublished || undefined
  };
  return `<script type="application/ld+json">${JSON.stringify(obj)}</script>`;
}

function ogImageTag(coverPath) {
  if (!coverPath) return "";
  // cuidado com espaços/acentos: encodeURI ajuda
  const abs = SITE + "/" + coverPath.replace(/^\//, "");
  return `<meta property="og:image" content="${escapeHtml(encodeURI(abs))}">`;
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

const template = fs.readFileSync(TEMPLATE_PATH, "utf-8");
ensureDir(OUT_DIR);

const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith(".md"));

for (const file of files) {
  const slug = file.replace(/\.md$/, "");
  const raw = fs.readFileSync(path.join(POSTS_DIR, file), "utf-8");

  const parsed = matter(raw);
  const meta = parsed.data || {};
  const mdBody = parsed.content || "";

  const title = meta.title || slug;
  const description = meta.description || "";
  const category = (meta.category || "Blog").toString().toUpperCase();
  const dateStr = (meta.date || "").toString().replaceAll('"', "");
  const dateBR = formatDateBR(dateStr);

  const contentHtml = marked.parse(mdBody);
  const readTime = readTimeMinutes(contentHtml);

  const canonical = `${SITE}/blog/${encodeURIComponent(slug)}/`;
  const jsonLd = makeJsonLd({
    title,
    description,
    canonical,
    datePublished: dateStr || undefined
  });

  const html = template
    .replaceAll("{{TITLE}}", escapeHtml(title))
    .replaceAll("{{DESCRIPTION}}", escapeHtml(description))
    .replaceAll("{{CATEGORY}}", escapeHtml(category))
    .replaceAll("{{DATE_BR}}", escapeHtml(dateBR))
    .replaceAll("{{READ_TIME}}", escapeHtml(readTime))
    .replaceAll("{{CANONICAL}}", escapeHtml(canonical))
    .replaceAll("{{CONTENT}}", contentHtml)
    .replaceAll("{{JSON_LD}}", jsonLd)
    .replaceAll("{{OG_IMAGE_TAG}}", ogImageTag(meta.cover));

  const outPostDir = path.join(OUT_DIR, slug);
  ensureDir(outPostDir);
  fs.writeFileSync(path.join(outPostDir, "index.html"), html, "utf-8");

  console.log(`OK: /blog/${slug}/`);
}

console.log("Build finalizado. Saída em: dist/blog/");
