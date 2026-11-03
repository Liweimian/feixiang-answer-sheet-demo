import { useMemo, useRef, useState } from 'react'
import { MetisMessage } from '@yuanfudao/metis-web-component'
import {
  answerSheetTemplates,
  defaultAnswerSheetDocument,
  instantiateTemplate,
} from '../data/answerSheetTemplates'
import { rulePacks } from '../data/mockPaper'
import { autoFixBlocks, buildPreflightChecks } from '../features/answer-sheet/preflight'
import type {
  AnswerBlock,
  AnswerBlockKind,
  AnswerSheetDocument,
  AnswerSheetTemplate,
  DraftSnapshot,
  FlowStage,
  ParseResult,
  PublishedVersion,
  SourceKind,
  TemplateCategory,
} from '../features/answer-sheet/types'
import { isQuestionBlockKind } from '../features/answer-sheet/types'
import { answerSheetService } from '../services/answerSheetService'
import { EditorToolbar } from '../components/EditorToolbar'
import { EditorWorkbench } from '../components/EditorWorkbench'
import { ParsingStage } from '../components/ParsingStage'
import { PaperSettingsDialog } from '../components/PaperSettingsDialog'
import { PreflightDialog } from '../components/PreflightDialog'
import { SourceSetup } from '../components/SourceSetup'
import { StudioHeader } from '../components/StudioHeader'
import { TemplatePickerDialog } from '../components/TemplatePickerDialog'

type TemplateFilter = 'all' | TemplateCategory

function cloneDefaultDocument(): AnswerSheetDocument {
  return {
    ...defaultAnswerSheetDocument,
    mode: 'smart',
    paper: {
      ...defaultAnswerSheetDocument.paper,
      sections: defaultAnswerSheetDocument.paper.sections.map((section) => ({ ...section })),
    },
    blocks: defaultAnswerSheetDocument.blocks.map((block) => ({ ...block })),
  }
}

function totalQuestionScore(blocks: AnswerBlock[]): number {
  return blocks.reduce((total, block) => total + (isQuestionBlockKind(block.kind) ? block.score ?? 0 : 0), 0)
}

export function AnswerSheetStudioPage() {
  const [stage, setStage] = useState<FlowStage>('source')
  const [document, setDocument] = useState<AnswerSheetDocument>(cloneDefaultDocument)
  const [parseResult, setParseResult] = useState<ParseResult>()
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
  const [templateDialogContext, setTemplateDialogContext] = useState<'create' | 'replace'>('create')
  const [templateInitialFilter, setTemplateInitialFilter] = useState<TemplateFilter>('all')
  const [paperSettingsOpen, setPaperSettingsOpen] = useState(false)
  const saveTimer = useRef<number>()

  const { paper, blocks, mode, rulePackId, pageCount } = document
  const rulePack = rulePacks.find((pack) => pack.id === rulePackId) ?? rulePacks[0]
  const currentTemplate = answerSheetTemplates.find((template) => template.id === document.templateId)
  const checks = useMemo(
    () => buildPreflightChecks(paper, blocks, mode, rulePack, pageCount),
    [blocks, mode, pageCount, paper, rulePack],
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

  const beginNewDocument = (nextDocument: AnswerSheetDocument) => {
    window.clearTimeout(saveTimer.current)
    setDocument(nextDocument)
    setHistory([])
    setFuture([])
    setDraftVersion(1)
    setPublished(undefined)
    setActivePage(1)
    setSelectedBlockId(nextDocument.blocks[0]?.id ?? '')
    scheduleSave(nextDocument, 1)
  }

  const startFromSource = async (source: SourceKind) => {
    if (source === 'blank' || source === 'template') {
      setTemplateDialogContext('create')
      setTemplateInitialFilter(document.mode === 'standard' ? 'standard' : 'all')
      setTemplateDialogOpen(true)
      return
    }

    const nextDocument = cloneDefaultDocument()
    nextDocument.mode = document.mode
    beginNewDocument(nextDocument)
    setParseResult(undefined)
    setStage('parsing')
    setParseResult(await answerSheetService.parsePaper(nextDocument.paper))
  }

  const applyTemplate = (template: AnswerSheetTemplate, options: { preserveTitle: boolean }) => {
    let nextDocument = instantiateTemplate(template)
    if (templateDialogContext === 'replace' && options.preserveTitle) {
      nextDocument = {
        ...nextDocument,
        paper: { ...nextDocument.paper, title: document.paper.title },
      }
    }

    if (templateDialogContext === 'replace') {
      commitDocument(nextDocument)
      MetisMessage.success(`已套用“${template.name}”，可使用撤销恢复原结构`)
    } else {
      beginNewDocument(nextDocument)
      setStage('editor')
      MetisMessage.success(`已从“${template.name}”开始创建`)
    }
    setActivePage(1)
    setSelectedBlockId(nextDocument.blocks[0]?.id ?? '')
    setTemplateDialogOpen(false)
  }

  const openTemplateCenter = () => {
    setTemplateDialogContext('replace')
    setTemplateInitialFilter('all')
    setTemplateDialogOpen(true)
  }

  const moveBlock = (id: string, direction: -1 | 1) => {
    const currentIndex = blocks.findIndex((block) => block.id === id)
    if (currentIndex < 0) return
    const pageIndices = blocks.reduce<number[]>((indices, block, index) => {
      if (block.page === blocks[currentIndex].page) indices.push(index)
      return indices
    }, [])
    const positionOnPage = pageIndices.indexOf(currentIndex)
    const targetIndex = pageIndices[positionOnPage + direction]
    if (targetIndex === undefined) return
    const next = [...blocks]
    ;[next[currentIndex], next[targetIndex]] = [next[targetIndex], next[currentIndex]]
    commitBlocks(next)
  }

  const addBlock = (kind: AnswerBlockKind) => {
    const labels: Record<AnswerBlockKind, string> = {
      objective: '新增客观题填涂区',
      'short-answer': '新增短答区域',
      essay: '新增作文 / 综合题区',
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
      height: kind === 'forbidden' ? 56 : kind === 'essay' ? 260 : kind === 'drawing' || kind === 'table' ? 140 : 104,
      lineCount: kind === 'short-answer' ? 4 : kind === 'essay' ? 12 : undefined,
      optionCount: kind === 'objective' ? 4 : undefined,
      itemsPerColumn: kind === 'objective' ? 11 : undefined,
      showScore: false,
      locked: kind === 'forbidden',
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

  const updateSelected = (patch: Partial<AnswerBlock>) => {
    const normalizedPatch: Partial<AnswerBlock> = { ...patch }
    if (patch.kind) {
      normalizedPatch.locked = patch.kind === 'forbidden'
      if (!isQuestionBlockKind(patch.kind)) {
        Object.assign(normalizedPatch, {
          sectionId: undefined,
          range: undefined,
          score: undefined,
          lineCount: undefined,
          optionCount: undefined,
          itemsPerColumn: undefined,
          writingLayout: undefined,
          showScore: false,
          hint: undefined,
        })
      } else {
        normalizedPatch.hint = undefined
        if (patch.kind !== 'objective') {
          normalizedPatch.optionCount = undefined
          normalizedPatch.itemsPerColumn = undefined
        }
        if (patch.kind !== 'short-answer' && patch.kind !== 'essay') normalizedPatch.lineCount = undefined
        if (patch.kind !== 'essay') normalizedPatch.writingLayout = undefined
      }
    }
    const nextBlocks = blocks.map((block) => block.id === selectedBlockId ? { ...block, ...normalizedPatch } : block)
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

  const updateTitle = (title: string) => {
    if (title === paper.title) return
    commitDocument({ ...document, paper: { ...paper, title } })
    MetisMessage.success('标题已更新并自动保存')
  }

  const savePaperSettings = (nextPaper: typeof paper, nextPageCount: number) => {
    const integerPageCount = Number.isFinite(nextPageCount) ? Math.round(nextPageCount) : 1
    const normalizedPageCount = Math.min(4, Math.max(1, integerPageCount))
    const nextBlocks = blocks.map((block) => block.page > normalizedPageCount ? { ...block, page: normalizedPageCount } : block)
    commitDocument({ ...document, paper: nextPaper, blocks: nextBlocks, pageCount: normalizedPageCount })
    setPaperSettingsOpen(false)
    MetisMessage.success('基础信息已更新，相关校验已重新计算')
  }

  const confirmParsedStructure = (writingLayout: 'choose-one' | 'separate') => {
    const nextBlocks = blocks.map((block) => block.kind === 'essay'
      ? {
          ...block,
          writingLayout,
          height: writingLayout === 'separate' ? Math.max(block.height, 320) : block.height,
          hint: writingLayout === 'separate'
            ? '两个作文选项分别预留独立作答区，请任选其一作答。'
            : '二选一，共用作答区；不少于 50 词',
        }
      : block)
    commitDocument({ ...document, blocks: nextBlocks })
    setStage('editor')
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
    const version = await answerSheetService.publish(draftVersion)
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

  return (
    <>
      <StudioHeader stage={stage} />
      <div className={`studio-body stage-${stage}`}>
        {stage === 'source' && (
          <SourceSetup
            mode={mode}
            onModeChange={(nextMode) => setDocument((current) => ({ ...current, mode: nextMode }))}
            onStart={(source) => void startFromSource(source)}
          />
        )}
        {stage === 'parsing' && (
          <ParsingStage
            paper={paper}
            result={parseResult}
            onBack={() => setStage('source')}
            onConfirm={confirmParsedStructure}
          />
        )}
        {stage === 'editor' && (
          <>
            <EditorToolbar
              paper={paper}
              mode={mode}
              rulePacks={rulePacks}
              rulePackId={rulePackId}
              templateName={currentTemplate?.name ?? '自定义模板'}
              draftVersion={draftVersion}
              publishedVersion={published?.version}
              saving={saving}
              savedAt={savedAt}
              canUndo={history.length > 0}
              canRedo={future.length > 0}
              onBack={() => setStage('source')}
              onModeChange={(nextMode) => {
                if (nextMode === mode) return
                commitDocument({ ...document, mode: nextMode })
                MetisMessage.success(nextMode === 'standard' ? '已启用大考规范约束' : '已切换为飞象自由排版')
              }}
              onRulePackChange={(id) => {
                if (id === rulePackId) return
                commitDocument({ ...document, rulePackId: id })
                MetisMessage.info('规则包已切换，题目内容保持不变')
              }}
              onOpenTemplates={openTemplateCenter}
              onOpenPaperSettings={() => setPaperSettingsOpen(true)}
              onUndo={undo}
              onRedo={redo}
              onSave={() => void saveNow()}
              onPreflight={() => setPreflightOpen(true)}
              onPrint={() => window.print()}
            />
            <EditorWorkbench
              paper={paper}
              blocks={blocks}
              mode={mode}
              rulePack={rulePack}
              pageCount={pageCount}
              activePage={activePage}
              selectedBlockId={selectedBlockId}
              onPageChange={changePage}
              onSelect={setSelectedBlockId}
              onUpdate={updateSelected}
              onMove={moveBlock}
              onDelete={deleteSelected}
              onAdd={addBlock}
              onTitleCommit={updateTitle}
            />
          </>
        )}
      </div>

      <TemplatePickerDialog
        open={templateDialogOpen}
        context={templateDialogContext}
        currentTemplateId={templateDialogContext === 'replace' ? document.templateId : undefined}
        initialFilter={templateInitialFilter}
        onClose={() => setTemplateDialogOpen(false)}
        onApply={applyTemplate}
      />

      <PaperSettingsDialog
        open={paperSettingsOpen}
        paper={paper}
        pageCount={pageCount}
        onClose={() => setPaperSettingsOpen(false)}
        onSave={savePaperSettings}
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
        onDownload={() => MetisMessage.success('演示：打印版文件已生成')}
      />
    </>
  )
}
