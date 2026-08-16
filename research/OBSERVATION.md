# 观察记录（前置）

对照站点：https://robertsspaceindustries.com/en/starmap/bookmarks?location=GOSS&camera=10,102.98,0.002,0,0  
对照版本：ARK Starmap `9.536.0`

## 技术骨架

- 壳页：`#starmap-application` + `starmap.bundle.js` + `main.css`
- 字体：Electrolize / Orbitron / starmap-icons
- 3D：Three.js + Collada `.dae`
- 路由 tab：`"" | search | bookmarks | routes`
- 查询：`location`（层级码）+ `camera`（五元组）+ 偶发 `selection`（搜索点选瞬间）
- 搜索点选 STAR SYSTEM 飞入：`camera=60,0,0.002,0,0`（Terra 锁定）
- 罗盘 / 系统主视角：`10,102.98,0.002,0,0`（GOSS 现场）
- 银河主视角 / 无查询首访：`10,0,0.4,0,0`
- 搜索点选瞬间偶发 `selection=`，随后换成 `location=`
- 无 WebSocket；`localStorage` 仅 `sm_sound_fx`、`skipAcknowledgment`、`skipInfo`

## 已打通的公开 API

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| POST JSON | `/api/starmap/bootup` | 90 星系 + 135 隧道 + 种族 + 阵营 + 渲染 config |
| POST JSON | `/api/starmap/star-systems/{CODE}` | 单星系天体 |
| POST JSON | `/api/starmap/celestial-objects/{CODE}` | 单天体详情 |
| POST form | `/api/starmap/find` `query=` | 搜索 |
| POST form | `/api/starmap/routes/find` `departure` + `destination` + 可选 `ship_size` | `shortest` / `leastjumps`；`size` 键无效 |
| POST | `/api/starmap/bookmarks/find` | 未登录：`ErrNotAuthenticated` |
| POST | `/api/starmap/bookmarks/{code}/toggleBookmark` 或 `toggleAvoid` | 需登录 |

完整快照在 `research/capture/`（117 文件，0 错误）。  
资源路径清单（不下载体）在 `research/tokens/asset-manifest.json`。

## HUD 已确认文案

开场：Stellar Cartographics → 全屏提示 → Nick Croshaw 引言 → ARK 设定 → Explore starmap  
左侧：Back / Galaxy / Star System / Jump point  
右侧：Search / Bookmarks / Routes / Display  
Disc：Inspect / Information / Routing / Bookmark（leftover DOM，选中后天体控制盘才上屏）。Inspect 只拉近镜头；Information 打开右上信息卡。Set As Departure/Destination；Avoid；Population / Economy / Threat。9.536.0 窗口模式右键空白或银河星系标签**不会**画出浮动菜单（2015 教程的右键菜单已不在现行页）。  
Display：阵营、Jump tunnels（S/M/L）、Long-Range Scanner、Heatmap Scanner、2D/3D

## 明确不进仓库的东西

官方 `.dae` / `.wav` / Logo 源文件 / `starmap.bundle.js` 整包。只保留路径、字段和界面结构，供学习复刻。
