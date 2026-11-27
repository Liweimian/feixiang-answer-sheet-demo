import { refreshBlankAnswerHtml } from '../components/AnswerBlockView'
import { reflowEditedAnswerBlocks } from '../features/answer-sheet/pageLayout'
import { canEditQuestionGroup, editableQuestionGroup, appendSubquestion, appendQuestionOption, appendQuestionBlank, applyQuestionBatch, updateQuestionItem, removeQuestionSubpart, removeQuestionItem, appendGroupQuestion, addGroupQuestionSubparts, deleteGroupQuestionSelection, setGroupSubquestionType } from '../features/answer-sheet/directQuestionEdit'
import { useEffect, useMemo, useRef, useState } from 'react'
import { MetisMessage } from '@yuanfudao/metis-web-component'
import { SourcePaperPreviewDialog } from '../components/SourcePaperPreviewDialog'
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
import { isAnswerableBlock, isQuestionBlockKind } from '../features/answer-sheet/types'
import { answerSheetService } from '../services/answerSheetService'
import { EditorToolbar } from '../components/EditorToolbar'
import { EditorWorkbench } from '../components/EditorWorkbench'
import { PreflightDialog } from '../components/PreflightDialog'
import { BatchQuestionGroupDialog } from '../components/BatchQuestionGroupDialog'
import { QuestionGroupDialog } from '../components/QuestionGroupDialog'
import { ObjectiveAnswerDialog, type AnswerDialogValue } from '../components/ObjectiveAnswerDialog'
import { OriginalPaperReference } from '../components/OriginalPaperReference'
import { formatQuestionRange, questionNumbers } from '../features/answer-sheet/range'
import { createEntityId } from '../features/answer-sheet/ids'

function cloneDefaultDocument(): AnswerSheetDocument {
  return {
    ...defaultAnswerSheetDocument,
    mode: 'smart',
    paper: {
      ...defaultAnswerSheetDocument.paper,
      sections: defaultAnswerSheetDocument.paper.sections.map((section) => ({ ...section })),
    },
    blocks: defaultAnswerSheetDocument.blocks.map((block) => ({ ...block, locked: false, answerSlotCounts: block.answerSlotCounts ? [...block.answerSlotCounts] : undefined, answerSlotNumbers: block.answerSlotNumbers?.map((numbers) => [...numbers]), answerSlotLabels: block.answerSlotLabels?.map((labels) => [...labels]), answerSlotNumberStyles: block.answerSlotNumberStyles ? [...block.answerSlotNumberStyles] : undefined, answerSlotSettings: block.answerSlotSettings ? structuredClone(block.answerSlotSettings) : undefined, questionScores: block.questionScores ? { ...block.questionScores } : undefined, contentElements: block.contentElements ? [...block.contentElements] : undefined, floatingObjects: block.floatingObjects ? structuredClone(block.floatingObjects) : undefined })),
    settings: {
      ...defaultAnswerSheetDocument.settings,
      identityFields: ['学号', '姓名', '班级'],
      candidateNumberType: '学号',
      candidateNumberLayouts: [],
    },
    header: instantiateHeaderTemplate('daily-quiz'),
  }
}

function normalizeHeaderIdentity(document: AnswerSheetDocument): AnswerSheetDocument {
  if (document.header.preset !== 'quiz') return document
  return {
    ...document,
    settings: {
      ...document.settings,
      identityFields: ['学号', '姓名', '班级'],
      candidateNumberType: '学号',
      candidateNumberLayouts: [],
    },
  }
}

function totalQuestionScore(blocks: AnswerBlock[]): number {
  return blocks.reduce((total, block) => total + (isQuestionBlockKind(block.kind) ? block.score ?? 0 : 0), 0)
}

interface AnswerSheetStudioPageProps {
  initialDocument?: AnswerSheetDocument
  uploadedSourceFile?: File
  onAssociateSource?: (file: File) => void
  onBack?: () => void
  backLabel?: string
}

export function AnswerSheetStudioPage({ initialDocument, uploadedSourceFile, onAssociateSource, onBack, backLabel = '返回首页' }: AnswerSheetStudioPageProps) {
  const [document, setDocument] = useState<AnswerSheetDocument>(() => normalizeHeaderIdentity(initialDocument ? structuredClone(initialDocument) : cloneDefaultDocument()))
  const documentRef = useRef(document)
  documentRef.current = document
  const [history, setHistory] = useState<AnswerSheetDocument[]>([])
  const [future, setFuture] = useState<AnswerSheetDocument[]>([])
  const [questionGroupBatchResult, setQuestionGroupBatchResult] = useState<{ id: string; after: AnswerSheetDocument; removedCount?: number }>()
  const [deletedQuestion, setDeletedQuestion] = useState<{ id: string; number: number; after: AnswerSheetDocument }>()
  const [structure, setStructure] = useState<{ id: string; number?: number; subIndex?: number }>()
  const [selectedBlockId, setSelectedBlockId] = useState('')
  const [activePage, setActivePage] = useState(1)
  const [draftVersion, setDraftVersion] = useState(1)
  const [published, setPublished] = useState<PublishedVersion>()
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState('刚刚')
  const [preflightOpen, setPreflightOpen] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [printDocument, setPrintDocument] = useState<AnswerSheetDocument>()
  const [questionGroupOpen, setQuestionGroupOpen] = useState(false)
  const [batchGroupOpen, setBatchGroupOpen] = useState(false)
  const [questionGroupType, setQuestionGroupType] = useState<QuestionGroupType>('single')
  const [objectiveAnswerOpen, setObjectiveAnswerOpen] = useState(false)
  const [originalPaperOpen, setOriginalPaperOpen] = useState(false)
  const [uploadedSourceOpen, setUploadedSourceOpen] = useState(false)
  const associateSourceInputRef = useRef<HTMLInputElement>(null)
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
    setActivePage(preferred?.page ?? nextPage)
    setSelectedBlockId(preferredId ? preferred?.id ?? fallback?.id ?? '' : '')
  }

  const commitDocument = (nextDocument: AnswerSheetDocument) => {
    const version = ensureNextDraft()
    setHistory((items) => [...items.slice(-9), documentRef.current])
    setFuture([])
    documentRef.current = nextDocument
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

  const buildQuestionGroup = (draft: QuestionGroupDraft, sourceBlocks: AnswerBlock[], editingId = '') => {
    const editingBlock = editingId ? sourceBlocks.find((block) => block.id === editingId) : undefined
    const kind: AnswerBlockKind = ['single', 'multiple', 'judge'].includes(draft.type) ? 'objective' : draft.type === 'essay' ? 'essay' : 'short-answer'
    const blockHeight = kind === 'objective' ? Math.max(112, Math.ceil(draft.questionCount / 4) * 26 + 54) : draft.type === 'essay' ? 280 : draft.type === 'solution' ? 220 : draft.type === 'comprehensive' ? Math.max(200, 34 + draft.items.reduce((sum, item) => sum + Math.max(1, item.subquestionCount) * 32 + 12, 0)) : Math.max(150, 34 + draft.questionCount * 28)
    const inheritedSubjectiveStyle = draft.type === 'solution' || draft.type === 'comprehensive' ? settings.subjectiveAnswerStyle : undefined
    const inheritedLinesPerQuestion = Math.max(1, Math.floor((blockHeight - 30 - Math.max(0, draft.questionCount - 1) * 6) / Math.max(1, draft.questionCount) / settings.subjectiveLineHeight))
    let targetPage = editingBlock?.page ?? Math.max(activePage, ...sourceBlocks.map((block) => block.page))
    const pageBottom = (page: number) => sourceBlocks.filter((block) => block.page === page && block.id !== editingId).reduce((bottom, block) => Math.max(bottom, (block.canvasY ?? 0) + block.height), 0)
    let nextY = editingBlock?.canvasY ?? pageBottom(targetPage)
    const paperElement = window.document.querySelector<HTMLElement>('.paper-stack .answer-paper')
    const contentElement = paperElement?.querySelector<HTMLElement>('.paper-blocks')
    const paperHeight = paperElement ? parseFloat(getComputedStyle(paperElement).minHeight) : settings.paperSize === 'A3' ? 620 : settings.paperSize === '16K' ? 665 : settings.paperSize === '8K' ? 925 : 996
    const firstPageCapacity = paperHeight - (contentElement?.offsetTop ?? 240) - 40
    const pageCapacity = (page: number) => page === 1 ? firstPageCapacity : paperHeight - 70
    if (!editingBlock && nextY > 0 && nextY + blockHeight > pageCapacity(targetPage)) {
      targetPage += 1
      nextY = pageBottom(targetPage)
    }
    const fillSlotCounts = draft.type === 'fill' ? draft.items.map((item) => item.subquestionCount > 0 ? (item.subquestionBlankCounts ?? []).reduce((sum, count) => sum + count, 0) : item.blankCount) : undefined
    const fillSlotLabels = draft.type === 'fill' ? draft.items.map((item) => item.subquestionCount > 0 ? (item.subquestionBlankCounts ?? []).flatMap((count, subIndex) => Array.from({ length: count }, (_, blankIndex) => blankIndex === 0 ? `（${subIndex + 1}）` : '')) : Array.from({ length: item.blankCount }, () => '')) : undefined
    const fillSlotEntries = draft.type === 'fill' ? draft.items.flatMap((item) => {
      if (item.subquestionCount > 0) {
        let slotIndex = 0
        return (item.subquestionBlankCounts ?? []).flatMap((count, subIndex) => Array.from({ length: count }, (_, blankIndex) => {
          slotIndex += 1
          return { key: `${item.number}.${slotIndex}`, score: item.subquestionBlankScores?.[subIndex]?.[blankIndex] ?? 0, style: item.subquestionFillStyles?.[subIndex] ?? item.fillStyle }
        }))
      }
      return Array.from({ length: item.blankCount }, (_, blankIndex) => ({ key: `${item.number}.${blankIndex + 1}`, score: item.blankScores?.[blankIndex] ?? Number((item.score / item.blankCount).toFixed(2)), style: item.fillStyle }))
    }) : []
    const nextBlock: AnswerBlock = {
      id: editingBlock?.id ?? createEntityId('group'),
      page: targetPage,
      title: draft.title,
      range: formatQuestionRange(draft.items.map((item) => item.number)),
      score: draft.totalScore,
      kind,
      height: blockHeight,
      canvasX: editingBlock?.canvasX ?? 0,
      canvasY: editingBlock?.canvasY ?? nextY,
      canvasWidth: editingBlock?.canvasWidth ?? 100,
      lineCount: kind === 'objective' ? undefined : draft.type === 'solution' || draft.type === 'comprehensive' ? (inheritedSubjectiveStyle === 'lines' ? inheritedLinesPerQuestion : 1) : draft.type === 'essay' ? 8 : 3,
      questionLineCounts: draft.type === 'solution' ? Object.fromEntries(draft.items.map((item) => [String(item.number), inheritedSubjectiveStyle === 'lines' ? inheritedLinesPerQuestion : item.lineCount])) : undefined,
      answerSlotCounts: draft.type === 'fill' ? fillSlotCounts : draft.type === 'solution' || draft.type === 'essay' || draft.type === 'comprehensive' || kind === 'objective' && draft.items.some((item) => item.subquestionCount > 0) ? draft.items.map((item) => item.subquestionCount) : undefined,
      answerSlotLabels: draft.type === 'fill' ? fillSlotLabels : undefined,
      answerSlotSettings: draft.type === 'fill' ? Object.fromEntries(fillSlotEntries.map((slot) => [slot.key, { style: slot.style, count: slot.style === 'composition' ? 40 : ['tian', 'mi', 'squares'].includes(slot.style) ? 4 : undefined }])) : undefined,
      answerVariant: draft.type === 'fill' ? 'fill' : draft.type === 'solution' || draft.type === 'essay' || draft.type === 'comprehensive' ? 'solution' : undefined,
      optionCount: kind === 'objective' ? (draft.type === 'judge' ? 2 : Math.max(...draft.items.map((item) => item.optionCount), draft.optionCount, ...draft.items.flatMap((item) => item.subquestionOptionCounts ?? []))) : undefined,
      objectiveMode: draft.type === 'single' || draft.type === 'multiple' || draft.type === 'judge' ? draft.type : undefined,
      itemsPerColumn: kind === 'objective' ? Math.min(10, draft.questionCount) : undefined,
      objectiveLayout: kind === 'objective' ? 'horizontal' : undefined,
      responseStyle: draft.type === 'essay' ? 'grid' : draft.type === 'solution' || draft.type === 'comprehensive' ? inheritedSubjectiveStyle : kind === 'short-answer' ? 'lines' : undefined,
      answerAreaOverride: draft.type === 'solution' || draft.type === 'comprehensive' ? false : undefined,
      preserveAnswerAreaHeight: draft.type === 'solution' || draft.type === 'comprehensive' ? true : undefined,
      wordCount: draft.type === 'essay' ? 400 : undefined,
      showScore: true,
      showQuestionCount: true,
      showUnitScore: true,
      showScoreBox: false,
      objectiveAnswers: kind === 'objective' ? (editingBlock?.objectiveAnswers ?? Object.fromEntries(draft.items.filter((item) => item.answer).map((item) => [String(item.number), [...new Set(item.answer.split(''))]]))) : undefined,
      referenceAnswers: editingBlock?.referenceAnswers,
      questionScores: Object.fromEntries(draft.type === 'fill' ? fillSlotEntries.map((slot) => [slot.key, slot.score]) : draft.items.flatMap((item) => item.subquestionCount > 0 ? Array.from({ length: item.subquestionCount }, (_, index) => [`${item.number}.${index + 1}`, item.subquestionScores?.[index] ?? Number((item.score / item.subquestionCount).toFixed(2))]) : [[String(item.number), item.score]])),
      partialCreditScores: draft.type === 'multiple' ? Object.fromEntries(draft.items.flatMap((item) => item.subquestionCount > 0 ? Array.from({ length: item.subquestionCount }, (_, index) => [`${item.number}.${index + 1}`, item.subquestionPartialScores?.[index] ?? item.partialScore ?? 0]) : [[String(item.number), item.partialScore ?? 0]])) : undefined,
      questionGroupType: draft.groupType,
      questionGroupDraft: structuredClone(draft),
      contentElements: [],
      locked: false,
      userInserted: true,
    }
    return nextBlock
  }

  const addQuestionGroup = (draft: QuestionGroupDraft) => {
    const nextBlock = buildQuestionGroup(draft, blocks)
    const nextBlocks = [...blocks, nextBlock]
    commitDocument({ ...document, blocks: nextBlocks, pageCount: Math.max(document.pageCount, ...nextBlocks.map((block) => block.page)), paper: { ...paper, score: totalQuestionScore(nextBlocks) } })
    setSelectedBlockId(nextBlock.id)
    setQuestionGroupOpen(false)
    MetisMessage.success(`已添加“${draft.title}”`)
  }

  const applyStructure = (current: AnswerBlock, draft: QuestionGroupDraft, previous: QuestionGroupDraft, deletedNumber?: number, removedSubIndex?: number, editedNumber?: number, solutionBatch = false, bulkRemovedParts?: ReadonlyMap<number, readonly number[]>) => {
    if (draft === previous) return false
    const numbers = new Set(draft.items.map((item) => item.number))
    const previousNumbers = new Set(previous.items.map((item) => item.number))
    const occupied = new Set(blocks.filter((block) => block.id !== current.id).flatMap((block) => questionNumbers(block.range)))
    if ([...numbers].some((number) => !previousNumbers.has(number) && occupied.has(number))) {
      MetisMessage.info('新增题号与其他题组重复，请先调整题号')
      return false
    }
    const removedParts = bulkRemovedParts ?? (removedSubIndex !== undefined && editedNumber !== undefined
      ? new Map([[editedNumber, [removedSubIndex]]]) : undefined)
    const rebuilt = buildQuestionGroup(draft, blocks, current.id)
    const retained = <T,>(answers?: Record<string, T>) => answers && Object.fromEntries(
      Object.entries(answers).filter(([key]) => numbers.has(Number(key.split('.')[0]))),
    )
    const retainedReferences = retained(current.referenceAnswers)
    const referenceAnswers = retainedReferences && removedParts ? Object.fromEntries(Object.entries(retainedReferences).flatMap(([key, answer]) => {
      const [number, slot] = key.split('.')
      const indexes = removedParts.get(Number(number))
      if (!slot || !indexes?.length) return [[key, answer]]
      const index = Number(slot) - 1
      if (indexes.includes(index)) return []
      return [[`${number}.${index + 1 - indexes.filter((removed) => removed < index).length}`, answer]]
    })) : retainedReferences
    const rowCount = (group: QuestionGroupDraft) => group.items.reduce((sum, item) => sum + Math.max(1, item.subquestionCount), 0)
    const addedRows = Math.max(0, rowCount(draft) - rowCount(previous))
    const resized = addedRows > 0 || draft.items.length !== previous.items.length || draft.items.some((item, index) => item.subquestionCount !== previous.items[index]?.subquestionCount || item.blankCount !== previous.items[index]?.blankCount || String(item.subquestionBlankCounts) !== String(previous.items[index]?.subquestionBlankCounts))
    const rowHeight = current.kind === 'objective' ? 18 : Math.max(22, settings.subjectiveLineHeight + 6)
    const next: AnswerBlock = {
      ...current,
      range: rebuilt.range,
      score: rebuilt.score,
      questionGroupDraft: draft,
      questionScores: rebuilt.questionScores,
      partialCreditScores: rebuilt.partialCreditScores,
      answerVariant: rebuilt.answerVariant,
      answerSlotCounts: rebuilt.answerSlotCounts,
      answerSlotLabels: rebuilt.answerSlotLabels ?? current.answerSlotLabels,
      answerSlotSettings: rebuilt.answerSlotSettings ? { ...rebuilt.answerSlotSettings, ...retained(current.answerSlotSettings) } : current.answerSlotSettings,
      answerSlotNumbers: resized ? undefined : current.answerSlotNumbers,
      questionLineCounts: current.questionLineCounts ?? rebuilt.questionLineCounts,
      optionCount: rebuilt.optionCount,
      objectiveAnswers: retained(current.objectiveAnswers),
      referenceAnswers,
      height: resized ? Math.max(current.height + addedRows * rowHeight, rebuilt.height) : current.height,
    }
    const usesBlankAnswer = current.kind === 'short-answer' && draft.type !== 'fill'
      && (current.answerAreaOverride ? current.responseStyle : settings.subjectiveAnswerStyle) === 'blank'
    if (usesBlankAnswer) {
      next.answerRichText = refreshBlankAnswerHtml(current, next, removedParts)
      const printedRows = draft.items.reduce((count, item) => count + Math.max(1, item.subquestionCount), 0)
      const priorRows = previous.items.reduce((count, item) => count + Math.max(1, item.subquestionCount), 0)
      if (printedRows > priorRows) next.height = Math.max(next.height, 35 + printedRows * 52)
    }
    let nextBlocks = draft.items.length ? blocks.map((block) => block.id === current.id ? next : block) : blocks.filter((block) => block.id !== current.id)
    if (next.height > current.height) {
      const firstPaper = window.document.querySelector<HTMLElement>('.paper-stack .answer-paper')
      const body = firstPaper?.querySelector<HTMLElement>('.paper-blocks')
      const paperHeight = firstPaper ? parseFloat(getComputedStyle(firstPaper).minHeight) : 996
      const capacity = (page: number) => page === 1 ? paperHeight - (body?.offsetTop ?? 240) - 40 : paperHeight - 70
      if (next.height > capacity(2)) {
        MetisMessage.info('当前题组超过一页可用空间，请分成多个题组')
        return false
      }
      nextBlocks = reflowEditedAnswerBlocks(nextBlocks, current.page, settings.frontColumns, capacity)
    }
    const nextDocument = { ...document, blocks: nextBlocks, pageCount: Math.max(document.pageCount, ...nextBlocks.map((block) => block.page)), paper: { ...paper, score: totalQuestionScore(nextBlocks) } }
    commitDocument(nextDocument)
    if (solutionBatch && !draft.items.length) setQuestionGroupBatchResult({ id: current.id, after: nextDocument, removedCount: previous.items.length })
    if (!draft.items.length) setSelectedBlockId('')
    if (deletedNumber !== undefined) {
      setDeletedQuestion({ id: current.id, number: deletedNumber, after: nextDocument })
      setStructure(undefined)
      return true
    }
    setStructure((selection) => {
      if (selection?.id !== current.id) return selection
      if (!draft.items.length) return undefined
      const item = draft.items.find((entry) => entry.number === selection.number)
      if (!item) return { id: current.id }
      return selection.subIndex !== undefined && selection.subIndex >= item.subquestionCount ? { id: current.id, number: item.number } : selection
    })
    return true
  }

  const resizeQuestionGroup = (block: AnswerBlock, draft: QuestionGroupDraft, count: number) => {
    if (!Number.isInteger(count) || count < 1 || count > 300) {
      MetisMessage.info('题量须在 1–300 道之间')
      return false
    }
    if (count < draft.items.length) {
      const removed = draft.items.slice(count).map((item) => item.number)
      return applyStructure(block, deleteGroupQuestionSelection(draft, removed.map((number) => ({ number }))), draft, undefined, undefined, undefined, true)
    }
    const occupied = new Set(blocks.flatMap((entry) => questionNumbers(entry.range)))
    let number = Math.max(...draft.items.map((item) => item.number)) + 1
    let next = draft
    while (next.items.length < count) {
      while (occupied.has(number)) number += 1
      if (number > 999) {
        MetisMessage.info('已达到题号上限')
        return false
      }
      next = appendGroupQuestion(next, number)
      number += 1
    }
    return applyStructure(block, next, draft, undefined, undefined, undefined, true)
  }

  const handleQuestionAction = (id: string, number: number | undefined, action: string, value?: number, editedSubIndex?: number) => {
    const current = blocks.find((block) => block.id === id)
    if (!current || !canEditQuestionGroup(current)) return
    if (action === 'clear') {
      setStructure({ id })
      return
    }
    if (action === 'select' || action === 'edit') {
      setSelectedBlockId(id)
      setActivePage(current.page)
      setStructure({ id, number, subIndex: action === 'select' ? value : undefined })
      return
    }
    if (number === undefined) return
    const draft = editableQuestionGroup(current)
    const subIndex = editedSubIndex ?? (structure?.id === id && structure.number === number ? structure.subIndex : undefined)
    const next = action === 'add-option' ? appendQuestionOption(draft, number, value)
      : action === 'add-blank' ? appendQuestionBlank(draft, number, value)
      : action === 'add-subquestion' ? appendSubquestion(draft, number)
      : action === 'delete-subquestion' && value !== undefined ? removeQuestionSubpart(draft, number, value)
      : action === 'delete' ? removeQuestionItem(draft, number)
      : action === 'score' && value !== undefined ? updateQuestionItem(draft, number, { score: value }, subIndex)
      : action === 'option-count' && value !== undefined ? updateQuestionItem(draft, number, { optionCount: value }, subIndex)
      : action === 'partial-score' && value !== undefined ? updateQuestionItem(draft, number, { partialScore: value }, subIndex)
      : action === 'blank-count' && value !== undefined ? updateQuestionItem(draft, number, { blankCount: value }, subIndex)
      : draft
    applyStructure(current, next, draft, action === 'delete' ? number : undefined, action === 'delete-subquestion' ? value : undefined, number)
  }

  const addBatchQuestionGroups = (drafts: QuestionGroupDraft[]) => {
    const nextBlocks = [...blocks]
    drafts.forEach((draft) => nextBlocks.push(buildQuestionGroup(draft, nextBlocks)))
    commitDocument({ ...document, blocks: nextBlocks, pageCount: Math.max(document.pageCount, ...nextBlocks.map((block) => block.page)), paper: { ...paper, score: totalQuestionScore(nextBlocks) } })
    setSelectedBlockId(nextBlocks[nextBlocks.length - 1].id)
    setBatchGroupOpen(false)
    MetisMessage.success(`已添加 ${drafts.length} 个题组`)
  }

  const saveAnswers = (answers: Record<string, AnswerDialogValue>) => {
    commitBlocks(blocks.map((block) => isAnswerableBlock(block) ? { ...block, objectiveAnswers: answers[block.id]?.objectiveAnswers ?? block.objectiveAnswers, referenceAnswers: answers[block.id]?.referenceAnswers ?? block.referenceAnswers } : block))
    setObjectiveAnswerOpen(false)
    MetisMessage.success('答案已保存')
  }

  const structureBlock = structure?.id === selectedBlockId ? blocks.find((block) => block.id === structure.id && !block.locked) : undefined
  const structureDraft = structureBlock ? editableQuestionGroup(structureBlock) : undefined
  const structureItem = structureDraft?.items.find((item) => item.number === structure?.number)

  const suggestedQuestionStart = Math.max(0, ...blocks.flatMap((block) => questionNumbers(block.range))) + 1

  const changePage = (page: number) => {
    setActivePage(page)
    const selected = blocks.find((block) => block.id === selectedBlockId)
    if (selected && selected.page !== page) {
      const firstBlock = blocks.find((block) => block.page === page)
      setSelectedBlockId(firstBlock?.id ?? '')
    }
  }

  const deleteSelected = () => {
    const nextBlocks = blocks.filter((block) => block.id !== selectedBlockId)
    const nextDocument = paper.sections.length === 0
      ? { ...document, blocks: nextBlocks, pageCount: Math.max(document.pageCount, ...nextBlocks.map((block) => block.page)), paper: { ...paper, score: totalQuestionScore(nextBlocks) } }
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

  const selectBlock = (blockId: string, inspectGroup = true) => {
    const block = blocks.find((item) => item.id === blockId)
    setStructure(inspectGroup && block && canEditQuestionGroup(block) ? { id: blockId } : undefined)
    setSelectedBlockId(blockId)
    if (block) setActivePage(block.page)
  }

  const toggleBlockContent = (blockId: string, element: ContentElement) => {
    const block = blocks.find((item) => item.id === blockId)
    if (!block || block.kind === 'objective') return
    if (element === 'image' || element === 'table') {
      const nextObject = element === 'table'
        ? { id: `${element}-${Date.now()}`, kind: element, x: 28, y: 42, width: 44, height: 92, rows: 3, columns: 4, squareCells: false, cells: Array(12).fill('') }
        : { id: `${element}-${Date.now()}`, kind: element, x: 32, y: 42, width: 36, height: 88 }
      updateBlock(blockId, { floatingObjects: [...(block.floatingObjects ?? []), nextObject] })
      return
    }
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
    const currentDocument = documentRef.current
    const next = splitMergedBlock(currentDocument.blocks, id)
    if (next === currentDocument.blocks) return
    commitDocument({ ...currentDocument, blocks: next })
    const first = next.find((block) => block.id === id)
    if (first) setSelectedBlockId(first.id)
    MetisMessage.success('已恢复合并前的题块')
  }

  const insertAfterBlock = (afterId: string, kind: AnswerBlockKind, responseStyle?: AnswerBlock['responseStyle'], position: 'before' | 'after' = 'after') => {
    const anchorIndex = blocks.findIndex((block) => block.id === afterId)
    const anchor = blocks[anchorIndex]
    if (!anchor) return
    const title = kind === 'section-title' ? '标题' : kind === 'forbidden' ? '禁答区' : responseStyle === 'blank' ? '空白区' : responseStyle === 'tian' ? '田字格作答区' : responseStyle === 'mi' ? '米字格作答区' : responseStyle === 'four-line' ? '四线三格作答区' : '作答线'
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
    if (!target) return
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
    MetisMessage.success(target.userInserted ? '已删除插入内容' : '已删除题块')
  }

  const updateTitle = (title: string) => {
    if (title === paper.title) return
    commitDocument({ ...document, paper: { ...paper, title } })
    MetisMessage.success('标题已更新并自动保存')
  }

  const updateSettings = (patch: Partial<AnswerSheetSettings>) => {
    const nextSettings = { ...settings, ...patch }
    const nextBlocks = patch.subjectiveAnswerStyle
      ? blocks.map((block) => {
          if (block.kind !== 'short-answer' || block.answerVariant === 'fill') return block
          if (patch.subjectiveAnswerStyle !== 'lines') return { ...block, answerAreaOverride: false, preserveAnswerAreaHeight: true, responseStyle: patch.subjectiveAnswerStyle }
          const numbers = questionNumbers(block.range)
          const lineHeight = patch.subjectiveLineHeight ?? nextSettings.subjectiveLineHeight
          const linesPerQuestion = Math.max(1, Math.floor((block.height - 30 - Math.max(0, numbers.length - 1) * 6) / Math.max(1, numbers.length) / lineHeight))
          return {
            ...block,
            answerAreaOverride: false,
            preserveAnswerAreaHeight: true,
            responseStyle: patch.subjectiveAnswerStyle,
            lineCount: linesPerQuestion,
            ...(block.answerVariant === 'solution' && numbers.length
              ? { questionLineCounts: Object.fromEntries(numbers.map((number) => [String(number), linesPerQuestion])) }
              : {}),
          }
        })
      : blocks
    if (patch.identityFields) {
      const identityFields = [...patch.identityFields]
      if (!identityFields.includes('姓名')) {
        const studentNumberIndex = identityFields.indexOf('学号')
        identityFields.splice(studentNumberIndex >= 0 ? studentNumberIndex + 1 : 0, 0, '姓名')
      }
      nextSettings.identityFields = identityFields
    }
    if (patch.candidateNumberLayouts) nextSettings.candidateNumberLayouts = [...patch.candidateNumberLayouts]
    commitDocument({ ...document, settings: nextSettings, blocks: nextBlocks })
  }

  const updateModuleMerge = (kind: 'objective' | 'subjective' | 'none', checked: boolean) => {
    if (kind === 'none') {
      if (!settings.objectiveMerge && !settings.subjectiveMerge) return
      const nextBlocks = splitMergedModulesByCategory(splitMergedModulesByCategory(blocks, 'objective'), 'subjective')
      commitDocument({ ...document, settings: { ...settings, objectiveMerge: false, subjectiveMerge: false }, blocks: nextBlocks })
      MetisMessage.success('已取消题块合并')
      return
    }
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
        {questionGroupBatchResult?.after === document && questionGroupBatchResult.removedCount && <div className="question-delete-feedback">
          <span role="status">已删除 {questionGroupBatchResult.removedCount} 道题</span>
          <button type="button" onClick={() => {
            undo()
            setSelectedBlockId(questionGroupBatchResult.id)
            setStructure({ id: questionGroupBatchResult.id })
            setQuestionGroupBatchResult(undefined)
          }}>撤销删除</button>
          <button type="button" aria-label="关闭删除提示" onClick={() => setQuestionGroupBatchResult(undefined)}>×</button>
        </div>}
        {deletedQuestion?.after === document && <div className="question-delete-feedback">
          <span role="status">已删除第 {deletedQuestion.number} 题</span>
          <button type="button" onClick={() => {
            undo()
            const restored = history[history.length - 1]?.blocks.find((block) => block.id === deletedQuestion.id)
            if (restored) {
              setSelectedBlockId(restored.id)
              setActivePage(restored.page)
              setStructure({ id: restored.id, number: deletedQuestion.number })
            }
            setDeletedQuestion(undefined)
          }}>撤销删除</button>
          <button type="button" aria-label="关闭删除提示" onClick={() => setDeletedQuestion(undefined)}>×</button>
        </div>}
        <EditorToolbar
              paper={paper}
              backLabel={backLabel}
              draftVersion={draftVersion}
              publishedVersion={published?.version}
              saving={saving}
              savedAt={savedAt}
              canUndo={history.length > 0}
              canRedo={future.length > 0}
              fromPaper={fromPaper}
              originalPaperOpen={originalPaperOpen}
              onOriginalPaper={() => setOriginalPaperOpen((open) => !open)}
              onUploadedOriginal={uploadedSourceFile ? () => setUploadedSourceOpen(true) : undefined}
              onLinkOriginal={!fromPaper && !uploadedSourceFile && onAssociateSource ? () => associateSourceInputRef.current?.click() : undefined}
              onStageSubjectChange={(grade, subject) => commitDocument({ ...document, paper: { ...paper, grade, subject } })}
              onBack={() => onBack ? onBack() : MetisMessage.info('演示：返回组卷页；当前答题卡草稿已自动保存')}
              onUndo={undo}
              onRedo={redo}
              onSave={() => void saveNow()}
              onPreflight={() => setPreflightOpen(true)}
              onPrint={() => {
                printSnapshot(document)
              }}
              onDownloadAnnotated={() => {
                downloadAnnotatedAnswerSheet(document, draftVersion)
                MetisMessage.success('已下载带批改痕迹版，可在浏览器中继续打印为 PDF')
              }}
              hasAnswerBlocks={blocks.some(isAnswerableBlock)}
              onAnswers={() => setObjectiveAnswerOpen(true)}
        />
        <div className="ai-editor-layout editor-layout-without-assistant">
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
              questionSelection={structureBlock && structureItem ? { id: structureBlock.id, number: structureItem.number, subIndex: structure?.subIndex } : undefined}
              questionStructure={structureBlock && structureDraft && structure?.number === undefined ? {
                draft: structureDraft,
                onApplyBatch: (patch) => applyStructure(structureBlock, applyQuestionBatch(structureDraft, patch), structureDraft),
                onUpdateGroupQuestion: ({ number, subIndex }, patch) => applyStructure(
                  structureBlock, updateQuestionItem(structureDraft, number, patch, subIndex), structureDraft, undefined, undefined, undefined, true,
                ),
                onAddGroupSubparts: (numbers, count) => applyStructure(
                  structureBlock, addGroupQuestionSubparts(structureDraft, numbers, count), structureDraft, undefined, undefined, undefined, true,
                ),
                onDeleteGroupQuestionSelection: (selection) => {
                  const next = deleteGroupQuestionSelection(structureDraft, selection)
                  if (next === structureDraft && structureDraft.type === 'comprehensive') {
                    MetisMessage.info('综合题的每道题至少保留两个小题')
                    return false
                  }
                  const removedParts = new Map<number, number[]>()
                  for (const { number, subIndex } of selection) {
                    if (subIndex !== undefined) removedParts.set(number, [...(removedParts.get(number) ?? []), subIndex])
                  }
                  return applyStructure(structureBlock, next, structureDraft, undefined, undefined, undefined, true, removedParts)
                },
                onAddGroupQuestion: () => resizeQuestionGroup(structureBlock, structureDraft, structureDraft.questionCount + 1),
                onResizeGroup: (count) => resizeQuestionGroup(structureBlock, structureDraft, count),
                onLocateQuestion: (number) => {
                  const labels = window.document.querySelectorAll<HTMLElement>(`.paper-stack [data-block-id="${CSS.escape(structureBlock.id)}"] [data-question-number="${number}"]`)
                  const label = [...labels].find((element) => element.getClientRects().length > 0 && getComputedStyle(element).visibility === 'visible')
                  label?.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' })
                  label?.animate([{ backgroundColor: '#d8cffb' }, { backgroundColor: 'transparent' }], { duration: 1500 })
                },
                subject: paper.subject,
                onUpdateSubquestionType: (selection, type) => applyStructure(
                  structureBlock, setGroupSubquestionType(structureDraft, selection, type), structureDraft, undefined, undefined, undefined, true,
                ),
              } : undefined}
              onQuestionAction={handleQuestionAction}
              onBatchAddQuestionGroups={() => setBatchGroupOpen(true)}
              onAddQuestionGroup={(type) => { setQuestionGroupType(type); setQuestionGroupOpen(true) }}
              onEditQuestionGroup={(id) => {
                const block = blocks.find((item) => item.id === id)
                if (block) handleQuestionAction(id, undefined, 'edit')
              }}
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

        </div>
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
      <BatchQuestionGroupDialog open={batchGroupOpen} subject={paper.subject} suggestedStart={suggestedQuestionStart} onClose={() => setBatchGroupOpen(false)} onSubmit={addBatchQuestionGroups} />
      <QuestionGroupDialog open={questionGroupOpen} suggestedStart={suggestedQuestionStart} type={questionGroupType} subject={paper.subject} onClose={() => setQuestionGroupOpen(false)} onSubmit={addQuestionGroup} />
      <ObjectiveAnswerDialog open={objectiveAnswerOpen} blocks={blocks} onClose={() => setObjectiveAnswerOpen(false)} onSave={saveAnswers} />
      <SourcePaperPreviewDialog file={uploadedSourceOpen ? uploadedSourceFile : undefined} onClose={() => setUploadedSourceOpen(false)} />
      <input ref={associateSourceInputRef} type="file" hidden onChange={(event) => {
        const file = event.target.files?.[0]
        if (file) onAssociateSource?.(file)
        event.currentTarget.value = ''
      }} />
    </>
  )
}
