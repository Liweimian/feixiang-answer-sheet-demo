import type {
  AnswerBlock,
  DraftSnapshot,
  ExamPaper,
  ParseResult,
  PublishedVersion,
} from '../features/answer-sheet/types'

export interface AnswerSheetService {
  parsePaper(paper: ExamPaper): Promise<ParseResult>
  saveDraft(snapshot: DraftSnapshot, version: number): Promise<{ savedAt: string }>
  publish(snapshot: DraftSnapshot, version: number): Promise<PublishedVersion>
}

const wait = (duration: number) => new Promise((resolve) => window.setTimeout(resolve, duration))

class MockAnswerSheetService implements AnswerSheetService {
  async parsePaper(paper: ExamPaper): Promise<ParseResult> {
    await wait(900)
    const objectiveCount = paper.sections
      .filter((section) => section.answerKind === 'objective')
      .reduce((total, section) => total + section.questionCount, 0)
    const subjectiveCount = paper.sections
      .filter((section) => section.answerKind !== 'objective')
      .reduce((total, section) => total + section.questionCount, 0)
    const needsReview = paper.sections
      .filter((section) => section.confidence < 90)
      .map((section) => ({
        id: section.id,
        label: `${section.title}的作答形式`,
        detail: section.answerKind === 'essay'
          ? '检测到作文提示，请确认是否共用一个作答区。'
          : `当前识别置信度为 ${section.confidence}%，请确认题号与题型。`,
      }))
    return {
      sectionCount: paper.sections.length,
      objectiveCount,
      subjectiveCount,
      totalScore: paper.score,
      needsReview,
    }
  }

  async saveDraft(_snapshot: DraftSnapshot, _version: number): Promise<{ savedAt: string }> {
    await wait(320)
    return { savedAt: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) }
  }

  async publish(snapshot: DraftSnapshot, version: number): Promise<PublishedVersion> {
    await wait(680)
    return {
      version,
      publishedAt: new Date().toLocaleString('zh-CN', { hour12: false }),
      referencedExamCount: 0,
      snapshot: structuredClone(snapshot),
    }
  }
}

export const answerSheetService: AnswerSheetService = new MockAnswerSheetService()
