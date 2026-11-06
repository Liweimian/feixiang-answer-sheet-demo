import type {
  AnswerBlock,
  AnswerSheetSettings,
  CardMode,
  ExamPaper,
  HeaderLayout,
  HeaderModuleKind,
  PreflightCheck,
  RulePack,
} from './types'
import { isQuestionBlockKind } from './types'
import { parseQuestionRange, questionNumbers } from './range'
import { validateHeaderGeometry, visibleHeaderModules } from './headerGeometry'

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
  if (block.kind === 'mixed') return Math.max(150, 64 + questionCount * 11)
  if (block.kind === 'drawing' || block.kind === 'table') return 120
  return 0
}

export function buildPreflightChecks(
  paper: ExamPaper,
  blocks: AnswerBlock[],
  mode: CardMode,
  rulePack: RulePack,
  pageCount: number,
  settings: AnswerSheetSettings,
  header: HeaderLayout,
): PreflightCheck[] {
  const questionBlocks = blocks.filter((block) => isQuestionBlockKind(block.kind))
  const invalidRangeBlock = questionBlocks.find((block) => !parseQuestionRange(block.range).valid)
  const invalidScoreBlock = questionBlocks.find((block) => !Number.isFinite(block.score) || (block.score ?? 0) <= 0)
  const configurationReady = questionBlocks.length > 0 && !invalidRangeBlock && !invalidScoreBlock
  const representedNumbers = questionBlocks.flatMap((block) => questionNumbers(block.range))
  const expectedQuestionCount = paper.sections.reduce((total, section) => total + section.questionCount, 0)
  const numberCounts = representedNumbers.reduce<Map<number, number>>((counts, number) => {
    counts.set(number, (counts.get(number) ?? 0) + 1)
    return counts
  }, new Map())
  const duplicateNumbers = [...numberCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([number]) => number)
  const representedQuestionCount = representedNumbers.length
  const scoredTotal = questionBlocks.reduce((total, block) => total + (block.score ?? 0), 0)
  const scoreConfigured = paper.score > 0 || paper.sections.length === 0 && scoredTotal > 0
  const scoreMatches = !invalidScoreBlock && scoreConfigured && scoredTotal === paper.score
  const numberingConfigured = representedQuestionCount > 0
  const questionCountMatches = expectedQuestionCount === 0 || representedQuestionCount === expectedQuestionCount
  const numberingMatches = !invalidRangeBlock && numberingConfigured && duplicateNumbers.length === 0 && questionCountMatches
  const subjectMatches = mode === 'smart' || rulePack.subjectScope.includes(paper.subject) || rulePack.id.startsWith('beijing') && paper.subject === '英语'

  const safePageCount = Math.max(1, pageCount)
  const pageHeights = Array.from({ length: safePageCount }, (_, index) => index + 1).map((page) => {
    const pageBlocks = blocks.filter((block) => block.page === page)
    const columns = settings.frontColumns
    const rowHeights: number[] = []
    pageBlocks.forEach((block, index) => {
      const row = Math.floor(index / columns)
      rowHeights[row] = Math.max(rowHeights[row] ?? 0, block.height)
    })
    const flowHeight = rowHeights.reduce((total, height) => total + height, 0) + Math.max(0, rowHeights.length - 1) * 4
    const freeHeight = pageBlocks.reduce((maximum, block) => Math.max(maximum, (block.canvasY ?? 0) + block.height), 0)
    return Math.max(flowHeight, freeHeight)
  })
  const printableBodyHeight = settings.paperSize === 'A3' ? 390 : settings.paperSize === '8K' ? 650 : settings.paperSize === '16K' ? 450 : 720
  const overflowingPage = pageHeights.findIndex((height) => height > printableBodyHeight)
  const outOfRangeBlock = blocks.find((block) => block.page < 1 || block.page > safePageCount)
  const emptyPages = Array.from({ length: safePageCount }, (_, index) => index + 1)
    .filter((page) => !blocks.some((block) => block.page === page))
  const pageCountMatches = mode === 'smart' || safePageCount === rulePack.pageCount
  const paperSizeMatches = mode === 'smart' || settings.paperSize === rulePack.paperSize
  const standardLayoutMatches = pageCountMatches && paperSizeMatches
  const renderedHeaderModules = visibleHeaderModules(header, settings)
  const templateIdentityFields = renderedHeaderModules
    .filter((module) => module.kind === 'identity')
    .flatMap((module) => module.fields ?? [])
  const effectiveIdentityFields = header.preset === 'exam' && templateIdentityFields.length
    ? templateIdentityFields
    : settings.identityFields
  const hasCandidateNumber = effectiveIdentityFields.includes('准考证号') || effectiveIdentityFields.includes('考生号')
  const identityReady = effectiveIdentityFields.length > 0 && (!hasCandidateNumber || settings.candidateNumberLayouts.length > 0)
    && settings.candidateNumberDigits >= 4
    && settings.candidateNumberDigits <= 18
  const headerIssues = validateHeaderGeometry(header, settings)
  const headerKinds = new Set(renderedHeaderModules.map((module) => module.kind))
  const requiredHeaderKinds: HeaderModuleKind[] = ['title', 'identity']
  const requiredTemplateFields = header.templateId.startsWith('shenzhen-exam-reference')
    ? ['考生号', '姓名', '考点', '考场号', '座位号']
    : []
  const missingTemplateFields = requiredTemplateFields.filter((field) => !templateIdentityFields.includes(field))
  const missingHeaderKind = requiredHeaderKinds.find((kind) => !headerKinds.has(kind))
  const examHeaderComplete = header.preset !== 'exam' || (!missingHeaderKind && missingTemplateFields.length === 0)
  const headerReady = examHeaderComplete && headerIssues.length === 0
  const firstHeaderIssue = headerIssues[0]
  const firstHeaderModule = firstHeaderIssue ? header.modules.find((module) => module.id === firstHeaderIssue.moduleId) : undefined

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

  const sortedNumbers = [...new Set(representedNumbers)].sort((a, b) => a - b)
  const numberSpan = numberingConfigured ? `${sortedNumbers[0]}–${sortedNumbers[sortedNumbers.length - 1]}` : '未设置'

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
      label: '题号与题数',
      detail: !numberingConfigured
        ? '空白卡尚未配置题号范围，请先添加或导入题目结构'
        : numberingMatches
          ? `${numberSpan} 共 ${representedQuestionCount} 题，无重复题号；允许自定义起点与跳号`
          : [
              duplicateNumbers.length ? `重复 ${duplicateNumbers.join('、')}` : '',
              !questionCountMatches ? `当前 ${representedQuestionCount} 题，原卷 ${expectedQuestionCount} 题` : '',
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
      label: '考生信息与考号',
      detail: !identityReady
        ? '至少保留 1 个考生信息字段，并将考号位数设置为 4–18 位'
        : hasCandidateNumber
          ? `${effectiveIdentityFields.join('、')} · ${effectiveIdentityFields.includes('考生号') ? '考生号' : settings.candidateNumberType}${settings.candidateNumberDigits} 位 · ${settings.candidateNumberLayouts.map((layout) => layout === 'fill' ? '填涂' : layout === 'barcode' ? '条形码' : '手写').join(' + ')}`
          : effectiveIdentityFields.join('、'),
      severity: identityReady ? 'pass' : 'blocking',
    },
    {
      id: 'safe-zone',
      label: '定位与扫描安全区',
      detail: header.preset !== 'exam'
        ? '二维码、身份字段与题块边缘距离正常'
        : missingTemplateFields.length
          ? `${header.templateName}缺少${missingTemplateFields.join('、')}字段`
          : missingHeaderKind
            ? `${header.templateName}缺少当前设置需要的${missingHeaderKind === 'candidate-number' ? '考号格' : missingHeaderKind === 'barcode' ? '条码' : missingHeaderKind === 'notice' ? '注意事项' : '表头'}模块`
          : firstHeaderIssue?.type === 'overlap'
            ? `${firstHeaderModule?.label ?? '表头模块'}与其他模块重叠，请在画布中重新摆放`
            : firstHeaderIssue?.type === 'out-of-bounds'
              ? `${firstHeaderModule?.label ?? '表头模块'}超出表头安全区`
              : firstHeaderIssue?.type === 'minimum-size'
                ? `${firstHeaderModule?.label ?? '扫描模块'}小于可识别的最小尺寸`
                : `${header.templateName}的模块均位于表头安全区内，条码与考号区尺寸正常`,
      severity: headerReady ? 'pass' : 'blocking',
    },
    {
      id: 'print',
      label: '打印与页序',
      detail: mode === 'smart'
        ? `${settings.paperSize} · ${settings.frontColumns} 栏 · 共 ${safePageCount} 面`
        : standardLayoutMatches
          ? `${settings.paperSize} 共 ${safePageCount} 面，页序与${rulePack.shortName}一致`
          : `当前为 ${settings.paperSize} / ${safePageCount} 面，${rulePack.shortName}要求 ${rulePack.paperSize} / ${rulePack.pageCount} 面`,
      severity: standardLayoutMatches ? 'pass' : 'blocking',
    },
    {
      id: 'paper-link',
      label: '关联试卷与讲评',
      detail: settings.linkedPaperId
        ? `已关联试卷 ${settings.linkedPaperId}，可用于学情统计与讲评`
        : '尚未关联试卷；不影响打印，但无法回流学情与讲评',
      severity: settings.linkedPaperId ? 'pass' : 'warning',
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
