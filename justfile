[private]
default:
    @just --list

# just install
# 安装依赖并把 lookit link 到 PATH, 由用户手动执行.
install:
    bun install
    bun link

# just check
# 检查 lookit 总帮助和各子命令帮助.
check:
    bun src/cli.ts --help
    bun src/cli.ts glance --help
    bun src/cli.ts ground --help
    bun src/cli.ts detect --help
    bun src/cli.ts trace --help
    bun src/cli.ts crop --help
    bun src/cli.ts extract-fg --help
    bun src/cli.ts html-shot --help
    bun src/cli.ts model-svg --help
    bun src/cli.ts dominant-colors --help
    bun src/cli.ts pixel-diff --help
    bun src/cli.ts ascii --help
    bun src/cli.ts human --help
