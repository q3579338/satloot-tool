// 生成社交分享图 assets/og.png（1200×630）与 JSON-LD / manifest 用的 logo PNG（assets/logo-512.png、logo-192.png）。
// 一次性工具，产物进仓库；build.mjs 只负责把 assets/ 拷进 dist/。
// 用法：node tools/make-og.mjs
// 光栅化用 @resvg/resvg-js：本仓库没装的话借 bnbbang 那份（Windows 本机路径）。字体走系统字体（Segoe UI / Consolas）。
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'assets');

let Resvg;
for (const p of ['@resvg/resvg-js', 'D:/CLAUDE/bnbbang/server/node_modules/@resvg/resvg-js']) {
  try { ({ Resvg } = require(p)); break; } catch {}
}
if (!Resvg) throw new Error('缺 @resvg/resvg-js：npm i @resvg/resvg-js 或保证 D:/CLAUDE/bnbbang/server/node_modules 在');

const render = (svg, width) => Buffer.from(new Resvg(svg, { fitTo: { mode: 'width', value: width }, font: { loadSystemFonts: true, defaultFontFamily: 'Segoe UI' } }).render().asPng());

// ---- 站点强调色（与 index.html 的 CSS 变量一致：蓝紫渐变）----
const C = { bg: '#f7f8fa', ink: '#020617', muted: '#64748b', dim: '#94a3b8', line: 'rgba(226,232,240,.9)', brand: '#3b82f6', deep: '#2563eb', accent: '#8b5cf6', soft: '#eff6ff', softLine: '#bfdbfe', pill: '#dbeafe' };
const SANS = "'Segoe UI','Segoe UI Variable Text','Microsoft YaHei UI',Arial,sans-serif";
const MONO = "Consolas,'Cascadia Mono','Courier New',monospace";

const platforms = [['iOS', 'App Store'], ['Android', 'APK / store'], ['Windows', 'Windows 10 / 11'], ['macOS', 'macOS 12+']];
const tiles = platforms.map(([name, sub], i) => {
  const x = 736 + (i % 2) * 168, y = 186 + Math.floor(i / 2) * 92;
  return `<rect x="${x}" y="${y}" width="152" height="76" rx="14" fill="#ffffff" stroke="${C.softLine}"/>
<circle cx="${x + 26}" cy="${y + 38}" r="13" fill="${C.pill}"/><path d="M${x + 20} ${y + 38.5}l4 4 8-8" fill="none" stroke="${C.deep}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
<text x="${x + 50}" y="${y + 34}" font-family="${SANS}" font-weight="700" font-size="18" fill="${C.ink}">${name}</text>
<text x="${x + 50}" y="${y + 56}" font-family="${SANS}" font-size="13" fill="${C.muted}">${sub}</text>`;
}).join('\n');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<defs>
  <radialGradient id="a" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${C.brand}" stop-opacity=".22"/><stop offset="1" stop-color="${C.brand}" stop-opacity="0"/></radialGradient>
  <radialGradient id="b" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${C.accent}" stop-opacity=".20"/><stop offset="1" stop-color="${C.accent}" stop-opacity="0"/></radialGradient>
  <linearGradient id="g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${C.brand}"/><stop offset="1" stop-color="${C.accent}"/></linearGradient>
  <filter id="sh" x="-10%" y="-10%" width="120%" height="130%"><feGaussianBlur stdDeviation="14"/></filter>
</defs>
<rect width="1200" height="630" fill="${C.bg}"/>
<ellipse cx="1080" cy="40" rx="560" ry="320" fill="url(#a)"/>
<ellipse cx="160" cy="560" rx="520" ry="300" fill="url(#b)"/>
<text x="96" y="82" font-family="${MONO}" font-size="18" letter-spacing="5" fill="${C.deep}">SATLOOT TOOLS  ·  CLIENT DOWNLOADS</text>
<text x="94" y="182" font-family="${SANS}" font-weight="700" font-size="78" letter-spacing="-2.5" fill="${C.ink}">Markets in</text>
<text x="94" y="266" font-family="${SANS}" font-weight="700" font-size="78" letter-spacing="-2.5" fill="url(#g)">your pocket</text>
<text x="96" y="330" font-family="${SANS}" font-size="27" fill="${C.muted}">Market data, capital flows, monitoring and</text>
<text x="96" y="368" font-family="${SANS}" font-size="27" fill="${C.muted}">research tools, in sync across iOS, Android,</text>
<text x="96" y="406" font-family="${SANS}" font-size="27" fill="${C.muted}">Windows and macOS.</text>
<rect x="96" y="440" width="404" height="46" rx="23" fill="${C.soft}" stroke="${C.softLine}"/>
<text x="298" y="470" text-anchor="middle" font-family="${SANS}" font-weight="700" font-size="20" fill="${C.deep}">tool.satloot.com · official downloads</text>
<rect x="704" y="128" width="400" height="300" rx="22" fill="#0f172a" opacity=".16" filter="url(#sh)"/>
<rect x="700" y="118" width="400" height="300" rx="22" fill="#ffffff" stroke="${C.line}"/>
<text x="736" y="160" font-family="${SANS}" font-weight="700" font-size="20" fill="${C.ink}">One account, every client</text>
${tiles}
<line x1="736" y1="378" x2="1064" y2="378" stroke="${C.line}"/>
<text x="736" y="402" font-family="${SANS}" font-weight="600" font-size="15" fill="${C.muted}">Synced with the web app · same permissions</text>
<line x1="96" y1="546" x2="1104" y2="546" stroke="${C.line}"/>
<text x="600" y="586" text-anchor="middle" font-family="${MONO}" font-size="15" letter-spacing="4" fill="${C.dim}">MARKETS  →  FUNDS  →  MONITORING  →  RESEARCH   ·   DOWNLOAD ONLY FROM OFFICIAL LINKS</text>
</svg>`;

// 与 index.html 顶栏 logo 同款（favicon 是单色蓝底，这里用顶栏的蓝紫渐变版）
const LOGO = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3b82f6"/><stop offset="1" stop-color="#8b5cf6"/></linearGradient></defs><rect width="32" height="32" rx="8" fill="url(#lg)"/><path d="M8 21L13.2 13.8L17.2 17.4L24 9.2" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

fs.mkdirSync(OUT, { recursive: true });
const og = render(svg, 1200);
fs.writeFileSync(path.join(OUT, 'og.png'), og);
for (const s of [512, 192]) fs.writeFileSync(path.join(OUT, `logo-${s}.png`), render(LOGO, s));
console.log(`assets/og.png ${(og.length / 1024).toFixed(0)} KB, logo-512.png, logo-192.png`);
