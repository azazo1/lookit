[private]
default:
    @just --list

# just install
# 幂等安装 lookit skill 到 ~/.codex/skills/lookit.
install:
    mkdir -p "$HOME/.codex/skills/lookit"
    cp -R SKILL.md agents references scripts package.json bun.lock config.example.toml "$HOME/.codex/skills/lookit/"
    cd "$HOME/.codex/skills/lookit" && bun install --production --frozen-lockfile

# just deps
# 安装当前项目依赖.
deps:
    bun install

# just check
# 编译全部 CLI 并检查帮助信息.
check:
    bun build --target=bun scripts/glance.ts scripts/ground.ts scripts/detect.ts scripts/trace.ts scripts/dominant_colors.ts scripts/pixel_diff.ts scripts/ascii.ts --outdir /tmp/lookit-build
    bun run scripts/glance.ts --help
    bun run scripts/ground.ts --help
    bun run scripts/detect.ts --help
    bun run scripts/trace.ts --help
    bun run scripts/dominant_colors.ts --help
    bun run scripts/pixel_diff.ts --help
    bun run scripts/ascii.ts --help

# just build
# 编译全部 CLI 到 /tmp/lookit-build.
build:
    bun build --target=bun scripts/glance.ts scripts/ground.ts scripts/detect.ts scripts/trace.ts scripts/dominant_colors.ts scripts/pixel_diff.ts scripts/ascii.ts --outdir /tmp/lookit-build

# just glance <图片> [参数]
# 使用 glance 描述/提问/OCR 图片.
glance *args:
    @bun run scripts/glance.ts {{args}}

# just ground <图片> <目标> [--region ...]
# 使用 ground 定位目标并输出像素框.
ground *args:
    @bun run scripts/ground.ts {{args}}

# just detect <图片> [类别] [--region ...]
# 使用 detect 盘点图片或区域中的元素.
detect *args:
    @bun run scripts/detect.ts {{args}}

# just trace <图片> [--polygon] [--region ...]
# 使用 trace 把图片转为 SVG 几何.
trace *args:
    @bun run scripts/trace.ts {{args}}

# just dominant-colors <图片> [--region ...]
# 使用 dominant_colors 提取区域主色.
dominant-colors *args:
    @bun run scripts/dominant_colors.ts {{args}}

# just pixel-diff <原图> <重建图>
# 使用 pixel_diff 比较两张图片的像素差异.
pixel-diff *args:
    @bun run scripts/pixel_diff.ts {{args}}

# just ascii <图片> [<对比图片>] [--width N] [--height N]
# 使用 ascii 把图片输出为 ASCII 像素网格, 传入两张图时并排比较.
ascii *args:
    @bun run scripts/ascii.ts {{args}}
