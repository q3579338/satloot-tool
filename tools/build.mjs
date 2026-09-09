// tool.satloot.com 双语构建：index.html（中文，唯一源）→ dist/
//   dist/index.html      中文：原样 + canonical/hreflang + 首访语言跳转脚本
//   dist/en/index.html   英文：按 i18n/en.json 逐段整句翻译，<html lang="en">，meta 全英文，相对地址改根绝对
//   dist/sitemap.xml     两个 URL，互带 alternate
// 用法：node tools/build.mjs
//
// 翻译口径（与 bnbbang/web/prerender-en.js 的 translate() 一致）：
//   · 按 <script>…</script> / <style>…</style> / 注释 / 单个标签切 token；
//   · 只翻「trim 后与词典 key 逐字相等」的文本节点，部分匹配一律不做；
//   · 属性只翻 placeholder / title / aria-label / alt，以及 <meta> 的 content；
//   · SCRIPT / STYLE / CODE / PRE / TEXTAREA 里的不翻；任一祖先带 data-nolang 的不翻；
//   · 词典漏翻自动回落中文，构建末尾把漏翻列出来。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const ORIGIN = 'https://tool.satloot.com';
const LS_KEY = 'satloot.lang';

const SRC = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const DICT = JSON.parse(fs.readFileSync(path.join(ROOT, 'i18n', 'en.json'), 'utf8'));

const ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];
const SKIP_TAGS = { script: 1, style: 1, code: 1, pre: 1, textarea: 1 };
const VOID_TAGS = { area: 1, base: 1, br: 1, col: 1, embed: 1, hr: 1, img: 1, input: 1, link: 1, meta: 1, param: 1, source: 1, track: 1, wbr: 1 };
const CJK = /[一-龥　-〿＀-￯]/;

/** 词典翻译：整段命中才换，否则原样返回 */
function translate(html, dict) {
  const used = new Set();
  const misses = [];
  const t = (s) => {
    if (Object.prototype.hasOwnProperty.call(dict, s)) { used.add(s); return dict[s]; }
    return s;
  };
  const tokens = html.split(/(<script\b[\s\S]*?<\/script\s*>|<style\b[\s\S]*?<\/style\s*>|<!--[\s\S]*?-->|<[^>]+>)/i);
  const stack = [];
  let hits = 0;
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if (!tok) continue;
    if (/^<(?:!--|script\b|style\b)/i.test(tok)) continue; // 注释 / 脚本 / 样式整块跳过
    if (tok[0] === '<') {
      const m = tok.match(/^<\/?([a-zA-Z][a-zA-Z0-9-]*)/);
      if (!m) continue;
      const name = m[1].toLowerCase();
      if (tok[1] === '/') {
        for (let k = stack.length - 1; k >= 0; k--) if (stack[k].name === name) { stack.length = k; break; }
        continue;
      }
      let tag = tok;
      const attrs = name === 'meta' ? ATTRS.concat('content') : ATTRS;
      for (const a of attrs) {
        const re = new RegExp('(\\s' + a + '=")([^"]*)(")');
        tag = tag.replace(re, (mm, p1, v, p3) => {
          const s = v.trim();
          if (!s) return mm;
          const en = t(s);
          if (en === s) { if (CJK.test(s)) misses.push(`${a}="${s}"`); return mm; }
          hits++;
          return p1 + v.replace(s, () => en) + p3;
        });
      }
      tokens[i] = tag;
      const selfClose = /\/>$/.test(tok) || VOID_TAGS[name];
      if (!selfClose) stack.push({ name, nolang: /\sdata-nolang(?:=|\s|>|$)/.test(tok) });
      continue;
    }
    if (stack.some((s) => SKIP_TAGS[s.name] || s.nolang)) continue;
    const s = tok.trim();
    if (!s) continue;
    const en = t(s);
    if (en === s) { if (CJK.test(s)) misses.push(s); continue; }
    tokens[i] = tok.replace(s, () => en);
    hits++;
  }
  const unused = Object.keys(dict).filter((k) => !used.has(k));
  return { html: tokens.join(''), hits, misses, unused };
}

/** 相对地址改根绝对（/en/ 目录下的页面，相对地址会指到 /en/xxx）。绝对 / 带协议 / 锚点 / data: 的不动 */
function absolutize(html) {
  const isRel = (u) => !/^(?:[a-z][a-z0-9+.-]*:|\/\/|\/|#|$)/i.test(u);
  return html.replace(/\b(src|href|poster|action)="([^"]*)"/g, (m, k, v) => (isRel(v) ? `${k}="/${v}"` : m));
}

/** 英文页里去掉 <script> 内的整行 // 注释和 <style> 内的块注释（源码注释是中文，不该出现在英文产物里） */
function stripComments(html) {
  html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, (blk) => blk.replace(/^[ \t]*\/\/[^\n]*\n/gm, ''));
  html = html.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, (blk) => blk.replace(/\/\*[\s\S]*?\*\/[ \t]*\n?/g, '').replace(/\n[ \t]*\n[ \t]*\n/g, '\n\n'));
  return html;
}

function headLinks(lang) {
  const url = lang === 'en' ? `${ORIGIN}/en/` : `${ORIGIN}/`;
  return [
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:locale" content="${lang === 'en' ? 'en_US' : 'zh_CN'}">`,
    `<link rel="canonical" href="${url}">`,
    `<link rel="alternate" hreflang="zh-CN" href="${ORIGIN}/">`,
    `<link rel="alternate" hreflang="en" href="${ORIGIN}/en/">`,
    `<link rel="alternate" hreflang="x-default" href="${ORIGIN}/">`,
  ].map((l) => '  ' + l).join('\n') + '\n';
}

// 首访语言跳转：只在 / 上跑；记过选择（点过语言切换）就不跳；浏览器语言不以 zh 开头才跳 /en/
const REDIRECT = `  <script>(function(){try{if(!/^https?:$/.test(location.protocol))return;if(localStorage.getItem(${JSON.stringify(LS_KEY)}))return;var n=navigator.language||(navigator.languages||[])[0]||'';if(n&&!/^zh/i.test(n))location.replace('/en/'+location.search+location.hash)}catch(e){}})();</script>\n`;

function mustReplace(html, from, to, what) {
  if (!html.includes(from)) throw new Error(`build: 源里找不到 ${what}：${from}`);
  return html.replace(from, () => to);
}

// ---- 中文页 ----
let zh = SRC;
zh = mustReplace(zh, '  <link rel="icon"', headLinks('zh') + '  <link rel="icon"', 'favicon 行（用来定位插 hreflang）');
zh = mustReplace(zh, '  <meta charset="UTF-8">\n', '  <meta charset="UTF-8">\n' + REDIRECT, 'charset 行（用来定位插跳转脚本）');

// ---- 英文页 ----
const r = translate(SRC, DICT);
let en = r.html;
en = mustReplace(en, '<html lang="zh-CN">', '<html lang="en">', '<html lang>');
en = mustReplace(en, '  <link rel="icon"', headLinks('en') + '  <link rel="icon"', 'favicon 行');
en = en.replace(/<a class="lang-switch"[^>]*>[^<]*<\/a>/, '<a class="lang-switch" href="/" hreflang="zh-CN" lang="zh-CN" data-nolang>中文</a>');
if (!en.includes('hreflang="zh-CN" lang="zh-CN"')) throw new Error('build: 源里没有 .lang-switch 语言切换链接');
en = mustReplace(en, 'class="brand" href="/"', 'class="brand" href="/en/"', '品牌链接');
en = stripComments(en);
en = absolutize(en);

// ---- 落盘 ----
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(path.join(DIST, 'en'), { recursive: true });
fs.writeFileSync(path.join(DIST, 'index.html'), zh);
fs.writeFileSync(path.join(DIST, 'en', 'index.html'), en);

const today = new Date().toISOString().slice(0, 10);
const alt = `<xhtml:link rel="alternate" hreflang="zh-CN" href="${ORIGIN}/"/><xhtml:link rel="alternate" hreflang="en" href="${ORIGIN}/en/"/><xhtml:link rel="alternate" hreflang="x-default" href="${ORIGIN}/"/>`;
fs.writeFileSync(path.join(DIST, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url><loc>${ORIGIN}/</loc>${alt}<lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>1.0</priority></url>
  <url><loc>${ORIGIN}/en/</loc>${alt}<lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>0.9</priority></url>
</urlset>
`);
fs.writeFileSync(path.join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${ORIGIN}/sitemap.xml\n`);

// ---- 报告 ----
const kb = (s) => (Buffer.byteLength(s) / 1024).toFixed(0);
console.log(`built dist/index.html (${kb(zh)} KB) + dist/en/index.html (${kb(en)} KB) + sitemap.xml + robots.txt`);
console.log(`词典 ${Object.keys(DICT).length} 条，命中 ${r.hits} 处`);
if (r.unused.length) console.warn(`词典里没用上的 key（${r.unused.length}）：` + r.unused.map((k) => JSON.stringify(k)).join(', '));
if (r.misses.length) {
  console.warn(`英文页漏翻（${r.misses.length}，已回落中文）：`);
  for (const m of [...new Set(r.misses)]) console.warn('  - ' + m);
  process.exitCode = 2;
} else {
  console.log('英文页可见文本无中文残留');
}
