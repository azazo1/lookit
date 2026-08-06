---
name: lookit
description: 给无视觉能力模型提供的本地视觉 CLI 工具集, 提供 glance (描述/提问/OCR 图片), ground (定位目标并输出像素框), detect (盘点元素), trace (本地把图片转为 SVG 几何), crop (把像素盒裁成文件), extract_fg (提取图标前景), html_shot (HTML 截图), model-svg (让视觉模型直接生成 SVG), dominant_colors, pixel_diff, ascii (图片转 ASCII 像素网格) 和 human (人工注解图片). 适用于图片问答, 文字提取, 元素定位, 图片对比, HTML/SVG 还原等需要看图的场景.
---

# lookit

十二个本地 CLI 让没有视觉能力的 agent 拥有看图能力. 它们共享同一份视觉配置 (`LOOKIT_API_KEY` / `LOOKIT_BASE_URL` / `LOOKIT_MODEL` / `LOOKIT_LANG`), 不需要额外凭证.

本文中的 `glance`, `ground`, `detect`, `trace`, `crop`, `extract_fg`, `html_shot`, `model-svg`, `dominant_colors`, `pixel_diff`, `ascii`, `human` 分别是 `bun run scripts/glance.ts`, `bun run scripts/ground.ts`, `bun run scripts/detect.ts`, `bun run scripts/trace.ts`, `bun run scripts/crop.ts`, `bun run scripts/extract_fg.ts`, `bun run scripts/html_shot.ts`, `bun run scripts/model_svg.ts`, `bun run scripts/dominant_colors.ts`, `bun run scripts/pixel_diff.ts`, `bun run scripts/ascii.ts`, `bun run scripts/human.ts` 的缩写.

独立 CLI 源码位于 `scripts/standalone/human/`, 使用 `just build-human` 编译到项目根目录 `dist/human`, 或使用 `just install-human` 安装到 `~/.local/bin/human`. 独立版默认持续服务模式, 无图片也会打开空页面, 可粘贴图片, 拖放文件或输入本机路径; 提交后服务不退出并显示结果 JSON 预览. agent/脚本继续使用 `bun run scripts/human.ts` 的 oneshot 模式, 默认输出保持不变.

## CLI 执行目录

所有 CLI 都必须在本 skill 根目录执行. 根目录就是包含本 `SKILL.md` 的目录, 不要假设它固定安装在某个绝对路径. 调用 `exec_command` 时, 将工具参数 `workdir` 设置为该目录, 在 `cmd` 中使用相对脚本路径. 如果其他终端工具把同一参数命名为 `currentDir`, 再使用它的对应字段:

```text
workdir: "/path/to/lookit"
cmd: "bun run scripts/glance.ts image.png -q \"...\""
```

不要把脚本写成 `/path/to/lookit/scripts/...` 的绝对路径. 图片路径可以继续使用绝对路径.

默认配置从 `~/.config/lookit/config.toml` 读取, 可用 `LOOKIT_CONFIG` 指定其他 TOML 文件; 顶层字段为 `version`, `api_key`, `base_url`, `model`, `lang`; 也支持直接使用 `LOOKIT_API_KEY` 等环境变量覆盖.

根据要回答的问题选择工具:

| 问题 | 工具 |
|---|---|
| 这张图显示/写了什么? | `glance` |
| X 在哪里? (能描述出具体对象) | `ground` |
| 有哪些 X? (某一类对象的全部实例) | `detect` |
| 精确形状/大小/偏移是什么? | `trace` |
| 把这个像素盒裁成文件? | `crop` |
| 从截图提取图标/Logo 前景? | `extract_fg` |
| 把 HTML 渲染成截图? | `html_shot` |
| 让视觉模型直接生成可编辑 SVG 草稿? | `model-svg` |
| 区域内有哪些主色, 候选色中哪个最接近? | `dominant_colors` |
| 这些工具没有返回的数字, 比如颜色值或两个元素之间的距离 | `pixel_diff` |
| 图片的粗略像素结构或逐像素字符对比是什么? | `ascii` |
| 需要人工确认用户意图, 由用户决定设计和注解, 普通多模态模型无法可靠决策分析 | `human` |

`glance` 回答"是什么", `ground` 和 `detect` 回答"在哪里". `ground` 接收一个具体对象的描述, `detect` 接收一个类别并枚举实例.

两者都返回真实坐标, 但不是像素级精确: 框先在 0-1000 网格上生成, 再缩放到原图, 最后几像素不一定可靠. 这足够用于裁剪, 点击和位置比较. 当数字必须精确时, 用 `trace` 从真实像素推导偏移, 大小和形状.

只有这些工具无法覆盖时才直接操作像素, 例如采样颜色值或计算两个已定位元素之间的关系.

## glance - 询问图片

```bash
glance <image>                                 # 详细描述
glance <image> -q "<问题>"                     # 定向提问 (只用于定性问题)
glance <image> --ocr                           # 逐字 OCR
glance <image> --region X1,Y1,X2,Y2 -q "..."   # 放大裁剪区域
glance <img1> <img2> --region X1,Y1,X2,Y2 -q "..."  # 对比同一区域
glance <img1> <img2> -q "..."                  # 单次调用对比多张图
```

对比时要把所有图片路径放在一次调用里. 分开调用看不到同一张图, 事后比较两段描述会形成两次幻觉面, 而不是真正对比. `--region` 会先裁剪每张输入图片, 只上传裁剪区域, 小文字和小图标会更容易识别.

这种单次对比适合先发现布局, 内容, 颜色和缺失元素等整体差异, 例如复原验证时用 `glance <原始图> <渲染结果> -q "对比这两张图..."`. 但它不适合定位单词徽章或小幅位移: 视觉模型会舍入, 对 `pixel_diff` 来说却很精确. 先用 pixel_diff 拿到差异框, 再用 `glance --region` 放大该区域读取实际变化.

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

坐标来自真实像素而不是模型估计. 只适用于平坦高对比图形; 文字会变成曲线 (文字重要时配合 `--ocr`). 小图会自动放大后再追踪, 大小不是跳过工具的理由. 但 trace 记录的是栅格化后的像素边界, 不是原始设计的矢量几何. 重建小图标或简单几何时只把它当测量参考, 不要为了降低 `pixel_diff` 把锯齿或抗锯齿轮廓写进 SVG. 交付前阅读 `references/restore.md`.

## model-svg - 让视觉模型直接生成 SVG (调用视觉 API)

```bash
model-svg <image> -o out.svg                       # 生成并校验 SVG
model-svg <image> --region X1,Y1,X2,Y2 -o out.svg  # 只重建指定区域
model-svg <image> --instruction "..." -o out.svg  # 添加形状或风格要求
```

该命令要求模型只返回一个 SVG 文档, 自动去除代码围栏并校验标签结构, `viewBox`/尺寸, 脚本和外部资源. 它生成的是可编辑草稿, 仍需按 `references/restore.md` 渲染, 检查和人工整理; 不要把模型输出或 `pixel_diff` 结果直接当作最终质量判定.

## crop - 把像素盒裁成独立文件 (本地处理, 不调用视觉 API)

```bash
crop <image> --region X1,Y1,X2,Y2              # 写到 <image-stem>.crop.png
crop <image> --region X1,Y1,X2,Y2 -o out.png
crop <image> --region X1,Y1,X2,Y2 --scale 4    # 放大 4 倍后写出
```

`--region` 使用 `ground`/`detect` 输出的原图像素框, 超出图片边界时自动收敛. 同一个盒子接下来要喂给 `pixel_diff`, `dominant_colors` 或 `trace` 多次时, 先裁一次存成文件复用, 而不是每次调用都在内存里重裁. `--scale N` 会先用 LANCZOS 放大裁剪结果, 适合小图标在继续定位或追踪前先放大; 后续工具返回的坐标处于放大后的网格, 需要除以 `N` 映射回原图.

## extract_fg - 提取图标/Logo 前景透明 PNG (本地处理, 不调用视觉 API)

```bash
extract_fg <image> --region X1,Y1,X2,Y2 -o icon.png
extract_fg <image> --region X1,Y1,X2,Y2 --mode dark
extract_fg <image> --region X1,Y1,X2,Y2 --exclude-color '#E6E6E6'
crop <image> --region X1,Y1,X2,Y2 --scale 4 -o icon4x.png
extract_fg icon4x.png                          # 自动模式, 图标居中时无需 region
extract_fg icon4x.png --boxes 101,84,184,171   # 用 ground 框校正自动圆心
```

手动模式在区域内取满足颜色条件的像素, 做 8 邻域连通分量分析, 保留足够大的分量, 输出透明背景 PNG 并打印原图像素 bbox. 自动模式假设传入的是 `crop --scale` 裁出的居中图标, 从圆环采样背景色并排除, 再从最大的几个彩色分量中选图形. 输出可直接交给下游 `crop`, `glance --region` 或 `<img>` 引用.

## html_shot - 把 HTML 渲染成 PNG (本地处理, 需要 Chrome 系浏览器)

```bash
html_shot page.html                            # 写到 page.png, 1280x800
html_shot page.html --width 1440 --height 900 -o page.png
html_shot page.html --scale 2 --wait-ms 300    # 2 倍像素并等待字体/图片
```

渲染由本机 headless Chrome/Chromium/Edge 完成, 只捕获 viewport. 还原工作流中先写 HTML, 再 `html_shot` 截图, 最后用 `pixel_diff` 和 `glance` 对照设计图验证; 页面比窗口高时传 `--height`, 需要 HiDPI 清晰度时传 `--scale`.

## ascii - 图片转 ASCII 像素网格 (本地处理, 不调用视觉 API)

```bash
ascii <image>                              # 输出字符网格
ascii <image> --width 40 --height 40       # 指定网格大小
ascii <image> --region X1,Y1,X2,Y2         # 先裁剪再转换
ascii <img1> <img2>                        # 两张图逐像素并排对比
ascii <img1> <img2> --region X1,Y1,X2,Y2   # 只比较同一区域
```

默认输出不缩放 64x64 以内的图片, 更大图片自动缩到 64x64 以内; 可用 `--width`/`--height` 覆盖. 传入两张图时, `--region` 会先裁剪每张图片再并排比较. 判断规则和临时脚本一致: alpha 大于 0 且红色通道超过 `--threshold` (默认 80) 的像素显示为 `#`, 否则为 `.`. 这个输出只用于粗略结构预览, 坐标和尺寸仍从 `trace` 获取.

## pixel_diff - 两张图哪里不同 (本地处理, 不调用视觉 API)

```bash
pixel_diff <图A> <图B>
pixel_diff <图A> <图B> --region X1,Y1,X2,Y2
```

输出整体差异百分比, 以及最严重区域的 `x1: ..` 框; 这些框可以直接传给 `glance --region`. 传入 `--region` 时只比较该区域, 输出的框坐标仍对应原图. 它用于定位差异, 不是视觉质量评分; 百分比更低不代表 SVG 更平滑或更合理. 重建验证按 `references/restore.md` 的质量顺序执行.

## dominant_colors - 区域主色与候选色值 (本地处理, 不调用视觉 API)

```bash
dominant_colors <image> --region X1,Y1,X2,Y2          # 输出主色聚类和占比
dominant_colors <image> --region X1,Y1,X2,Y2 \
  --candidates '#F9FAFA,#F5F5F5,#F3F3F3,#EDEDED'      # 从候选色中选最接近值
```

其余 CLI 需要 Bun 和 `sharp` 包; 独立版 `human` 不需要 `sharp`, 但编译时需要 Bun. `glance/ground/detect/model-svg` 还需要视觉 API. 安装本 skill 后, 在 skill 目录里执行一次 `bun install`.

视觉模型能说出颜色名称 (比如 "浅灰"), 但不能给出具体色值. 第一种模式降采样, 量化和合并相近颜色, 输出区域主要颜色及各自占比; 直方图显示哪个是背景, 哪个是强调色. 给定标签对应的候选调色板后, 第二种模式按区域像素与每个候选色的接近程度打分并输出胜者. 色值从这里取, 不要从 `glance` 的散文描述里取. 路径相对本 skill 自己的目录.

## human - 人工图片审查 (本地页面, 不调用视觉 API)

```bash
human <image>                                              # 打开页面等待人工注解
human <image> --task "请标出所有按钮和输入框" --labels "按钮,输入框"
human <image> --output 注解.json --text                     # 保存注解并输出人类可读摘要
human <image> --timeout 120 --no-open                      # 不自动打开浏览器
human --serve                                              # 独立 CLI 空页面, 可粘贴/拖放/输入路径
human --serve <image>                                      # 持续服务并预加载图片
human --once <image>                                       # 独立 CLI 一次提交后退出
```

当你想要理解用户究竟想表达图像中的什么问题, 想要怎么进行设计和注解, 而普通多模态模型无法可靠决策和分析时, 使用 `human` 脚本.

该命令会启动一个本地 HTTP 服务, 打开浏览器页面. 用户可以用矩形框选, 多边形或标记点补充区域注解, 也可以给每张图片和整体任务写文字结论. `bun run scripts/human.ts` 和 `just human` 仍是 oneshot: 提交后脚本立即退出, 默认把 JSON 结果输出到标准输出供你直接使用; `--text` 会改成人类可读摘要. 取消后页面会尝试自动关闭, 取消或超时不会生成注解.

返回的每个区域都包含原图像素坐标 `box` 和原始 `points`; `box` 可直接传给 `glance --region` 或 `dominant_colors --region` 做后续处理. 默认监听 `127.0.0.1` 和随机端口, `--output` 会把 JSON 写入文件. 页面默认是选择/拖拽模式, 点击矩形后可直接编辑标签和说明, 编辑内容会立即更新当前区域, 取消选择后编辑框会清空; 拖拽矩形可移动, 拖动边角可调整大小, 切到框选模式后再拖拽生成新矩形. 页面支持滚轮或按钮把图片放大到最多 10 倍, 并显示超时倒计时, 可点击延长 5 分钟.
页面支持数字键 `1-4` 快速切换选择, 框选, 多边形和标记点, 输入框获得焦点时不会触发切换.

独立版 `human` (`dist/human` 或安装后的 `human`) 默认进入 `--serve` 模式, 不限制超时, 提交后服务保持运行. 页面底部会显示结果 JSON 预览, 可以复制 JSON, 也可以继续添加图片, 修改注解或再次提交. 空页面支持粘贴截图, 拖放文件, 选择文件, 或输入本机图片路径; `--once` 可让独立版恢复为一次提交后退出.

> 作为 agent, 你应该使用 `bun run scripts/human.ts ...` 的版本.

## 只有文字描述而没有图片时

如果只收到了别人/工具/其他模型写出的图片描述, 但对话中能看到图片文件路径, 不要绕过缺失的细节自行推理. 自己再看一次:

1. `glance <path> -q "<具体细节>"` - 一次定性追问.
2. `ground <path> "<目标>"`, 然后 `glance <path> --region <框> -q "..."` - 先定位, 再放大; 这是近距离检查单个元素的可靠方式.

如果文件已经不存在, 直接说明, 不要猜测.

## 从粗到细 - 上面所有任务的方法

单个图片问题时, `glance` 就是完整答案. 多步骤任务从外到内进行:

1. 先做一次全图扫描 (`glance`, 或使用已有描述), 得到布局和元素清单.
2. 对关键元素使用 `ground` 定位, 再用 `glance --region <框> -q "..."` 放大. 全图扫描经常漏掉小文字和小图标, 裁剪后模型能看到更高有效分辨率. 同一个盒子需要多次复用时, 先用 `crop` 裁成文件.
3. 像素级事实 (精确颜色, 小偏移, 大小) 永远不要采用散文答案. 视觉模型会自信地报告不存在的样式, 比如单色代码块里的彩色语法高亮或实际不存在的边框. 数字从 `trace`, `ground` 框或 `pixel_diff` 获取; 只有这些都无法返回时才自己采样像素.

## 使用场景

每个文件对应一类完整任务: 适用条件, 调用顺序和如何判断做对了.

当任务是根据图片重建页面 (HTML), 图标或示意图 (SVG), 或提取视觉组件时, 阅读 `references/restore.md`, 并按其中规则选择 `references/restore-quick.md` 或 `references/restore-exact.md`.

当任务是根据截图操作 GUI, 需要点击, 输入或滚动前先定位时, 阅读 `references/gui.md`.

## 注意事项

- 只支持 PNG / JPEG / GIF / WebP 图片.
- 如果命令不存在, 说明可选工具未安装; 报告给用户, 不要临时用其他工具替代.
- 如果视觉 API 失败, 如实报告错误, 绝不编造图片内容.

来源仓库: https://github.com/Anionex/codex-vision-proxy

安装说明: https://github.com/Anionex/codex-vision-proxy/blob/main/AGENT_INSTALL.md
