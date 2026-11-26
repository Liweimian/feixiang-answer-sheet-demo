import type { AnswerBlock, QuestionGroupDraft, QuestionGroupType } from './types'
import { questionNumbers } from './range'

/** Adapt older templates to the same editor contract without losing per-question scores. */
export function editableQuestionGroup(block: AnswerBlock): QuestionGroupDraft {
  if (block.questionGroupDraft) return structuredClone(block.questionGroupDraft)
  const numbers = questionNumbers(block.range)
  const type: QuestionGroupType = block.kind === 'objective' ? block.objectiveMode ?? 'single' : block.kind === 'essay' ? 'essay' : block.answerVariant === 'fill' ? 'fill' : 'solution'
  const items: QuestionGroupDraft['items'] = numbers.map((number, index) => {
    const count = block.answerSlotCounts?.[index] ?? 0
    const scores = Array.from({ length: count }, (_, sub) => block.questionScores?.[`${number}.${sub + 1}`] ?? (block.score ?? 0) / Math.max(1, numbers.length) / Math.max(1, count))
    return { number, score: block.questionScores?.[String(number)] ?? (count ? scores.reduce((a, b) => a + b, 0) : (block.score ?? 0) / Math.max(1, numbers.length)), blankCount: type === 'fill' ? Math.max(1, count) : 1, fillStyle: 'lines', lineCount: block.questionLineCounts?.[String(number)] ?? block.lineCount ?? 3, subquestionCount: type === 'fill' ? 0 : count, subquestionScores: scores, blankScores: type === 'fill' ? scores : undefined, optionCount: block.optionCount === 5 ? 5 as const : 4 as const, answer: block.objectiveAnswers?.[String(number)]?.join('') ?? '', partialScore: block.partialCreditScores?.[String(number)] ?? 0 }
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
