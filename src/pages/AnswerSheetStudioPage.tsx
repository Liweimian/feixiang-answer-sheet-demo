import { useMemo, useRef, useState } from 'react'
import { MetisMessage } from '@yuanfudao/metis-web-component'
import { beijingEnglishPaper, initialAnswerBlocks, rulePacks } from '../data/mockPaper'
import { autoFixBlocks, buildPreflightChecks } from '../features/answer-sheet/preflight'
import type {
  AnswerBlock,
  AnswerBlockKind,
  CardMode,
  DraftSnapshot,
  FlowStage,
  ParseResult,
  PublishedVersion,
  SourceKind,
} from '../features/answer-sheet/types'
import { answerSheetService } from '../services/answerSheetService'
import { EditorToolbar } from '../components/EditorToolbar'
import { EditorWorkbench } from '../components/EditorWorkbench'
import { ParsingStage } from '../components/ParsingStage'
import { PreflightDialog } from '../components/PreflightDialog'
import { SourceSetup } from '../components/SourceSetup'
import { StudioHeader } from '../components/StudioHeader'

export function AnswerSheetStudioPage() {
  const [stage, setStage] = useState<FlowStage>('source')
  const [mode, setMode] = useState<CardMode>('smart')
  const [parseResult, setParseResult] = useState<ParseResult>()
  const [blocks, setBlocks] = useState<AnswerBlock[]>(initialAnswerBlocks)
  const [history, setHistory] = useState<AnswerBlock[][]>([])
  const [future, setFuture] = useState<AnswerBlock[][]>([])
  const [selectedBlockId, setSelectedBlockId] = useState(initialAnswerBlocks[0].id)
  const [activePage, setActivePage] = useState(1)
  const [rulePackId, setRulePackId] = useState(rulePacks[0].id)
  const [draftVersion, setDraftVersion] = useState(1)
  const [published, setPublished] = useState<PublishedVersion>()
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState('刚刚')
  const [preflightOpen, setPreflightOpen] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const saveTimer = useRef<number>()
  const rulePack = rulePacks.find((pack) => pack.id === rulePackId) ?? rulePacks[0]
  const checks = useMemo(() => buildPreflightChecks(beijingEnglishPaper, blocks, mode, rulePack), [blocks, mode, rulePack])

  const ensureNextDraft = () => {
    let version = draftVersion
    if (published && draftVersion <= published.version) {
      version = published.version + 1
      setDraftVersion(version)
      MetisMessage.info(`已创建 V${version} 草稿，V${published.version} 印刷版不受影响`)
    }
    return version
  }

  const currentSnapshot = (overrides: Partial<DraftSnapshot> = {}): DraftSnapshot => ({
    blocks,
    mode,
    rulePackId,
    ...overrides,
  })

  const scheduleSave = (snapshot: DraftSnapshot, version = draftVersion) => {
    setSaving(true)
    window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(async () => {
      const result = await answerSheetService.saveDraft(snapshot, version)
      setSavedAt(result.savedAt)
      setSaving(false)
    }, 700)
  }

  const commitBlocks = (nextBlocks: AnswerBlock[]) => {
    const version = ensureNextDraft()
    setHistory((items) => [...items.slice(-9), blocks])
    setFuture([])
    setBlocks(nextBlocks)
    scheduleSave(currentSnapshot({ blocks: nextBlocks }), version)
  }

  const startParsing = async (_source: SourceKind) => {
    setParseResult(undefined)
    setStage('parsing')
    setParseResult(await answerSheetService.parsePaper(beijingEnglishPaper))
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
      objective: '客观题填涂区', 'short-answer': '短答区域', essay: '作文区域',
      forbidden: '禁答区，请勿书写', drawing: '新增作图区', table: '新增表格区', notice: '作答说明',
    }
    const nextBlock: AnswerBlock = {
      id: `${kind}-${Date.now()}`,
      page: activePage,
      title: labels[kind],
      kind,
      height: kind === 'forbidden' ? 56 : 104,
      showScore: false,
      locked: mode === 'standard' && kind === 'forbidden',
    }
    commitBlocks([...blocks, nextBlock])
    setSelectedBlockId(nextBlock.id)
  }

  const changePage = (page: number) => {
    setActivePage(page)
    const selected = blocks.find((block) => block.id === selectedBlockId)
    if (selected?.page !== page) {
      const firstBlock = blocks.find((block) => block.page === page)
      if (firstBlock) setSelectedBlockId(firstBlock.id)
    }
  }

  const deleteSelected = () => {
    const nextBlocks = blocks.filter((block) => block.id !== selectedBlockId)
    commitBlocks(nextBlocks)
    const fallback = nextBlocks.find((block) => block.page === activePage)
    setSelectedBlockId(fallback?.id ?? '')
  }

  const updateSelected = (patch: Partial<AnswerBlock>) => {
    commitBlocks(blocks.map((block) => block.id === selectedBlockId ? { ...block, ...patch } : block))
  }

  const undo = () => {
    const previous = history[history.length - 1]
    if (!previous) return
    setFuture((items) => [blocks, ...items].slice(0, 10))
    setHistory((items) => items.slice(0, -1))
    setBlocks(previous)
    scheduleSave(currentSnapshot({ blocks: previous }), ensureNextDraft())
  }

  const redo = () => {
    const next = future[0]
    if (!next) return
    setHistory((items) => [...items, blocks].slice(-10))
    setFuture((items) => items.slice(1))
    setBlocks(next)
    scheduleSave(currentSnapshot({ blocks: next }), ensureNextDraft())
  }

  const saveNow = async () => {
    window.clearTimeout(saveTimer.current)
    setSaving(true)
    const result = await answerSheetService.saveDraft(currentSnapshot(), draftVersion)
    setSavedAt(result.savedAt)
    setSaving(false)
    MetisMessage.success('草稿已保存')
  }

  const publish = async () => {
    window.clearTimeout(saveTimer.current)
    setPublishing(true)
    setSaving(true)
    const saved = await answerSheetService.saveDraft(currentSnapshot(), draftVersion)
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
        {stage === 'source' && <SourceSetup mode={mode} onModeChange={setMode} onStart={(source) => void startParsing(source)} />}
        {stage === 'parsing' && <ParsingStage result={parseResult} onBack={() => setStage('source')} onConfirm={() => setStage('editor')} />}
        {stage === 'editor' && (
          <>
            <EditorToolbar
              paper={beijingEnglishPaper}
              mode={mode}
              rulePacks={rulePacks}
              rulePackId={rulePackId}
              draftVersion={draftVersion}
              publishedVersion={published?.version}
              saving={saving}
              savedAt={savedAt}
              canUndo={history.length > 0}
              canRedo={future.length > 0}
              onBack={() => setStage('source')}
              onModeChange={(nextMode) => {
                if (nextMode === mode) return
                const version = ensureNextDraft()
                setMode(nextMode)
                scheduleSave(currentSnapshot({ mode: nextMode }), version)
                MetisMessage.success(nextMode === 'standard' ? '已启用大考规范约束' : '已切换为飞象自由排版')
              }}
              onRulePackChange={(id) => {
                if (id === rulePackId) return
                const version = ensureNextDraft()
                setRulePackId(id)
                scheduleSave(currentSnapshot({ rulePackId: id }), version)
                MetisMessage.info('规则包已切换，题目内容保持不变')
              }}
              onUndo={undo}
              onRedo={redo}
              onSave={() => void saveNow()}
              onPreflight={() => setPreflightOpen(true)}
              onPrint={() => window.print()}
            />
            <EditorWorkbench
              paper={beijingEnglishPaper}
              blocks={blocks}
              mode={mode}
              rulePack={rulePack}
              activePage={activePage}
              selectedBlockId={selectedBlockId}
              onPageChange={changePage}
              onSelect={setSelectedBlockId}
              onUpdate={updateSelected}
              onMove={moveBlock}
              onDelete={deleteSelected}
              onAdd={addBlock}
            />
          </>
        )}
      </div>

      <PreflightDialog
        open={preflightOpen}
        checks={checks}
        publishing={publishing}
        published={published}
        draftVersion={draftVersion}
        onClose={() => setPreflightOpen(false)}
        onAutoFix={() => { commitBlocks(autoFixBlocks(blocks)); MetisMessage.success('已优化作答空间，请再次确认') }}
        onPublish={() => void publish()}
        onLocate={locateBlock}
        onDownload={() => MetisMessage.success('演示：打印版文件已生成')}
      />
    </>
  )
}
