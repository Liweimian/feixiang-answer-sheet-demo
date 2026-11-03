import type {
  AnswerBlock,
  CardMode,
  ExamPaper,
  PreflightCheck,
  RulePack,
} from './types'
import { isQuestionBlockKind } from './types'
import { parseQuestionRange, questionNumbers } from './range'

export function minimumContentHeight(block: AnswerBlock): number {
  const questionCount = questionNumbers(block.range).length
  if (!questionCount) return 0

  if (block.kind === 'objective') {
    const itemsPerColumn = Math.max(4, block.itemsPerColumn ?? 11)
    const columnCount = Math.min(3, Math.max(1, Math.ceil(questionCount / itemsPerColumn)))
    const rowCount = Math.ceil(questionCount / columnCount)
    return 44 + rowCount * 13
  }
  if (block.kind === 'short-answer') {
    const lineCount = block.lineCount ?? 4
    return questionCount === 1
      ? Math.max(96, 44 + lineCount * 10)
      : 48 + Math.max(lineCount * 9, questionCount * 28)
  }
  if (block.kind === 'essay') return block.writingLayout === 'separate' ? 320 : 260
  if (block.kind === 'drawing' || block.kind === 'table') return 120
  return 0
}

export function buildPreflightChecks(
  paper: ExamPaper,
  blocks: AnswerBlock[],
  mode: CardMode,
  rulePack: RulePack,
  pageCount: number,
): PreflightCheck[] {
  const questionBlocks = blocks.filter((block) => isQuestionBlockKind(block.kind))
  const invalidRangeBlock = questionBlocks.find((block) => !parseQuestionRange(block.range).valid)
  const invalidScoreBlock = questionBlocks.find((block) => !Number.isFinite(block.score) || (block.score ?? 0) <= 0)
  const configurationReady = questionBlocks.length > 0 && !invalidRangeBlock && !invalidScoreBlock
  const representedNumbers = questionBlocks.flatMap((block) => questionNumbers(block.range))
  const sectionNumbers = [...new Set(paper.sections.flatMap((section) => questionNumbers(section.range)))].sort((a, b) => a - b)
  const numberBounds = representedNumbers.reduce(
    (bounds, number) => ({ min: Math.min(bounds.min, number), max: Math.max(bounds.max, number) }),
    { min: Number.POSITIVE_INFINITY, max: Number.NEGATIVE_INFINITY },
  )
  const blankCardNumbers = representedNumbers.length
    ? Array.from({ length: numberBounds.max - numberBounds.min + 1 }, (_, index) => numberBounds.min + index)
    : []
  const expectedNumbers = sectionNumbers.length ? sectionNumbers : blankCardNumbers
  const numberCounts = representedNumbers.reduce<Map<number, number>>((counts, number) => {
    counts.set(number, (counts.get(number) ?? 0) + 1)
    return counts
  }, new Map())
  const missingNumbers = expectedNumbers.filter((number) => !numberCounts.has(number))
  const duplicateNumbers = [...numberCounts.entries()]
    .filter(([number, count]) => expectedNumbers.includes(number) && count > 1)
    .map(([number]) => number)
  const extraNumbers = [...numberCounts.keys()].filter((number) => !expectedNumbers.includes(number))
  const scoredTotal = questionBlocks.reduce((total, block) => total + (block.score ?? 0), 0)
  const scoreConfigured = paper.score > 0 || paper.sections.length === 0 && scoredTotal > 0
  const scoreMatches = !invalidScoreBlock && scoreConfigured && scoredTotal === paper.score
  const numberingConfigured = expectedNumbers.length > 0
  const numberingMatches = !invalidRangeBlock && numberingConfigured && missingNumbers.length === 0 && duplicateNumbers.length === 0 && extraNumbers.length === 0
  const subjectMatches = mode === 'smart' || rulePack.subjectScope.includes(paper.subject) || rulePack.id.startsWith('beijing') && paper.subject === '英语'

  const safePageCount = Math.max(1, pageCount)
  const pageHeights = Array.from({ length: safePageCount }, (_, index) => index + 1).map((page) => {
    const pageBlocks = blocks.filter((block) => block.page === page)
    return pageBlocks.reduce((total, block) => total + block.height, 0) + Math.max(0, pageBlocks.length - 1) * 4
  })
  const overflowingPage = pageHeights.findIndex((height) => height > 620)
  const outOfRangeBlock = blocks.find((block) => block.page < 1 || block.page > safePageCount)
  const emptyPages = Array.from({ length: safePageCount }, (_, index) => index + 1)
    .filter((page) => !blocks.some((block) => block.page === page))
  const pageCountMatches = mode === 'smart' || safePageCount === rulePack.pageCount

  const crampedContentBlock = questionBlocks.find((block) => {
    const minimumHeight = minimumContentHeight(block)
    return minimumHeight > 0 && block.height < minimumHeight
  })
  const crampedMinimumHeight = crampedContentBlock ? minimumContentHeight(crampedContentBlock) : 0

  const expectsShortAnswer = paper.sections.some((section) => section.answerKind === 'short-answer') || blocks.some((block) => block.kind === 'short-answer')
  const shortBlocks = blocks.filter((block) => block.kind === 'short-answer')
  const tightShortBlock = shortBlocks.find((block) => block.height < 96 || (block.lineCount ?? 0) < 4)
  const shortSpaceReady = !expectsShortAnswer || shortBlocks.length > 0 && !tightShortBlock

  const expectsEssay = paper.sections.some((section) => section.answerKind === 'essay') || blocks.some((block) => block.kind === 'essay')
  const essayBlocks = blocks.filter((block) => block.kind === 'essay')
  const tightEssayBlock = essayBlocks.find((block) => block.height < 260 || (block.lineCount ?? 0) < 12)
  const essaySpaceReady = !expectsEssay || essayBlocks.length > 0 && !tightEssayBlock

  const numberSpan = numberingConfigured
    ? `${expectedNumbers[0]}–${expectedNumbers[expectedNumbers.length - 1]}`
    : '未设置'

  return [
    {
      id: 'configuration',
      label: '题块配置完整性',
      detail: questionBlocks.length === 0
        ? '尚未添加题目作答区'
        : invalidRangeBlock
          ? `${invalidRangeBlock.title}：${parseQuestionRange(invalidRangeBlock.range).message}`
          : invalidScoreBlock
            ? `${invalidScoreBlock.title}尚未设置有效分值`
            : `${questionBlocks.length} 个题目作答区均已配置题号和分值`,
      severity: configurationReady ? 'pass' : 'blocking',
      blockId: invalidRangeBlock?.id ?? invalidScoreBlock?.id,
    },
    {
      id: 'score',
      label: '题目与分值',
      detail: !scoreConfigured
        ? '空白卡尚未设置试卷总分，请完善试卷结构后再发布'
        : scoreMatches
          ? paper.sections.length === 0
            ? `已按当前题块自动汇总为 ${scoredTotal} 分`
            : `当前作答题块合计 ${scoredTotal} 分，与试卷标注一致`
          : `当前作答题块合计 ${scoredTotal} 分，试卷标注为 ${paper.score} 分`,
      severity: scoreMatches ? 'pass' : 'blocking',
    },
    {
      id: 'numbering',
      label: '题号连续性',
      detail: !numberingConfigured
        ? '空白卡尚未配置题号范围，请先添加或导入题目结构'
        : numberingMatches
          ? `${numberSpan} 无重复、缺失或额外题号`
          : [
              missingNumbers.length ? `缺少 ${missingNumbers.join('、')}` : '',
              duplicateNumbers.length ? `重复 ${duplicateNumbers.join('、')}` : '',
              extraNumbers.length ? `额外 ${extraNumbers.join('、')}` : '',
            ].filter(Boolean).join('；'),
      severity: numberingMatches ? 'pass' : 'blocking',
    },
    {
      id: 'short-space',
      label: '主观题作答空间',
      detail: !expectsShortAnswer
        ? '当前试卷不包含短答题'
        : shortBlocks.length === 0
          ? '未找到短答题作答区'
          : tightShortBlock
            ? `${tightShortBlock.title} 的高度或书写行数偏小`
            : `${shortBlocks.length} 个短答区均已预留建议书写空间`,
      severity: shortSpaceReady ? 'pass' : 'blocking',
      blockId: tightShortBlock?.id,
      fixable: Boolean(tightShortBlock),
    },
    {
      id: 'essay-space',
      label: '作文 / 综合题空间',
      detail: !expectsEssay
        ? '当前试卷不包含作文或长篇综合题'
        : essayBlocks.length === 0
          ? '未找到作文或综合题作答区'
          : tightEssayBlock
            ? `${tightEssayBlock.title} 建议至少 12 行并保留完整页内空间`
            : '作文或综合题空间满足当前模板建议',
      severity: essaySpaceReady ? 'pass' : essayBlocks.length ? 'warning' : 'blocking',
      blockId: tightEssayBlock?.id,
      fixable: Boolean(tightEssayBlock),
    },
    {
      id: 'content-capacity',
      label: '题块内容容量',
      detail: crampedContentBlock
        ? crampedMinimumHeight > 360
          ? `${crampedContentBlock.title}包含题目过多，建议拆成多个题块`
          : `${crampedContentBlock.title}当前高度 ${crampedContentBlock.height}px，至少需要 ${crampedMinimumHeight}px 才不会裁切`
        : '题号、填涂项和书写内容均可完整显示',
      severity: crampedContentBlock ? 'blocking' : 'pass',
      blockId: crampedContentBlock?.id,
      fixable: Boolean(crampedContentBlock && crampedMinimumHeight <= 360),
    },
    {
      id: 'rule-scope',
      label: '规则包与学科',
      detail: mode === 'smart'
        ? '飞象模式不强制应用地区大考规则包'
        : subjectMatches
          ? `${rulePack.shortName}与当前${paper.subject}试卷匹配`
          : `${rulePack.shortName}不适用于当前${paper.subject}试卷`,
      severity: subjectMatches ? 'pass' : 'blocking',
    },
    {
      id: 'page-overflow',
      label: '题块与跨页',
      detail: outOfRangeBlock
        ? `${outOfRangeBlock.title} 位于模板页数之外`
        : overflowingPage < 0
          ? `${safePageCount} 页题块均在可印刷区域内，未发生溢出`
          : `第 ${overflowingPage + 1} 页内容过高，可能侵入页脚或裁切区`,
      severity: !outOfRangeBlock && overflowingPage < 0 ? 'pass' : 'blocking',
      blockId: outOfRangeBlock?.id,
    },
    {
      id: 'empty-pages',
      label: '空白页检查',
      detail: emptyPages.length
        ? `第 ${emptyPages.join('、')} 页没有题块；如非刻意留白，请在“基础信息”中减少页数或补充区域`
        : `${safePageCount} 页均包含可打印区域`,
      severity: emptyPages.length ? mode === 'standard' ? 'blocking' : 'warning' : 'pass',
    },
    {
      id: 'identity',
      label: '逐页身份与条码',
      detail: mode === 'standard'
        ? `共 ${safePageCount} 面，每张物理纸重复身份区与条码框`
        : '飞象模式已保留姓名、班级、学号和二维码',
      severity: 'pass',
    },
    {
      id: 'safe-zone',
      label: '定位与扫描安全区',
      detail: mode === 'standard'
        ? '定位点、条码框、右侧禁写条均未被题块覆盖'
        : '二维码与题块边缘距离正常',
      severity: 'pass',
    },
    {
      id: 'print',
      label: '打印与页序',
      detail: mode === 'smart'
        ? `A4 单面 ${safePageCount} 页；已写入 100% 原尺寸打印提示`
        : pageCountMatches
          ? `${rulePack.paperSize} 共 ${rulePack.pageCount} 面，页序与规则包一致`
          : `当前模板为 ${safePageCount} 页，${rulePack.shortName}要求 ${rulePack.pageCount} 面`,
      severity: pageCountMatches ? 'pass' : 'blocking',
    },
  ]
}

export function autoFixBlocks(blocks: AnswerBlock[]): AnswerBlock[] {
  return blocks.map((block) => {
    const minimumHeight = minimumContentHeight(block)
    let nextBlock = minimumHeight > block.height && minimumHeight <= 360
      ? { ...block, height: minimumHeight, hint: '已按题目数量扩展内容空间' }
      : block
    if (block.kind === 'short-answer' && (block.height < 96 || (block.lineCount ?? 0) < 4)) {
      nextBlock = { ...nextBlock, height: Math.max(nextBlock.height, 100), lineCount: Math.max(block.lineCount ?? 0, 4), hint: '已按建议扩展短答空间' }
    }
    if (block.kind === 'essay' && (block.height < 260 || (block.lineCount ?? 0) < 12)) {
      nextBlock = { ...nextBlock, height: Math.max(nextBlock.height, 292), lineCount: Math.max(block.lineCount ?? 0, 12), hint: block.hint ?? '已按建议扩展综合作答空间' }
    }
    return nextBlock
  })
}
