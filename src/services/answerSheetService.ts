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
  publish(version: number): Promise<PublishedVersion>
}

const wait = (duration: number) => new Promise((resolve) => window.setTimeout(resolve, duration))

class MockAnswerSheetService implements AnswerSheetService {
  async parsePaper(paper: ExamPaper): Promise<ParseResult> {
    await wait(900)
    return {
      sectionCount: paper.sections.length,
      objectiveCount: 33,
      subjectiveCount: 5,
      totalScore: paper.score,
      needsReview: [
        {
          id: 'writing-choice',
          label: '第 48 题命题形式',
          detail: '检测到两个写作提示，已识别为“二选一，共用作答区”。',
        },
      ],
    }
  }

  async saveDraft(_snapshot: DraftSnapshot, _version: number): Promise<{ savedAt: string }> {
    await wait(320)
    return { savedAt: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) }
  }

  async publish(version: number): Promise<PublishedVersion> {
    await wait(680)
    return {
      version,
      publishedAt: new Date().toLocaleString('zh-CN', { hour12: false }),
      referencedExamCount: 0,
    }
  }
}

export const answerSheetService: AnswerSheetService = new MockAnswerSheetService()
