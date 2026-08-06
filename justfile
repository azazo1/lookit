[private]
default:
    @just --list

# just install
# 同 just deps
install: deps

# just deps
# 安装当前项目依赖.
deps:
    bun install

# just check
# 编译全部 CLI 并检查帮助信息.
check:
    bun run scripts/standalone/human/build-human-app.ts
    bun build --target=bun scripts/glance.ts scripts/ground.ts scripts/detect.ts scripts/trace.ts scripts/model_svg.ts scripts/dominant_colors.ts scripts/pixel_diff.ts scripts/ascii.ts scripts/human.ts scripts/standalone/human/human_cli.ts scripts/crop.ts scripts/extract_fg.ts scripts/html_shot.ts --outdir /tmp/lookit-build
    bun run scripts/glance.ts --help
    bun run scripts/ground.ts --help
    bun run scripts/detect.ts --help
    bun run scripts/trace.ts --help
    bun run scripts/model_svg.ts --help
    bun run scripts/dominant_colors.ts --help
    bun run scripts/pixel_diff.ts --help
    bun run scripts/ascii.ts --help
    bun run scripts/human.ts --help
    bun run scripts/standalone/human/human_cli.ts --help
    bun run scripts/crop.ts --help
    bun run scripts/extract_fg.ts --help
    bun run scripts/html_shot.ts --help
    bun build --compile scripts/standalone/human/human_cli.ts --outfile /tmp/lookit-human-check

# just build
# 编译全部 CLI 到 /tmp/lookit-build.
build:
    bun build --target=bun scripts/glance.ts scripts/ground.ts scripts/detect.ts scripts/trace.ts scripts/model_svg.ts scripts/dominant_colors.ts scripts/pixel_diff.ts scripts/ascii.ts scripts/human.ts scripts/standalone/human/human_cli.ts scripts/crop.ts scripts/extract_fg.ts scripts/html_shot.ts --outdir /tmp/lookit-build

# just build-human-app
# 从 standalone/human/human-app.html 生成内嵌 HTML 模块.
build-human-app:
    bun run scripts/standalone/human/build-human-app.ts

# just build-human
# 编译独立 human CLI 到项目根目录 dist/human.
build-human: build-human-app
    @mkdir -p dist
    bun build --compile scripts/standalone/human/human_cli.ts --outfile dist/human

# just install-human
# 编译独立 human CLI 并安装到 ~/.local/bin/human.
install-human: build-human
    @mkdir -p "$${HOME}/.local/bin"
    @install -m 755 dist/human "$${HOME}/.local/bin/human"

# just glance <图片> [参数]
# 使用 glance 描述/提问/OCR 图片.
glance *args:
    @bun run scripts/glance.ts {{ args }}

# just ground <图片> <目标> [--region ...]
# 使用 ground 定位目标并输出像素框.
ground *args:
    @bun run scripts/ground.ts {{ args }}

# just detect <图片> [类别] [--region ...]
# 使用 detect 盘点图片或区域中的元素.
detect *args:
    @bun run scripts/detect.ts {{ args }}

# just trace <图片> [--polygon] [--region ...]
# 使用 trace 把图片转为 SVG 几何.
trace *args:
    @bun run scripts/trace.ts {{ args }}

# just model-svg <图片> [-o 输出.svg] [--region ...]
# 让视觉模型直接生成可编辑 SVG.
model-svg *args:
    @bun run scripts/model_svg.ts {{ args }}

# just dominant-colors <图片> [--region ...]
# 使用 dominant_colors 提取区域主色.
dominant-colors *args:
    @bun run scripts/dominant_colors.ts {{ args }}

# just pixel-diff <原图> <重建图>
# 使用 pixel_diff 比较两张图片的像素差异.
pixel-diff *args:
    @bun run scripts/pixel_diff.ts {{ args }}

# just ascii <图片> [<对比图片>] [--width N] [--height N]
# 使用 ascii 把图片输出为 ASCII 像素网格, 传入两张图时并排比较.
ascii *args:
    @bun run scripts/ascii.ts {{ args }}

# just human <图片> [--task ...] [--labels ...] [--output ...]
# 打开本地页面让用户注解图片并返回结果.
human *args:
    @bun run scripts/human.ts {{ args }}

# just crop <图片> --region X1,Y1,X2,Y2 [-o 输出.png] [--scale N]
# 把图片中的像素盒裁成独立 PNG 文件.
crop *args:
    @bun run scripts/crop.ts {{ args }}

# just extract-fg <图片> [--region ...] [--mode color|dark] [-o 输出.png]
# 从截图区域提取图标/Logo 前景透明 PNG.
extract-fg *args:
    @bun run scripts/extract_fg.ts {{ args }}

# just html-shot <HTML 文件或 URL> [--width N] [--height N] [--scale N]
# 使用本机 Chrome/Chromium/Edge 把 HTML 渲染成 PNG.
html-shot *args:
    @bun run scripts/html_shot.ts {{ args }}
