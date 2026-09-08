# SPEC：satloot 工具站「客户端下载」落地页

## 目标
产出一个**单文件、自包含**的静态落地页 `index.html`，部署到 `http://tool.satloot.com/`。
版面结构、视觉语言、交互节奏对标参考站 `https://io.traderax.net/announce/mobile-app`
（Tailwind 浅色系 + 蓝紫渐变 mesh 风格），但**文案、品牌、图片全部用我们自己的**——
不复制对方的营销原文、品牌名（"极致社区"）、App 截图和下载链接。

## 硬性约束
1. **单文件**：`index.html` 一个文件跑起来就是完整页面。CSS 内联在 `<style>`，JS 内联在 `<script>`。
2. **零外部依赖**：不许 CDN 引 Tailwind / 字体 / 图标库 / 任何 JS 框架。手写 CSS。
   （唯一例外：Google Fonts 可以不用，直接用系统字体栈。）
3. 图片一律用**内联 SVG** 画（手机外壳 mockup、平台图标、装饰图形），不许引外链图片。
4. 中文站，`<html lang="zh-CN">`。
5. 响应式：375px / 768px / 1280px 三档都要好看，body 绝不横向滚动。
6. 深浅色：页面主体是**浅色设计**（对标参考站）。加 `prefers-color-scheme: dark` 的深色适配，
   用 CSS 变量做，别让暗色模式下变成一坨白。

## 设计令牌（从参考站量出来的，照抄这套）
```
--bg:            #f7f8fa      /* body 底色 */
--surface:       #ffffff      /* 卡片 */
--ink:           #020617      /* 大标题 slate-950 */
--ink-body:      #171717      /* 正文 */
--muted:         #64748b      /* slate-500 次要文字 */
--line:          rgba(226,232,240,.8)   /* 卡片描边 slate-200/80 */
--brand:         #3b82f6      /* blue-500 */
--brand-deep:    #2563eb      /* blue-600 */
--accent:        #8b5cf6      /* violet-500 */
```
- 字体栈：`ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif`
- H1：`font-weight:900; letter-spacing:-.045em;` 桌面 72px / 平板 60px / 手机 36px，行高约 1.0
- 卡片：`border-radius:24px; border:1px solid var(--line); background:#fff;`
  `box-shadow:0 18px 50px -35px rgba(15,23,42,.5);`
  hover：上移 4px + 描边转 blue-200 + 阴影加重，`transition:.3s`
- 下载按钮卡：`border-radius:16px; min-height:80px;` 白底、slate-200 描边、
  `box-shadow:0 12px 35px -18px rgba(15,23,42,.35)`，hover 上移 2px
- **Hero / CTA 大区块**：`border-radius:2rem;` + `border:1px solid rgba(191,219,254,.6)`，
  背景是双层 radial mesh：
  `radial-gradient(circle at 75% 15%, rgba(59,130,246,.20), transparent 25%),`
  `radial-gradient(circle at 20% 75%, rgba(139,92,246,.18), transparent 30%), #fff`
  （第三个区块把两个圆心位置对调，做视觉呼应）
- 小标签（eyebrow）：大写英文、字号 12px、`letter-spacing:.18em`、颜色 blue-600

## 页面结构（从上到下，共 5 段）

### 0. 顶栏
左侧品牌「satloot 工具站」+ 一个内联 SVG 标记；右侧两个次要链接（`工具总览` / `联系我们`，
先用 `#` 占位）。粘顶 `position:sticky; top:0`，半透明白底 + `backdrop-filter:blur(12px)` + 底部细线。

### 1. Hero（左文右图）
- eyebrow：`SATLOOT TOOLS`
- H1 两行，第二行用蓝紫渐变文字（`background-clip:text`）：
  「把行情装进口袋 / 决策不再等电脑」
- 副标题一句：行情、资金、监控与研究工具，在 iOS、Android、Windows、macOS 客户端保持同步。
- **4 个下载按钮卡**（2×2 网格，手机端单列），每个卡：左侧内联 SVG 平台图标，右侧三行——
  上标小字 / 主标题 / 版本号：
  | 上标 | 主标题 | 版本 | href |
  |---|---|---|---|
  | Available for | 下载 iOS 版 | v0.1.0 | `#ios` |
  | Get it on | 下载 Android 版 | v0.1.0 | `#android` |
  | Windows 10 / 11 | 下载 PC 版 | v0.1.0 | `#windows` |
  | macOS 12+ | 下载 Mac 版 | v0.1.0 | `#macos` |
  （链接先占位，之后替换成真实地址；给每个 `<a>` 加 `data-platform` 属性方便后续接线）
- 按钮下方一行三个小徽章（带对勾 SVG）：`官方下载地址` / `网页数据同步` / `账号权限一致`
- 右侧：**内联 SVG 画两台手机**，一前一后错位叠放、轻微倾斜，屏幕里用色块和线条示意
  行情列表 / K 线 / 数据卡片。手机外壳用深色 slate-900 圆角矩形 + 高光描边。
  右下角浮一个小胶囊：`MULTI-PLATFORM` + `iOS · Android · Windows · Mac`

### 2. 功能特性区
- eyebrow `FEATURED CAPABILITIES` + H2「为移动决策精选的功能」+ 一句副标题
- **一排筛选按钮**：`全部 / 行情动态 / 研究工具 / 交易管理`（药丸形，选中态蓝底白字）。
  点击用原生 JS 过滤下方卡片（`data-cat` 属性 + 淡入淡出），默认「全部」。
- **6 张功能卡**（3 列 → 平板 2 列 → 手机 1 列），每张：
  英文 eyebrow / 中文标题 / 两行描述 / 底部一条灰色小字「网页能力原生同步」+ 一个装饰角标 SVG。

  | 分类 data-cat | eyebrow | 标题 | 描述 |
  |---|---|---|---|
  | 行情动态 | MARKET PULSE | 多维行情中心 | 持仓量、成交量、资金费率与实时价格一屏聚合，交易所和市场随手切换。 |
  | 研究工具 | SMART RADAR | 资金与叙事雷达 | 资金流向、板块轮动与策略候选同步网页端，异动一眼看清。 |
  | 行情动态 | LIVE SIGNAL | 极速市场消息 | 交易所公告与市场快讯集中推送，省掉在多个平台之间来回切换。 |
  | 研究工具 | MASTER MIND | 交易心法库 | 按作者、专栏和关键词检索交易文章，原生图文阅读，随时复盘。 |
  | 研究工具 | CYCLE LAB | 历史规律 | 复盘 BTC 周期、山寨波段与资金轮动，图表与统计口径完整同步。 |
  | 交易管理 | LIVE TRADING | 实盘与账户 | 授权用户可查看实盘曲线、成交记录与账户权益，权限与网页一致。 |

### 3. 「不是简化版网页」区（左图右文，和 Hero 反向）
- 左：内联 SVG 单台手机 mockup（画个"发现页"样式：搜索条 + 宫格图标 + 列表）
- 右：eyebrow `ONE ACCOUNT · EVERY PLATFORM`
  + H2 两行「不是简化版网页 / 而是完整的客户端体验」（第二行渐变文字）
  + 一段说明文字
  + **4 条带对勾图标的要点**（两列）：
    `原生界面与设备交互` / `账号权限实时同步` / `行情与研究数据同源` / `重要功能持续更新`
- 这个区块也用 mesh 渐变大圆角容器，圆心位置和 Hero 对调

### 4. 底部 CTA
- 居中 H2「现在，随时掌握市场」+ 一句副标题
- 再放一次那 4 个下载按钮卡（同样式，一排四个 → 手机单列）
- 底下一行小字提示：请仅通过本页面提供的官方地址下载

### 5. 页脚
细线分隔，左侧版权 `© 2026 satloot`，右侧几个占位链接。再加一行**免责声明**小字：
本站展示的数据与指标来源于公开互联网整理，可能存在延迟或口径差异，仅供参考，不构成投资建议。

## 交互细节
- 所有卡片、按钮 hover 有 transform + shadow 过渡，`transition: all .3s ease`
- 滚动进场动画：用 `IntersectionObserver` 给各 section 做一次性淡入上移（`opacity/translateY`），
  必须包 `@media (prefers-reduced-motion: reduce)` 关掉。
- 功能筛选按钮：纯 JS，无框架。切换时卡片用 CSS 过渡，别直接 `display:none` 硬闪。
- 页面必须在**禁用 JS** 时依然完整可读（筛选默认全部展示、动画默认可见）。

## SEO / Meta
- `<title>客户端下载 · satloot 工具站</title>`
- `<meta name="description">`、`og:title`、`og:description`、`og:type=website`
- inline SVG favicon（`<link rel="icon" href="data:image/svg+xml,...">`）

## 验收标准
1. `index.html` 单文件，双击能打开，无控制台报错、无 404 请求。
2. 375 / 768 / 1280 三个宽度下无横向滚动、无元素重叠、文字不溢出。
3. 筛选按钮点四个分类都对，计数正确。
4. 暗色模式下可读（不是纯白刺眼）。
5. 文件体积 < 200KB。
