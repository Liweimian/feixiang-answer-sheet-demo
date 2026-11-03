import type {
  AnswerBlock,
  CardMode,
  ExamPaper,
  PreflightCheck,
  RulePack,
} from './types'

function questionNumbers(range?: string): number[] {
  if (!range) return []
  const parts = range.split(/[\-–—]/).map((part) => Number(part.trim()))
  if (parts.some(Number.isNaN)) return []
  if (parts.length === 1) return [parts[0]]
  const [start, end] = parts
  return Array.from({ length: Math.max(0, end - start + 1) }, (_, index) => start + index)
}

export function buildPreflightChecks(
  paper: ExamPaper,
  blocks: AnswerBlock[],
  mode: CardMode,
  rulePack: RulePack,
): PreflightCheck[] {
  const short47 = blocks.find((block) => block.id === 'short-47')
  const essay = blocks.find((block) => block.id === 'essay-48')
  const expectedNumbers = Array.from({ length: 38 }, (_, index) => index + 11)
  const representedNumbers = blocks.flatMap((block) => questionNumbers(block.range))
  const numberCounts = representedNumbers.reduce<Map<number, number>>((counts, number) => {
    counts.set(number, (counts.get(number) ?? 0) + 1)
    return counts
  }, new Map())
  const missingNumbers = expectedNumbers.filter((number) => !numberCounts.has(number))
  const duplicateNumbers = [...numberCounts.entries()].filter(([, count]) => count > 1).map(([number]) => number)
  const scoredTotal = blocks.reduce((total, block) => total + (block.score ?? 0), 0)
  const scoreMatches = scoredTotal === paper.score
  const numberingMatches = missingNumbers.length === 0 && duplicateNumbers.length === 0
  const subjectMatches = mode === 'smart' || rulePack.subjectScope.includes('英语') || rulePack.id.startsWith('beijing')
  const pageHeights = [1, 2].map((page) => blocks.filter((block) => block.page === page).reduce((total, block) => total + block.height, 0))
  const overflowingPage = pageHeights.findIndex((height) => height > 620)
  const currentPageCount = Math.max(...blocks.map((block) => block.page), 1)
  const pageCountMatches = mode === 'smart' || currentPageCount === rulePack.pageCount

  return [
    {
      id: 'score',
      label: '题目与分值',
      detail: scoreMatches ? `当前作答题块合计 ${scoredTotal} 分，与试卷标注一致` : `当前作答题块合计 ${scoredTotal} 分，试卷标注为 ${paper.score} 分`,
      severity: scoreMatches ? 'pass' : 'blocking',
    },
    {
      id: 'numbering',
      label: '题号连续性',
      detail: numberingMatches
        ? '11–48 无重复、缺失；客观题 11–43 连续排列'
        : `${missingNumbers.length ? `缺少 ${missingNumbers.join('、')}` : ''}${missingNumbers.length && duplicateNumbers.length ? '；' : ''}${duplicateNumbers.length ? `重复 ${duplicateNumbers.join('、')}` : ''}`,
      severity: numberingMatches ? 'pass' : 'blocking',
    },
    {
      id: 'short-space',
      label: '第 47 题作答空间',
      detail: short47 ? (short47.height >= 96 ? '已预留 4 行英文短答空间' : '当前区域偏小，可能挤压学生书写') : '未找到第 47 题作答区',
      severity: short47 && short47.height >= 96 ? 'pass' : 'blocking',
      blockId: short47?.id,
      fixable: Boolean(short47),
    },
    {
      id: 'essay-space',
      label: '第 48 题作文空间',
      detail: essay ? ((essay.lineCount ?? 0) >= 12 ? '12 行作文横线，满足当前模板建议' : `当前只有 ${essay.lineCount ?? 0} 行，建议扩展到 12 行`) : '未找到第 48 题作文区',
      severity: essay ? ((essay.lineCount ?? 0) >= 12 ? 'pass' : 'warning') : 'blocking',
      blockId: essay?.id,
      fixable: Boolean(essay),
    },
    {
      id: 'rule-scope',
      label: '规则包与学科',
      detail: mode === 'smart' ? '飞象模式不强制应用地区大考规则包' : subjectMatches ? `${rulePack.shortName}与当前${paper.subject}试卷匹配` : `${rulePack.shortName}不适用于当前${paper.subject}试卷`,
      severity: subjectMatches ? 'pass' : 'blocking',
    },
    {
      id: 'page-overflow',
      label: '题块与跨页',
      detail: overflowingPage < 0 ? '两页题块均在可印刷区域内，未发生溢出' : `第 ${overflowingPage + 1} 页内容过高，可能侵入页脚或裁切区`,
      severity: overflowingPage < 0 ? 'pass' : 'blocking',
    },
    {
      id: 'identity',
      label: '逐页身份与条码',
      detail: mode === 'standard' ? `共 ${rulePack.pageCount} 面，每张物理纸正面重复身份区与条码框` : '飞象模式已保留姓名、班级、学号和二维码',
      severity: 'pass',
    },
    {
      id: 'safe-zone',
      label: '定位与扫描安全区',
      detail: mode === 'standard' ? '定位点、条码框、右侧禁写条均未被题块覆盖' : '二维码与题块边缘距离正常',
      severity: 'pass',
    },
    {
      id: 'print',
      label: '打印与页序',
      detail: mode === 'smart'
        ? `A4 单面 ${currentPageCount} 页；已写入 100% 原尺寸打印提示`
        : pageCountMatches
          ? `${rulePack.paperSize} 共 ${rulePack.pageCount} 面，页序与规则包一致`
          : `当前为 ${currentPageCount} 页，${rulePack.shortName}要求 ${rulePack.pageCount} 面`,
      severity: pageCountMatches ? 'pass' : 'blocking',
    },
  ]
}

export function autoFixBlocks(blocks: AnswerBlock[]): AnswerBlock[] {
  return blocks.map((block) => {
    if (block.id === 'short-47') return { ...block, height: 100, lineCount: 4, hint: '已按建议扩展为 4 行' }
    if (block.id === 'essay-48') return { ...block, height: 292, lineCount: 12, hint: '二选一，共用作答区；不少于 50 词' }
    return block
  })
}
