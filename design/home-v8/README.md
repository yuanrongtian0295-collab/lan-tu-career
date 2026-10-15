# 首页 v8 精修

2026-09-11。以 v7 实际页面为基线，保留既有街球漫画风格，不重做人物、姓名、赛季和总评艺术字。

## 新资源

- `public/assets/home-v8/paper-panel.png`：细深蓝描边、克制缺口、白纸留白、右下浅蓝网点。用于状态、下一场、动态三个次要面板。
- 生成源：`E:\Codex\.codex\generated_images\01a00e76-e7a7-7b20-bc0a-2a3ce82f3f1c\exec-3e52805b-173c-4cd7-b3cc-0dd657b13b2b.png`。
- 原图 1619×971，真实 RGBA，中心 alpha 254；导出 1208×608，482171 bytes，alpha 0–255，四角 alpha=0，有效品红像素 0。
- `scripts/prepare_home_panel_v8.ps1` 复用 v7 包装类，只裁透明留边、等比缩小，不绘制美术。v7 新增 LibraryOnly 参数，不改变默认处理。
- 标题、进入比赛、导航选中图继续使用 home-v7；74 和姓名背景等继续使用 home-v6，旧图未删除。

## 设计决定

- 资源与状态栏移出缩放插画层。资源按钮高 44px，恢复图标语义，金额显示为 42万，title/aria-description 保留 420,000。
- 状态标签 14px、数值 23px。动态正文 14px，最多两行。短屏滚动而非缩小字。
- 下一场按“标题/赛季 → 日期/场地 → 左右队伍/VS → 主按钮”分组。队徽、缩写、全名、战绩对称。
- 主要 CTA 高 60px，移除不含业务信息的口号，保留原生成艺术字。390×844 时按钮 bottom=768，nav top=776，首屏完整显示。
- 英雄区高 544px，状态 top=434px；姓名 40px 及字体不变，总评标签仍以左上角为锚点 scale(.85)，数字图片不缩小。
- 桌面导航与 390px 首页壳等宽，仅限 homepage，不改变其他页面。

## 生成提示词

```text
Use case: ui-mockup. Asset type: ONE reusable blank paper panel raster asset for an existing bright blue/yellow street-basketball comic mobile game interface. Generate a brand-new asset, not a screenshot and not an edit. A white paper panel with a restrained hand-cut slightly slanted silhouette, aspect ratio 5:3, front-facing perfectly flat 2D. Large pure white quiet center occupying 92% of the paper. Very faint natural paper fibers only. Elegant thin dark navy outline (about 0.4% of paper width), tiny short hard blue shadow (under 0.6% width), a few exceptionally subtle pale-blue halftone dots confined to one bottom corner. Mostly straight edges with only 2-3 small angular nicks total, no repeated sawteeth. Keep a broad rectangular safe content area. Sophisticated sports-comic editorial sticker treatment, NOT sterile sci-fi, NOT grungy, NOT photoreal desk paper. The whole silhouette occupies 90% of canvas with clean transparent padding on all sides. Output true RGBA TRANSPARENT background outside the paper; four corners must have alpha=0. The paper itself is opaque true white. No text, no numbers, no labels, no icons, no yellow tab, no outlines inside, no extra floating strokes, no heavy border, no dramatic torn edges, no checkerboard or colored backdrop, no scene or props. This is a restrained secondary surface below much louder yellow comic title stickers.
```
