import type { AnswerBlock } from './types'
import { isQuestionBlockKind } from './types'
import { formatQuestionRange, parseQuestionRange } from './range'

type MoveDirection = -1 | 1
type ConsolidationKind = 'objective' | 'subjective'

function roundScore(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function nextSplitId(blocks: AnswerBlock[], id: string): string {
  const usedIds = new Set(blocks.map((block) => block.id))
  const base = `${id}-split`
  if (!usedIds.has(base)) return base

  let suffix = 2
  while (usedIds.has(`${base}-${suffix}`)) suffix += 1
  return `${base}-${suffix}`
}

function mergeScores(first?: number, second?: number): number | undefined {
  if (!Number.isFinite(first) || !Number.isFinite(second)) return undefined
  return roundScore(Number(first) + Number(second))
}

function isConsolidationTarget(block: AnswerBlock, kind: ConsolidationKind): boolean {
  if (kind === 'objective') return block.kind === 'objective'
  return isQuestionBlockKind(block.kind) && block.kind !== 'objective'
}

function consolidateUnlockedSegment(
  segment: AnswerBlock[],
  kind: ConsolidationKind,
): AnswerBlock[] {
  const firstTargetIndex = segment.findIndex((block) => isConsolidationTarget(block, kind))
  if (firstTargetIndex < 0) return segment

  const leading = segment
    .slice(0, firstTargetIndex)
    .filter((block) => !isConsolidationTarget(block, kind))
  const targets = segment.filter((block) => isConsolidationTarget(block, kind))
  const trailing = segment
    .slice(firstTargetIndex)
    .filter((block) => !isConsolidationTarget(block, kind))

  return [...leading, ...targets, ...trailing]
}

/** Move a block one position within its current page. */
export function moveBlock(
  blocks: AnswerBlock[],
  id: string,
  direction: MoveDirection,
): AnswerBlock[] {
  const currentIndex = blocks.findIndex((block) => block.id === id)
  const current = blocks[currentIndex]
  if (!current || current.locked) return blocks

  const pageIndices = blocks.reduce<number[]>((indices, block, index) => {
    if (block.page === current.page) indices.push(index)
    return indices
  }, [])
  const pagePosition = pageIndices.indexOf(currentIndex)
  const targetIndex = pageIndices[pagePosition + direction]
  const target = targetIndex === undefined ? undefined : blocks[targetIndex]
  if (!target || target.locked) return blocks

  const next = [...blocks]
  ;[next[currentIndex], next[targetIndex]] = [next[targetIndex], next[currentIndex]]
  return next
}

/** Place the dragged block immediately before the target block. */
export function reorderBlock(
  blocks: AnswerBlock[],
  dragId: string,
  targetId: string,
): AnswerBlock[] {
  if (dragId === targetId) return blocks

  const dragIndex = blocks.findIndex((block) => block.id === dragId)
  const targetIndex = blocks.findIndex((block) => block.id === targetId)
  const dragged = blocks[dragIndex]
  const target = blocks[targetIndex]
  if (!dragged || !target || dragged.locked || target.locked) return blocks
  const remaining = blocks.filter((_, index) => index !== dragIndex)
  const targetPosition = remaining.findIndex((block) => block.id === targetId)
  if (targetPosition < 0) return blocks
  const insertionIndex = dragIndex < targetIndex ? targetPosition + 1 : targetPosition

  const moved = dragged.page === target.page ? dragged : { ...dragged, page: target.page }
  return [
    ...remaining.slice(0, insertionIndex),
    moved,
    ...remaining.slice(insertionIndex),
  ]
}

/** Renumber valid, unlocked question blocks while preserving each block's item count. */
export function renumberQuestionBlocks(
  blocks: AnswerBlock[],
  start = 1,
): AnswerBlock[] {
  let nextNumber = Number.isFinite(start) ? Math.max(1, Math.floor(start)) : 1
  let changed = false

  const next = blocks.map((block) => {
    if (!isQuestionBlockKind(block.kind)) return block

    const parsed = parseQuestionRange(block.range)
    if (!parsed.valid || parsed.numbers.length === 0) return block

    if (block.locked) {
      nextNumber = Math.max(nextNumber, Math.max(...parsed.numbers) + 1)
      return block
    }

    const numbers = Array.from(
      { length: parsed.numbers.length },
      (_, index) => nextNumber + index,
    )
    nextNumber += parsed.numbers.length
    const range = formatQuestionRange(numbers)
    if (range === block.range) return block
    changed = true
    return { ...block, range }
  })

  return changed ? next : blocks
}

/** Split a valid question block into two adjacent blocks. */
export function splitBlock(blocks: AnswerBlock[], id: string): AnswerBlock[] {
  const index = blocks.findIndex((block) => block.id === id)
  const block = blocks[index]
  if (!block || block.locked || !isQuestionBlockKind(block.kind)) return blocks

  const parsed = parseQuestionRange(block.range)
  if (!parsed.valid || parsed.numbers.length < 2) return blocks

  const firstCount = Math.ceil(parsed.numbers.length / 2)
  const firstNumbers = parsed.numbers.slice(0, firstCount)
  const secondNumbers = parsed.numbers.slice(firstCount)
  const firstRatio = firstCount / parsed.numbers.length

  const firstHeight = Math.round(block.height * firstRatio)
  const secondHeight = block.height - firstHeight
  const hasScore = Number.isFinite(block.score)
  const firstScore = hasScore ? roundScore(Number(block.score) * firstRatio) : undefined
  const secondScore = hasScore ? roundScore(Number(block.score) - Number(firstScore)) : undefined

  const hasLineCount = Number.isFinite(block.lineCount)
  const firstLineCount = hasLineCount
    ? Math.max(1, Math.round(Number(block.lineCount) * firstRatio))
    : undefined
  const secondLineCount = hasLineCount
    ? Math.max(1, Number(block.lineCount) - Number(firstLineCount))
    : undefined

  const first: AnswerBlock = {
    ...block,
    range: formatQuestionRange(firstNumbers),
    score: firstScore,
    height: firstHeight,
    lineCount: firstLineCount,
    contentElements: block.contentElements ? [...block.contentElements] : undefined,
  }
  const second: AnswerBlock = {
    ...block,
    id: nextSplitId(blocks, block.id),
    range: formatQuestionRange(secondNumbers),
    score: secondScore,
    height: secondHeight,
    lineCount: secondLineCount,
    contentElements: block.contentElements ? [...block.contentElements] : undefined,
  }

  return [...blocks.slice(0, index), first, second, ...blocks.slice(index + 1)]
}

/** Merge a block with the immediately following compatible block. */
export function mergeWithNext(blocks: AnswerBlock[], id: string): AnswerBlock[] {
  const index = blocks.findIndex((block) => block.id === id)
  const current = blocks[index]
  const following = blocks[index + 1]
  if (
    !current
    || !following
    || current.locked
    || following.locked
    || current.page !== following.page
    || current.kind !== following.kind
  ) return blocks

  const currentRange = parseQuestionRange(current.range)
  const followingRange = parseQuestionRange(following.range)
  if (!currentRange.valid || !followingRange.valid) return blocks

  const combinedNumbers = [...currentRange.numbers, ...followingRange.numbers]
  if (new Set(combinedNumbers).size !== combinedNumbers.length) return blocks

  const mergedElements = [...new Set([
    ...(current.contentElements ?? []),
    ...(following.contentElements ?? []),
  ])]
  const mergedText = [current.contentText, following.contentText]
    .filter((value): value is string => Boolean(value?.trim()))
    .join('\n')

  const merged: AnswerBlock = {
    ...current,
    range: formatQuestionRange(combinedNumbers),
    score: mergeScores(current.score, following.score),
    height: current.height + following.height,
    lineCount: Number.isFinite(current.lineCount) && Number.isFinite(following.lineCount)
      ? Number(current.lineCount) + Number(following.lineCount)
      : current.lineCount,
    contentText: mergedText || undefined,
    contentElements: mergedElements.length ? mergedElements : undefined,
    showScore: current.showScore || following.showScore,
    showScoreBox: current.showScoreBox || following.showScoreBox,
  }

  return [...blocks.slice(0, index), merged, ...blocks.slice(index + 2)]
}

/** Group objective or subjective blocks within each page without moving locked blocks. */
export function consolidateBlocks(
  blocks: AnswerBlock[],
  kind: ConsolidationKind,
): AnswerBlock[] {
  const next = [...blocks]
  const pages = [...new Set(blocks.map((block) => block.page))]

  pages.forEach((page) => {
    const pageIndices = blocks.reduce<number[]>((indices, block, index) => {
      if (block.page === page) indices.push(index)
      return indices
    }, [])
    const pageBlocks = pageIndices.map((index) => blocks[index])

    let segmentStart = 0
    while (segmentStart < pageBlocks.length) {
      if (pageBlocks[segmentStart].locked) {
        segmentStart += 1
        continue
      }

      let segmentEnd = segmentStart
      while (segmentEnd < pageBlocks.length && !pageBlocks[segmentEnd].locked) {
        segmentEnd += 1
      }

      const consolidated = consolidateUnlockedSegment(
        pageBlocks.slice(segmentStart, segmentEnd),
        kind,
      )
      consolidated.forEach((block, offset) => {
        next[pageIndices[segmentStart + offset]] = block
      })
      segmentStart = segmentEnd
    }
  })

  return next.some((block, index) => block !== blocks[index]) ? next : blocks
}
