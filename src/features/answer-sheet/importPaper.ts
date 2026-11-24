import { answerSheetTemplates, defaultAnswerSheetDocument, instantiateTemplate } from '../../data/answerSheetTemplates'
import type { AnswerBlock, AnswerSheetDocument, QuestionGroupDraft, QuestionGroupType } from './types'
import { questionNumbers } from './range'

const questionPattern = /^\s*(\d{1,3})\s*[.．、]\s*(?:[（(]\s*(\d+(?:\.\d+)?)\s*分\s*[）)])?/
const sectionPattern = /^\s*[一二三四五六七八九十]+[、.．]\s*(.+)$/

function inferType(label: string): QuestionGroupType {
  if (/多选/.test(label)) return 'multiple'
  if (/判断/.test(label)) return 'judge'
  if (/填空|完形/.test(label)) return 'fill'
  if (/作文|写作/.test(label)) return 'essay'
  if (/综合|阅读理解/.test(label)) return 'comprehensive'
  if (/解答|简答|计算|应用/.test(label)) return 'solution'
  return 'single'
}

function sampleAnswerSheet(file: File): AnswerSheetDocument {
  const sample = structuredClone(defaultAnswerSheetDocument)
  const blocks = sample.blocks.map((block) => {
    if (!['objective', 'short-answer', 'essay'].includes(block.kind)) return { ...block, sectionId: undefined, locked: false }
    const numbers = questionNumbers(block.range)
    const type: QuestionGroupType = block.kind === 'objective' ? block.objectiveMode ?? 'single' : block.kind === 'essay' ? 'essay' : 'solution'
    const unitScore = numbers.length ? Number(((block.score ?? 0) / numbers.length).toFixed(2)) : 0
    const items: QuestionGroupDraft['items'] = numbers.map((number, index) => ({
      number,
      score: block.questionScores?.[String(number)] ?? (index === numbers.length - 1 ? Number(((block.score ?? 0) - unitScore * index).toFixed(2)) : unitScore),
      blankCount: 1,
      fillStyle: 'lines',
      lineCount: 3,
      subquestionCount: block.answerSlotCounts?.[index] ?? 0,
      optionCount: 4,
      answer: '',
    }))
    const draft: QuestionGroupDraft = {
      title: block.title,
      type,
      groupType: 'normal',
      startNumber: numbers[0] ?? 1,
      questionCount: numbers.length,
      totalScore: block.score ?? 0,
      optionCount: block.optionCount ?? 4,
      items,
    }
    return { ...block, sectionId: undefined, locked: false, userInserted: true, questionGroupDraft: draft }
  })
  return {
    ...sample,
    paper: { ...sample.paper, id: `uploaded-${Date.now()}`, title: `${file.name.replace(/\.[^.]+$/, '')}答题卡`, sourceLabel: `上传试卷演示：${file.name}`, sections: [] },
    settings: { ...sample.settings, linkedPaperId: '' },
    blocks,
  }
}

async function readPaperText(file: File): Promise<string> {
  const extension = file.name.split('.').pop()?.toLowerCase()
  if (extension === 'txt' || extension === 'md') return file.text()
  if (extension === 'docx') {
    const mammoth = (await import('mammoth')).default
    const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })
    return result.value
  }
  if (extension === 'pdf') {
    const [{ getDocument, GlobalWorkerOptions }, { default: pdfWorkerUrl }] = await Promise.all([
      import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
    ])
    GlobalWorkerOptions.workerSrc = pdfWorkerUrl
    const pdf = await getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise
    const pages: string[] = []
    for (let index = 1; index <= pdf.numPages; index++) {
      const page = await pdf.getPage(index)
      const content = await page.getTextContent()
      let previousY: number | undefined
      const lines: string[] = []
      for (const item of content.items) {
        if (!('str' in item)) continue
        const y = item.transform[5]
        if (previousY !== undefined && Math.abs(y - previousY) > 3) lines.push('\n')
        lines.push(item.str)
        previousY = y
      }
      pages.push(lines.join(''))
    }
    return pages.join('\n')
  }
  return ''
}

export async function importPaperAsAnswerSheet(file: File): Promise<AnswerSheetDocument> {
  const text = await readPaperText(file).catch(() => '')
  const groups: Array<{ title: string; type: QuestionGroupType; totalScore?: number; questions: Array<{ number: number; score: number }> }> = []
  let current: typeof groups[number] | undefined
  for (const line of text.split(/\r?\n/)) {
    const section = line.match(sectionPattern)
    if (section) {
      current = { title: section[0].trim(), type: inferType(section[1]), totalScore: Number(section[1].match(/(?:共|合)\s*(\d+(?:\.\d+)?)\s*分/)?.[1] ?? 0) || undefined, questions: [] }
      groups.push(current)
      continue
    }
    const question = line.match(questionPattern)
    if (!question) continue
    if (!current) {
      current = { title: '一、选择题', type: 'single', questions: [] }
      groups.push(current)
    }
    const number = Number(question[1])
    if (!current.questions.some((item) => item.number === number)) current.questions.push({ number, score: Number(question[2] ?? 0) })
  }
  const recognized = groups.filter((group) => group.questions.length > 0)
  if (!recognized.length) return sampleAnswerSheet(file)
  for (const group of recognized) {
    if (!group.totalScore || group.questions.some((item) => item.score > 0)) continue
    const unitScore = Number((group.totalScore / group.questions.length).toFixed(2))
    group.questions.forEach((item, index) => { item.score = index === group.questions.length - 1 ? Number((group.totalScore! - unitScore * index).toFixed(2)) : unitScore })
  }
  const template = answerSheetTemplates.find((item) => item.id === 'true-blank')!
  const base = instantiateTemplate(template)
  const blocks: AnswerBlock[] = recognized.map((group, index) => {
    const numbers = group.questions.map((item) => item.number)
    const start = Math.min(...numbers)
    const end = Math.max(...numbers)
    const score = group.questions.reduce((total, item) => total + item.score, 0)
    const kind = ['single', 'multiple', 'judge'].includes(group.type) ? 'objective' : group.type === 'essay' ? 'essay' : 'short-answer'
    const items: QuestionGroupDraft['items'] = group.questions.map((item) => ({ number: item.number, score: item.score, blankCount: 1, fillStyle: 'lines', lineCount: 3, subquestionCount: 0, optionCount: 4, answer: '' }))
    const draft: QuestionGroupDraft = { title: group.title, type: group.type, groupType: 'normal', startNumber: start, questionCount: group.questions.length, totalScore: score, optionCount: group.type === 'judge' ? 2 : 4, items }
    return {
      id: `imported-${index}-${Date.now()}`, page: 1, title: group.title, range: start === end ? String(start) : `${start}–${end}`,
      kind, score, height: kind === 'objective' ? Math.max(112, Math.ceil(items.length / 4) * 26 + 54) : Math.max(150, items.length * 55),
      canvasY: 0, canvasX: 0, canvasWidth: 100, showScore: true, showQuestionCount: true, showUnitScore: true,
      objectiveMode: kind === 'objective' ? (group.type as 'single' | 'multiple' | 'judge') : undefined,
      optionCount: kind === 'objective' ? draft.optionCount : undefined,
      answerVariant: group.type === 'fill' ? 'fill' : group.type === 'solution' || group.type === 'essay' ? 'solution' : undefined,
      answerSlotCounts: group.type === 'fill' ? items.map(() => 1) : undefined,
      responseStyle: kind === 'essay' ? 'grid' : kind === 'short-answer' ? 'lines' : undefined,
      lineCount: kind === 'objective' ? undefined : 3,
      questionScores: Object.fromEntries(items.map((item) => [group.type === 'fill' ? `${item.number}.1` : String(item.number), item.score])),
      questionGroupDraft: draft, userInserted: true, locked: false,
    }
  })
  let nextY = 0
  for (const block of blocks) { block.canvasY = nextY; nextY += block.height }
  const title = file.name.replace(/\.[^.]+$/, '')
  const subject = ['语文', '数学', '英语', '物理', '化学', '生物', '历史', '地理'].find((value) => title.includes(value)) ?? '未设置'
  return {
    ...base,
    paper: { ...base.paper, id: `uploaded-${Date.now()}`, title: `${title}答题卡`, subject, grade: '未设置', sourceLabel: `上传试卷：${file.name}`, score: blocks.reduce((sum, block) => sum + (block.score ?? 0), 0), sections: [] },
    settings: { ...base.settings, linkedPaperId: '' },
    blocks,
  }
}
