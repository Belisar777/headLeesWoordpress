const fs = require('fs');
const path = require('path');

const API_URL = process.env.WP_API_URL;
const DIST_DIR = path.join(__dirname, 'www');
const CACHE_FILE = path.join(__dirname, 'cache.json');
const ENCODING = 'utf8';

/**
 * Funkce pro obalení obsahu do jednotného HTML layoutu.
 * Zde budeš později implementovat svou minimalistickou GUI knihovnu.
 */
function wrapInLayout(title, content) {
  // Třídy a konstanty podle tvých pravidel: PascalCase pro komponenty, UPPER_CASE pro barvy/konstanty
  const BG_COLOR = "#f4f4f4";

  return `<!DOCTYPE html>
<html lang="cs">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body { font-family: sans-serif; line-height: 1.6; background: ${BG_COLOR}; max-width: 800px; margin: 0 auto; padding: 20px; }
        nav { margin-bottom: 20px; border-bottom: 1px solid #ccc; padding-bottom: 10px; }
        .Card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    </style>
</head>
<body>
    <nav>
        <a href="index.html">Domů</a>
    </nav>
    <main class="Card">
        ${content}
    </main>
</body>
</html>`;
}

async function buildWeb() {
  if (!fs.existsSync(DIST_DIR)) fs.mkdirSync(DIST_DIR);
  let cache = fs.existsSync(CACHE_FILE) ? JSON.parse(fs.readFileSync(CACHE_FILE, ENCODING)) : {};

  const indexRes = await fetch(`${API_URL}/?get_static_index=1`);
  const posts = await indexRes.json();
  const newCache = {};
  const validFiles = new Set(['index.html', '404.html']);

  // 1. Generování jednotlivých článků
  for (const post of posts) {
    const fileName = `${post.slug}.html`;
    validFiles.add(fileName);
    newCache[post.id] = post.modified;

    if (cache[post.id] === post.modified && fs.existsSync(path.join(DIST_DIR, fileName))) continue;

    const postData = await (await fetch(`${API_URL}/?get_static_post=${post.id}`)).json();
    const html = wrapInLayout(postData.title, `<h1>${postData.title}</h1><div>${postData.content}</div>`);
    fs.writeFileSync(path.join(DIST_DIR, fileName), html, ENCODING);
    console.log(`Generated post: ${fileName}`);
  }

  // 2. Generování index.html (rozcestník)
  const indexLinks = posts.map(p => `<li><a href="${p.slug}.html">${p.title}</a></li>`).join('');
  const indexHtml = wrapInLayout('Můj Web', `<h1>Seznam článků</h1><ul>${indexLinks}</ul>`);
  fs.writeFileSync(path.join(DIST_DIR, 'index.html'), indexHtml, ENCODING);

  // 3. Generování 404.html
  const errorHtml = wrapInLayout('404 - Nenalezeno', `<h1>Chyba 404</h1><p>Stránka nebyla nalezena. <a href="index.html">Zpět na hlavní stranu</a></p>`);
  fs.writeFileSync(path.join(DIST_DIR, '404.html'), errorHtml, ENCODING);

  // 4. Cleanup starých souborů
  fs.readdirSync(DIST_DIR).forEach(file => {
    if (!validFiles.has(file) && file.endsWith('.html')) {
      fs.unlinkSync(path.join(DIST_DIR, file));
      console.log(`Deleted old file: ${file}`);
    }
  });

  fs.writeFileSync(CACHE_FILE, JSON.stringify(newCache, null, 2), ENCODING);
  console.log('Build finished successfully.');
}

buildWeb().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});