export type FlowStage = 'source' | 'parsing' | 'editor'
export type SourceKind = 'library' | 'upload' | 'template' | 'blank'
export type CardMode = 'smart' | 'standard'
export type AnswerBlockKind =
  | 'objective'
  | 'short-answer'
  | 'essay'
  | 'forbidden'
  | 'drawing'
  | 'table'
  | 'notice'

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
  kind: AnswerBlockKind
  height: number
  lineCount?: number
  showScore: boolean
  locked?: boolean
  hint?: string
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
}

export interface DraftSnapshot {
  blocks: AnswerBlock[]
  mode: CardMode
  rulePackId: string
}
