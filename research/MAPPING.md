# 官方字段映射（对照社区抓取器）

权威源是本仓库已抓的公开 POST JSON，不是第三方 SDK。

对照仓库（只读字段名，不引入依赖、不抄代码）：

- [Dymerz/RSI-Scraper](https://github.com/Dymerz/RSI-Scraper) — Python，原样返回 `resultset`
- [koo04/GoScrapeRSI](https://github.com/koo04/GoScrapeRSI) — Go 移植，自行重写 struct，**会丢字段**

两端点双方都包了，和我们一致：

| 官方 | 体 |
|---|---|
| `POST /api/starmap/bootup` | `{}` |
| `POST /api/starmap/star-systems/{CODE}` | `{}` |
| `POST /api/starmap/celestial-objects/{CODE}` | `{}` |
| `POST /api/starmap/find` | `query=` |
| `POST /api/starmap/routes/find` | `departure` + `destination` + 可选 `ship_size`（`S`/`M`/`L`） |

## 社区封装哪里不准

| 官方 JSON | RSI-Scraper | GoScrapeRSI | 本仓库 |
|---|---|---|---|
| `systems[].position_x/y/z` | 原样保留 | 错绑成 `Position{x,y,z}`，反序列化后恒为 0 | `position: [x,y,z]` |
| `tunnels[].entry.code` / `designation` / `distance` / `lat/lon` | 原样 | `TunnelPoint` 只有 `star_system_id` 和臆造的 `celestial_object_id` | 用 `code` + `star_system_id` |
| `affiliation[]` | 原样 | 压成 `affiliation_id` / `affiliation_name` | `affiliation[].code` + 官方色 |
| `subtype` 对象 `{id,name,type}` | 原样 | 写成 `[]SubType` | 单对象 |
| `routes/find` 的舰船键 | 发 `ship_size` | 发 `ship_size` | **`ship_size` 会改路**：舰船只能走 `tunnel.size >= ship_size` 的隧道。`size` 被忽略。2026-08-16 探测：GOSS→TERRA `ship_size=L` 变为 Through Tayac、2 跳；S 级隧道对（TERRA–PYRO 等）在 L 舰下会绕路或无路 |
| `data.config`（LRS 色、星野、隧道外观） | 不读 | 不读 | `src/data/official.ts` |
| `frost_line` / `habitable_zone_*` / `shader_data` | 透传但不用 | 类型里没有 | 系统视图片环 + 主光色 |
| `find` 对象带 `star_system.code` | 原样 | `map[string]any` | 搜索行 `于 {星系}` |

结论：这两个仓库**不能**当精确 schema。Python 侧适合当「端点清单」；Go 侧的 struct **不能**当映射表。

## bootup 顶层

`success` / `code` / `msg` / `data.{config,systems,tunnels,species,affiliations}`

`config.longRangeScanner`：人口 `colorD1=#9be80d`，经济 `colorL1=#efc22f`，威胁 `colorC1=#ed7346`。  
`affiliations`：`uee #48bbd4` / `BANU #ffce17` / `VNCL #bd002d` / `XIAN #52c231` / `DEV #ca922d` / `UNC #f6851f`。  
`species`：HUMAN / BANU / XIAN / TEVARIN / KRTHAK / VNCL（HUD 阵营条不展示种族）。

## 天体（star-systems / celestial-objects）

`id code designation name type appearance distance latitude longitude size habitable parent_id show_label show_orbitlines sensor_* shader_data subtype affiliation age axial_tilt orbit_period fairchanceact texture children population`

球面（航线距离用无符号经度，与官方 `flight_distance` 对齐）：`x = d·cos(lat)·cos(lon)`，`y = d·sin(lat)`，`z = d·cos(lat)·sin(lon)`。  
系统视图像素：官方引擎取 `lon = −longitude`（社区镜像笔记；平方距离不变）。  
银河位置：官方 `obj3d.position.set(position_x/100, position_z/100, −position_y/100)`。克隆保持 0.18 倍率以配合已锁定的 `camera=0.4` 取景，只对齐轴向（含 −y）。

航线结果表 leftover 列宽（窗口模式未算出时仍在 DOM）：`sm-label` 200px | `sm-jumps` 70px | `sm-distance` 125px | `sm-selection` 145px；`sm-list-region` 约 76px 高，一行摘要。表单：`sm-departure-region` / `sm-destination-region` / `sm-ship-size` / `sm-go`。Q&A：距离单位是 AU。

## 航线段

`type` = `system` | `jump`；另有 `system_code` / `object_code` / `segment_type` `F|J` / `segment_distance` / `is_departure` / `is_destination`。

运行时入口：`src/data/official.ts`。校验：`pnpm verify:mapping`。
