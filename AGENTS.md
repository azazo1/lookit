# lookit

lookit 是为非视觉模型提供的视觉辅助 Codex skill, 提供 Bun TypeScript CLI `lookit`, 子命令如下:

- `glance`: 图片描述/提问/OCR.
- `ground`: 定位目标并输出像素框.
- `detect`: 盘点图片或区域中的元素.
- `trace`: 本地把图片转为 SVG 几何.
- `crop`: 把像素盒裁成文件.
- `extract-fg`: 提取图标前景.
- `html-shot`: HTML 截图.
- `model-svg`: 让视觉模型直接生成 SVG.
- `dominant-colors`: 提取区域主色或匹配候选色值.
- `pixel-diff`: 比较两张图片的像素差异.
- `ascii`: 图片转 ASCII 像素网格.
- `human`: 人工注解图片.

视觉 CLI 默认读取 `~/.config/lookit/config.toml`, 顶层字段为 `version`, `api_key`, `base_url`, `model`, `lang`; 环境变量 `LOOKIT_*` 优先. 项目来源于 anionex/codex-vision-proxy 但不包含 codex-vision-proxy 代理部分.

## 开发更新

- 新增或修改 CLI, 依赖, 配置示例时, 同步更新 `package.json`, `SKILL.md` 和 `justfile`.
- `just install` 执行 `bun install` 和 `bun link`, 由用户手动运行; 不要由 agent 自动执行 `bun link`.
- 本项目使用 bun, 不使用 npm.
