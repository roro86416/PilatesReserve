const HHMM_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

function toMin(hhmm) {
  const m = HHMM_RE.exec(hhmm);
  if (!m) throw new Error(`Invalid HH:mm: ${hhmm}`);
  const h = +m[1],
    min = +m[2];
  return h * 60 + min;
}
function toHHMM(mins) {
  const h = String(Math.floor(mins / 60)).padStart(2, "0");
  const m = String(mins % 60).padStart(2, "0");
  return `${h}:${m}`;
}

/**
 * 檢查設定是否正確，不正確直接丟錯
 */
export function validateSlotConfig(startHHMM, endHHMM, stepMin = 60) {
  if (!HHMM_RE.test(startHHMM)) throw new Error("WORK_START 格式錯誤");
  if (!HHMM_RE.test(endHHMM)) throw new Error("WORK_END 格式錯誤");
  if (!Number.isInteger(stepMin) || stepMin <= 0)
    throw new Error("SLOT_MINUTES 必須是正整數");
  if (stepMin > 24 * 60) throw new Error("SLOT_MINUTES 不可超過 1440");
  const start = toMin(startHHMM);
  const end = toMin(endHHMM);
  if (start >= end) throw new Error("起始時間需早於結束時間");
  // 可選：要求整除，避免尾端殘段
  const span = end - start;
  if (span % stepMin !== 0) throw new Error("時間區間需能被 SLOT_MINUTES 整除");
  return { start, end, stepMin };
}

/**
 * 產生時段清單（含防呆）
 */
export function buildSlots(startHHMM, endHHMM, stepMin = 60) {
  const {
    start,
    end,
    stepMin: step,
  } = validateSlotConfig(startHHMM, endHHMM, stepMin);
  const out = [];
  for (let t = start, guard = 0; t < end; t += step) {
    out.push(toHHMM(t));
    if (++guard > 1440) throw new Error("Guard: 無限迴圈保護");
  }
  return out;
}
