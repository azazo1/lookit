# lookit

lookit 是为非视觉模型提供的视觉辅助 Codex skill, 提供以下 Bun TypeScript CLI:

- `glance`: 图片描述/提问/OCR.
- `ground`: 定位目标并输出像素框.
- `detect`: 盘点图片或区域中的元素.
- `trace`: 本地把图片转为 SVG 几何.
- `dominant_colors`: 提取区域主色或匹配候选色值.
- `pixel_diff`: 比较两张图片的像素差异.

视觉 CLI 默认读取 `~/.config/lookit/config.toml`, 顶层字段为 `version`, `api_key`, `base_url`, `model`, `lang`; 环境变量 `LOOKIT_*` 优先. 项目来源于 anionex/codex-vision-proxy 但不包含 codex-vision-proxy 代理部分.

## 开发更新

- 新增或修改 CLI, 依赖, 配置示例时, 同步更新 `package.json`, `SKILL.md` 和 `justfile`.
- `just install` 是幂等安装 recipe, 它显式复制 `SKILL.md`, `agents`, `references`, `scripts`, `package.json`, `bun.lock`, `config.example.toml`; 新增需要随 skill 安装的文件时, 必须同步更新该 recipe 的复制列表.
- 已安装到 `~/.codex/skills/lookit` 的副本不会自动跟随项目更新; 项目更新后需要重新运行 `just install`, 由用户执行.
- 本项目使用 bun, 不使用 npm.
