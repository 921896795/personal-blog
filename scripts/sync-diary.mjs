/**
 * 把 MySQL 表 dty_daily_diary 导出为前端可直接读取的 JSON 快照。
 *
 * 用法：
 *   node scripts/sync-diary.mjs            # 缺少配置时跳过，保留现有快照（供构建使用）
 *   node scripts/sync-diary.mjs --strict   # 缺少配置或拉取失败时报错退出
 *
 * 需要的环境变量：
 *   DIARY_DB_HOST / DIARY_DB_PORT / DIARY_DB_USER / DIARY_DB_PASSWORD / DIARY_DB_NAME
 */
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const OUT = resolve(process.cwd(), "public/data/daily-diary.json");
const strict = process.argv.includes("--strict");

const env = process.env;
const required = ["DIARY_DB_HOST", "DIARY_DB_USER", "DIARY_DB_PASSWORD", "DIARY_DB_NAME"];
const missing = required.filter(key => !env[key]);

function fallback(message) {
  if (strict) {
    console.error(`[diary] ${message}`);
    process.exit(1);
  }
  console.warn(`[diary] ${message}，沿用现有快照 ${existsSync(OUT) ? "（已存在）" : "（不存在，页面将显示空状态）"}`);
  process.exit(0);
}

if (missing.length) {
  fallback(`缺少环境变量 ${missing.join("、")}`);
}

const { createConnection } = await import("mysql2/promise");

let connection;
const entries = [];

try {
  connection = await createConnection({
    host: env.DIARY_DB_HOST,
    port: Number(env.DIARY_DB_PORT || 3306),
    user: env.DIARY_DB_USER,
    password: env.DIARY_DB_PASSWORD,
    database: env.DIARY_DB_NAME,
    charset: "utf8mb4",
    dateStrings: true,
    connectTimeout: 15000
  });

  const [rows] = await connection.query(
    `SELECT DATE_FORMAT(record_time, '%Y-%m-%d') AS day,
            work_diary,
            life_diary,
            others,
            COALESCE(label, '') AS label
       FROM dty_daily_diary
      WHERE record_time IS NOT NULL
      ORDER BY record_time DESC`
  );

  for (const row of rows) {
    const entry = {
      date: row.day,
      work: (row.work_diary || "").trim() || null,
      life: (row.life_diary || "").trim() || null,
      others: (row.others || "").trim() || null,
      label: (row.label || "").trim()
    };
    if (!entry.work && !entry.life && !entry.others) continue;
    entries.push(entry);
  }
} catch (error) {
  fallback(`连接或查询失败：${error.message}`);
} finally {
  await connection?.end().catch(() => {});
}

const days = entries.map(entry => entry.date).sort();
const payload = {
  syncedAt: new Date().toISOString(),
  stats: {
    total: entries.length,
    days: new Set(days).size,
    start: days[0] ?? null,
    end: days[days.length - 1] ?? null
  },
  entries
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(payload), "utf8");

console.log(
  `[diary] 已导出 ${payload.stats.total} 篇记录（${payload.stats.start} ~ ${payload.stats.end}），` +
    `文件大小约 ${(readFileSync(OUT).length / 1024).toFixed(1)}KB`
);
