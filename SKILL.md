---
name: lookit
description: 本地视觉 CLI 工具集, 提供 glance (描述/提问/OCR 图片), ground (定位目标并输出像素框), detect (盘点元素), trace (把图片转为 SVG 几何), 以及 dominant_colors 和 pixel_diff. 适用于图片问答, 文字提取, 元素定位, 图片对比, HTML/SVG 还原等需要看图的场景.
---

# lookit

四个本地 CLI 让纯文本 agent 拥有看图能力. 它们共享同一份视觉配置 (`VISION_API_KEY` / `VISION_BASE_URL` / `VISION_MODEL` / `LANG`), 不需要额外凭证.

根据要回答的问题选择工具:

| 问题 | 工具 |
|---|---|
| 这张图显示/写了什么? | `glance` |
| X 在哪里? (能描述出具体对象) | `ground` |
| 有哪些 X? (某一类对象的全部实例) | `detect` |
| 精确形状/大小/偏移是什么? | `trace` |
| 区域内有哪些主色, 候选色中哪个最接近? | `scripts/dominant_colors.ts` |
| 这些工具没有返回的数字, 比如颜色值或两个元素之间的距离 | 直接读取像素 (Bun + sharp) |

`glance` 回答"是什么", `ground` 和 `detect` 回答"在哪里". `ground` 接收一个具体对象的描述, `detect` 接收一个类别并枚举实例.

两者都返回真实坐标, 但不是像素级精确: 框先在 0-1000 网格上生成, 再缩放到原图, 最后几像素不一定可靠. 这足够用于裁剪, 点击和位置比较. 当数字必须精确时, 用 `trace` 从真实像素推导偏移, 大小和形状.

只有这些工具无法覆盖时才直接操作像素, 例如采样颜色值或计算两个已定位元素之间的关系.

## glance - 询问图片

```bash
glance <image>                                 # 详细描述
glance <image> -q "<问题>"                     # 定向提问 (只用于定性问题)
glance <image> --ocr                           # 逐字 OCR
glance <image> --region X1,Y1,X2,Y2 -q "..."   # 放大裁剪区域
glance <img1> <img2> -q "..."                  # 单次调用对比多张图
```

对比时要把所有图片路径放在一次调用里. 分开调用看不到同一张图, 事后比较两段描述会形成两次幻觉面, 而不是真正对比. `--region` 只上传裁剪区域, 小文字和小图标会更容易识别.

但"两张图之间发生了什么变化"不是 `glance` 的问题. 一个单词徽章或小幅位移对视觉模型来说只是舍入误差, 对 `scripts/pixel_diff.ts` 来说却很精确. 先用 pixel_diff 拿到差异框, 再用 `glance --region` 放大该区域读取实际变化.

## ground - 定位指定目标

```bash
ground <image> "<目标描述>"
ground <image> "<目标>" --region X1,Y1,X2,Y2
```

输出为原图像素坐标的 `x1: .., y1: .., x2: .., y2: ..`; 使用 `--region` 时也会映射回原图坐标.

如果返回多个编号框, 说明描述匹配到多个元素而不是单个目标. 用文本, 位置或所属区块来收窄描述, 再重新调用.

这个框不仅是答案, 也是下一步调用的输入:

```bash
$ ground screenshot.png "发送按钮"
x1: 1067, y1: 841, x2: 1108, y2: 881
$ glance screenshot.png --region 1067,841,1108,881 -q "它是可用状态还是置灰状态?"
```

这种两步调用用于检查全图视角下太小而无法分辨的内容.

## detect - 枚举某一类元素

```bash
detect <image>                        # 所有 UI 元素
detect <image> "按钮"                  # 只找按钮
detect <image> --region X1,Y1,X2,Y2   # 只找框内元素
```

`ground` 用于指定某个具体对象, `detect` 用于指定一个类别并枚举全部实例. 输出是带编号的列表, 每项包含可见文字和框. 全屏一次扫描是快速初稿, 密集页面每次运行计数可能不同. 要完整盘点时, 先 detect 布局区块, 再对每个区块执行 `detect --region`.

## trace - 精确形状几何 (本地处理, 不调用视觉 API)

```bash
trace <image>                                  # 黑白样条 SVG 输出到标准输出
trace <image> --polygon                        # 适合线框图/方框图的折线输出
trace <image> --region X1,Y1,X2,Y2 -o out.svg  # 先裁剪再追踪
```

坐标来自真实像素而不是模型估计. 只适用于平坦高对比图形; 文字会变成曲线 (文字重要时配合 `--ocr`). 小图会自动放大后再追踪, 30px 图标和截图一样可以处理, 大小不是跳过工具的理由. 在交付或复用追踪出的 SVG 前, 阅读 `references/restore.md`, 里面有复用陷阱和直接交付与手写重绘的判断.

## pixel_diff - 两张图哪里不同 (本地处理, 不调用视觉 API)

```bash
bun run scripts/pixel_diff.ts <图A> <图B>      # 路径相对本 skill 目录
```

输出整体差异百分比, 以及最严重区域的 `x1: ..` 框; 这些框可以直接传给 `glance --region`. 视觉模型会舍入, 这个工具是精确版本.

## dominant_colors - 区域主色与候选色值 (本地处理, 不调用视觉 API)

```bash
bun run scripts/dominant_colors.ts <image> --region X1,Y1,X2,Y2          # 输出主色聚类和占比
bun run scripts/dominant_colors.ts <image> --region X1,Y1,X2,Y2 \
  --candidates '#F9FAFA,#F5F5F5,#F3F3F3,#EDEDED'                        # 从候选色中选最接近值
```

两个脚本需要 Bun 和 `sharp` 包. 安装本 skill 后, 在 skill 目录里执行一次 `bun install`.

视觉模型能说出颜色名称 (比如 "浅灰"), 但不能给出具体色值. 第一种模式降采样, 量化和合并相近颜色, 输出区域主要颜色及各自占比; 直方图显示哪个是背景, 哪个是强调色. 给定标签对应的候选调色板后, 第二种模式按区域像素与每个候选色的接近程度打分并输出胜者. 色值从这里取, 不要从 `glance` 的散文描述里取. 路径相对本 skill 自己的目录.

## 使用副本, 不要用临时路径

如果图片位于临时目录, 第一次工具调用前先复制到持久位置, 并一直对副本操作, 这样后续仍能访问:

```bash
cp "<临时路径>" work/shot.png
glance work/shot.png -q "..."
```

例外: 用户明确要求图片保留在临时目录.

## 只有文字描述而没有图片时

如果只收到了别人/工具/其他模型写出的图片描述, 但对话中能看到图片文件路径, 不要绕过缺失的细节自行推理. 自己再看一次:

1. `glance <path> -q "<具体细节>"` - 一次定性追问.
2. `ground <path> "<目标>"`, 然后 `glance <path> --region <框> -q "..."` - 先定位, 再放大; 这是近距离检查单个元素的可靠方式.

如果文件已经不存在, 直接说明, 不要猜测.

## 从粗到细 - 上面所有任务的方法

单个图片问题时, `glance` 就是完整答案. 多步骤任务从外到内进行:

1. 先做一次全图扫描 (`glance`, 或使用已有描述), 得到布局和元素清单.
2. 对关键元素使用 `ground` 定位, 再用 `glance --region <框> -q "..."` 放大. 全图扫描经常漏掉小文字和小图标, 裁剪后模型能看到更高有效分辨率.
3. 像素级事实 (精确颜色, 小偏移, 大小) 永远不要采用散文答案. 视觉模型会自信地报告不存在的样式, 比如单色代码块里的彩色语法高亮或实际不存在的边框. 数字从 `trace`, `ground` 框或 `pixel_diff` 获取; 只有这些都无法返回时才自己采样像素.

## 使用场景

每个文件对应一类完整任务: 适用条件, 调用顺序和如何判断做对了.

当任务是根据图片重建页面 (HTML), 图标或示意图 (SVG), 或提取视觉组件时, 阅读 `references/restore.md`.

## 注意事项

- 只支持 PNG / JPEG / GIF / WebP 图片.
- 如果命令不存在, 说明可选工具未安装; 报告给用户, 不要临时用其他工具替代.
- 如果视觉 API 失败, 如实报告错误, 绝不编造图片内容.

来源仓库: https://github.com/Anionex/codex-vision-proxy

安装说明: https://github.com/Anionex/codex-vision-proxy/blob/main/AGENT_INSTALL.md
