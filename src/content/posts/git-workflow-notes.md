---
title: "Git 工作流的几点记录"
description: "团队协作中 Git 使用的一些实用经验。"
pubDatetime: 2026-06-09T11:00:00.000+08:00
tags: ["Git", "技术", "效率"]
draft: false
---

Git 用得好不好，直接影响团队协作效率。

## commit message 要有意义

```
fix: 修复营收报表筛选条件不生效的问题
feat: 新增校区维度对比看板
docs: 更新数据口径文档
```

好的 commit message 能让 `git log` 变成一份项目变更日志。

## 分支策略

小团队用 feature branch + main 就够了：

1. 从 main 拉 feature 分支
2. 开发完成后提 PR
3. Code review 通过后合并到 main
4. 删除已合并的 feature 分支

## .gitignore 要提前配好

项目初始化时就把 `.gitignore` 配好，避免把 `node_modules`、`.env`、构建产物提交进去。

## 结语

Git 不只是版本控制工具，也是团队沟通的载体。
