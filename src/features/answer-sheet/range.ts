const MAX_QUESTION_NUMBER = 999
const MAX_QUESTION_COUNT = 300
const RANGE_SEGMENT_PATTERN = /^\s*(\d{1,3})(?:\s*[-–—]\s*(\d{1,3}))?\s*$/

export interface ParsedQuestionRange {
  valid: boolean
  numbers: number[]
  message?: string
}

export function parseQuestionRange(range?: string): ParsedQuestionRange {
  if (!range?.trim()) return { valid: false, numbers: [], message: '未设置题号范围' }
  const segments = range.split(/[,，、]/).map((segment) => segment.trim()).filter(Boolean)
  if (!segments.length) return { valid: false, numbers: [], message: '请使用“1”“1–20”或“1–10，12–20”格式' }

  const numbers: number[] = []
  for (const segment of segments) {
    const match = segment.match(RANGE_SEGMENT_PATTERN)
    if (!match) return { valid: false, numbers: [], message: '请使用“1”“1–20”或“1–10，12–20”格式' }
    const start = Number(match[1])
    const end = Number(match[2] ?? match[1])
    if (start < 1 || end < 1 || start > MAX_QUESTION_NUMBER || end > MAX_QUESTION_NUMBER) {
      return { valid: false, numbers: [], message: `题号需在 1–${MAX_QUESTION_NUMBER} 之间` }
    }
    if (end < start) return { valid: false, numbers: [], message: '结束题号不能小于起始题号' }
    if (numbers.length + end - start + 1 > MAX_QUESTION_COUNT) {
      return { valid: false, numbers: [], message: `单个题块最多包含 ${MAX_QUESTION_COUNT} 道题` }
    }
    for (let number = start; number <= end; number += 1) numbers.push(number)
  }

  if (new Set(numbers).size !== numbers.length) {
    return { valid: false, numbers: [], message: '同一题块内存在重复题号' }
  }
  return { valid: true, numbers }
}

export function questionNumbers(range?: string): number[] {
  return parseQuestionRange(range).numbers
}

export function formatQuestionRange(numbers: number[]): string {
  const sorted = [...new Set(numbers)].sort((a, b) => a - b)
  if (!sorted.length) return ''
  const segments: string[] = []
  let start = sorted[0]
  let previous = sorted[0]
  for (let index = 1; index <= sorted.length; index += 1) {
    const current = sorted[index]
    if (current === previous + 1) {
      previous = current
      continue
    }
    segments.push(start === previous ? `${start}` : `${start}–${previous}`)
    if (current === undefined) break
    start = current
    previous = current
  }
  return segments.join('，')
}
