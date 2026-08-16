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

## 克隆已接上的操作

开场（可跳过）→ 90 星系银河（阵营色 + 可筛选隧道）→ 点星系进入 → 恒星/行星/卫星/空间站/小行星带/黑洞/POI/跳跃点 → 悬停「控制盘 >」→ 信息/航线/书签盘 → 设为起终点 → 本机书签 → 跳跃点跃迁闪白进入邻系 → 搜索任意字串排列组合 → 航线 BFS（与官方隧道图一致）并在银河画线 → DISPLAY 阵营/SML/热力 → 2D/3D → WASD/方向键/+/-/Esc/2/3/F → `?location=&camera=&tab=&view=` 同步

## 仍须对照官网补的现场

- 官方跳跃点「穿过去」的精确手势（双击 / Inspect / 自动）
- DISPLAY 热力是否真是网格而非光晕
- 登录态书签 JSON
- 官方键盘是否 WASD（部分环境只响应鼠标）
