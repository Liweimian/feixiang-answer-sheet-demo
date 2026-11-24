import type {
  AnswerBlock,
  AnswerSheetDocument,
  AnswerSheetSettings,
  AnswerSheetTemplate,
  ExamPaper,
} from '../features/answer-sheet/types'
import { beijingEnglishPaper, initialAnswerBlocks } from './mockPaper'
import { cloneHeaderLayout, instantiateHeaderTemplate } from './headerTemplates'

const defaultNotice = '客观题用 2B 铅笔填涂；主观题使用黑色字迹签字笔，在对应题号区域内作答。'

function createSettings(overrides: Partial<AnswerSheetSettings> = {}): AnswerSheetSettings {
  const defaults: AnswerSheetSettings = {
    reviewMode: 'online',
    cardStyle: 'answer-only',
    paperSize: 'A4',
    printSide: 'double',
    frontColumns: 2,
    backColumns: 2,
    candidateNumberLayouts: ['barcode'],
    candidateNumberType: '准考证号',
    candidateNumberDigits: 10,
    identityFields: ['学校', '姓名', '班级', '准考证号'],
    showNotice: true,
    noticeStyle: 'daily',
    questionNumberOrder: 'within-major-continuous',
    objectiveSortMode: 'number-horizontal-option-horizontal',
    objectiveMerge: false,
    subjectiveMerge: false,
    subjectiveAnswerStyle: 'lines',
    subjectiveLineHeight: 16,
    noticeText: defaultNotice,
    showFooter: true,
    footerText: '请按 100% 原尺寸打印',
    linkedPaperId: '',
  }
  return {
    ...defaults,
    ...overrides,
    identityFields: overrides.identityFields ? [...overrides.identityFields] : [...defaults.identityFields],
    candidateNumberLayouts: overrides.candidateNumberLayouts ? [...overrides.candidateNumberLayouts] : [...defaults.candidateNumberLayouts],
  }
}

const generalPaper: ExamPaper = {
  id: 'paper-general-stage-test',
  title: '初中阶段综合测试答题卡',
  subtitle: '通用空卡模板 · 可自由调整',
  region: '通用',
  grade: '初中',
  subject: '综合',
  examType: '阶段检测',
  durationMinutes: 90,
  score: 100,
  sourceLabel: '系统模板 · 26 道题',
  disclaimer: '通用结构示例，使用前请根据本校阅卷和扫描要求完成打印测试。',
  sections: [
    { id: 'g1', title: '一、选择题', range: '1–20', questionCount: 20, score: 40, answerKind: 'objective', confidence: 100 },
    { id: 'g2', title: '二、解答题', range: '21–25', questionCount: 5, score: 30, answerKind: 'short-answer', confidence: 100 },
    { id: 'g3', title: '三、综合题', range: '26', questionCount: 1, score: 30, answerKind: 'essay', confidence: 100 },
  ],
}

const generalBlocks: AnswerBlock[] = [
  { id: 'general-objective', sectionId: 'g1', page: 1, title: '一、选择题', range: '1–20', score: 40, kind: 'objective', height: 174, showScore: true, hint: '4 选 1，按题号连续填涂' },
  { id: 'general-short-a', sectionId: 'g2', page: 1, title: '二、解答题 21–23', range: '21–23', score: 18, kind: 'short-answer', height: 186, lineCount: 9, showScore: true },
  { id: 'general-short-b', sectionId: 'g2', page: 2, title: '二、解答题 24–25', range: '24–25', score: 12, kind: 'short-answer', height: 190, lineCount: 8, showScore: true },
  { id: 'general-essay', sectionId: 'g3', page: 2, title: '三、综合题 26', range: '26', score: 30, kind: 'essay', height: 292, lineCount: 12, showScore: true, hint: '请在指定区域内完成综合作答。' },
  { id: 'general-forbidden', page: 2, title: '禁答区', kind: 'forbidden', height: 56, showScore: false, locked: false, contentText: '请勿在此区域作答' },
]

const sciencePaper: ExamPaper = {
  id: 'paper-science-lab',
  title: '初中理科实验与作图答题卡',
  subtitle: '理科特色模板 · 作图与表格增强',
  region: '通用',
  grade: '初中',
  subject: '物理',
  examType: '阶段检测',
  durationMinutes: 90,
  score: 100,
  sourceLabel: '校本模板 · 17 道题',
  disclaimer: '理科结构示例，正式使用前需核对作图比例和扫描定位参数。',
  sections: [
    { id: 'p1', title: '一、选择题', range: '1–12', questionCount: 12, score: 36, answerKind: 'objective', confidence: 100 },
    { id: 'p2', title: '二、实验与计算', range: '13–15', questionCount: 3, score: 24, answerKind: 'short-answer', confidence: 100 },
    { id: 'p3', title: '三、作图题', range: '16', questionCount: 1, score: 20, answerKind: 'drawing', confidence: 100 },
    { id: 'p4', title: '四、数据分析', range: '17', questionCount: 1, score: 20, answerKind: 'table', confidence: 100 },
  ],
}

const scienceBlocks: AnswerBlock[] = [
  { id: 'science-objective', sectionId: 'p1', page: 1, title: '一、选择题', range: '1–12', score: 36, kind: 'objective', height: 132, showScore: true },
  { id: 'science-short', sectionId: 'p2', page: 1, title: '二、实验与计算 13–15', range: '13–15', score: 24, kind: 'short-answer', height: 246, lineCount: 12, showScore: true },
  { id: 'science-drawing', sectionId: 'p3', page: 2, title: '三、作图题 16', range: '16', score: 20, kind: 'drawing', height: 230, showScore: true, hint: '坐标、光路或受力作图区域' },
  { id: 'science-table', sectionId: 'p4', page: 2, title: '四、数据分析 17', range: '17', score: 20, kind: 'table', height: 230, showScore: true, hint: '可继续在右侧面板调整表格区域高度' },
  { id: 'science-forbidden', page: 2, title: '禁答区', kind: 'forbidden', height: 56, showScore: false, locked: false, contentText: '请勿在此区域作答' },
]

const blankPaper: ExamPaper = {
  id: 'paper-blank',
  title: '未命名答题卡',
  subtitle: '真正空白卡',
  region: '通用',
  grade: '未设置',
  subject: '未设置',
  examType: '自定义',
  durationMinutes: 0,
  score: 0,
  sourceLabel: '真正空白卡',
  disclaimer: '请添加题块并完善题号、分值后再执行印前校验。',
  sections: [],
}

const shenzhenPaper: ExamPaper = {
  id: 'paper-shenzhen-physchem-layout',
  title: '深圳市中考理化合卷答题卡结构演示',
  subtitle: '深圳地区模板 · A3 四面',
  region: '深圳',
  grade: '初三',
  subject: '物理+化学合卷',
  examType: '中考结构演示',
  durationMinutes: 120,
  score: 120,
  sourceLabel: '地区模板 · 结构演示',
  disclaimer: '仅演示深圳理化合卷的分学科题区、考生信息与四面布局；正式印刷前请以当年考试机构样卡为准。',
  sections: [
    { id: 'sz-p1', title: '物理客观题', range: '1–20', questionCount: 20, score: 40, answerKind: 'objective', confidence: 100 },
    { id: 'sz-p2', title: '物理主观题', range: '21–25', questionCount: 5, score: 30, answerKind: 'short-answer', confidence: 100 },
    { id: 'sz-c1', title: '化学客观题', range: '26–35', questionCount: 10, score: 20, answerKind: 'objective', confidence: 100 },
    { id: 'sz-c2', title: '化学主观题', range: '36–40', questionCount: 5, score: 30, answerKind: 'short-answer', confidence: 100 },
  ],
}

const shenzhenBlocks: AnswerBlock[] = [
  { id: 'sz-objective-physics', sectionId: 'sz-p1', page: 1, title: '物理客观题填涂区', range: '1–20', score: 40, kind: 'objective', height: 190, optionCount: 4, itemsPerColumn: 10, objectiveLayout: 'horizontal', showScore: true },
  { id: 'sz-short-physics', sectionId: 'sz-p2', page: 2, title: '物理主观题作答区', range: '21–25', score: 30, kind: 'short-answer', height: 300, lineCount: 12, lineStyle: 'solid', responseStyle: 'lines', showScore: true, showScoreBox: true, scoreStep: 1 },
  { id: 'sz-objective-chemistry', sectionId: 'sz-c1', page: 3, title: '化学客观题填涂区', range: '26–35', score: 20, kind: 'objective', height: 150, optionCount: 4, itemsPerColumn: 10, objectiveLayout: 'horizontal', showScore: true },
  { id: 'sz-short-chemistry', sectionId: 'sz-c2', page: 4, title: '化学主观题作答区', range: '36–40', score: 30, kind: 'short-answer', height: 300, lineCount: 12, lineStyle: 'solid', responseStyle: 'lines', showScore: true, showScoreBox: true, scoreStep: 1 },
]

export const answerSheetTemplates: AnswerSheetTemplate[] = [
  {
    id: 'general-a4-smart',
    name: '智能空卡 · A4 双页',
    description: '适合大多数校内测验，先给出选择题、解答题与综合题的推荐结构。',
    origin: 'system',
    category: 'recommended',
    featured: true,
    tags: ['通用', '初中', '自动排版'],
    paperSize: 'A4',
    columns: 2,
    identityMode: 'barcode',
    highlights: ['客观题自动分栏', '主观题空间已预估', '可自由增删题块'],
    document: { paper: generalPaper, blocks: generalBlocks, settings: createSettings({ linkedPaperId: generalPaper.id }), header: instantiateHeaderTemplate('daily-quiz'), mode: 'smart', rulePackId: 'beijing-middle-2026', templateId: 'general-a4-smart', pageCount: 2 },
  },
  {
    id: 'beijing-english-standard',
    name: '北京英语 · 大考规范演示',
    description: '从试卷大题自动生成三页答题卡，客观题可按模块合并，主观题保留横线与作文格。',
    origin: 'system',
    category: 'standard',
    tags: ['北京', '英语', '大考规范'],
    paperSize: 'A4',
    columns: 2,
    identityMode: 'both',
    highlights: ['客观题按大题拆分', '多选合并与可逆分割', '横线与作文格作答区'],
    document: { paper: beijingEnglishPaper, blocks: initialAnswerBlocks, settings: createSettings({ frontColumns: 1, backColumns: 1, candidateNumberLayouts: ['fill', 'barcode'], linkedPaperId: beijingEnglishPaper.id }), header: instantiateHeaderTemplate('beijing-exam-reference'), mode: 'standard', rulePackId: 'beijing-middle-2026', templateId: 'beijing-english-standard', pageCount: 3 },
  },
  {
    id: 'shenzhen-physchem-standard',
    name: '深圳理化合卷 · 大考规范演示',
    description: 'A3 四面，预置分学科题区、考场与座位信息，适合核对深圳地区大考版式。',
    origin: 'system',
    category: 'standard',
    tags: ['深圳', '理化合卷', '大考规范'],
    paperSize: 'A3',
    columns: 2,
    identityMode: 'both',
    highlights: ['A3 四面布局', '物理与化学分区', '大考身份信息'],
    document: {
      paper: shenzhenPaper,
      blocks: shenzhenBlocks,
      settings: createSettings({
        paperSize: 'A3',
        printSide: 'double',
        frontColumns: 2,
        backColumns: 2,
        candidateNumberLayouts: ['barcode', 'handwrite'],
        candidateNumberType: '考号',
        identityFields: ['学校', '姓名', '准考证号'],
        linkedPaperId: shenzhenPaper.id,
      }),
      header: instantiateHeaderTemplate('shenzhen-exam-reference-a'),
      mode: 'standard',
      rulePackId: 'shenzhen-physchem-2026',
      templateId: 'shenzhen-physchem-standard',
      pageCount: 4,
    },
  },
  {
    id: 'science-lab-school',
    name: '理科实验与作图 · 校本模板',
    description: '为物理、化学等复杂学科预留作图、实验记录和数据表格区域。',
    origin: 'school',
    category: 'subject',
    tags: ['物理', '作图', '表格'],
    paperSize: 'A4',
    columns: 2,
    identityMode: 'barcode',
    highlights: ['作图框', '实验长答区', '数据表格区'],
    document: { paper: sciencePaper, blocks: scienceBlocks, settings: createSettings({ linkedPaperId: sciencePaper.id }), header: instantiateHeaderTemplate('daily-quiz'), mode: 'smart', rulePackId: 'beijing-middle-2026', templateId: 'science-lab-school', pageCount: 2 },
  },
  {
    id: 'true-blank',
    name: '真正空白卡',
    description: '只保留纸张、身份区与页脚，从第一个题块开始完全自定义。',
    origin: 'personal',
    category: 'blank',
    tags: ['空白', '自定义', 'A4'],
    paperSize: 'A4',
    columns: 1,
    identityMode: 'candidate-number',
    highlights: ['无预置题号', '无预置分值', '适合第三方纸质卷'],
    document: {
      paper: blankPaper,
      blocks: [],
      settings: createSettings({
        reviewMode: 'manual',
        printSide: 'single',
        frontColumns: 1,
        backColumns: 1,
        candidateNumberLayouts: ['handwrite'],
        candidateNumberType: '学号',
        identityFields: ['学校', '姓名', '班级', '学号'],
      }),
      header: instantiateHeaderTemplate('daily-quiz'),
      mode: 'smart',
      rulePackId: 'beijing-middle-2026',
      templateId: 'true-blank',
      pageCount: 1,
    },
  },
]

export function instantiateTemplate(template: AnswerSheetTemplate): AnswerSheetDocument {
  return {
    ...template.document,
    paper: {
      ...template.document.paper,
      sections: template.document.paper.sections.map((section) => ({ ...section })),
    },
    blocks: template.document.blocks.map((block) => ({
      ...block,
      answerSlotCounts: block.answerSlotCounts ? [...block.answerSlotCounts] : undefined,
      answerSlotNumbers: block.answerSlotNumbers?.map((numbers) => [...numbers]),
      answerSlotNumberStyles: block.answerSlotNumberStyles ? [...block.answerSlotNumberStyles] : undefined,
      answerSlotSettings: block.answerSlotSettings ? structuredClone(block.answerSlotSettings) : undefined,
      questionScores: block.questionScores ? { ...block.questionScores } : undefined,
      objectiveAnswers: block.objectiveAnswers ? Object.fromEntries(Object.entries(block.objectiveAnswers).map(([number, answers]) => [number, [...answers]])) : undefined,
      contentElements: block.contentElements ? [...block.contentElements] : undefined,
    })),
    settings: {
      ...template.document.settings,
      identityFields: [...template.document.settings.identityFields],
      candidateNumberLayouts: [...template.document.settings.candidateNumberLayouts],
    },
    header: cloneHeaderLayout(template.document.header),
  }
}

export const defaultAnswerSheetDocument = instantiateTemplate(
  answerSheetTemplates.find((template) => template.id === 'beijing-english-standard')!,
)
