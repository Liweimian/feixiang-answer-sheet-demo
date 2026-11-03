# 飞象智能制卡 Demo

一个可运行的 Web 桌面原型，演示从模拟试卷解析到答题卡编辑、校验和发布的完整流程。

## 终端与预览

- Web 桌面端，推荐浏览器宽度不低于 1280px。
- 默认入口：`/`
- 过稿占位模式：`/?mode=review`

## 本地启动

```bash
npm install
npm run dev
```

## 构建与预览

```bash
npm run build
npm run preview
```

## 分享方式

1. 最快方式：执行 `npm run build`，将 `dist/` 打包发送。项目已设置相对资源路径；建议通过任意静态文件服务打开。
2. 发链接：将 `dist/` 拖入 Netlify，或使用 Vercel 部署。

## 目录说明

- `src/pages/`：页面编排。
- `src/components/`：制卡流程与编辑器组件。
- `src/features/answer-sheet/`：领域类型和状态转换。
- `src/data/`：原创模拟试卷与规则包数据。
- `src/services/`：可替换的 mock 服务边界。
- `src/design-system/`：飞象页面级 token、骨架与 zoom 适配。
- `AGENT-HANDOFF.md`：跨对话产品决策与边界。

## 当前 Mock

试卷上传与解析、自动保存、PDF生成、打印扫描、鉴权、权限、协作和埋点均为本地演示状态，不代表生产能力。
