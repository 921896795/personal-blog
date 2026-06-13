# Personal Blog

一个基于 AstroPaper 思路定制的个人静态博客，适合部署到 Netlify。

## 本地开发

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
npm run preview
```

项目脚本会自动关闭 Astro telemetry，避免本地构建时写入系统配置目录。

## 写文章

在 `src/content/posts/` 下新增 Markdown 文件：

```md
---
title: "文章标题"
description: "文章摘要"
pubDatetime: 2026-06-12T10:00:00.000+08:00
tags: ["随笔"]
draft: false
---

正文内容。
```

`draft: true` 的文章不会出现在生产站点中。

## Netlify 部署

- Build command: `npm run build`
- Publish directory: `dist`
- Node version: `22`
