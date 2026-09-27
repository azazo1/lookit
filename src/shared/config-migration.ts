export const CURRENT_CONFIG_VERSION = 1;

export function migrateConfig(
  values: Record<string, string>,
  declaredVersion: number,
): Record<string, string> {
  let version = Number.isFinite(declaredVersion) ? declaredVersion : 1;
  if (!Number.isInteger(version) || version < 1) {
    throw new Error("配置文件版本无效");
  }
  if (version > CURRENT_CONFIG_VERSION) {
    throw new Error(`配置文件版本 ${version} 高于当前支持的 ${CURRENT_CONFIG_VERSION}`);
  }
  if (version < CURRENT_CONFIG_VERSION) {
    // 后续需要迁移旧版本时在这里按版本逐级转换.
  }
  values.LOOKIT_CONFIG_VERSION = String(CURRENT_CONFIG_VERSION);
  return values;
}
