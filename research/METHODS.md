# 观察官方 ARK Starmap 的可靠方法（排行）

本仓库**不逆向、不下载** `starmap.bundle.js` / `.dae` / `.wav`。
下面按「对复刻 HUD / 3D / 交互的可靠度」排序。Codegraph 对本仓库没有可用 MCP，未使用。

## 第一档：现在就该用（已用 + 本轮加码）

### 1. 官方公开 POST API（最高可靠 · 数据源）

同源、无鉴权即可复现：

| 端点 | 体 | 用途 |
|---|---|---|
| `/api/starmap/bootup` | `{}` | 90 星系 + 135 隧道 |
| `/api/starmap/star-systems/{CODE}` | `{}` | 星系天体 |
| `/api/starmap/celestial-objects/{CODE}` | `{}` | 单天体 |
| `/api/starmap/find` | `query=` | 搜索（≥3 字，匹配名称不是 code） |
| `/api/starmap/routes/find` | `departure` + `destination` + 可选 `size`/`avoid` | 航线 |

社区封装（只对照端点，不引入依赖；**不能**当 schema）：

1. [Dymerz/RSI-Scraper](https://github.com/Dymerz/RSI-Scraper) — Python 原样回 `resultset`；航线误发 `ship_size`
2. [koo04/GoScrapeRSI](https://github.com/koo04/GoScrapeRSI) — Go 移植，struct 把 `position_x` 错绑成 `{x,y,z}`，隧道丢 `code`

精确字段表：`research/MAPPING.md`，运行时：`src/data/official.ts`。
3. [robertsspaceindustries/sc-starmap](https://github.com/robertsspaceindustries/sc-starmap) — 第三方 TS JSON dump（作者 ari-party，**不是** CIG 源码）
4. [StarCitizenWiki/API](https://github.com/StarCitizenWiki/API) — wiki + 游戏文件，管道不同
5. [agabani/StarCitizenApi](https://github.com/agabani/StarCitizenApi) — 2017 C# SDK

本仓库脚本：`scripts/capture-starmap.mjs`、`capture-combos-*.mjs`、`verify-routes.mjs`。

### 2. 按官方 class 的无头浏览器（最高可靠 · HUD）

对 `#starmap-application` 点真实按钮，拦截 `/api/starmap/*`。
关键选择器：`button.launch`、`.sm-galaxy-display-tab`、`.sm-affiliations`、`.sm-tunnels`、`.sm-scanners`、`.sm-search-tab`、`.sm-routes-tab`。

**坑：** 必须先 `GLX` 再点 DISPLAY，否则系统视图里点 DISPLAY 打不开星系条。
**坑：** 不要点 `sm-initial-scene`（父节点也含 ENTER FULL SCREEN 文本）。

脚本：`scripts/traverse-official-leftover.mjs`、`scripts/traverse-official-combos.mjs`。

### 3. 官方第一方教程 / 工程 comm-link（最高可靠 · 手势）

| 来源 | 锁定事实 |
|---|---|
| [YouTube: Star Citizen - Star Map](https://www.youtube.com/watch?v=4eAD0liNeis)（CIG 2015） | **右键**天体 → `INSPECT` / `INFORMATION` / `ROUTING` / `BOOKMARK`。INSPECT 拉近。点空白关闭。星系过滤 S/M/L + 阵营 + LRS。系统视图也可右键任意天体。点 sensors 看 lifeforms。书签需登录。 |
| [The ARK Starmap](https://robertsspaceindustries.com/en/comm-link/spectrum-dispatch/15000-The-ARK-Starmap) | REST、顺序加载、Three.js、Turbulent + Gamerizon |
| [Q&A: Starmap](https://robertsspaceindustries.com/en/comm-link/engineering/15011-Q-A-Starmap) | 航线 AU = **跃迁点之间**的常规/量子飞行距离，**不含**跃迁段。2015 时 WASD 还是「考虑中」。3D 左键旋转、2D 左键平移。不公开源码。Starmap 非实时；SkyLine 才是实时层。 |
| [JS Montreal 2016 幻灯](https://speakerdeck.com/turbulent/starmap-journey-through-a-webgl-project) | UI（Marionette / Web Audio / 全屏 / 路由）与 Viewer（WebGL / 鼠标 / REST 缓存）拆分。黑洞是程序化 quad shader。~20k LOC / 4 个月。 |
| [starcitizen.tools/Starmap](https://starcitizen.tools/Starmap) | Unity 原型 → WebGL |
| Comm Arts 访谈 | Control **disk**；星系切换像虫洞 |

**不要**把游戏内 Skyline（F2）手势抄到网页：游戏里右键是平移，双右键缩小。

## 第二档：补漏用

4. **全屏 computerUse** — 人手势（右键、拖、WASD）。失败模式：卡在系统视图、窗口模式搜索被裁切、点错 splash。
5. **官方 CSS class 清单** — `research/tokens/design-tokens.json`：`sm-lz-open`、`sm-system-display-tab`、`sm-search-autocomplete`、`sm-go`、`sm-next-segment`。有 class ≠ 已观察到可见文案。
6. **社区传感器设定** — NID / J&P / TSAS 解释 DISPLAY 三个扫描器，不是 HUD 铬件。
7. [Synchrones/ARK_Starmap](https://github.com/Synchrones/ARK_Starmap) — Unity 离线复刻（3 star）。只作对照，**不要**抄它的右键拖平移 / `J` 开关隧道 / `Esc` 退选；那些是作者自加，不是官网。

## 不要用

- 下载 / 反编译 `starmap.bundle.js`、官方 mesh、logo、音效
- 游戏内 Quantum 教程当网页 HUD
- 名字带 Starmap 但无关的 GitHub（子域名工具、CV 等）
- 未登录就当书签 API 可用（`ErrNotAuthenticated`）

## 本轮未测组合（按教程 + CSS 排出，必须重录）

1. 右键空白 / 星系球 / 恒星 / 行星 / 跃迁点 → 是否出现 INSPECT 菜单
2. 点 INSPECT → `camera=` 是否拉近
3. 系统视图 `sm-system-display-tab` 里有什么
4. 搜索框输入后 **Enter**（窗口模式必须 Enter 才出表）
5. 空搜索框点 **autocomplete** 最近访问
6. ROUTES：GOSS+TERRA → **CALCULATE >** 等 ≥3s；再切 S/M/L；找 shortest / leastjumps / View route / `sm-next-segment`
7. 罗盘：星系 vs 系统；CAMERA 3D/2D；中键
8. 圆盘 MAN-MADE / VOICE-OVERS / OPEN（`sm-lz-open`）
9. **先点 canvas 再** WASD / 方向键 / +/- / Esc / 2 / 3，记 `camera=`
10. 双击跃迁点（此前未进入目标星系）

记录目录：`research/capture/official-combos/`。  
本轮结果见同目录 `SUMMARY.md`：空白右键无菜单；已标注星系（SOL）右键也无浮动菜单、仅高亮；搜索要 Enter；星系 DISPLAY 只有传感器+摄像机。
