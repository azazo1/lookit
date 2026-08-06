# 根据图片重建 UI 或图形

**何时使用**: 任务是复现图片展示的内容, 比如把页面还原成 HTML, 把图标或示意图还原成 SVG, 或提取可复用的视觉组件. 不用于回答图片问题, 那只需要 `glance`.

工具语法在 `SKILL.md`. 本文件只负责路由, 具体执行顺序和通过/失败判断在下面两个文件中. 只读匹配的一个, 不要同时读两个, 除非正在切换模式.

## 先选模式, 再开干

| 模式 | 触发信号 | 工作流 |
|---|---|---|
| 非精确 (默认) | 未提及"像素级/精确"; 只要求"布局, 配色, 图标一致", "大致还原", "复原 UI" | `references/restore-quick.md` |
| 精确 | 明确要求"像素级还原", "像素级一致", "精确还原", "pixel-perfect" | `references/restore-exact.md` |

不要因为追求"还原度"就把非精确任务升级成精确流程. 拿不准时先按非精确完成, 用户要求更精确再升级; 升级只需换读 `restore-exact.md`, 已做过的 detect/glance/颜色采样结果不用重做.

## 通用经验 (两个工作流都适用)

- `detect`/`ground` 的 box 常有偏移或偏小, 实测偏 5-10px 很常见, 个别元素会被裁掉一半. 拿 box 做裁剪或定位时, 先每边外扩 8-10px (2x 原图) 再按 ink 边界收紧; 同一批裁剪完拼成 contact sheet 目检.
- 一切对比都对照原图, 拿自己渲染的两版互相对比不算数.
- 字体渲染差异是固有噪声 (Helvetica/Arial 与系统 SF Pro 等); 非精确直接接受, 精确做 pixel_diff 时把它当已知噪声.
- 截图可能是 HiDPI (常见 2x). `detect`/`ground`/`crop` 返回原图像素, 换算成 HTML 逻辑尺寸前先确认原图尺寸与页面逻辑尺寸的比值, 否则整体布局会偏移一个量级.
- 图标/图片是私有的, 能用原图就用原图. 截图里的图标不要上网搜替代图, 也不要自己做一个替代的; 先从原图里提取, 只有确实截不出来时才谈替代.
- 用 `detect` 给的坐标组织画布, 不要自己重想坐标. 注意 HiDPI 比例和 box 外扩.

### 从截图提取图标前景 (不要直接按 box crop)

直接按 `detect`/`ground` 的 box `crop` 会混入相邻内容. 用 `extract_fg`:

```bash
extract_fg shot.png --region X1,Y1,X2,Y2 -o icon.png
extract_fg shot.png --region X1,Y1,X2,Y2 --mode dark
crop shot.png --region X1,Y1,X2,Y2 --scale 4 -o icon4x.png
extract_fg icon4x.png
extract_fg icon4x.png --boxes 101,84,184,171
```

方法: 区域内取彩色像素 (或暗色线条), 做 8 邻域连通分量分析, 保留所有足够大的分量 (>= 最大分量的 2%), 背景噪点自动分离, 输出透明背景 PNG 并打印精确 bbox. 抠图是像素级复制, 不降质; 图标再小也只是裁出来贴回去, 放大 4x 后定位/抠图不受尺寸影响. 只有用户明确要求 SVG/矢量交付时才手绘, 那属于 `restore-exact.md` 的精确流程.

- 干扰为彩色且连片 (彩色背景, 水印) 时, 加 `--exclude-color '#背景色'`.
- 取色/搜索区域要收紧到目标本身, 宽松框住即可, 否则可能收进相邻元素.
- 实心图标含白色镂空细节或浅色渐变底圈也适用; `--no-keep-whites` 可关闭内部白色保留.

备选 (脚本不适用时): `ground` 定位 (放大 4x 再 ground), 或 `dominant_colors` 主色 union. 实测三种方法结果等价; HSV 色相区间法杂散分量多, 不推荐.
