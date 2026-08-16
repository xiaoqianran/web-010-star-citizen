# 克隆深度真人遍历（2026-08-16）

脚本：`scripts/traverse-deep.mjs` + `traverse-tail.mjs`

## 点名进入（搜索 → 点精确行）

| 查询 | 点中 | 焦点徽章 |
| --- | --- | --- |
| Tamsa | Tamsa | TAMSA（黑洞信息卡：Stellar / 不宜居） |
| Stanton | Stanton | STANTON |
| ARK | The ARK | THE ARK（Space Station，宜居，人口 3） |
| Olisar | Port Olisar | PORT OLISAR（Starbase，经济 6，威胁 3） |
| Cellin | Cellin | CELLIN |
| Aaron | Aaron Halo | AARON HALO |
| Cassel | Cassel | CASSEL |
| Vanduul | Vanduul Attack | VEGA（POI 所在系） |

## 控制盘 / 书签 / 跃迁

- Cassel → 书签页加入 → 书签表出现 Cassel / 行星
- 航线页「设为起点」打开航线面板
- 搜索 `Goss - Terra` → 控制盘「跃迁至 TERRA」→ 焦点变为 **TERRA**（真实换系）

## 航线输入组合（与官方 API 一致）

- GOSS→TERRA 1 跳 Through Terra
- GOSS→SOL 5 跳 Through Terra
- GOSS→STANTON 2 跳 Through Terra
- TAYAC→GOSS 1 跳 Through Goss
- TAMSA→SOL 5 跳 Through Banshee
- foo/Cassel/空 → Invalid object specified

## DISPLAY

- 生命体扫描：银河出现绿色光晕（非网格）
- 经济 / 犯罪：可单独打开
- 2D：URL 出现 `view=2d`；键盘 WASD/+/- 改变 `camera=`
- 汉堡菜单：首页 / 探索 / 星图 +「双星」（GOSS）

## 搜到的空/宽结果

- `Port Renatus` 当时本地索引没有 LZ（已补 `SOL.LZS.PORTRETANUS`）
- `black` / `xxxnomatch` = 0
- `jump/star/planet/...` 本地子串顶格 32
