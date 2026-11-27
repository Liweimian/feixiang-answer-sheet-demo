import type { AnswerBlock, PaperColumns } from './types'

interface BlockLayout {
  x: number
  y: number
  width: number
  height: number
}

export function layoutAnswerBlocks(blocks: AnswerBlock[], columns: PaperColumns) {
  const columnWidth = 100 / columns
  const bottoms = Array.from({ length: columns }, () => 0)
  const layouts = new Map<string, BlockLayout>()
  for (const block of blocks) {
    const column = bottoms.indexOf(Math.min(...bottoms))
    const width = block.canvasWidth ?? columnWidth
    const x = block.canvasX ?? column * columnWidth
    let y = block.canvasY ?? bottoms[column]
    for (;;) {
      const intersections = [...layouts.values()].filter((other) =>
        x < other.x + other.width && x + width > other.x && y < other.y + other.height && y + block.height > other.y)
      if (!intersections.length) break
      y = Math.max(...intersections.map((other) => other.y + other.height))
    }
    layouts.set(block.id, { x, y, width, height: block.height })
    for (let index = 0; index < columns; index += 1) {
      if (x < (index + 1) * columnWidth && x + width > index * columnWidth) {
        bottoms[index] = Math.max(bottoms[index], y + block.height)
      }
    }
  }
  return layouts
}

// Preserve the sheet's existing pages and positions. Only blocks that overflow
// as a result of the edit cascade onto subsequent pages.
export function reflowEditedAnswerBlocks(
  blocks: AnswerBlock[],
  page: number,
  columns: PaperColumns,
  capacity: (page: number) => number,
) {
  const assigned = new Map<string, AnswerBlock>()
  const lastPage = Math.max(page, ...blocks.map((block) => block.page))
  let carry: AnswerBlock[] = []
  for (let currentPage = page; currentPage <= lastPage || carry.length; currentPage += 1) {
    const candidates = [...carry, ...blocks.filter((block) => block.page === currentPage)]
    if (!candidates.length) continue
    const layouts = layoutAnswerBlocks(candidates, columns)
    carry = []
    let moveFollowing = false
    for (const block of candidates) {
      const layout = layouts.get(block.id)!
      const overflows = layout.y + block.height > capacity(currentPage)
      if (moveFollowing || (overflows && (layout.y > 0 || block.height <= capacity(currentPage + 1)))) {
        carry.push({ ...block, page: currentPage + 1, canvasY: 0 })
        moveFollowing = true
      } else {
        assigned.set(block.id, block)
      }
    }
  }
  return blocks.map((block) => assigned.get(block.id) ?? block)
}
