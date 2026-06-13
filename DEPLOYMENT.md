# 部署与维护指南

## 1. 首次本地运行

```bash
cd personal-blog
npm install
npm run dev
```

浏览器打开终端里显示的本地地址，通常是 `http://localhost:4321`。

## 2. 修改站点信息

主要改这两个文件：

- `src/config.ts`：站点标题、作者、导航、社交链接
- `astro.config.mjs`：把 `site` 改成你的 Netlify 域名或自定义域名

例如：

```js
site: "https://your-name.netlify.app"
```

## 3. 写新文章

在 `src/content/posts/` 里新增 `.md` 文件：

```md
---
title: "文章标题"
description: "文章摘要"
pubDatetime: 2026-06-12T10:00:00.000+08:00
tags: ["标签"]
draft: false
---

正文内容。
```

## 4. 发布到 Netlify

把项目推送到 GitHub 后：

1. 登录 Netlify
2. 选择 Add new site
3. 选择 Import an existing project
4. 连接 GitHub 仓库
5. Build command 填 `npm run build`
6. Publish directory 填 `dist`
7. 部署完成后，把生成的 Netlify 域名更新到 `astro.config.mjs` 和 `src/config.ts`

## 5. 常用命令

```bash
npm run dev      # 本地开发
npm run build    # 生产构建
npm run preview  # 预览构建结果
```

项目脚本已经默认设置 `ASTRO_TELEMETRY_DISABLED=1`。
