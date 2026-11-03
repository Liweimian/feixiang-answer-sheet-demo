const MAX_QUESTION_NUMBER = 999
const MAX_QUESTION_COUNT = 300
const RANGE_PATTERN = /^\s*(\d{1,3})(?:\s*[-–—]\s*(\d{1,3}))?\s*$/

export interface ParsedQuestionRange {
  valid: boolean
  numbers: number[]
  message?: string
}

export function parseQuestionRange(range?: string): ParsedQuestionRange {
  if (!range?.trim()) return { valid: false, numbers: [], message: '未设置题号范围' }
  const match = range.match(RANGE_PATTERN)
  if (!match) return { valid: false, numbers: [], message: '请使用“1”或“1–20”格式' }

  const start = Number(match[1])
  const end = Number(match[2] ?? match[1])
  if (start < 1 || end < 1 || start > MAX_QUESTION_NUMBER || end > MAX_QUESTION_NUMBER) {
    return { valid: false, numbers: [], message: `题号需在 1–${MAX_QUESTION_NUMBER} 之间` }
  }
  if (end < start) return { valid: false, numbers: [], message: '结束题号不能小于起始题号' }
  if (end - start + 1 > MAX_QUESTION_COUNT) {
    return { valid: false, numbers: [], message: `单个题块最多包含 ${MAX_QUESTION_COUNT} 道题` }
  }

  return {
    valid: true,
    numbers: Array.from({ length: end - start + 1 }, (_, index) => start + index),
  }
}

export function questionNumbers(range?: string): number[] {
  return parseQuestionRange(range).numbers
}
