import { useEffect, useMemo, useRef, useState } from 'react'
import { MetisMessage } from '@yuanfudao/metis-web-component'
import {
  answerSheetTemplates,
  defaultAnswerSheetDocument,
  instantiateTemplate,
} from '../data/answerSheetTemplates'
import { rulePacks } from '../data/mockPaper'
import { autoFixBlocks, buildPreflightChecks } from '../features/answer-sheet/preflight'
import { downloadAnnotatedAnswerSheet } from '../features/answer-sheet/export'
import {
  consolidateBlocks,
  mergeWithNext,
  moveBlock as moveBlockOperation,
  renumberQuestionBlocks,
  reorderBlock,
  splitBlock,
} from '../features/answer-sheet/operations'
import type {
  AnswerBlock,
  AnswerBlockKind,
  AnswerSheetDocument,
  AnswerSheetSettings,
  AnswerSheetTemplate,
  DraftSnapshot,
  PublishedVersion,
  TemplateCategory,
} from '../features/answer-sheet/types'
import { isQuestionBlockKind } from '../features/answer-sheet/types'
import { answerSheetService } from '../services/answerSheetService'
import { EditorToolbar } from '../components/EditorToolbar'
import { EditorWorkbench } from '../components/EditorWorkbench'
import { PreflightDialog } from '../components/PreflightDialog'
import { StudioHeader } from '../components/StudioHeader'
import { TemplatePickerDialog } from '../components/TemplatePickerDialog'

type TemplateFilter = 'all' | TemplateCategory

function cloneDefaultDocument(): AnswerSheetDocument {
  return {
    ...defaultAnswerSheetDocument,
    paper: {
      ...defaultAnswerSheetDocument.paper,
      sections: defaultAnswerSheetDocument.paper.sections.map((section) => ({ ...section })),
    },
    blocks: defaultAnswerSheetDocument.blocks.map((block) => ({ ...block, contentElements: block.contentElements ? [...block.contentElements] : undefined })),
    settings: {
      ...defaultAnswerSheetDocument.settings,
      identityFields: [...defaultAnswerSheetDocument.settings.identityFields],
    },
  }
}

function totalQuestionScore(blocks: AnswerBlock[]): number {
  return blocks.reduce((total, block) => total + (isQuestionBlockKind(block.kind) ? block.score ?? 0 : 0), 0)
}

export function AnswerSheetStudioPage() {
  const [document, setDocument] = useState<AnswerSheetDocument>(cloneDefaultDocument)
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
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false)
  const [templateInitialFilter, setTemplateInitialFilter] = useState<TemplateFilter>('all')
  const [printDocument, setPrintDocument] = useState<AnswerSheetDocument>()
  const saveTimer = useRef<number>()

  useEffect(() => {
    const clearPrintSnapshot = () => setPrintDocument(undefined)
    window.addEventListener('afterprint', clearPrintSnapshot)
    return () => window.removeEventListener('afterprint', clearPrintSnapshot)
  }, [])

  const { paper, blocks, settings, mode, rulePackId, pageCount } = document
  const rulePack = rulePacks.find((pack) => pack.id === rulePackId) ?? rulePacks[0]
  const currentTemplate = answerSheetTemplates.find((template) => template.id === document.templateId)
  const checks = useMemo(
    () => buildPreflightChecks(paper, blocks, mode, rulePack, pageCount, settings),
    [blocks, mode, pageCount, paper, rulePack, settings],
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

  const applyTemplate = (template: AnswerSheetTemplate) => {
    const templateDocument = instantiateTemplate(template)
    const nextPageCount = templateDocument.pageCount
    const retainedBlocks = document.blocks.map((block) => ({
      ...block,
      page: Math.min(block.page, nextPageCount),
      contentElements: block.contentElements ? [...block.contentElements] : undefined,
    }))
    let nextDocument: AnswerSheetDocument = {
      ...templateDocument,
      blocks: retainedBlocks,
      templateId: template.id,
    }
    nextDocument = {
      ...nextDocument,
      paper: {
        ...document.paper,
        sections: document.paper.sections.map((section) => ({ ...section })),
      },
      settings: { ...nextDocument.settings, linkedPaperId: document.paper.id },
    }
    commitDocument(nextDocument)
    MetisMessage.success(`已套用“${template.name}”版式，当前试卷题号与分值保持不变`)
    setActivePage(1)
    setSelectedBlockId(nextDocument.blocks[0]?.id ?? '')
    setTemplateDialogOpen(false)
  }

  const openTemplateCenter = () => {
    setTemplateInitialFilter('all')
    setTemplateDialogOpen(true)
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

  const addBlock = (kind: AnswerBlockKind) => {
    const labels: Record<AnswerBlockKind, string> = {
      objective: '新增客观题填涂区',
      'short-answer': '新增短答区域',
      essay: '新增作文 / 综合题区',
      mixed: '新增混合题区域',
      forbidden: '禁答区，请勿书写',
      drawing: '新增作图区',
      table: '新增表格区',
      notice: '作答说明',
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
    if (paper.sections.length === 0) {
      commitDocument({
        ...document,
        blocks: nextBlocks,
        paper: { ...paper, score: totalQuestionScore(nextBlocks) },
      })
      return
    }
    commitBlocks(nextBlocks)
  }

  const updateSelected = (patch: Partial<AnswerBlock>) => updateBlock(selectedBlockId, patch)

  const updateTitle = (title: string) => {
    if (title === paper.title) return
    commitDocument({ ...document, paper: { ...paper, title } })
    MetisMessage.success('标题已更新并自动保存')
  }

  const changePageCount = (nextPageCount: number) => {
    const integerPageCount = Number.isFinite(nextPageCount) ? Math.round(nextPageCount) : 1
    const normalizedPageCount = Math.min(4, Math.max(1, integerPageCount))
    const nextBlocks = blocks.map((block) => block.page > normalizedPageCount ? { ...block, page: normalizedPageCount } : block)
    commitDocument({ ...document, blocks: nextBlocks, pageCount: normalizedPageCount })
  }

  const updateSettings = (patch: Partial<AnswerSheetSettings>) => {
    const nextSettings = { ...settings, ...patch }
    if (patch.identityFields) nextSettings.identityFields = [...patch.identityFields]
    commitDocument({ ...document, settings: nextSettings })
  }

  const changeMode = (nextMode: typeof mode) => {
    if (nextMode === mode) return
    commitDocument({ ...document, mode: nextMode })
    MetisMessage.success(nextMode === 'standard' ? '已启用大考规范约束' : '已切换为飞象自由排版')
  }

  const changeRulePack = (id: string) => {
    if (id === rulePackId) return
    const nextRulePack = rulePacks.find((pack) => pack.id === id)
    if (!nextRulePack) return
    const nextPageCount = Math.min(4, Math.max(1, nextRulePack.pageCount))
    const nextBlocks = blocks.map((block) => block.page > nextPageCount ? { ...block, page: nextPageCount } : block)
    commitDocument({
      ...document,
      rulePackId: id,
      pageCount: nextPageCount,
      blocks: nextBlocks,
      settings: { ...settings, paperSize: nextRulePack.paperSize },
    })
    MetisMessage.info('规则包及默认纸张、面数已切换，题目内容保持不变')
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
      <StudioHeader paperTitle={paper.title} />
      <div className="studio-body stage-editor">
        <EditorToolbar
              paper={paper}
              templateName={currentTemplate?.name ?? '自定义模板'}
              draftVersion={draftVersion}
              publishedVersion={published?.version}
              saving={saving}
              savedAt={savedAt}
              canUndo={history.length > 0}
              canRedo={future.length > 0}
              onBack={() => MetisMessage.info('演示：返回组卷页；当前答题卡草稿已自动保存')}
              onUndo={undo}
              onRedo={redo}
              onSave={() => void saveNow()}
              onPreflight={() => setPreflightOpen(true)}
              onPrint={() => printSnapshot(document)}
              onDownloadAnnotated={() => {
                downloadAnnotatedAnswerSheet(document, draftVersion)
                MetisMessage.success('已下载带批改痕迹版，可在浏览器中继续打印为 PDF')
              }}
        />
        <EditorWorkbench
              document={document}
              rulePacks={rulePacks}
              rulePack={rulePack}
              templateName={currentTemplate?.name ?? '自定义模板'}
              activePage={activePage}
              selectedBlockId={selectedBlockId}
              onPageChange={changePage}
              onSelect={setSelectedBlockId}
              onUpdate={updateSelected}
              onMove={moveBlock}
              onDelete={deleteSelected}
              onAdd={addBlock}
              onTitleCommit={updateTitle}
              onBlockTitleCommit={(id, title) => updateBlock(id, { title })}
              onModeChange={changeMode}
              onRulePackChange={changeRulePack}
              onOpenTemplates={openTemplateCenter}
              onSettingsChange={updateSettings}
              onPageCountChange={changePageCount}
              onReorder={dragBlock}
              onRenumber={renumberBlocks}
              onSplit={splitSelected}
              onMerge={mergeSelected}
              onConsolidate={consolidate}
              printDocument={printDocument}
        />
      </div>

      <TemplatePickerDialog
        open={templateDialogOpen}
        context="replace"
        currentTemplateId={document.templateId}
        initialFilter={templateInitialFilter}
        onClose={() => setTemplateDialogOpen(false)}
        onApply={applyTemplate}
      />

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
    </>
  )
}
