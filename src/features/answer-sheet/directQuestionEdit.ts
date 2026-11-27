import type { AnswerBlock, QuestionGroupDraft, QuestionGroupType } from './types'
import { questionNumbers } from './range'

export const MAX_CHOICE_OPTIONS = 8

export function canEditQuestionGroup(block: AnswerBlock) {
  return !block.locked && !block.mergedParts?.length && ['objective', 'short-answer', 'essay'].includes(block.kind)
    && questionNumbers(block.range).length > 0
}

/** Adapt older templates to the same editor contract without losing per-question scores. */
export function editableQuestionGroup(block: AnswerBlock): QuestionGroupDraft {
  if (block.questionGroupDraft) return structuredClone(block.questionGroupDraft)
  const numbers = questionNumbers(block.range)
  const type: QuestionGroupType = block.kind === 'objective' ? block.objectiveMode ?? 'single' : block.kind === 'essay' ? 'essay' : block.answerVariant === 'fill' ? 'fill' : 'solution'
  const items: QuestionGroupDraft['items'] = numbers.map((number, index) => {
    const count = block.answerSlotCounts?.[index] ?? 0
    const scores = Array.from({ length: count }, (_, sub) => block.questionScores?.[`${number}.${sub + 1}`] ?? (block.score ?? 0) / Math.max(1, numbers.length) / Math.max(1, count))
    return { number, score: block.questionScores?.[String(number)] ?? (count ? scores.reduce((a, b) => a + b, 0) : (block.score ?? 0) / Math.max(1, numbers.length)), blankCount: type === 'fill' ? Math.max(1, count) : 1, fillStyle: 'lines', lineCount: block.questionLineCounts?.[String(number)] ?? block.lineCount ?? 3, subquestionCount: type === 'fill' ? 0 : count, subquestionScores: scores, blankScores: type === 'fill' ? scores : undefined, optionCount: Math.max(4, Math.min(MAX_CHOICE_OPTIONS, block.optionCount ?? 4)), answer: block.objectiveAnswers?.[String(number)]?.join('') ?? '', partialScore: block.partialCreditScores?.[String(number)] ?? 0 }
  })
  return { title: block.title, type, groupType: block.questionGroupType ?? 'normal', startNumber: numbers[0] ?? 1, questionCount: numbers.length, totalScore: block.score ?? 0, optionCount: block.optionCount ?? 4, items }
}

/** First split preserves the parent score; later additions preserve existing children. */
export function appendSubquestion(draft: QuestionGroupDraft, number: number): QuestionGroupDraft {
  const next = structuredClone(draft)
  const item = next.items.find((entry) => entry.number === number)
  if (!item) return next
  const oldCount = item.subquestionCount
  const count = oldCount ? oldCount + 1 : 2
  const scores = oldCount ? [...(item.subquestionScores ?? Array.from({ length: oldCount }, () => item.score / oldCount)), 0] : [Number((item.score / 2).toFixed(2)), Number((item.score - Number((item.score / 2).toFixed(2))).toFixed(2))]
  Object.assign(item, { subquestionCount: count, subquestionScores: scores, subquestionOptionCounts: Array.from({ length: count }, (_, i) => item.subquestionOptionCounts?.[i] ?? item.optionCount), subquestionPartialScores: Array.from({ length: count }, (_, i) => item.subquestionPartialScores?.[i] ?? item.partialScore ?? 0), subquestionBlankCounts: Array.from({ length: count }, (_, i) => item.subquestionBlankCounts?.[i] ?? 1), subquestionBlankScores: scores.map((score, i) => item.subquestionBlankScores?.[i] ?? [score]), subquestionFillStyles: Array.from({ length: count }, (_, i) => item.subquestionFillStyles?.[i] ?? item.fillStyle), subquestionTypes: Array.from({ length: count }, (_, i) => item.subquestionTypes?.[i] ?? 'solution') })
  return next
}

export interface QuestionItemPatch {
  score?: number
  optionCount?: number
  blankCount?: number
  blankScore?: number
  partialScore?: number
}

export interface QuestionBatchPatch extends QuestionItemPatch {
  questionCount?: number
}

type Item = QuestionGroupDraft['items'][number]
const round = (value: number) => Math.round(value * 100) / 100
const distribute = (score: number, count: number) => {
  const cents = Math.round(score * 100)
  return Array.from({ length: count }, (_, index) => (Math.floor(cents / count) + (index < cents % count ? 1 : 0)) / 100)
}
const summarize = (draft: QuestionGroupDraft, items: Item[]) => ({
  ...draft, items, questionCount: items.length, startNumber: items[0]?.number ?? draft.startNumber,
  totalScore: round(items.reduce((total, item) => total + item.score, 0)),
})

function patchItem(type: QuestionGroupType, item: Item, patch: QuestionItemPatch, subIndex?: number): Item {
  const next = structuredClone(item)
  const child = subIndex !== undefined && subIndex >= 0 && subIndex < item.subquestionCount
  const choice = type === 'single' || type === 'multiple'
  const score = patch.score === undefined ? undefined : round(Math.max(0, patch.score))
  if (choice && patch.optionCount !== undefined && Number.isInteger(patch.optionCount) && patch.optionCount >= 4 && patch.optionCount <= MAX_CHOICE_OPTIONS) {
    const count = patch.optionCount
    if (!child) next.optionCount = count
    if (item.subquestionCount) next.subquestionOptionCounts = Array.from({ length: item.subquestionCount }, (_, index) =>
      !child || index === subIndex ? count : item.subquestionOptionCounts?.[index] ?? item.optionCount)
  }
  if (item.subquestionCount) {
    const previousScores = item.subquestionScores ?? distribute(item.score, item.subquestionCount)
    const scores = score !== undefined && !child ? distribute(score, item.subquestionCount) : [...previousScores]
    if (child && score !== undefined) scores[subIndex] = score
    if (type === 'fill') {
      const counts = Array.from({ length: item.subquestionCount }, (_, index) =>
        (!child || index === subIndex) && patch.blankCount !== undefined ? patch.blankCount : item.subquestionBlankCounts?.[index] ?? 1)
      next.subquestionBlankCounts = counts
      next.subquestionBlankScores = counts.map((count, index) => {
        const affected = !child || index === subIndex
        const prior = item.subquestionBlankScores?.[index]
        if (affected && patch.blankScore !== undefined) return Array(count).fill(round(patch.blankScore))
        if (prior?.length === count && (!affected || score === undefined)) return prior
        return distribute(scores[index], count)
      })
      next.subquestionScores = next.subquestionBlankScores.map((values) => round(values.reduce((a, b) => a + b, 0)))
    } else next.subquestionScores = scores
    next.score = round(next.subquestionScores.reduce((a, b) => a + b, 0))
    if (type === 'multiple') next.subquestionPartialScores = next.subquestionScores.map((maxScore, index) =>
      Math.min(maxScore, ((!child || index === subIndex) ? patch.partialScore : undefined) ?? item.subquestionPartialScores?.[index] ?? item.partialScore ?? 0))
  } else {
    if (score !== undefined) next.score = score
    if (type === 'fill') {
      next.blankCount = patch.blankCount ?? item.blankCount
      if (patch.blankScore !== undefined) next.blankScores = Array(next.blankCount).fill(round(patch.blankScore))
      else if (score !== undefined || next.blankCount !== item.blankCount) next.blankScores = distribute(next.score, next.blankCount)
      if (next.blankScores?.length) next.score = round(next.blankScores.reduce((a, b) => a + b, 0))
    }
    if (type === 'multiple') next.partialScore = Math.min(next.score, patch.partialScore ?? item.partialScore ?? 0)
  }
  return next
}

function validPatch(patch: QuestionItemPatch) {
  return Object.values(patch).every((value) => Number.isFinite(value) && value >= 0)
    && (patch.blankCount === undefined || Number.isInteger(patch.blankCount) && patch.blankCount >= 1 && patch.blankCount <= 20)
}

export function updateQuestionItem(draft: QuestionGroupDraft, number: number, patch: QuestionItemPatch, subIndex?: number) {
  if (!validPatch(patch) || !draft.items.some((item) => item.number === number)) return draft
  return summarize(draft, draft.items.map((item) => item.number === number ? patchItem(draft.type, item, patch, subIndex) : item))
}

export function applyQuestionBatch(draft: QuestionGroupDraft, patch: QuestionBatchPatch) {
  const { questionCount, ...fields } = patch
  const count = questionCount ?? draft.items.length
  if (!validPatch(fields) || !Number.isInteger(count) || count < 1 || count > 300) return draft
  const items = draft.items.slice(0, count)
  const last = draft.items[draft.items.length - 1]
  if (!last || last.number + Math.max(0, count - items.length) > 999) return draft
  for (let index = items.length; index < count; index += 1) {
    items.push({ ...structuredClone(last), number: last.number + index - draft.items.length + 1, answer: '' })
  }
  return summarize(draft, Object.keys(fields).length ? items.map((item) => patchItem(draft.type, item, fields)) : items)
}

export function appendQuestionOption(draft: QuestionGroupDraft, number: number, subIndex?: number) {
  const item = draft.items.find((entry) => entry.number === number)
  if (!item || !['single', 'multiple'].includes(draft.type)) return draft
  const count = subIndex === undefined ? item.optionCount : item.subquestionOptionCounts?.[subIndex] ?? item.optionCount
  return count >= MAX_CHOICE_OPTIONS ? draft : updateQuestionItem(draft, number, { optionCount: count + 1 }, subIndex)
}

export function appendQuestionBlank(draft: QuestionGroupDraft, number: number, subIndex?: number) {
  const item = draft.items.find((entry) => entry.number === number)
  if (draft.type !== 'fill' || !item || (item.subquestionCount && subIndex === undefined)) return draft
  const count = subIndex === undefined ? item.blankCount : item.subquestionBlankCounts?.[subIndex] ?? 1
  return updateQuestionItem(draft, number, { blankCount: count + 1 }, subIndex)
}

export function removeQuestionItem(draft: QuestionGroupDraft, number: number) {
  return summarize(draft, draft.items.filter((item) => item.number !== number))
}

export function removeQuestionSubpart(draft: QuestionGroupDraft, number: number, subIndex: number) {
  const source = draft.items.find((item) => item.number === number)
  if (!source || source.subquestionCount <= (draft.type === 'comprehensive' ? 2 : 0) || subIndex < 0 || subIndex >= source.subquestionCount) return draft
  const item = structuredClone(source)
  item.subquestionScores ??= distribute(item.score, item.subquestionCount)
  for (const field of ['subquestionScores', 'subquestionOptionCounts', 'subquestionPartialScores', 'subquestionBlankCounts', 'subquestionBlankScores', 'subquestionFillStyles', 'subquestionTypes'] as const) {
    item[field]?.splice(subIndex, 1)
  }
  item.subquestionCount -= 1
  item.score = round(item.subquestionScores.reduce((a, b) => a + b, 0))
  if (draft.type === 'fill' && item.subquestionCount === 0) item.blankScores = distribute(item.score, item.blankCount)
  return summarize(draft, draft.items.map((entry) => entry.number === number ? item : entry))
}

export function appendGroupQuestion(draft: QuestionGroupDraft, number: number) {
  const last = draft.items[draft.items.length - 1]
  if (!last || number < 1 || number > 999 || draft.items.length >= 300 || draft.items.some((item) => item.number === number)) return draft
  const item: Item = {
    number, score: last.score, blankCount: last.blankCount, fillStyle: last.fillStyle,
    lineCount: last.lineCount, subquestionCount: 0, optionCount: last.optionCount, answer: '',
  }
  if (draft.type === 'multiple') item.partialScore = Math.min(last.score, last.partialScore ?? 0)
  if (draft.type === 'fill') {
    item.blankStyles = last.blankStyles?.slice(0, item.blankCount)
    item.blankScores = distribute(item.score, item.blankCount)
  }
  if (draft.type === 'comprehensive') {
    item.subquestionCount = Math.max(2, last.subquestionCount)
    item.subquestionTypes = Array.from({ length: item.subquestionCount }, (_, index) => last.subquestionTypes?.[index] ?? 'solution')
    item.subquestionScores = distribute(item.score, item.subquestionCount)
  }
  return summarize(draft, [...draft.items, item])
}

export function addGroupQuestionSubparts(draft: QuestionGroupDraft, selectedNumbers: readonly number[], quantity: number) {
  const selected = new Set(selectedNumbers)
  if (!selected.size || !Number.isInteger(quantity) || quantity < 1
    || draft.items.some((item) => selected.has(item.number) && item.subquestionCount + quantity > 20)) return draft
  const items = draft.items.map((item) => {
    if (!selected.has(item.number)) return item
    const oldCount = item.subquestionCount
    const count = Math.max(draft.type === 'comprehensive' ? 2 : 1, oldCount + quantity)
    const oldScores = item.subquestionScores ?? distribute(item.score, oldCount)
    const scores = oldCount ? Array.from({ length: count }, (_, index) => oldScores[index] ?? 0) : distribute(item.score, count)
    const next = { ...item, subquestionCount: count, subquestionScores: scores }
    if (draft.type === 'single' || draft.type === 'multiple') {
      next.subquestionOptionCounts = scores.map((_, index) => item.subquestionOptionCounts?.[index] ?? item.optionCount)
      if (draft.type === 'multiple') next.subquestionPartialScores = scores.map((score, index) =>
        Math.min(score, item.subquestionPartialScores?.[index] ?? item.partialScore ?? 0))
    }
    if (draft.type === 'fill') {
      next.subquestionBlankCounts = scores.map((_, index) => item.subquestionBlankCounts?.[index] ?? (index === 0 && !oldCount ? item.blankCount : 1))
      next.subquestionBlankScores = next.subquestionBlankCounts.map((blanks, index) => item.subquestionBlankScores?.[index] ?? distribute(scores[index], blanks))
      next.subquestionFillStyles = scores.map((_, index) => item.subquestionFillStyles?.[index] ?? item.fillStyle)
    }
    if (draft.type === 'comprehensive') next.subquestionTypes = scores.map((_, index) => item.subquestionTypes?.[index] ?? 'solution')
    return next
  })
  return summarize(draft, items)
}

export interface GroupQuestionSelection {
  number: number
  subIndex?: number
}

export function deleteGroupQuestionSelection(draft: QuestionGroupDraft, selection: readonly GroupQuestionSelection[]) {
  if (!selection.length) return draft
  const whole = new Set(selection.filter((entry) => entry.subIndex === undefined).map((entry) => entry.number))
  const parts = new Map<number, number[]>()
  for (const { number, subIndex } of selection) {
    const item = draft.items.find((entry) => entry.number === number)
    if (subIndex === undefined || !item || whole.has(number) || subIndex < 0 || subIndex >= item.subquestionCount || !Number.isInteger(subIndex)) continue
    const indexes = parts.get(number) ?? []
    if (!indexes.includes(subIndex)) parts.set(number, [...indexes, subIndex])
  }
  if (draft.type === 'comprehensive' && [...parts].some(([number, indexes]) =>
    (draft.items.find((item) => item.number === number)?.subquestionCount ?? 0) - indexes.length < 2)) return draft
  const remaining = draft.items.filter((item) => !whole.has(item.number))
  let next = remaining.length === draft.items.length ? draft : summarize(draft, remaining)
  for (const [number, indexes] of parts) {
    for (const index of indexes.sort((a, b) => b - a)) next = removeQuestionSubpart(next, number, index)
  }
  return next
}

export function setGroupSubquestionType(
  draft: QuestionGroupDraft,
  selection: readonly GroupQuestionSelection[],
  type: Exclude<QuestionGroupType, 'comprehensive'>,
) {
  if (draft.type !== 'comprehensive' || !selection.length) return draft
  const byQuestion = new Map<number, Set<number | undefined>>()
  for (const { number, subIndex } of selection) {
    const indexes = byQuestion.get(number) ?? new Set()
    indexes.add(subIndex)
    byQuestion.set(number, indexes)
  }

  let changed = false
  const items = draft.items.map((item) => {
    const indexes = byQuestion.get(item.number)
    if (!indexes || !item.subquestionCount) return item
    const previous = item.subquestionTypes
    const all = indexes.has(undefined)
    const subquestionTypes = Array.from({ length: item.subquestionCount }, (_, index) =>
      all || indexes.has(index) ? type : previous?.[index])
    if (subquestionTypes.every((value, index) => value === previous?.[index])) return item
    changed = true
    return { ...item, subquestionTypes }
  })
  return changed ? { ...draft, items } : draft
}
