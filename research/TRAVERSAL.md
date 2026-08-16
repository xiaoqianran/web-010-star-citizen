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
- 舰船 S/M/L 对 GOSS→TERRA 均接受
- 135 条隧道全部 `direction=B`，尺寸 L79 / M36 / S20

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
- S/M/L 不改变 GOSS→TERRA / GOSS→SOL 结果
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
| jump/star/planet/moon/station/belt | 32（上限） | 本地子串比官方宽，便于穷尽 |

航线：GOSS→TERRA 1 跳 Through Terra；GOSS→SOL 5 跳；GOSS→GOSS 空；foo/Cassel/空 → Invalid object specified。与官方 API 一致。

点 Cassel：控制盘 + 信息卡（宜居/尺寸/UEE/人口 7/经济 9/威胁 3）。DISPLAY 12 个开关可点；全部关掉阵营后银河变空（符合过滤）。2D/键盘/GLX 可切换。

## 克隆已接上的操作

开场（可跳过）→ 90 星系银河（阵营色 + 可筛选隧道）→ 点星系进入 → 恒星/行星/卫星/空间站/小行星带/黑洞/POI/跳跃点 → 悬停「控制盘 >」→ 信息/航线/书签盘 → 设为起终点 → 本机书签 → 跳跃点跃迁闪白进入邻系 → 搜索任意字串排列组合 → 航线 BFS（与官方隧道图一致）并在银河画线 → DISPLAY 阵营/SML/热力 → 2D/3D → WASD/方向键/+/-/Esc/2/3/F → `?location=&camera=&tab=&view=` 同步

## API combo sweep 3

- `Renatus` / `Port Renatus` → **LZ** `SOL.LZS.PORTRETANUS`（不在 star-systems 列表里）
- `The ARK` / `The Ark` 命中空间站；`Fair` 误伤卫星 Fairo；`Warn` → Vanduul Attack
- `ARC-L2` / `Lagrange` / `L1`–`L5` / `uee` / `Xi'an`：空或校验失败
- **S 级隧道** TERRA–PYRO、NUL–CROSHAW、CATHCART–KILIAN、BANSHEE–YULIN：`size=S` 与 `size=L` 路径完全相同
- 远距对（SOL–NYX、PYRO–TAMSA、VEGA–TAMSA、TRISE–SOL…）**shortest 与 leastjumps 仍始终相同**
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

## 仍须对照官网补的现场

- DISPLAY 热力是网格还是光晕
- 登录态书签 JSON
- 官方键盘是否 WASD（窗口模式未测完）
