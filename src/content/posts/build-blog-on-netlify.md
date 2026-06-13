---
title: "用 Astro 和 Netlify 搭建个人博客"
description: "梳理从模板选择、内容组织到自动部署的完整路径。"
pubDatetime: 2026-06-12T11:00:00.000+08:00
tags: ["Astro", "Netlify", "建站"]
draft: false
---

个人博客的技术选型不应该太重。对一个以写作为核心的网站来说，静态站点通常已经足够。

## 技术选择

这个博客采用 Astro 作为基础框架，文章使用 Markdown 管理，最终构建成静态文件并部署到 Netlify。

这样的组合有几个好处：

- 页面加载速度快
- 写作流程简单
- 部署成本低
- 后续迁移也相对容易

## 部署流程

项目推送到 GitHub 后，在 Netlify 中导入仓库，设置构建命令为 `npm run build`，发布目录为 `dist`。

之后每次推送代码，Netlify 都会自动构建并发布新版本。
