/**
 * 把 MySQL 里的个人数据表导出为前端可直接读取的 JSON 快照。
 *
 *   dty_daily_diary     -> public/data/daily-diary.json
 *   dty_daily_feedback  -> public/data/daily-feedback.json
 *   dty_quarter_okr     -> public/data/quarter-okr.json
 *   dty_daily_expense_v2 -> public/data/daily-expense.json
 *   dty_exercise        -> public/data/exercise.json
 *   dty_books           -> public/data/books.json
 *
 * 用法：
 *   node scripts/sync-data.mjs            # 缺少配置时跳过，保留现有快照（供构建使用）
 *   node scripts/sync-data.mjs --strict   # 缺少配置或拉取失败时报错退出
 *
 * 需要的环境变量：
 *   DATA_DB_HOST / DATA_DB_PORT / DATA_DB_USER / DATA_DB_PASSWORD / DATA_DB_NAME
 * 兼容旧变量名 DIARY_DB_*。
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const OUT_DIR = resolve(process.cwd(), "public/data");
const strict = process.argv.includes("--strict");

const env = process.env;
const pick = (name, fallbackName) => env[name] ?? (fallbackName ? env[fallbackName] : undefined);

const config = {
  host: pick("DATA_DB_HOST", "DIARY_DB_HOST"),
  port: Number(pick("DATA_DB_PORT", "DIARY_DB_PORT") || 3306),
  user: pick("DATA_DB_USER", "DIARY_DB_USER"),
  password: pick("DATA_DB_PASSWORD", "DIARY_DB_PASSWORD"),
  database: pick("DATA_DB_NAME", "DIARY_DB_NAME")
};

const missing = Object.entries(config)
  .filter(([key, value]) => key !== "port" && !value)
  .map(([key]) => key);

function fallback(message) {
  if (strict) {
    console.error(`[sync] ${message}`);
    process.exit(1);
  }
  console.warn(`[sync] ${message}，沿用现有快照（若不存在则页面显示空状态）`);
  process.exit(0);
}

if (missing.length) {
  fallback(`缺少数据库环境变量 ${missing.join("、")}`);
}

/** 每日时间的分类，顺序同时写入 JSON，前端按此渲染 */
const FEEDBACK_CATEGORIES = [
  "work",
  "read",
  "stock_sb",
  "stock_xb",
  "studyself",
  "study",
  "account",
  "exercise",
  "temp",
  "other"
];

const round = value => Math.round(Number(value || 0) * 100) / 100;
const text = value => (value ? String(value).trim() || null : null);

const { createConnection } = await import("mysql2/promise");

let connection;
try {
  connection = await createConnection({ ...config, charset: "utf8mb4", dateStrings: true, connectTimeout: 15000 });

  // ---------------------------------------------------------------- 日记
  const [diaryRows] = await connection.query(
    `SELECT DATE_FORMAT(record_time, '%Y-%m-%d') AS day,
            work_diary, life_diary, others, COALESCE(label, '') AS label
       FROM dty_daily_diary
      WHERE record_time IS NOT NULL
      ORDER BY record_time DESC`
  );

  const diaryEntries = diaryRows
    .map(row => ({
      date: row.day,
      work: text(row.work_diary),
      life: text(row.life_diary),
      others: text(row.others),
      label: (row.label || "").trim()
    }))
    .filter(entry => entry.work || entry.life || entry.others);

  const diaryDays = diaryEntries.map(entry => entry.date).sort();

  writeSnapshot("daily-diary.json", {
    syncedAt: new Date().toISOString(),
    stats: {
      total: diaryEntries.length,
      days: new Set(diaryDays).size,
      start: diaryDays[0] ?? null,
      end: diaryDays[diaryDays.length - 1] ?? null
    },
    entries: diaryEntries
  });

  // ---------------------------------------------------------------- 每日时间
  const [feedbackRows] = await connection.query(
    `SELECT DATE_FORMAT(log_date, '%Y-%m-%d') AS day,
            read_period, work, stock_sb_period, stock_xb_period,
            studyself_period, account_period, exercise_period,
            study_type, study_hour,
            temporary_matters, temporary_type, other_period,
            summary
       FROM dty_daily_feedback
      WHERE log_date IS NOT NULL
      ORDER BY log_date DESC`
  );

  const feedbackEntries = feedbackRows.map(row => ({
    d: row.day,
    v: [
      round(row.work),
      round(row.read_period),
      round(row.stock_sb_period),
      round(row.stock_xb_period),
      round(row.studyself_period),
      round(row.study_hour),
      round(row.account_period),
      round(row.exercise_period),
      round(row.temporary_matters),
      round(row.other_period)
    ],
    st: row.study_type === null ? null : Number(row.study_type),
    tt: row.temporary_type === null ? null : Number(row.temporary_type),
    s: text(row.summary)
  }));

  const totalHours = feedbackEntries.reduce(
    (sum, entry) => sum + entry.v.reduce((daySum, hours) => daySum + hours, 0),
    0
  );
  const dates = feedbackEntries.map(entry => entry.d).sort();

  writeSnapshot("daily-feedback.json", {
    syncedAt: new Date().toISOString(),
    categories: FEEDBACK_CATEGORIES,
    stats: {
      days: feedbackEntries.length,
      hours: round(totalHours),
      start: dates[0] ?? null,
      end: dates[dates.length - 1] ?? null
    },
    entries: feedbackEntries
  });

  // ---------------------------------------------------------------- 季度 OKR
  const [okrRows] = await connection.query(
    `SELECT id, year, quarter, theme, objective, result, progress, status, action_status, notes,
            DATE_FORMAT(updated_at, '%Y-%m-%d') AS updated
       FROM dty_quarter_okr
      ORDER BY year DESC, quarter DESC, id ASC`
  );

  const okrEntries = okrRows.map(row => ({
    id: Number(row.id),
    year: Number(row.year),
    quarter: Number(row.quarter),
    theme: (row.theme || "").trim() || "其他",
    objective: (row.objective || "").trim(),
    result: (row.result || "").trim(),
    progress: Number(row.progress || 0),
    status: (row.status || "").trim() || "未开始",
    actionStatus: (row.action_status || "").trim() || "进行中",
    notes: text(row.notes),
    updated: row.updated ?? null
  }));

  const quarters = new Set(okrEntries.map(entry => `${entry.year}-Q${entry.quarter}`));
  const objectives = new Set(okrEntries.map(entry => `${entry.year}-Q${entry.quarter}|${entry.theme}|${entry.objective}`));
  const avgProgress = okrEntries.length
    ? round(okrEntries.reduce((sum, entry) => sum + entry.progress, 0) / okrEntries.length)
    : 0;

  writeSnapshot("quarter-okr.json", {
    syncedAt: new Date().toISOString(),
    stats: {
      quarters: quarters.size,
      objectives: objectives.size,
      krs: okrEntries.length,
      avgProgress
    },
    entries: okrEntries
  });

  // ---------------------------------------------------------------- 收支
  const [expenseRows] = await connection.query(
    `SELECT DATE_FORMAT(period, '%Y-%m-%d') AS day,
            amount, category, note
       FROM dty_daily_expense_v2
      WHERE period IS NOT NULL
      ORDER BY period DESC, id DESC`
  );

  const expenseEntries = expenseRows
    .map(row => ({
      d: row.day,
      a: round(row.amount),
      c: row.category,
      n: text(row.note)
    }))
    .filter(entry => entry.a > 0);

  const expenseTotal = round(expenseEntries.reduce((total, entry) => total + entry.a, 0));
  const expenseMonths = new Set(expenseEntries.map(entry => entry.d.slice(0, 7)));
  const expenseDates = expenseEntries.map(entry => entry.d).sort();

  writeSnapshot("daily-expense.json", {
    syncedAt: new Date().toISOString(),
    stats: {
      total: expenseTotal,
      count: expenseEntries.length,
      months: expenseMonths.size,
      start: expenseDates[0] ?? null,
      end: expenseDates[expenseDates.length - 1] ?? null,
      avgMonthly: expenseMonths.size ? round(expenseTotal / expenseMonths.size) : 0
    },
    entries: expenseEntries
  });

  // ---------------------------------------------------------------- 运动
  const [exerciseRows] = await connection.query(
    `SELECT DATE_FORMAT(log_date, '%Y-%m-%d') AS day,
            type, duration, number, note
       FROM dty_exercise
      WHERE log_date IS NOT NULL
      ORDER BY log_date DESC, record_time DESC`
  );

  const exerciseEntries = exerciseRows.map(row => ({
    d: row.day,
    t: (row.type || "").trim() || "其他",
    du: round(row.duration),
    nu: round(row.number),
    n: text(row.note)
  }));

  const exerciseDates = exerciseEntries.map(entry => entry.d).sort();
  const runningEntries = exerciseEntries.filter(entry => entry.t === "跑步");
  const swimmingEntries = exerciseEntries.filter(entry => entry.t === "游泳");

  writeSnapshot("exercise.json", {
    syncedAt: new Date().toISOString(),
    stats: {
      total: exerciseEntries.length,
      types: new Set(exerciseEntries.map(entry => entry.t)).size,
      days: new Set(exerciseDates).size,
      distance: round(runningEntries.reduce((sum, entry) => sum + entry.nu, 0)),
      duration: round(swimmingEntries.reduce((sum, entry) => sum + entry.du, 0)),
      months: new Set(exerciseDates.map(day => day.slice(0, 7))).size,
      start: exerciseDates[0] ?? null,
      end: exerciseDates[exerciseDates.length - 1] ?? null
    },
    entries: exerciseEntries
  });

  // ---------------------------------------------------------------- 读书
  const [bookRows] = await connection.query(
    `SELECT id, title, status,
            DATE_FORMAT(start_date, '%Y-%m-%d') AS start,
            DATE_FORMAT(finish_date, '%Y-%m-%d') AS finish
       FROM dty_books
      ORDER BY finish_date DESC, id ASC`
  );

  const bookEntries = bookRows
    .filter(row => row.finish)
    .map(row => ({
      id: row.id,
      t: row.title,
      s: row.start ?? null,
      d: row.finish,
      st: row.status ?? "已完成"
    }));

  const bookDates = bookEntries.map(entry => entry.d).sort();

  writeSnapshot("books.json", {
    syncedAt: new Date().toISOString(),
    stats: {
      total: bookEntries.length,
      months: new Set(bookDates.map(day => day.slice(0, 7))).size,
      years: new Set(bookDates.map(day => day.slice(0, 4))).size,
      start: bookDates[0] ?? null,
      end: bookDates[bookDates.length - 1] ?? null,
      latest: bookEntries[0]?.t ?? null
    },
    entries: bookEntries
  });
} catch (error) {
  fallback(`连接或查询失败：${error.message}`);
} finally {
  await connection?.end().catch(() => {});
}

function writeSnapshot(name, payload) {
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(resolve(OUT_DIR, name), JSON.stringify(payload), "utf8");
  const size = (JSON.stringify(payload).length / 1024).toFixed(1);
  console.log(`[sync] ${name} 已更新（约 ${size}KB）`);
}
