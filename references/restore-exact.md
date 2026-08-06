# 精确模式

触发信号: 用户明确要求"像素级还原", "像素级一致", "精确还原", "pixel-perfect".
工作目标: pixel_diff 逐轮下降直至收敛. 只有本模式使用 pixel_diff 迭代验证.

## 步骤

1. Inventory in one pass, then refine by region: `detect` 全屏一次, 不逐元素调用; 密集页面按布局区块 `detect --region`, 再 `glance --region` 放大, `dominant_colors` 采样.
2. 数字从像素取, 不从散文取: 精确颜色, 偏移和大小用 `dominant_colors`, `trace`.
3. 每个形状决定: ship trace 还是 measure from it. 有机形状可直接交付 trace; 简单几何或还要编辑的 SVG 从 trace 读取测量值再手写干净基础图形.
   - 小图标是手写案例, 不是 no-trace 案例. 用 `trace <icon> --polygon` 读取端点, 角点, 描边宽度, 最终输出 `<path stroke=... fill=none>`.
   - trace 复用陷阱: SVG 透明背景要先合成白色再 pixel diff; 每个 path 的 transform 要连同 d 一起复制.
4. 颜色从像素取, 模型只命名: `glance` 拿颜色名称, `dominant_colors` 拿聚类和候选色值.

## Verify (pixel_diff 逐轮收敛)

渲染 HTML (Playwright 或 `html_shot`) 或 SVG (`rsvg-convert`), 然后:

```bash
pixel_diff <original.png> <rendered.png>
```

输出整体差异百分比和最严重区域框, 框可传给 `glance --region`. 修最大差异, 重渲染, 重跑, 数字应逐轮下降; 剩余差异为字体噪声或已解释区域时停止.

结构代码 (Mermaid, Graphviz, JSON layout) 不用 pixel_diff 验证, 而是渲染后 `detect` + OCR 重建 inventory, 对比节点数, 标签集, 边方向和数量. 标签必须逐字匹配, 读不出写 `[unreadable]`, 不猜.

两条阅读规则: 低百分比不代表只有一个缺陷; 不要用分开的描述对比下结论.

## Boundaries

整张截图和照片不适合 trace. 低对比图形会被二值化掉. "0 paths" 可恢复: 依次调高 `--scale`, 收紧 `--region`, 或对浅色背景深色图形先反色. `--color` 最后才用, 且只用于真正多色图形.
