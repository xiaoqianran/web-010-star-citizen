# web-010-star-citizen

学习复刻 [ARK Starmap](https://robertsspaceindustries.com/en/starmap/bookmarks?location=GOSS&camera=10,102.98,0.002,0,0) 的前置仓库。

当前阶段：**先抓取、先对照、先部署学习台**。三维场景还没写。界面用语默认中文，专有名词保持英文。

这是粉丝学习项目，与 Cloud Imperium Games / Roberts Space Industries 无关。

## 本地

```bash
pnpm install
pnpm dev
```

重新抓取公开 API（不含官方模型与音频）：

```bash
pnpm capture
```

## 部署

正式预览走 **Vercel**（单页路由带 `location` / `camera` 查询参数）：

https://web-010-star-citizen.vercel.app

仓库已连接到 Vercel，合并到 `main` 后会自动部署。GitHub Actions 只做 `pnpm build` 检查。本环境无法开启 GitHub Pages，也无法写入仓库 Secrets。

不要把 Vercel token 写进仓库。本地部署：

```bash
npx vercel --prod --yes --token "$VERCEL_TOKEN"
```

## 目录

- `src/i18n/zh.ts` — 中文界面用语
- `research/I18N_POLICY.md` — 译 / 不译规则
- `research/copy/en-source.json` — 官方英文原文
- `research/capture/` — 公开 API 快照
- `research/tokens/` — 从官方 CSS 抽出的色板与类名
- `scripts/capture-starmap.mjs` — 抓取脚本
