# 首页下半区 v7

2026-09-10。只修改首页下半区与总评标签缩放，不涉及捏脸/3D、存档或其他页面玩法。

## 设计与接入

- `lower-concept.png`：下半区方向稿，队徽为占位符；实际接入已有真实队徽和游戏数据。
- `prompts.md`：实际生成提示词；使用内置 image_gen。
- CSS：`src/party-theme.css` 末尾 Home v7 区块。保留上半区布局、姓名字体/40px、7/4 数字图片。
- 总评标签 `scale(.85)`，`transform-origin: top left`，原 top=1px、left=6px、width=108px 不变。
- 小屏允许滚动，动态正文保持 12px；CTA 76px 高，底部导航 68px。
- 固定的“下一场”“最新动态”“进入比赛”为真实生成的图片文字；战绩、数值、球员/球队名、日期、动态内容仍可实时变化。
- 不是整图切割覆盖页面：空白面板适配容器比例，标题及文字图片保持原比例；真实数据和响应式布局与概念图有必要差异。

## 素材清单

文件位于 `public/assets/home-v7/`，旧 v6 素材均保留。

| 文件 | 尺寸 | 用途 | 最终生成源文件 |
| --- | --- | --- | --- |
| status-panel.png | 808×458 | 三行状态底板 | exec-3b5bac57-5ed8-41d5-b48c-c395bb490d62.png |
| match-panel.png | 1208×436 | 比赛白纸底板 | exec-43c98a21-00a8-426d-95f3-3a88fe53b052.png |
| feed-panel.png | 1208×413 | 动态底板/伤病提示 | exec-1c6b673e-66bb-46fb-9cae-fbf6ac61db44.png |
| next-title.png | 608×264 | 下一场黄色标题 | exec-4aa9eca0-e77c-47b4-9441-1b6ecc7c2877.png |
| feed-title.png | 708×260 | 最新动态蓝色标题 | exec-dbe7ca46-64c3-4e8c-97d5-036ce938a78e.png |
| cta-panel.png | 1208×234 | 黄色按钮底板 | exec-028416da-8962-47eb-9a2a-18e630dd374e.png |
| nav-selected.png | 408×307 | 导航选中贴纸 | exec-89f1a23e-0f51-473f-9d89-6bd1821233c9.png |
| play-wordmark.png | 708×190 | 进入比赛艺术字 | exec-82c76a1d-0908-4e9c-b150-366f1fce264a.png |

所有源文件位于 `E:\Codex\.codex\generated_images\01a00e76-e7a7-7b20-bc0a-2a3ce82f3f1c\`。

## 透明处理

`scripts/prepare_home_lower_v7.ps1` 仅进行背景清理、边界裁切、等比缩小和透明留边，不绘制字体或组件美术。三张白纸原始输出有烘焙棋盘格，因此从画布外围 flood-fill 至闭合蓝色轮廓，保留白纸内侧；其余保留真实 alpha。全部素材 alpha 0–255、四角 alpha=0，阈值品红像素=0。需结合深色场景目视检查，不能仅凭 RGBA 文件格式判断透明合格。

## 验收

见 `.codex-worklog/sessions/2026-09-10-首页下半区贴图与排版v7.md`。短屏不追求首屏装下所有内容，完整信息通过纵向滚动呈现。导航图标使用现有可缩放线性图标，统一增粗；没有新增不必要的位图图标。
