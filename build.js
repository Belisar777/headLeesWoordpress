const fs = require('fs');
const path = require('path');

const API_URL = process.env.WP_API_URL || 'https://minwordpress-295.rostiapp.cz';
const DIST_DIR = path.join(__dirname, 'www');
const CACHE_FILE = path.join(__dirname, 'cache.json');
const ENCODING = 'utf8';

async function buildWeb() {
  if (!fs.existsSync(DIST_DIR)) fs.mkdirSync(DIST_DIR);
  let cache = fs.existsSync(CACHE_FILE) ? JSON.parse(fs.readFileSync(CACHE_FILE, ENCODING)) : {};

  const indexRes = await fetch(`${API_URL}/?get_static_index=1`);
  const posts = await indexRes.json();
  const newCache = {};
  const validFiles = new Set(['index.html', '404.html']);

  for (const post of posts) {
    const fileName = `${post.slug}.html`;
    validFiles.add(fileName);
    newCache[post.id] = post.modified;

    if (cache[post.id] === post.modified && fs.existsSync(path.join(DIST_DIR, fileName))) continue;

    const data = await (await fetch(`${API_URL}/?get_static_post=${post.id}`)).json();
    const html = `<!DOCTYPE html><html lang="cs"><head><title>${data.title}</title></head><body>${data.content}</body></html>`;
    fs.writeFileSync(path.join(DIST_DIR, fileName), html, ENCODING);
  }

  fs.readdirSync(DIST_DIR).forEach(file => {
    if (!validFiles.has(file) && file.endsWith('.html')) fs.unlinkSync(path.join(DIST_DIR, file));
  });
  fs.writeFileSync(CACHE_FILE, JSON.stringify(newCache, null, 2), ENCODING);
}
buildWeb();
