import { createHash } from "node:crypto";

const rawPassword = import.meta.env.PUBLIC_SITE_PASSWORD ?? "";

/** 是否开启了密码保护。未配置 PUBLIC_SITE_PASSWORD 时为 false */
export const isPasswordProtected = rawPassword.length > 0;

/**
 * 密码的 SHA-256 摘要，在构建期算好。
 * 只有这个值会进入前端产物，明文密码不会出现在仓库或打包结果里。
 */
export const passwordHash = createHash("sha256").update(rawPassword).digest("hex");

let warned = false;

if (!isPasswordProtected && !warned) {
  warned = true;
  console.warn(
    "[auth] 未检测到 PUBLIC_SITE_PASSWORD，密码保护处于关闭状态。" +
      "请在 Netlify 环境变量中配置后重新部署。"
  );
}
