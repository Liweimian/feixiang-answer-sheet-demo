import { useEffect, useMemo, useRef, useState } from 'react'
import { MetisMessage } from '@yuanfudao/metis-web-component'
import { defaultAnswerSheetDocument } from '../data/answerSheetTemplates'
import { cloneHeaderLayout, instantiateHeaderTemplate } from '../data/headerTemplates'
import { rulePacks } from '../data/mockPaper'
import { autoFixBlocks, buildPreflightChecks } from '../features/answer-sheet/preflight'
import { downloadAnnotatedAnswerSheet } from '../features/answer-sheet/export'
import {
  consolidateBlocks,
  mergeModulesByCategory,
  mergeObjectiveModules,
  mergeSelectedBlocks,
  mergeWithNext,
  moveBlock as moveBlockOperation,
  renumberQuestionBlocks,
  reorderBlock,
  splitBlock,
  splitMergedBlock,
  splitMergedModulesByCategory,
} from '../features/answer-sheet/operations'
import type {
  AnswerBlock,
  AnswerBlockKind,
  AnswerSheetDocument,
  AnswerSheetSettings,
  ContentElement,
  DraftSnapshot,
  HeaderLayout,
  HeaderPreset,
  HeaderTemplateId,
  PublishedVersion,
  QuestionGroupDraft,
  QuestionGroupType,
} from '../features/answer-sheet/types'
import { isQuestionBlockKind } from '../features/answer-sheet/types'
import { answerSheetService } from '../services/answerSheetService'
import { EditorToolbar } from '../components/EditorToolbar'
import { EditorWorkbench } from '../components/EditorWorkbench'
import { PreflightDialog } from '../components/PreflightDialog'
import { QuestionGroupDialog } from '../components/QuestionGroupDialog'
import { ObjectiveAnswerDialog } from '../components/ObjectiveAnswerDialog'
import { OriginalPaperReference } from '../components/OriginalPaperReference'
import { questionNumbers } from '../features/answer-sheet/range'

function cloneDefaultDocument(): AnswerSheetDocument {
  return {
    ...defaultAnswerSheetDocument,
    mode: 'smart',
    paper: {
      ...defaultAnswerSheetDocument.paper,
      sections: defaultAnswerSheetDocument.paper.sections.map((section) => ({ ...section })),
    },
    blocks: defaultAnswerSheetDocument.blocks.map((block) => ({ ...block, locked: false, answerSlotCounts: block.answerSlotCounts ? [...block.answerSlotCounts] : undefined, answerSlotNumbers: block.answerSlotNumbers?.map((numbers) => [...numbers]), answerSlotNumberStyles: block.answerSlotNumberStyles ? [...block.answerSlotNumberStyles] : undefined, answerSlotSettings: block.answerSlotSettings ? structuredClone(block.answerSlotSettings) : undefined, questionScores: block.questionScores ? { ...block.questionScores } : undefined, contentElements: block.contentElements ? [...block.contentElements] : undefined })),
    settings: {
      ...defaultAnswerSheetDocument.settings,
      identityFields: ['学号', '姓名', '班级'],
      candidateNumberType: '学号',
      candidateNumberLayouts: [],
    },
    header: instantiateHeaderTemplate('daily-quiz'),
  }
}

function totalQuestionScore(blocks: AnswerBlock[]): number {
  return blocks.reduce((total, block) => total + (isQuestionBlockKind(block.kind) ? block.score ?? 0 : 0), 0)
}

interface AnswerSheetStudioPageProps {
  initialDocument?: AnswerSheetDocument
  onBack?: () => void
}

export function AnswerSheetStudioPage({ initialDocument, onBack }: AnswerSheetStudioPageProps) {
  const [document, setDocument] = useState<AnswerSheetDocument>(() => initialDocument ? structuredClone(initialDocument) : cloneDefaultDocument())
  const [history, setHistory] = useState<AnswerSheetDocument[]>([])
  const [future, setFuture] = useState<AnswerSheetDocument[]>([])
  const [selectedBlockId, setSelectedBlockId] = useState(document.blocks[0]?.id ?? '')
  const [activePage, setActivePage] = useState(1)
  const [draftVersion, setDraftVersion] = useState(1)
  const [published, setPublished] = useState<PublishedVersion>()
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState('刚刚')
  const [preflightOpen, setPreflightOpen] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [printDocument, setPrintDocument] = useState<AnswerSheetDocument>()
  const [questionGroupOpen, setQuestionGroupOpen] = useState(false)
  const [questionGroupType, setQuestionGroupType] = useState<QuestionGroupType>('single')
  const [objectiveAnswerOpen, setObjectiveAnswerOpen] = useState(false)
  const [originalPaperOpen, setOriginalPaperOpen] = useState(false)
  const saveTimer = useRef<number>()

  useEffect(() => {
    const clearPrintSnapshot = () => setPrintDocument(undefined)
    window.addEventListener('afterprint', clearPrintSnapshot)
    return () => window.removeEventListener('afterprint', clearPrintSnapshot)
  }, [])

  const { paper, blocks, settings, mode, rulePackId, pageCount } = document
  const fromPaper = Boolean(settings.linkedPaperId)
  const rulePack = rulePacks.find((pack) => pack.id === rulePackId) ?? rulePacks[0]
  const checks = useMemo(
    () => buildPreflightChecks(paper, blocks, mode, rulePack, pageCount, settings, document.header),
    [blocks, document.header, mode, pageCount, paper, rulePack, settings],
  )

  const ensureNextDraft = () => {
    let version = draftVersion
    if (published && draftVersion <= published.version) {
      version = published.version + 1
      setDraftVersion(version)
      MetisMessage.info(`已创建 V${version} 草稿，V${published.version} 印刷版不受影响`)
    }
    return version
  }

  const scheduleSave = (snapshot: DraftSnapshot, version = draftVersion) => {
    setSaving(true)
    window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(async () => {
      const result = await answerSheetService.saveDraft(snapshot, version)
      setSavedAt(result.savedAt)
      setSaving(false)
    }, 700)
  }

  const syncSelection = (snapshot: AnswerSheetDocument, preferredId = selectedBlockId) => {
    const nextPage = Math.min(Math.max(1, activePage), snapshot.pageCount)
    const preferred = snapshot.blocks.find((block) => block.id === preferredId)
    const fallback = snapshot.blocks.find((block) => block.page === nextPage) ?? snapshot.blocks[0]
    setActivePage(preferred?.page ?? fallback?.page ?? 1)
    setSelectedBlockId(preferred?.id ?? fallback?.id ?? '')
  }

  const commitDocument = (nextDocument: AnswerSheetDocument) => {
    const version = ensureNextDraft()
    setHistory((items) => [...items.slice(-9), document])
    setFuture([])
    setDocument(nextDocument)
    syncSelection(nextDocument)
    scheduleSave(nextDocument, version)
  }

  const commitBlocks = (nextBlocks: AnswerBlock[]) => {
    commitDocument({ ...document, blocks: nextBlocks })
  }

  const moveBlock = (id: string, direction: -1 | 1) => {
    const next = moveBlockOperation(blocks, id, direction)
    if (next === blocks) return
    commitBlocks(next)
  }

  const dragBlock = (dragId: string, targetId: string) => {
    const next = reorderBlock(blocks, dragId, targetId)
    if (next === blocks) return
    commitBlocks(next)
    const moved = next.find((block) => block.id === dragId)
    if (moved) {
      setSelectedBlockId(dragId)
      setActivePage(moved.page)
    }
  }

  const renumberBlocks = (start: number) => {
    const next = renumberQuestionBlocks(blocks, start)
    if (next === blocks) {
      MetisMessage.info('请先为题目区域设置有效题号')
      return
    }
    commitBlocks(next)
    MetisMessage.success(`已从第 ${Math.max(1, Math.floor(start || 1))} 题起连续编号`)
  }

  const splitSelected = () => {
    const next = splitBlock(blocks, selectedBlockId)
    if (next === blocks) {
      MetisMessage.info('至少包含 2 道题的未锁定题块才可分割')
      return
    }
    commitBlocks(next)
    MetisMessage.success('题块已分割，题号与分值按题数分配')
  }

  const mergeSelected = () => {
    const next = mergeWithNext(blocks, selectedBlockId)
    if (next === blocks) {
      MetisMessage.info('请选择同页且同类型的相邻题块进行合并')
      return
    }
    commitBlocks(next)
    MetisMessage.success('相邻题块已合并')
  }

  const consolidate = (kind: 'objective' | 'subjective') => {
    const next = consolidateBlocks(blocks, kind)
    if (next === blocks) {
      MetisMessage.info(kind === 'objective' ? '客观题已经集中排列' : '主观题已经集中排列')
      return
    }
    commitBlocks(next)
    MetisMessage.success(kind === 'objective' ? '已按页集中客观题' : '已按页集中主观题')
  }

  const mergeObjectiveBlocks = () => {
    const next = mergeObjectiveModules(blocks)
    if (next === blocks) {
      MetisMessage.info('当前每页只有一个可合并的客观题模块')
      return
    }
    commitBlocks(next)
    const merged = next.find((block) => block.kind === 'objective' && block.page === activePage)
    if (merged) setSelectedBlockId(merged.id)
    MetisMessage.success('已按页合并客观题模块，题号与分值已合并')
  }

  const addBlock = (kind: AnswerBlockKind) => {
    const labels: Record<AnswerBlockKind, string> = {
      objective: '新增客观题填涂区',
      'short-answer': '新增短答区域',
      essay: '新增作文 / 综合题区',
      mixed: '新增混合题区域',
      forbidden: '禁答区',
      drawing: '新增作图区',
      table: '新增表格区',
      notice: '作答说明',
      'response-area': '新增作答组件',
      'section-title': '标题',
    }
    const nextBlock: AnswerBlock = {
      id: `${kind}-${Date.now()}`,
      page: activePage,
      title: labels[kind],
      kind,
      height: kind === 'forbidden' ? 56 : kind === 'essay' ? 260 : kind === 'mixed' ? 180 : kind === 'drawing' || kind === 'table' ? 140 : 104,
      lineCount: kind === 'short-answer' || kind === 'mixed' ? 4 : kind === 'essay' ? 12 : undefined,
      optionCount: kind === 'objective' || kind === 'mixed' ? 4 : undefined,
      itemsPerColumn: kind === 'objective' || kind === 'mixed' ? 11 : undefined,
      objectiveLayout: kind === 'objective' || kind === 'mixed' ? 'horizontal' : undefined,
      lineStyle: kind === 'short-answer' || kind === 'essay' || kind === 'mixed' ? 'solid' : undefined,
      responseStyle: kind === 'essay' ? 'lines' : kind === 'short-answer' || kind === 'mixed' ? 'lines' : undefined,
      showScore: false,
      showQuestionCount: false,
      showScoreBox: false,
      contentElements: [],
      contentText: kind === 'forbidden' ? '请勿在此区域作答' : undefined,
      locked: false,
    }
    const next = [...blocks]
    const pageIndices = next.reduce<number[]>((indices, block, index) => {
      if (block.page === activePage) indices.push(index)
      return indices
    }, [])
    const insertAt = pageIndices.length ? pageIndices[pageIndices.length - 1] + 1 : next.length
    next.splice(insertAt, 0, nextBlock)
    commitBlocks(next)
    setSelectedBlockId(nextBlock.id)
  }

  const addQuestionGroup = (draft: QuestionGroupDraft) => {
    const endNumber = draft.startNumber + draft.questionCount - 1
    const kind: AnswerBlockKind = ['single', 'multiple', 'judge'].includes(draft.type) ? 'objective' : draft.type === 'comprehensive' ? 'mixed' : 'short-answer'
    const pageBlocks = blocks.filter((block) => block.page === activePage)
    const nextY = pageBlocks.reduce((bottom, block) => Math.max(bottom, (block.canvasY ?? 0) + block.height), 0)
    const nextBlock: AnswerBlock = {
      id: `group-${Date.now()}`,
      page: activePage,
      title: draft.title,
      range: draft.questionCount === 1 ? `${draft.startNumber}` : `${draft.startNumber}–${endNumber}`,
      score: draft.totalScore,
      kind,
      height: kind === 'objective' ? Math.max(112, Math.ceil(draft.questionCount / 4) * 26 + 54) : draft.type === 'solution' ? 220 : draft.type === 'comprehensive' ? 200 : 150,
      canvasX: 0,
      canvasY: nextY,
      canvasWidth: 100,
      lineCount: kind === 'objective' ? undefined : draft.type === 'solution' ? 8 : draft.type === 'comprehensive' ? 6 : 3,
      questionLineCounts: draft.type === 'solution' ? Object.fromEntries(draft.items.map((item) => [String(item.number), item.lineCount])) : undefined,
      answerSlotCounts: draft.type === 'fill' ? draft.items.map((item) => item.blankCount) : draft.type === 'solution' ? draft.items.map((item) => item.subquestionCount) : undefined,
      answerSlotSettings: draft.type === 'fill' ? Object.fromEntries(draft.items.flatMap((item) => Array.from({ length: item.blankCount }, (_, slotIndex) => [`${item.number}.${slotIndex + 1}`, { style: item.fillStyle, count: item.fillStyle === 'tian' || item.fillStyle === 'mi' ? 4 : undefined }]))) : undefined,
      answerVariant: draft.type === 'fill' ? 'fill' : draft.type === 'solution' ? 'solution' : undefined,
      optionCount: kind === 'objective' ? Math.max(...draft.items.map((item) => item.optionCount), draft.optionCount) as 4 | 5 : undefined,
      objectiveMode: draft.type === 'single' || draft.type === 'multiple' || draft.type === 'judge' ? draft.type : undefined,
      itemsPerColumn: kind === 'objective' ? Math.min(10, draft.questionCount) : undefined,
      objectiveLayout: kind === 'objective' ? 'horizontal' : undefined,
      responseStyle: kind === 'short-answer' || kind === 'mixed' ? 'lines' : undefined,
      showScore: true,
      showQuestionCount: true,
      showUnitScore: true,
      showScoreBox: false,
      objectiveAnswers: kind === 'objective' ? Object.fromEntries(draft.items.filter((item) => item.answer).map((item) => [String(item.number), [...new Set(item.answer.split(''))]])) : undefined,
      questionScores: Object.fromEntries(draft.items.flatMap((item) => item.subquestionCount > 0 ? Array.from({ length: item.subquestionCount }, (_, index) => [`${item.number}.${index + 1}`, Number((item.score / item.subquestionCount).toFixed(2))]) : [[String(item.number), item.score]])),
      contentElements: [],
      locked: false,
    }
    const nextBlocks = [...blocks, nextBlock]
    commitDocument({ ...document, blocks: nextBlocks, paper: { ...paper, score: totalQuestionScore(nextBlocks) } })
    setSelectedBlockId(nextBlock.id)
    setQuestionGroupOpen(false)
    MetisMessage.success(`已添加“${draft.title}”`)
  }

  const saveObjectiveAnswers = (answers: Record<string, Record<string, string[]>>) => {
    commitBlocks(blocks.map((block) => block.kind === 'objective' ? { ...block, objectiveAnswers: answers[block.id] ?? {} } : block))
    setObjectiveAnswerOpen(false)
    MetisMessage.success('客观题答案已保存')
  }

  const suggestedQuestionStart = Math.max(0, ...blocks.flatMap((block) => questionNumbers(block.range))) + 1

  const changePage = (page: number) => {
    setActivePage(page)
    const selected = blocks.find((block) => block.id === selectedBlockId)
    if (selected?.page !== page) {
      const firstBlock = blocks.find((block) => block.page === page)
      setSelectedBlockId(firstBlock?.id ?? '')
    }
  }

  const deleteSelected = () => {
    const nextBlocks = blocks.filter((block) => block.id !== selectedBlockId)
    const nextDocument = paper.sections.length === 0
      ? { ...document, blocks: nextBlocks, paper: { ...paper, score: totalQuestionScore(nextBlocks) } }
      : { ...document, blocks: nextBlocks }
    commitDocument(nextDocument)
    const fallback = nextBlocks.find((block) => block.page === activePage)
    setSelectedBlockId(fallback?.id ?? '')
  }

  const updateBlock = (blockId: string, patch: Partial<AnswerBlock>) => {
    const normalizedPatch: Partial<AnswerBlock> = { ...patch }
    if (patch.kind) {
      if (!isQuestionBlockKind(patch.kind)) {
        Object.assign(normalizedPatch, {
          sectionId: undefined,
          range: undefined,
          score: undefined,
          lineCount: undefined,
          optionCount: undefined,
          itemsPerColumn: undefined,
          writingLayout: undefined,
          objectiveLayout: undefined,
          lineStyle: undefined,
          responseStyle: undefined,
          showQuestionCount: false,
          showScoreBox: false,
          scoreStep: undefined,
          showScore: false,
          hint: undefined,
        })
      } else {
        normalizedPatch.hint = undefined
        if (patch.kind !== 'objective' && patch.kind !== 'mixed') {
          normalizedPatch.optionCount = undefined
          normalizedPatch.itemsPerColumn = undefined
          normalizedPatch.objectiveLayout = undefined
        }
        if (patch.kind !== 'short-answer' && patch.kind !== 'essay' && patch.kind !== 'mixed') normalizedPatch.lineCount = undefined
        if (patch.kind !== 'essay') normalizedPatch.writingLayout = undefined
      }
    }
    const nextBlocks = blocks.map((block) => block.id === blockId ? { ...block, ...normalizedPatch } : block)
    if (paper.sections.length === 0 || patch.score !== undefined) {
      const nextSections = paper.sections.map((section) => {
        const sectionBlocks = nextBlocks.filter((block) => block.sectionId === section.id && isQuestionBlockKind(block.kind))
        return sectionBlocks.length
          ? { ...section, score: sectionBlocks.reduce((total, block) => total + (block.score ?? 0), 0) }
          : section
      })
      commitDocument({
        ...document,
        blocks: nextBlocks,
        paper: { ...paper, sections: nextSections, score: totalQuestionScore(nextBlocks) },
      })
      return
    }
    commitBlocks(nextBlocks)
  }

  const updateSelected = (patch: Partial<AnswerBlock>) => updateBlock(selectedBlockId, patch)

  const selectBlock = (blockId: string) => {
    const block = blocks.find((item) => item.id === blockId)
    setSelectedBlockId(blockId)
    if (block) setActivePage(block.page)
  }

  const toggleBlockContent = (blockId: string, element: ContentElement) => {
    const block = blocks.find((item) => item.id === blockId)
    if (!block || block.kind === 'objective') return
    const current = block.contentElements ?? []
    updateBlock(blockId, { contentElements: current.includes(element) ? current.filter((item) => item !== element) : [...current, element] })
  }

  const mergeCanvasBlocks = (ids: string[], layout?: { x: number; y: number; width: number; height: number }) => {
    const next = mergeSelectedBlocks(blocks, ids, layout)
    if (next === blocks) {
      MetisMessage.info('只能合并同页、题号有效且未锁定的题块')
      return
    }
    commitBlocks(next)
    const merged = next.find((block) => block.mergedParts?.length && ids.every((id) => block.mergedParts?.some((part) => part.id === id)))
    if (merged) setSelectedBlockId(merged.id)
    MetisMessage.success('题块已合并，可在画布中随时切割恢复')
  }

  const splitCanvasBlock = (id: string) => {
    const next = splitMergedBlock(blocks, id)
    if (next === blocks) return
    commitBlocks(next)
    const first = next.find((block) => block.id === id)
    if (first) setSelectedBlockId(first.id)
    MetisMessage.success('已恢复合并前的题块')
  }

  const insertAfterBlock = (afterId: string, kind: AnswerBlockKind, responseStyle?: AnswerBlock['responseStyle'], position: 'before' | 'after' = 'after') => {
    const anchorIndex = blocks.findIndex((block) => block.id === afterId)
    const anchor = blocks[anchorIndex]
    if (!anchor) return
    const title = kind === 'section-title' ? '标题' : kind === 'forbidden' ? '禁答区' : responseStyle === 'blank' ? '空白区' : responseStyle === 'tian' ? '田字格作答区' : responseStyle === 'mi' ? '米字格作答区' : responseStyle === 'four-line' ? '四线三格作答区' : '作答横线'
    const height = kind === 'section-title' ? 34 : kind === 'forbidden' ? 72 : 100
    const anchorY = anchor.canvasY ?? 0
    const inserted: AnswerBlock = {
      id: `insert-${kind}-${Date.now()}`,
      page: anchor.page,
      title,
      kind,
      height,
      lineCount: 4,
      responseStyle,
      contentText: kind === 'forbidden' ? '请勿在此区域作答' : undefined,
      showScore: false,
      showQuestionCount: false,
      userInserted: true,
      borderStyle: 'bordered',
      canvasX: anchor.canvasX,
      canvasY: position === 'before' ? anchorY : anchorY + anchor.height,
      canvasWidth: anchor.canvasWidth,
    }
    const insertionY = position === 'before' ? anchorY : anchorY + anchor.height
    const shiftedBlocks = blocks.map((block) => (
      block.page === anchor.page
      && (position === 'before' || block.id !== anchor.id)
      && (block.canvasY ?? 0) >= insertionY
      && (block.canvasX ?? 0) === (anchor.canvasX ?? 0)
        ? { ...block, canvasY: (block.canvasY ?? 0) + height }
        : block
    ))
    const insertIndex = position === 'before' ? anchorIndex : anchorIndex + 1
    const next = [...shiftedBlocks.slice(0, insertIndex), inserted, ...shiftedBlocks.slice(insertIndex)]
    commitBlocks(next)
    setSelectedBlockId(inserted.id)
    MetisMessage.success(`已在当前题块${position === 'before' ? '前' : '后'}插入${title}`)
  }

  const deleteInsertedBlock = (id: string) => {
    const target = blocks.find((block) => block.id === id)
    if (!target?.userInserted) return
    const targetY = target.canvasY ?? 0
    const targetBottom = targetY + target.height
    const compacted = blocks
      .filter((block) => block.id !== id)
      .map((block) => (
        block.page === target.page
        && (block.canvasX ?? 0) === (target.canvasX ?? 0)
        && (block.canvasY ?? 0) >= targetBottom
          ? { ...block, canvasY: (block.canvasY ?? 0) - target.height }
          : block
      ))
    commitBlocks(compacted)
    setSelectedBlockId('')
    MetisMessage.success('已删除插入内容，可撤销恢复')
  }

  const updateTitle = (title: string) => {
    if (title === paper.title) return
    commitDocument({ ...document, paper: { ...paper, title } })
    MetisMessage.success('标题已更新并自动保存')
  }

  const updateSettings = (patch: Partial<AnswerSheetSettings>) => {
    const nextSettings = { ...settings, ...patch }
    if (patch.identityFields) {
      const identityFields = [...patch.identityFields]
      if (!identityFields.includes('姓名')) {
        const studentNumberIndex = identityFields.indexOf('学号')
        identityFields.splice(studentNumberIndex >= 0 ? studentNumberIndex + 1 : 0, 0, '姓名')
      }
      nextSettings.identityFields = identityFields
    }
    if (patch.candidateNumberLayouts) nextSettings.candidateNumberLayouts = [...patch.candidateNumberLayouts]
    commitDocument({ ...document, settings: nextSettings })
  }

  const updateModuleMerge = (kind: 'objective' | 'subjective', checked: boolean) => {
    const field = kind === 'objective' ? 'objectiveMerge' : 'subjectiveMerge'
    const nextBlocks = checked
      ? mergeModulesByCategory(blocks, kind)
      : splitMergedModulesByCategory(blocks, kind)
    commitDocument({
      ...document,
      settings: { ...settings, [field]: checked },
      blocks: nextBlocks,
    })
    MetisMessage.success(checked
      ? `已按页合并${kind === 'objective' ? '客观题' : '主观题'}模块`
      : `已恢复${kind === 'objective' ? '客观题' : '主观题'}模块`)
  }

  const applyPreset = (preset: HeaderPreset) => {
    const nextHeader = instantiateHeaderTemplate(preset === 'quiz' ? 'daily-quiz' : 'exam-general')
    const nextSettings: AnswerSheetSettings = preset === 'quiz'
      ? {
          ...settings,
          paperSize: 'A4',
          frontColumns: 1,
          backColumns: 1,
          identityFields: ['学号', '姓名', '班级'],
          candidateNumberType: '学号',
          candidateNumberLayouts: [],
          showNotice: true,
          noticeStyle: 'daily',
        }
      : {
          ...settings,
          paperSize: 'A4',
          frontColumns: 1,
          backColumns: 1,
          identityFields: ['学校', '姓名', '准考证号'],
          candidateNumberType: '准考证号',
          candidateNumberLayouts: ['fill', 'barcode'],
          showNotice: true,
          noticeStyle: 'exam',
        }
    commitDocument({
      ...document,
      header: nextHeader,
      settings: { ...nextSettings, identityFields: [...nextSettings.identityFields], candidateNumberLayouts: [...nextSettings.candidateNumberLayouts] },
    })
    MetisMessage.success(preset === 'quiz' ? '已切换为日常测验表头' : '已应用大型考试通用表头，题目结构保持不变')
  }

  const applyHeaderTemplate = (templateId: HeaderTemplateId) => {
    const nextHeader = instantiateHeaderTemplate(templateId)
    commitDocument({
      ...document,
      header: nextHeader,
      settings: {
        ...settings,
        identityFields: ['学校', '姓名', '准考证号'],
        candidateNumberType: '准考证号',
        candidateNumberLayouts: templateId === 'beijing-exam-reference' ? ['fill', 'barcode'] : ['barcode', 'handwrite'],
        showNotice: true,
        noticeStyle: 'exam',
      },
    })
    MetisMessage.success(`已应用${nextHeader.templateName}，原题块、分页与题号均已保留`)
  }

  const updateHeader = (header: HeaderLayout) => {
    commitDocument({ ...document, header: cloneHeaderLayout(header) })
  }

  const restoreHeaderTemplate = () => {
    commitDocument({ ...document, header: instantiateHeaderTemplate(document.header.templateId) })
    MetisMessage.success('已恢复表头模板布局，考号呈现与注意事项设置保持不变')
  }

  const updateMetaVisibility = (field: 'showQuestionCount' | 'showUnitScore' | 'showScore', visible: boolean) => {
    commitBlocks(blocks.map((block) => isQuestionBlockKind(block.kind) ? { ...block, [field]: visible } : block))
  }

  const undo = () => {
    const previous = history[history.length - 1]
    if (!previous) return
    setFuture((items) => [document, ...items].slice(0, 10))
    setHistory((items) => items.slice(0, -1))
    setDocument(previous)
    syncSelection(previous)
    scheduleSave(previous, ensureNextDraft())
  }

  const redo = () => {
    const next = future[0]
    if (!next) return
    setHistory((items) => [...items, document].slice(-10))
    setFuture((items) => items.slice(1))
    setDocument(next)
    syncSelection(next)
    scheduleSave(next, ensureNextDraft())
  }

  const saveNow = async () => {
    window.clearTimeout(saveTimer.current)
    setSaving(true)
    const result = await answerSheetService.saveDraft(document, draftVersion)
    setSavedAt(result.savedAt)
    setSaving(false)
    MetisMessage.success('草稿已保存')
  }

  const publish = async () => {
    window.clearTimeout(saveTimer.current)
    setPublishing(true)
    setSaving(true)
    const saved = await answerSheetService.saveDraft(document, draftVersion)
    setSavedAt(saved.savedAt)
    setSaving(false)
    const version = await answerSheetService.publish(document, draftVersion)
    setPublished(version)
    setPublishing(false)
  }

  const locateBlock = (id: string) => {
    const block = blocks.find((item) => item.id === id)
    if (block) {
      setSelectedBlockId(id)
      setActivePage(block.page)
    }
    setPreflightOpen(false)
  }

  const printSnapshot = (snapshot: AnswerSheetDocument) => {
    setPrintDocument(snapshot)
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => window.print()))
  }

  return (
    <>
      <div className="studio-body stage-editor">
        <EditorToolbar
              paper={paper}
              backLabel="返回首页"
              draftVersion={draftVersion}
              publishedVersion={published?.version}
              saving={saving}
              savedAt={savedAt}
              canUndo={history.length > 0}
              canRedo={future.length > 0}
              fromPaper={fromPaper}
              originalPaperOpen={originalPaperOpen}
              onOriginalPaper={() => setOriginalPaperOpen((open) => !open)}
              onBack={() => onBack ? onBack() : MetisMessage.info('演示：返回组卷页；当前答题卡草稿已自动保存')}
              onUndo={undo}
              onRedo={redo}
              onSave={() => void saveNow()}
              onPreflight={() => setPreflightOpen(true)}
              onPrint={() => {
                if (fromPaper) {
                  printSnapshot(document)
                  return
                }
                if (!published) {
                  setPreflightOpen(true)
                  MetisMessage.info('请先完成印前校验并生成印刷版')
                  return
                }
                printSnapshot(published.snapshot)
                if (published.version !== draftVersion) MetisMessage.info(`当前为 V${draftVersion} 草稿，已打开不可变的 V${published.version} 印刷版`)
              }}
              onDownloadAnnotated={() => {
                downloadAnnotatedAnswerSheet(document, draftVersion)
                MetisMessage.success('已下载带批改痕迹版，可在浏览器中继续打印为 PDF')
              }}
              hasObjectiveBlocks={blocks.some((block) => block.kind === 'objective')}
              onObjectiveAnswers={() => setObjectiveAnswerOpen(true)}
        />
        <EditorWorkbench
              document={document}
              rulePacks={rulePacks}
              rulePack={rulePack}
              activePage={activePage}
              selectedBlockId={selectedBlockId}
              onPageChange={changePage}
              onSelect={selectBlock}
              onUpdate={updateSelected}
              onBlockScoresChange={(id, scores) => updateBlock(id, { questionScores: scores, score: Object.values(scores).reduce((sum, score) => sum + score, 0) })}
              onMove={moveBlock}
              onDelete={deleteSelected}
              onAdd={addBlock}
              onAddQuestionGroup={(type) => { setQuestionGroupType(type); setQuestionGroupOpen(true) }}
              onTitleCommit={updateTitle}
              onBlockTitleCommit={(id, title) => updateBlock(id, { title })}
              onSettingsChange={updateSettings}
              onModuleMergeChange={updateModuleMerge}
              onPresetChange={applyPreset}
              onHeaderTemplateChange={applyHeaderTemplate}
              onRestoreHeaderTemplate={restoreHeaderTemplate}
              onHeaderChange={updateHeader}
              onMetaVisibilityChange={updateMetaVisibility}
              onReorder={dragBlock}
              onRenumber={renumberBlocks}
              onSplit={splitSelected}
              onMerge={mergeSelected}
              onConsolidate={consolidate}
              onMergeObjectiveModules={mergeObjectiveBlocks}
              onMoveBlock={(id, canvasX, canvasY, page) => {
                updateBlock(id, { canvasX, canvasY, page })
                setActivePage(page)
              }}
              onResizeBlock={(id, height, canvasWidth) => updateBlock(id, { height, canvasWidth })}
              onToggleBlockContent={toggleBlockContent}
              onUpdateCanvasBlock={updateBlock}
              onInsertAfter={insertAfterBlock}
              onDeleteInsertedBlock={deleteInsertedBlock}
              onUndo={undo}
              onRedo={redo}
              onMergeBlocks={mergeCanvasBlocks}
              onSplitMerged={splitCanvasBlock}
              printDocument={printDocument}
        />
        {fromPaper && <OriginalPaperReference
          open={originalPaperOpen}
          paper={paper}
          blocks={blocks}
          selectedBlockId={selectedBlockId}
          onClose={() => setOriginalPaperOpen(false)}
        />}
      </div>

      <PreflightDialog
        open={preflightOpen}
        checks={checks}
        publishing={publishing}
        published={published}
        draftVersion={draftVersion}
        onClose={() => setPreflightOpen(false)}
        onAutoFix={() => {
          commitBlocks(autoFixBlocks(blocks))
          MetisMessage.success('已优化作答空间，请再次确认')
        }}
        onPublish={() => void publish()}
        onLocate={locateBlock}
        onDownload={() => printSnapshot(published?.snapshot ?? document)}
        onDownloadPublished={() => printSnapshot(published?.snapshot ?? document)}
      />
      <QuestionGroupDialog open={questionGroupOpen} suggestedStart={suggestedQuestionStart} type={questionGroupType} onClose={() => setQuestionGroupOpen(false)} onSubmit={addQuestionGroup} />
      <ObjectiveAnswerDialog open={objectiveAnswerOpen} blocks={blocks} onClose={() => setObjectiveAnswerOpen(false)} onSave={saveObjectiveAnswers} />
    </>
  )
}
