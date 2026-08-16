# 穷尽遍历记录

对照：ARK Starmap 9.536.0  
克隆：本仓库 Vite 复刻  
原则：先观察再复刻。不进仓库：官方 `.dae` / `.wav` / `starmap.bundle.js` / Logo 源文件。

## 已锁定的公开现象

### 镜头 URL `camera=a,b,c,d,e`

| 分量 | 现场含义 |
| --- | --- |
| a | 仰角相关（星系默认约 10；近天体可到 ~170） |
| b | 水平方位角，左键拖动改变，有惯性 |
| c | 距离/缩放。~0.002 星系，~0.006–0.02 跳跃标签，~0.001 近天体，>0.05 银河 |
| d, e | 目标偏移；星系视图常为 0，进入天体后出现小数 |

`location` 为层级码（`GOSS` 或 `GOSS.STARS.GOSSA`）。tab 走路径 `"" | search | bookmarks | routes`。  
搜索点选 STAR SYSTEM 锁定 `camera=60,0,0.002,0,0`；罗盘系统主视角仍是 `10,102.98,0.002,0,0`。

### 搜索 `/api/starmap/find`

- `Terra` 25 天体，`Stanton` 27，`Sol` 36，`Pyro` 28
- `Cassel` 仅行星 Cassel；`ArcCorp`/`Crusader`/`Hurston` 各 1 颗行星（不是星系）
- `jump` / `black` / `xxxnomatch` 成功但空
- `a` / `UE`：`success=0`（过短）
- `star` → JusticeStar Satellite（人造）
- `planet` → 原行星盘（小行星带）
- `belt` 48 条带；`station` 9 座人造设施；`moon` → Broken Moon
- 天体类型全集：STAR / PLANET / SATELLITE / JUMPPOINT / ASTEROID_BELT / ASTEROID_FIELD / MANMADE / BLACKHOLE / POI

### 航线 `/api/starmap/routes/find`

- GOSS→TERRA / HELIOS：1 跳；GOSS→STANTON：2；GOSS→SOL：5（Through Terra）
- GOSS→GOSS：成功但无段
- foo→bar：`ErrInvalidObject`
- 舰船键是 **`ship_size`**（不是 `size`）。规则：隧道尺寸 ≥ 舰船尺寸。GOSS→TERRA 默认/S/M = 1 跳；L = Through Tayac、2 跳
- 135 条隧道全部 `direction=B`，尺寸 L79 / M36 / S20
- 2026-08-16 再探测：TERRA→PYRO（S 隧道）S/M/L = 1 / 2 Through Stanton / 4 Through Stanton；STANTON→PYRO（M 隧道）L = 3 Through Nyx；CATHCART→KILIAN L = 12/3 Through Nexus；NUL→CROSHAW L = 5 Through Centauri；BANSHEE→YULIN L = `OK` 但无段；`ship_size=X` = `ErrValidationFailed`

### 其它

- 书签未登录：`ErrNotAuthenticated`
- TAMSA 恒星类型为 `BLACKHOLE`（`shader_data.blackhole`）
- VEGA 有 POI `Vanduul Attack`
- Stanton 有卫星 + Port Olisar 等 MANMADE + Aaron Halo
- DISPLAY 远程扫描器色：生命绿 `#9be80d`、经济金 `#efc22f`、犯罪橙 `#ed7346`
- `localStorage`：`sm_sound_fx` / `skipAcknowledgment` / `skipInfo`

## API combo sweep 2

- `Tamsa` 命中黑洞恒星；`ARK` → The ARK（TAYAC.STATION.THEARK）+ 误伤 Markahil 恒星
- `Olisar` / `Port Olisar` / `Port` → Port Olisar；`Port` 另有 `LZ` 类型 Port Renatus
- `Yela` → 卫星 + Ring of Yela 带
- `Vanduul` → POI Vanduul Attack；`Banu` → Trise Flotilla
- `Io`（2 字母）、空串、空格：`ErrValidationFailed`（最短约 3 字符）
- `GOSS.STARS.GOSSA` / `THEARK` 完整码搜索为空；`Goss A` 可以
- 航线只接受星系代号/名称：`Cassel→Terra` = `ErrInvalidObject`
- 空起终点：`ErrValidationFailed`
- 表单键 `size=S/M/L` 不改变 GOSS→TERRA / GOSS→SOL 结果（官方忽略 `size`）
- TAMSA→SOL 5 跳 Through Banshee；VEGA→TERRA 4 跳 Through Bremen

## 克隆真人遍历（headless Chrome → `research/capture/clone-pass/REPORT.json`）

开场三屏可点通。进入 GOSS 后 URL 即为 `location=GOSS&camera=10,102.98,0.002,0,0`。拖动后 `camera` 五元组会变。

| 搜索 | 条数 | 现象 |
| --- | --- | --- |
| Terra / Stanton / Sol | 29–32 | 子串命中跳跃点偏多（已改为星系/精确名优先） |
| Cassel / Olisar / Cellin / Goss A / microTech | 1 | 与官方一致 |
| Tamsa | 6 | 含黑洞恒星 |
| ARK | 4 | 含 The ARK |
| Vanduul / Banu | 1 | POI / Trise Flotilla |
| black / xxxnomatch | 0 | 与官方空结果一致 |
| jump/star/planet/moon/station/belt | 旧版会顶格 32 | 现已改为只匹配名称，与官方一致 |

航线：GOSS→TERRA 1 跳 Through Terra；GOSS→SOL 5 跳；GOSS→GOSS 空；foo/Cassel/空 → Invalid object specified。与官方 API 一致。

点 Cassel：控制盘 + 信息卡（宜居/尺寸/UEE/人口 7/经济 9/威胁 3）。DISPLAY 12 个开关可点；全部关掉阵营后银河变空（符合过滤）。2D/键盘/GLX 可切换。

## 克隆已接上的操作

开场（可跳过）→ 90 星系银河（阵营色 + 可筛选隧道）→ 点星系进入 → 恒星/行星/卫星/空间站/小行星带/黑洞/POI/跳跃点 → 悬停「控制盘 >」→ 信息/航线/书签盘 → 设为起终点 → 本机书签 → 跳跃点跃迁闪白进入邻系 → 搜索任意字串排列组合 → 航线 BFS（与官方隧道图一致）并在银河画线 → DISPLAY 阵营/SML/热力 → 2D/3D → WASD/方向键/+/-/Esc/2/3/F → `?location=&camera=&tab=&view=` 同步

## API combo sweep 3（摘要；完整数字见下一节）

- `Renatus` / `Port Renatus` → **LZ** `SOL.LZS.PORTRETANUS`（不在 star-systems 列表里）
- `The ARK` / `The Ark` 命中空间站；`Fair` 误伤卫星 Fairo；`Warn` → Vanduul Attack
- `ARC-L2` / `Lagrange` / `L1`–`L5` / `uee` / `Xi'an`：空或校验失败
- **S 级隧道** TERRA–PYRO、NUL–CROSHAW、CATHCART–KILIAN、BANSHEE–YULIN：`size=S` 与 `size=L` 路径完全相同（**不挡 S 隧道**）
- 远距对 **shortest ≠ leastjumps**（`shortest` 优化 `flight_distance`，跳数可以更多）。详见下一节与 `SUMMARY3.json`。
- 已抓天体详情：Tamsa 黑洞、The ARK、Port Olisar、Cellin、Luna、VEGA POI

## 克隆深度遍历

见 `research/capture/clone-deep/SUMMARY.md`。已点通：Tamsa 黑洞卡、The ARK、Port Olisar、Cellin、Aaron Halo、书签往返、**控制盘跃迁 GOSS→TERRA**、航线五组官方数字、生命体绿光晕、2D URL、键盘改 camera。换系时旧 CSS2D 标签会残留，已在场景重建时摘掉。

## 官方页真人点击（窗口模式）

- 悬停天体出现 `CONTROL DISC >`；单击出选择环与控制盘。双击跳跃点**不会**穿过去。
- 进入邻系可靠办法：控制盘操作，或改 URL `?location=STANTON&system=STANTON`。
- GOSS：双星 + Cassel / Goss I / Goss III + 四向跳跃点（Terra / Tyrol / Tayac / Osiris）。
- STANTON：单星、Hurston、ARC-L2、Stanton - Pyro、偏橙星云。
- 窗口模式下搜索输入框会被底栏裁切，官方自己也难打字；组合结果以 API sweep 为准。
- DISPLAY / 键盘 / 书签页这次窗口模式没点完。

## API combo sweep 3

- `LZ` / `L1`–`L5`：`ErrValidationFailed`「Must have at least 3 characters」
- `Fair` 命中卫星 Fairo（`PYRO.MOON.FAIRO`），不是 Fair Chance；`Fair Chance` 空
- `ARC-L2` / `Lagrange` / `POI` / `neutron` / `pulsar` / `black hole` / `Xi'an` / `XIAN` / `uee` / `UEE` 成功但空（阵营码与类型词不搜；空格 `black hole` 也不匹配黑洞）
- `The ARK` / `The Ark` 大小写不敏感，只中 The ARK（不再误伤 Markahil）
- Port Renatus 类型 `LZ`，码拼写 `SOL.LZS.PORTRETANUS`；Delamar 类型 `PLANET` 但码 `NYX.ASTEROID.DELAMAR`
- `Warn` 子串命中 `VEGA.POI.WARN01`（designation `VANDUUL-WARN-01`）
- 四条 S 隧道对（TERRA–PYRO / NUL–CROSHAW / CATHCART–KILIAN / BANSHEE–YULIN）：`size=L` 与 `size=S` 仍 1 跳同段，**不挡 S 隧道**
- 远距才分叉：`shortest` 优化 `flight_distance`，跳数可**多于** `leastjumps`（SOL–NYX 10 vs 4；STANTON–TAMSA 11 vs 7 Through Nyx / Through Pyro；KILIAN–PYRO 4 vs 3 且 first_jump 不同）。CROSHAW–SOL / TERRA–NYX 不分。无 `BANU` 星系码，Banu 用 TRISE–SOL（10 vs 7）
- 天体详情：TAMSA 恒星 `BLACKHOLE`+`shader_data.blackhole`；The ARK `habitable` Space Station；WARN01 `appearance=WARNING_RED` 长设定文；Luna `PLANET_BROWN`

## API combo sweep 4

公开 `find` 又穷尽了 139 组（含 90 个官方星系名）+ 26 组航线 + 12 个天体详情。

### 新搜到的现象

- 着陆区 `LZ`（不在 `star-systems` 列表里）：`Port Renatus` `SOL.LZS.PORTRETANUS`、`Levski` `NYX.LZS.LEVSKI`、`Lorville` `STANTON.LZS.LORVILLE`、`Area18`/`A18` `STANTON.LZS.AREA18`、`Orison` `STANTON.LZS.ORISON`。天体接口：`distance=0`，挂在行星 `parent_id` 上。
- 游戏里后加的站点名在旧星图里不存在：`Grim Hex` / `New Babbage` / `Baijini` / `Tressler` / `Port Tressler` / `Dumpers Depot` / `Javelin` 成功但空。`Everus` 误伤行星 Severus。
- 名称子串：`protoplanetary` 7 条带；`cluster` 7 个小行星场；`flotilla` 5 座人造设施；`halo` → Aaron Halo；`ring` 12 条环；`the` → The Red God / The ARK / The Coil。
- 种族/类型词仍空：`Human` `Tevarin` `Kr'Thak` `Claimed` `BLACKHOLE` `Jump` `JUMP` `Landing`。
- `ab`（2 字符）`ErrValidationFailed`；`xxx` / `***` / `123` 成功但空。
- 西安星系官方显示名带括注：`Ē'aluth (Eealus)`、`Kai'pua (Kayfa)`、`Yā'mon (Hadur)`、`La'uo (Virtus)`。用英文短名 `Kayfa` 搜得到天体但 **0 个星系行**（星系码仍是 `KAYFA`）。
- `K.ap'a'ri (Khabari)` / `Malkail (Markahil)` 命中星系行但 0 天体。

### 航线

- 又一批 shortest ≠ leastjumps：KINS–SOL 8/7、GEDDON–TRISE 10/8、EEALUS–SOL 9/6、KAYFA–TERRA 5/4、VIRGIL–SOL 9/4、GOSS–TAMSA 9/8、HELIOS–SOL 6/5、OBERON–TAMSA 7/6、HADUR–SOL 8/7、RIHLAH–GOSS 5/4。
- 表单键 `size=S/M/L` 不改 SOL–NYX / STANTON–TAMSA 路径；`ship_size=L` 会改（SOL–NYX 12 / 55.072）。
- 表单多写 `avoid=DAVIEN` / `avoid=TERRA` / `mode=` / `type=` **官方直接忽略**，仍走原路。
- `BANU` 不是星系码：`ErrInvalidObject`。
- `flight_distance` = 中转星系里「到达跳跃点 → 离开跳跃点」的球面欧氏距离之和（出发/到达星系为 0）。本地用 270 个跳跃点坐标重建，14 组官方对完全一致。

## 克隆已接上（对照 sweep 3–4）

- 搜索：少于 3 字符空；只匹配名称/称号，不匹配天体码（`jump` / `GOSS.STARS.GOSSA` 与官方一样空）。
- 航线：同时给出 shortest / leastjumps，面板切换会改银河高亮。
- 五个 LZ 注入对应星系场景（贴在行星上）。
- 指南针点击回到官方默认 `camera=10,102.98,0.002,0,0`。

## 克隆 leftover 真人遍历

`scripts/traverse-leftover.mjs` → `research/capture/clone-leftover/REPORT.json`

搜索与官方一致：`a`/`UE`/`jump`/`GOSS.STARS.GOSSA` = 0；`star` → JusticeStar；`the` 3；`halo` 1；`flotilla` 5；五个 LZ 各 1 且能点进 LEVSKI / AREA18 / ORISON。

航线面板切换与官方数字一致：SOL–NYX 10 / 4；STANTON–TAMSA 11 / 7 Through Nyx / Through Pyro；KILIAN–PYRO 4 / 3 Through Ellis / Through Davien。

## 官方页补充（窗口 / 全屏点击）

- 悬停 `CONTROL DISC >`。盘右页：INFORMATION / ROUTING / BOOKMARK。ROUTING：SET AS DEPARTURE / SET AS DESTINATION。全屏点过的盘上**没有** Jump Through；换系可靠办法仍是搜索点星系或改 URL。
- 搜索表：`N ITEMS FOUND`，列 NAME | TYPE | INFORMATION，行内 `BOOKMARK >`。`Cassel` → `CASSEL IV (GOSS)` 行星。`Terra` 界面约 20 行（API 25）。
- 书签空文案：`NO BOOKMARKS FOUND WITH THOSE FILTERS`。
- 人口扫描器现场见过绿色方格网，角标 `// POPULATION`（不是光晕）。克隆已改成方格网。
- 右方向键会切底栏页；W 在书签页聚焦时会打开书签，**不能当成 WASD 飞镜头的证据**。
- 汉堡是 RSI 站点菜单（OUR GAMES / SHOP / EXPLORE…），不是星图内页。

## API combo sweep 5

- 航线端点只认星系码/名称：`GOSS` / `Goss` / `Terra` / `Kayfa`（大写即 `KAYFA`）成功。
- 天体显示名一律 `ErrInvalidObject`：`Goss A` / `GOSS A` / `Cassel` / `Levski` / `Area18` / `The ARK`。官方盘 SET AS DEPARTURE 填入 `GOSS A` 后 Calculate 空白，与此一致。
- 天体完整码可以：`GOSS.STARS.GOSSA`→`TERRA` 与 `GOSS`→`TERRA` 同为 1 跳。
- `find` 分页字段 `page` / `offset` / `start` / `limit` / `count` / `max` **全部忽略**，Terra 仍 25 条。界面约 20 行是 UI 截断。
- HUD 词 `OPEN` / `voice` / `manmade` / `scanner` / `population` / `economy` / `crime` / `lifeforms` / `display` / `bookmark` / `route` 成功但空。
- 西安短名搜得到天体、0 星系行：`Kayfa` 9、`Eealus` 15、`Hadur` 14、`Virtus` 13。
- 又一批 shortest ≠ leastjumps：VIRGIL–TAMSA 9/7、PYRO–TAMSA 7/6、VEGA–TAMSA 7/6、TRISE–SOL 10/7。
- 已补抓全部 POI / BLACKHOLE / 可见 MANMADE 天体详情。

## 官方 leftover 脚本（puppeteer）

开场按钮是 `.launch-fullscreen`（ENTER FULL SCREEN）与 `.launch`（Or enter in window mode），不是 `sm-` 容器。第一轮误点 `sm-initial-scene` 整页，卡在欢迎屏。已改为点最短匹配按钮。

DISPLAY 在银河视图类名是 `sm-galaxy-display-tab`，星系视图是 `sm-system-display-tab`。先前代理一直停在 GOSS 星系，所以复选框从未出现。

### 银河 DISPLAY 已上屏（2026-08-16 窗口模式）

底栏图标条，不是侧栏复选框列表：

| 组 | 官方英文 | 控件 | 默认 |
| --- | --- | --- | --- |
| FACTIONS | UEE / BANU / VANDUUL / XI'AN / DEVELOPING / UNCLAIMED | checkbox 色点 | 全开 |
| JUMP TUNNELS | SMALL / MEDIUM / LARGE | checkbox 圆环 | **全关** |
| SENSORS | POPULATION / ECONOMY / THREAT | **radio**（内部值 lifeforms / economy / crime） | 全关 |
| CAMERA | 3D / 2D | radio | 3D |

打开隧道后银河出现橙色弧线。扫描器互斥。书签未登录空文案是 **`YOU HAVE NO BOOKMARKS YET.`**（带筛选才是 `NO BOOKMARKS FOUND WITH THOSE FILTERS`）。书签筛选：`STAR SYSTEM` / `CELESTIAL BODY`。

银河默认镜头 `camera=10,0,0.4,0,0`（与星系 `10,102.98,0.002,0,0` 不同）。

航线底栏：`DEPARTURE` / `DESTINATION` / `SHIP SIZE` 三圆 / `CALCULATE >`。GOSS 与 TERRA 能写入输入框。计算后的结果表这次窗口高度里没截到。盘上 ROUTING 现场是 **BACK / SET AS DEPARTURE / SET AS DESTINATION / AVOID**，仍无 Jump Through。

## 观察方法排行（2026-08-16）

完整清单见 `research/METHODS.md`。本轮选用前三档：

1. 公开 POST API（已穷尽 find/routes/bootup）
2. 按官方 class 的 puppeteer（`traverse-official-combos.mjs` 重录未测组合）
3. 第一方教程：CIG 2015 [Star Map](https://www.youtube.com/watch?v=4eAD0liNeis) 明确 **右键 → INSPECT / INFORMATION / ROUTING / BOOKMARK**；Q&A 确认航线 AU 不含跃迁段。

社区仓库只对照端点：Dymerz/RSI-Scraper、koo04/GoScrapeRSI（Go struct 会写错 `position_x` / 隧道 `code`，见 `research/MAPPING.md`）。Synchrones/ARK_Starmap 是 Unity 复刻，不抄其自加键位。

## 官方未测组合重录（2026-08-16）

见 `research/capture/official-combos/SUMMARY.md`。

- 银河空白处右键：无上屏菜单。INSPECT 节点在 DOM 里但像素是空的，直到控制盘真正打开。
- 银河已标注星系（SOL）右键：同样无浮动菜单，仅绿色高亮；双击不进入系统。
- 搜索必须 **Enter**：Terra 26 条；`jump` = `NO OBJECTS FOUND WITH FILTERS.`；Levski 类型 **LANDING ZONE**；行名 `CASSEL IN GOSS`。
- 点 Terra 星系：`?selection=TERRA` → `?location=TERRA&camera=60,0,0.002,0,0`。
- **星系 DISPLAY**（`sm-system-display-tab`）只有 SENSORS + CAMERA，没有阵营/隧道。
- 在 Terra 里 CALCULATE 等 3s：底栏能填 GOSS/TERRA，结果表仍未进 DOM。
- 左键拖动会写 `camera=`；本次按键时 URL 在 `/routes` 上没有五元组。

## 仍须对照官网补的现场

- 登录态书签 JSON（未登录只有 `ErrNotAuthenticated`）
- 官方键盘在 3D 画布聚焦时的 WASD（这次按键时焦点还在书签搜索框，camera 查询未变）
- 搜索框是否要回车才出 `N ITEMS FOUND` 表（窗口模式只见到底栏输入）。`jump` + Enter 官方空文案是 `NO OBJECTS FOUND WITH FILTERS`。空输入会下拉最近访问（Terra / GOSS / Sol / Stanton / Cassel）。
- 画布聚焦时 W 会抬镜头；焦点在搜索框时 W 会变成最近词。星系视图点 DISPLAY 不会出银河那条图标栏。
- 航线 Calculate 之后的结果表 / shortest 开关（字段已能写入 GOSS/TERRA，表未截到）
- 控制盘穿跃动画（现场仍无 Jump Through，克隆保持闪白换系）
