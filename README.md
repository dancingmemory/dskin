# DSKIN 🎮

**DeepSeek Harness（DSH）专用卡通像素皮肤插件** — 原始 UI 一律不动，
只做轻量像素点缀 + 一只会动的**像素宠物**。

宠物是一只黄色卡通电击鼠：会在屏幕底部来回散步、踏步、眨眼、
碰到边缘自动转身，鼠标悬停它会蹦跶，**点击它还会跳起来**。

> 纯皮肤插件：只改外观，不注入服务、不发事件、不触碰模型请求，
> 遵循官方 `dsh.client` 客户端插件契约，可热插拔、可卸载（卸载后完整还原）。

## 预览

| 亮色主题 | 暗色主题 |
| --- | --- |
| ![light](preview/light.png) | ![dark](preview/dark.png) |

> 预览为示意图，实际效果以浏览器渲染为准。

## 它做了什么（克制版）

- 🐭 **会动的像素宠物**：底部散步/踏步/眨眼/转身/悬停蹦跶/点击起跳
- ☀️ **轻柔天空背景**：浅蓝云朵（暗色：星空），只在应用窗口边缘露出
- 🖼️ **细像素窗框**：应用窗口加 2px 像素描边 + 轻硬阴影
- 🐭 **像素 favicon**：宠物头像；标题为 `DSKIN · DeepSeek Harness`
- ✅ **原始 UI 完全保留**：字体、按钮、输入框、滚动条、布局全部原生

## 安装

要求：DeepSeek Harness `dsh` CLI（或通过 `npx @deepseek-ai/dsh` 运行）。

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
dsh plugin --profile web add ./dskin-0.2.0.tgz
```

## 使用

1. 安装后**重启** `dsh web`（新插件行只在启动时进入加载图谱）：

```sh
dsh web
```

2. 打开 `http://127.0.0.1:3080` —— 左下角出现像素宠物，开始散步。
3. 想换回原版：`dsh plugin --profile web remove dskin`，重启即还原。

> 亮/暗主题跟随 DSH 的「外观」设置切换。

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
│       ├── index.ts      # apply(ctx) + PixelPet 状态机（idle/blink/walk/jump）
│       ├── mascots.ts    # 宠物 4 帧像素 SVG（生成自 scripts/gen-mascots.mjs）
│       └── dskin.module.css  # 样式，作用域于 body[data-dsh-dskin]
├── tests/apply.spec.ts   # apply/dispose 契约测试
└── scripts/              # 宠物帧与预览图生成器
```

### 皮肤契约（官方标准）

- 纯呈现层：不注入服务、不发 cordis 事件、不触碰模型请求
- 所有样式作用域在 `body[data-dsh-dskin]`（暗色 `body[data-dsh-dskin][data-ds-dark-theme]`）
- `apply(ctx)` 写什么就在 `ctx.effect` disposer 里收回什么：body 属性、宠物 DOM、favicon、标题
- CSS Modules 由 bundle 自动注入 `<style data-plugin-css>`，卸载时由加载器移除
- 不携带静态资源：宠物为内联 SVG

## 在 dsh 插件区索引到 DSKIN

本仓库已打上官方主题标签 **`dsh-plugin`**，可以在
[github.com/topics/dsh-plugin](https://github.com/topics/dsh-plugin) 下被索引到。
同时带有 `dsh`、`deepseek-harness` 等标签。

## 兼容性

- DeepSeek Harness `dsh` 0.1.0-rc.x（最新版 Web 客户端插件契约：`dsh.client` + `lib/client.js` +
  `window.__ModuleLoader__.load({ id, factory })`）
- 浏览器：Chrome / Edge / Safari 等现代浏览器

## 许可

MIT License — 见 [LICENSE](LICENSE)。
