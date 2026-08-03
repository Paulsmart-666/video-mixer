// 应用版本号：构建时由 vite.config.ts 从 package.json 注入（__APP_VERSION__），
// 与 更新日志.md 的「当前版本」标记、Git tag vX.Y.Z 保持一致（见 开发规范.md）。
export const APP_VERSION: string = __APP_VERSION__;
