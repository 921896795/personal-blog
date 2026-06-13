---
title: "Astro 和 Next.js 的选择"
description: "不同场景下选不同框架，没有银弹。"
pubDatetime: 2026-06-10T14:00:00.000+08:00
tags: ["Astro", "前端", "技术"]
draft: false
---

选框架之前，先想清楚你要做什么类型的网站。

## 静态内容为主：选 Astro

博客、文档站、营销页、作品集——这些以内容为核心的网站，Astro 是更好的选择：

- 默认零 JS，页面加载极快
- Islands Architecture 按需加载交互组件
- 内容集合（Content Collections）管理 Markdown 非常舒服
- 构建速度快，部署简单

## 交互密集：选 Next.js

如果你在做 SaaS、后台管理系统、需要大量客户端交互的应用，Next.js 更合适：

- React 生态成熟，组件库丰富
- SSR / ISR / Streaming 等渲染策略灵活
- API Routes 可以做全栈

## 我的选择

这个博客用 Astro，因为它就是纯内容站。未来如果要做带用户系统的工具类产品，可能会考虑 Next.js。

## 结语

框架是工具，不是信仰。选适合当前场景的就好。
