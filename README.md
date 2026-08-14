# DSKIN 🎮

**DeepSeek Harness 专用卡通像素皮肤插件** — 一键把 DSH Web 变成像素游戏机。

晴天娃娃蓝天空、像素云朵、厚描边硬阴影游戏面板、Press Start 2P 像素字体、
蓝色标题栏上的像素鲸，以及底部状态栏里喷火的卡通像素鼠吉祥物。
暗色主题是缀满像素星星的夜空。

> 纯皮肤插件：只改外观，不注入服务、不发事件、不触碰模型请求，
> 遵循官方 `dsh.client` 客户端插件契约，可热插拔、可卸载（卸载后完整还原）。

## 预览

| 亮色主题 | 暗色主题 |
| --- | --- |
| ![light](preview/light.png) | ![dark](preview/dark.png) |

> 预览为像素风示意图，实际效果以浏览器渲染为准。

## 功能

- 🐳 **像素鲸标题栏**：经典 DeepSeek 鲸鱼 + `DSKIN · DeepSeek Harness` 像素标题
- 🐭 **卡通像素鼠状态栏**：底部游戏 HUD，黄色电击鼠吉祥物 + `DSKIN / PLAYER 1 / PIXEL MODE ON / ♥♥♥`
- ☀️ **卡通天空背景**：太阳 + 像素云朵（暗色：星空 + 像素星星）
- 🕹️ **硬阴影游戏面板**：3px 墨线描边、6px 无模糊硬阴影、直角窗口
- 🔤 **Press Start 2P 像素字体**：内嵌 data-URI webfont（OFL 协议），无需联网加载
- 🧩 **完整 token 重映射**：`--dsw-static-*` / `--dsw-alias-*` / `--dsw-specific-*` 全部换成卡通糖果色
- 🎨 按钮/输入框/滚动条/对话框/菜单/代码块全部像素化，focus 焦点环为像素黄
- 🌙 亮/暗双主题，跟随 DSH 系统主题；尊重 `prefers-reduced-motion`

## 安装

要求：DeepSeek Harness `dsh` CLI（已安装或通过 `npx @deepseek-ai/dsh` 运行）。

### 方式一：GitHub 安装（推荐）

```sh
dsh plugin --profile web add github:dancingmemory/dskin
```

> pnpm ≥ 10 首次安装 git 依赖时可能拒绝执行构建脚本，dsh 会提示你把
> `allowBuilds: dskin: true` 写进 profile 的 `pnpm-workspace.yaml`，
> 按提示操作后重新运行上面的命令即可。

### 方式二：本地源码安装

```sh
git clone https://github.com/dancingmemory/dskin.git
cd dskin && pnpm install   # prepare 会自动构建 lib/
dsh plugin --profile web add .
```

### 方式三：tarball / npm 安装

```sh
pnpm pack
dsh plugin --profile web add ./dskin-0.1.0.tgz
```

## 使用

1. 安装后**重启** `dsh web`（新插件行只在启动时进入加载图谱）：

```sh
dsh web
```

2. 打开 `http://127.0.0.1:3080`，皮肤自动生效——顶部出现像素标题栏，
   底部出现卡通像素鼠状态栏。
3. 想换回原版皮肤：`dsh plugin --profile web remove dskin`，重启即还原。

> 注意：亮/暗主题跟随 DSH 的「外观」设置切换。

## 开发

```sh
pnpm install        # 安装依赖并触发 prepare 构建
pnpm build          # tsdown：lib/index.js (host) + lib/client.js (browser bundle)
pnpm test           # vitest：apply/dispose 契约测试
```

### 目录结构

```
├── package.json          # dsh.bundle 补丁 + dsh.client 清单（官方插件契约）
├── cordis.patch.yml      # bundle 补丁层：向 web 图谱插入 ui-skin-dskin 行
├── skin.json             # 皮肤元数据
├── tsdown.shared.ts      # 官方 clientBundle 构建预设的独立移植（自包含）
├── web-platform.ts       # 官方平台模块表（bundle external 判定）
├── src/
│   ├── index.ts          # host 侧入口（无操作）
│   └── client/
│       ├── index.ts      # apply(ctx)：皮肤装配与收回应约
│       ├── mascots.ts    # 像素鲸 / 像素鼠内联 SVG（生成自 scripts/gen-mascots.mjs）
│       └── dskin.module.css  # 全部样式，作用域于 body[data-dsh-dskin]
├── tests/apply.spec.ts   # apply/dispose 契约测试
└── scripts/              # 吉祥物与预览图生成器
```

### 皮肤契约（官方标准）

- 纯呈现层：不注入服务、不发 cordis 事件、不触碰模型请求
- 所有样式作用域在 `body[data-dsh-dskin]`（暗色 `body[data-dsh-dskin][data-ds-dark-theme]`）
- `apply(ctx)` 写什么就在 `ctx.effect` disposer 里收回什么：body 属性、chrome DOM、favicon、标题
- CSS Modules 由 bundle 自动注入 `<style data-plugin-css>`，卸载时由加载器移除
- 不携带静态资源：字体 data-URI、吉祥物内联 SVG

## 在 dsh 插件区索引到 DSKIN

本仓库已打上官方主题标签 **`dsh-plugin`**，可以在
[github.com/topics/dsh-plugin](https://github.com/topics/dsh-plugin) 下被索引到。
同时带有 `dsh`、`deepseek-harness` 等标签。

## 兼容性

- DeepSeek Harness `dsh` 0.1.0-rc.x（最新版 Web 客户端插件契约：`dsh.client` + `lib/client.js` +
  `window.__ModuleLoader__.load({ id, factory })`）
- 浏览器：Chrome / Edge / Safari 等现代浏览器

## 许可

MIT License — 见 [LICENSE](LICENSE)。内嵌字体 Press Start 2P 遵循 SIL Open Font License 1.1。
