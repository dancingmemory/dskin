<p align="center">
  <img src="assets/banner.jpg" alt="DSKIN banner" width="100%">
</p>

<h1 align="center">🐭 DSKIN · 像素宠物派对 🐳</h1>

<p align="center">
  <b>DeepSeek Harness（DSH）专用卡通像素皮肤插件</b><br>
  <i>A cartoon pixel skin plugin made exclusively for the DeepSeek Harness (DSH) Web GUI</i>
</p>

<p align="center">
  <a href="https://github.com/topics/dsh-plugin"><img src="https://img.shields.io/badge/dsh--plugin-✅%20官方插件区-blue" alt="dsh-plugin"></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/dancingmemory/dskin" alt="license"></a>
  <a href="https://github.com/dancingmemory/dskin"><img src="https://img.shields.io/github/v/tag/dancingmemory/dskin?label=version" alt="version"></a>
  <img src="https://img.shields.io/badge/平台-Web%20UI-4a90d9" alt="platform">
</p>

---

**📖 简介 / Intro**

> **DSKIN** 是 DeepSeek Harness（DSH）的轻量化卡通像素皮肤插件：
> 界面零改动，只在屏幕底边养几只小像素宠物。
>
> *DSKIN is a lightweight cartoon pixel skin plugin for DeepSeek Harness
> (DSH): the UI stays untouched — tiny pixel pets live at the screen edge.*

**界面零改动，不挡视线。** DSKIN 不加外框、不改背景、不动布局——它只做一件事：
**在屏幕底边养一群小像素宠物。**

两只黄色电击鼠 + 一条小鲸鱼 + 一只**可切换的像素小猫**（🐱 大橘 / 小白 / 玄猫 / 花猫）。
宠物都很小、贴底边，完全不影响使用；点一下会跳，悬停会蹦跶。
右下角的**爪爪按钮 🐾** 可以随时切换 4 只小猫，选择会被记住。

> **纯皮肤插件**：不注入服务、不发事件、不触碰模型请求。遵循官方
> `dsh.client` 客户端插件契约，可热插拔、可卸载，卸载后完整还原。

## ✨ 特性 / Features

| | |
| --- | --- |
| 🐱 **4 只可切换小猫** | 大橘 / 小白 / 玄猫 / 花猫，右下角 🐾 爪爪按钮切换，选择自动记住 |
| 🐭 **多宠物** | 2 只像素鼠 + 1 条像素鲸 + 1 只小猫，各自独立行动、随机速度 |
| 👟 **会动的宠物** | 踏步动画 / 眨眼 / 到边转身 / 悬停蹦跶 / 点击起跳 / 像素影子 |
| 📏 **不挡视线** | 宠物小、贴底边、无外框无背景，界面完全原生 |
| 🐱 **像素 favicon** | 当前小猫头像 + 产品标题 `DSKIN · DeepSeek Harness` |
| ✅ **零侵入** | 字体、按钮、输入框、滚动条、布局全部原生 |

## 🖼️ 预览 / Previews

| 亮色主题 | 暗色主题 |
| --- | --- |
| ![light](preview/light.png) | ![dark](preview/dark.png) |

## 📦 安装 / Install

要求：DeepSeek Harness `dsh` CLI（或 `npx @deepseek-ai/dsh`）。

### 方式一：GitHub 安装（推荐）

```sh
dsh plugin --profile web add github:dancingmemory/dskin
```

> pnpm ≥ 10 首次安装 git 依赖可能拒绝执行构建脚本，dsh 会提示你把
> `allowBuilds: dskin: true` 写进 profile 的 `pnpm-workspace.yaml`，重跑即可。

### 方式二：源码安装

```sh
git clone https://github.com/dancingmemory/dskin.git
cd dskin && pnpm install
dsh plugin --profile web add .
```

### 方式三：tarball

```sh
pnpm pack && dsh plugin --profile web add ./dskin-0.3.0.tgz
```

## 🚀 使用 / Usage

```sh
dsh web        # 安装后重启，让新插件行进入加载图谱
```

打开 `http://127.0.0.1:3080`——像素宠物已经在草地上散步了。
想还原：`dsh plugin --profile web remove dskin` 再重启。

## 🔍 发现 / Discoverability

本仓库已打上官方 **`dsh-plugin`** 主题标签，可在
[github.com/topics/dsh-plugin](https://github.com/topics/dsh-plugin) 下被索引到，
另带 `dsh` / `deepseek-harness` / `pixel-art` 等标签。

## 🛠️ 开发 / Development

```sh
pnpm install   # 安装依赖 + prepare 自动构建
pnpm build     # tsdown: lib/index.js (host) + lib/client.js (browser bundle)
pnpm test      # vitest: apply/dispose 契约测试
```

```
├── package.json          # dsh.bundle 补丁 + dsh.client 清单（官方插件契约）
├── cordis.patch.yml      # 向 web 图谱插入 ui-skin-dskin 行
├── skin.json             # 皮肤元数据
├── tsdown.shared.ts      # 官方 clientBundle 构建预设的独立移植（自包含）
├── web-platform.ts       # 官方平台模块表（bundle external 判定）
├── src/client/
│   ├── index.ts          # apply(ctx) + PixelPet 状态机（idle/blink/walk/jump）
│   ├── mascots.ts        # 宠物 8 帧像素 SVG（scripts/gen-mascots.mjs 生成）
│   └── dskin.module.css  # 样式，全部作用域于 body[data-dsh-dskin]
├── tests/apply.spec.ts   # apply/dispose 契约测试
├── assets/               # logo + banner 宣传图
└── scripts/              # 宠物帧 / 预览图 / 宣传图生成器
```

**皮肤契约（官方标准）**：纯呈现层；样式全部挂在 `body[data-dsh-dskin]`
（暗色 `[data-ds-dark-theme]`）；`apply(ctx)` 写什么就在 `ctx.effect` disposer
里收回什么；CSS Modules 由加载器注入/移除；不携带静态资源（宠物为内联 SVG）。

## 📄 许可 / License

MIT License。Logo 与宠物像素画为原创；参考了 DeepSeek 鲸鱼吉祥物形象。
