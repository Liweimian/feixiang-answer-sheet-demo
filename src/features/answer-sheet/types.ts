export type FlowStage = 'source' | 'parsing' | 'editor'
export type SourceKind = 'library' | 'upload' | 'template' | 'blank'
export type CardMode = 'smart' | 'standard'
export type TemplateOrigin = 'system' | 'school' | 'personal'
export type TemplateCategory = 'recommended' | 'standard' | 'subject' | 'blank'
export type ReviewMode = 'online' | 'manual' | 'mixed'
export type CardStyle = 'answer-only' | 'question-answer'
export type PaperSize = 'A4' | 'A3' | '8K' | '16K'
export type PrintSide = 'single' | 'double'
export type PaperColumns = 1 | 2 | 3
export type CandidateNumberLayout = 'fill' | 'barcode' | 'handwrite'
export type CandidateNumberType = '准考证号' | '学籍号' | '学号' | '考号'
export type IdentityField = '学校' | '姓名' | '班级' | '学号' | '准考证号'
export type ObjectiveLayout = 'horizontal' | 'vertical' | 'merged'
export type LineStyle = 'solid' | 'dashed'
export type NoticeStyle = 'daily' | 'exam'
export type QuestionNumberOrder = 'major' | 'minor'
export type ObjectiveSortMode = 'number-vertical-option-horizontal' | 'number-horizontal-option-vertical' | 'number-horizontal-option-horizontal'
export type SubjectiveAnswerStyle = 'blank' | 'lines'
export type HeaderPreset = 'quiz' | 'exam'
export type HeaderTemplateId = 'daily-quiz' | 'exam-general' | 'beijing-exam-reference' | 'shenzhen-exam-reference-a' | 'shenzhen-exam-reference-b'
export type HeaderEvidence = 'product-default' | 'official-sample' | 'official-rules' | 'reference-layout'
export type HeaderModuleKind = 'title' | 'identity' | 'candidate-number' | 'barcode' | 'notice' | 'fill-sample' | 'absence-mark'
export type ResponseStyle = 'lines' | 'grid' | 'tian' | 'mi' | 'four-line' | 'bracket' | 'square' | 'blank'
export type ContentElement = 'table' | 'formula' | 'image'
export type AnswerBlockKind =
  | 'objective'
  | 'short-answer'
  | 'essay'
  | 'mixed'
  | 'forbidden'
  | 'drawing'
  | 'table'
  | 'notice'
  | 'response-area'
  | 'section-title'

export const questionBlockKinds: AnswerBlockKind[] = [
  'objective',
  'short-answer',
  'essay',
  'mixed',
  'drawing',
  'table',
]

export function isQuestionBlockKind(kind: AnswerBlockKind): boolean {
  return questionBlockKinds.includes(kind)
}

export interface PaperSection {
  id: string
  title: string
  range: string
  questionCount: number
  score: number
  answerKind: AnswerBlockKind
  confidence: number
}

export interface ExamPaper {
  id: string
  title: string
  subtitle: string
  region: string
  grade: string
  subject: string
  examType: string
  durationMinutes: number
  score: number
  sourceLabel: string
  disclaimer: string
  sections: PaperSection[]
}

export interface AnswerBlock {
  id: string
  sectionId?: string
  page: number
  title: string
  range?: string
  score?: number
  questionScores?: Record<string, number>
  kind: AnswerBlockKind
  height: number
  canvasX?: number
  canvasY?: number
  canvasWidth?: number
  lineCount?: number
  answerSlotCounts?: number[]
  answerSlotNumbers?: number[][]
  answerVariant?: 'fill' | 'solution'
  wordCount?: number
  optionCount?: 2 | 4 | 5
  objectiveMode?: 'single' | 'multiple' | 'judge'
  objectiveAnswers?: Record<string, string[]>
  itemsPerColumn?: number
  objectiveLayout?: ObjectiveLayout
  writingLayout?: 'choose-one' | 'separate'
  lineStyle?: LineStyle
  responseStyle?: ResponseStyle
  answerAreaOverride?: boolean
  leadingBlankLines?: number
  contentText?: string
  contentElements?: ContentElement[]
  textBold?: boolean
  textItalic?: boolean
  textUnderline?: boolean
  textScript?: 'normal' | 'sub' | 'super'
  textAlign?: 'left' | 'center' | 'right'
  fontSize?: 'small' | 'medium' | 'large'
  lineSpacing?: 'compact' | 'normal' | 'loose'
  showScore: boolean
  showQuestionCount?: boolean
  showUnitScore?: boolean
  showScoreBox?: boolean
  scoreStep?: number
  userInserted?: boolean
  borderStyle?: 'bordered' | 'borderless'
  locked?: boolean
  hint?: string
  mergedParts?: AnswerBlock[]
}

export type QuestionGroupType = 'single' | 'multiple' | 'judge' | 'fill' | 'solution' | 'comprehensive'

export interface QuestionGroupDraft {
  title: string
  type: QuestionGroupType
  startNumber: number
  questionCount: number
  totalScore: number
  optionCount: 2 | 4 | 5
}

export interface AnswerSheetSettings {
  reviewMode: ReviewMode
  cardStyle: CardStyle
  paperSize: PaperSize
  printSide: PrintSide
  frontColumns: PaperColumns
  backColumns: PaperColumns
  candidateNumberLayouts: CandidateNumberLayout[]
  candidateNumberType: CandidateNumberType
  candidateNumberDigits: number
  identityFields: IdentityField[]
  showNotice: boolean
  noticeStyle: NoticeStyle
  questionNumberOrder: QuestionNumberOrder
  objectiveSortMode: ObjectiveSortMode
  objectiveMerge: boolean
  subjectiveAnswerStyle: SubjectiveAnswerStyle
  subjectiveLineHeight: number
  noticeText: string
  showFooter: boolean
  footerText: string
  linkedPaperId: string
}

export interface HeaderModule {
  id: string
  kind: HeaderModuleKind
  label: string
  x: number
  y: number
  width: number
  height: number
  minWidth: number
  minHeight: number
  fields?: string[]
  variant?: 'lines' | 'boxes' | 'compact' | 'detailed' | 'beijing-footer'
  protected?: boolean
}

export interface HeaderLayout {
  preset: HeaderPreset
  templateId: HeaderTemplateId
  templateName: string
  evidence: HeaderEvidence
  evidenceLabel: string
  sourceNote: string
  customized: boolean
  height: number
  continuationHeight: number
  continuationFields: string[]
  modules: HeaderModule[]
  hiddenItemIds?: string[]
}

export interface RulePack {
  id: string
  name: string
  shortName: string
  description: string
  evidenceLabel: string
  paperSize: 'A4' | 'A3' | '8K'
  pageCount: number
  identityFields: string[]
  lockedZones: string[]
  subjectScope: string
}

export interface AnswerSheetDocument {
  paper: ExamPaper
  blocks: AnswerBlock[]
  settings: AnswerSheetSettings
  header: HeaderLayout
  mode: CardMode
  rulePackId: string
  templateId: string
  pageCount: number
}

export interface AnswerSheetTemplate {
  id: string
  name: string
  description: string
  origin: TemplateOrigin
  category: TemplateCategory
  featured?: boolean
  tags: string[]
  paperSize: PaperSize
  columns: 1 | 2 | 3
  identityMode: 'barcode' | 'candidate-number' | 'both'
  highlights: string[]
  document: AnswerSheetDocument
}

export type CheckSeverity = 'pass' | 'warning' | 'blocking'

export interface PreflightCheck {
  id: string
  label: string
  detail: string
  severity: CheckSeverity
  blockId?: string
  fixable?: boolean
}

export interface ParseResult {
  sectionCount: number
  objectiveCount: number
  subjectiveCount: number
  totalScore: number
  needsReview: Array<{
    id: string
    label: string
    detail: string
  }>
}

export interface PublishedVersion {
  version: number
  publishedAt: string
  referencedExamCount: number
  snapshot: AnswerSheetDocument
}

export type DraftSnapshot = AnswerSheetDocument
