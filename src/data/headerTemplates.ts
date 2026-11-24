import type { HeaderLayout, HeaderModule, HeaderTemplateId } from '../features/answer-sheet/types'

export interface HeaderTemplateCatalogItem {
  id: HeaderTemplateId
  name: string
  shortName: string
  evidenceLabel: string
  description: string
  layout: HeaderLayout
}

const module = (value: HeaderModule): HeaderModule => value

export const headerTemplateCatalog: HeaderTemplateCatalogItem[] = [
  {
    id: 'daily-quiz',
    name: '日常测验表头',
    shortName: '日常测验',
    evidenceLabel: '飞象默认',
    description: '学号、姓名、年级班级与二维码的轻量表头。',
    layout: {
      preset: 'quiz',
      templateId: 'daily-quiz',
      templateName: '日常测验表头',
      evidence: 'product-default',
      evidenceLabel: '飞象默认',
      sourceNote: '适用于校内日常测验，可继续通过左侧考生信息开关调整字段。',
      customized: false,
      height: 66,
      continuationHeight: 50,
      continuationFields: ['学号', '姓名', '班级'],
      modules: [],
    },
  },
  {
    id: 'exam-general',
    name: '大型考试通用表头',
    shortName: '大考通用',
    evidenceLabel: '飞象参考',
    description: '紧凑排布姓名、学校、10 位准考证号填涂区、注意事项、缺考标记和填涂范例。',
    layout: {
      preset: 'exam',
      templateId: 'exam-general',
      templateName: '大型考试通用表头',
      evidence: 'product-default',
      evidenceLabel: '飞象参考',
      sourceNote: '通用大考紧凑结构，准考证号默认 10 位；正式印刷前需按扫描设备参数核验。',
      customized: false,
      height: 280,
      continuationHeight: 54,
      continuationFields: ['姓名', '学校名称', '考场号', '座位号', '准考证号'],
      modules: [
        module({ id: 'general-title', kind: 'title', label: '考试标题', x: 0, y: 0, width: 100, height: 14, minWidth: 42, minHeight: 10 }),
        module({ id: 'general-identity', kind: 'identity', label: '考生信息', x: 0, y: 17, width: 45, height: 44, minWidth: 32, minHeight: 32, fields: ['姓名', '学校名称', '考场号', '座位号'], variant: 'general-identity' }),
        module({ id: 'general-number', kind: 'candidate-number', label: '准考证号填涂区', x: 48, y: 17, width: 52, height: 44, minWidth: 40, minHeight: 40, fields: ['准考证号'], digitCount: 10, variant: 'general-omr', protected: true }),
        module({ id: 'general-notice', kind: 'notice', label: '注意事项', x: 0, y: 64, width: 100, height: 24, minWidth: 60, minHeight: 20, variant: 'general-compact' }),
        module({ id: 'general-fill', kind: 'fill-sample', label: '填涂示例', x: 0, y: 88, width: 100, height: 6, minWidth: 60, minHeight: 5, variant: 'general-compact', protected: true }),
        module({ id: 'general-absence', kind: 'absence-mark', label: '缺考标记', x: 0, y: 94, width: 100, height: 6, minWidth: 60, minHeight: 5, variant: 'general-compact', protected: true }),
      ],
    },
  },
  {
    id: 'beijing-exam-reference',
    name: '北京初中学考参考表头',
    shortName: '北京参考',
    evidenceLabel: '官方样例结构',
    description: '依据北京教育考试院公开答题卡样例抽象，保留学校、姓名、准考证号、须知、条码和缺考标记。',
    layout: {
      preset: 'exam',
      templateId: 'beijing-exam-reference',
      templateName: '北京初中学考参考表头',
      evidence: 'official-sample',
      evidenceLabel: '官方样例结构',
      sourceNote: '依据北京教育考试院 2022–2024 公开样例抽象；不是官方印刷原文件。',
      customized: false,
      height: 214,
      continuationHeight: 54,
      continuationFields: ['姓名', '准考证号'],
      modules: [
        module({ id: 'bj-title', kind: 'title', label: '考试标题', x: 0, y: 0, width: 100, height: 14, minWidth: 45, minHeight: 10 }),
        module({ id: 'bj-identity', kind: 'identity', label: '考生信息', x: 0, y: 15, width: 62, height: 15, minWidth: 38, minHeight: 12, fields: ['学校名称', '姓名'], variant: 'lines' }),
        module({ id: 'bj-number', kind: 'candidate-number', label: '准考证号格', x: 62, y: 15, width: 38, height: 15, minWidth: 28, minHeight: 12, fields: ['准考证号'], variant: 'boxes', protected: true }),
        module({ id: 'bj-notice', kind: 'notice', label: '考生须知', x: 0, y: 30, width: 62, height: 55, minWidth: 38, minHeight: 34, variant: 'detailed' }),
        module({ id: 'bj-barcode', kind: 'barcode', label: '条形码粘贴处', x: 62, y: 30, width: 38, height: 70, minWidth: 26, minHeight: 32, protected: true }),
        module({ id: 'bj-fill', kind: 'fill-sample', label: '填涂要求', x: 0, y: 85, width: 31, height: 15, minWidth: 25, minHeight: 10, variant: 'beijing-footer', protected: true }),
        module({ id: 'bj-absence', kind: 'absence-mark', label: '缺考标记', x: 31, y: 85, width: 31, height: 15, minWidth: 18, minHeight: 10, variant: 'beijing-footer', protected: true }),
      ],
    },
  },
  {
    id: 'shenzhen-exam-reference-a',
    name: '深圳初中学考参考表头 A',
    shortName: '深圳参考 A',
    evidenceLabel: '官方字段规则抽象',
    description: '依据深圳公开考务字段抽象，采用左侧身份信息、右侧条码的紧凑布局。',
    layout: {
      preset: 'exam',
      templateId: 'shenzhen-exam-reference-a',
      templateName: '深圳初中学考参考表头 A',
      evidence: 'official-rules',
      evidenceLabel: '官方字段规则抽象',
      sourceNote: '字段依据深圳公开考务规则；版式为产品参考重构，不是官方原版。',
      customized: false,
      height: 238,
      continuationHeight: 58,
      continuationFields: ['考生号', '姓名', '座位号'],
      modules: [
        module({ id: 'sza-title', kind: 'title', label: '考试标题', x: 0, y: 0, width: 100, height: 15, minWidth: 44, minHeight: 10 }),
        module({ id: 'sza-name', kind: 'identity', label: '姓名', x: 0, y: 18, width: 42, height: 14, minWidth: 30, minHeight: 11, fields: ['姓名'], variant: 'shenzhen-a' }),
        module({ id: 'sza-number', kind: 'candidate-number', label: '准考证号', x: 0, y: 32, width: 42, height: 17, minWidth: 28, minHeight: 13, fields: ['准考证号'], variant: 'shenzhen-a', protected: true }),
        module({ id: 'sza-seat', kind: 'identity', label: '考场与座位', x: 0, y: 49, width: 42, height: 17, minWidth: 30, minHeight: 13, fields: ['考场号', '座位号'], variant: 'shenzhen-a-boxes' }),
        module({ id: 'sza-barcode', kind: 'barcode', label: '条形码粘贴处', x: 45, y: 18, width: 55, height: 48, minWidth: 30, minHeight: 30, variant: 'shenzhen-a', protected: true }),
        module({ id: 'sza-absence', kind: 'absence-mark', label: '缺考标记', x: 0, y: 69, width: 14, height: 31, minWidth: 12, minHeight: 22, variant: 'shenzhen-a', protected: true }),
        module({ id: 'sza-notice', kind: 'notice', label: '注意事项', x: 14, y: 69, width: 72, height: 31, minWidth: 46, minHeight: 24, variant: 'shenzhen-a' }),
        module({ id: 'sza-fill', kind: 'fill-sample', label: '填涂范例', x: 86, y: 69, width: 14, height: 31, minWidth: 12, minHeight: 22, variant: 'shenzhen-a', protected: true }),
      ],
    },
  },
  {
    id: 'shenzhen-exam-reference-b',
    name: '深圳初中学考参考表头 B',
    shortName: '深圳参考 B',
    evidenceLabel: '样卡版式参考',
    description: '依据深圳学考样卡版式重构，上方为注意事项与缺考标记，下方为考生信息和条形码区。',
    layout: {
      preset: 'exam',
      templateId: 'shenzhen-exam-reference-b',
      templateName: '深圳初中学考参考表头 B',
      evidence: 'reference-layout',
      evidenceLabel: '样卡版式参考',
      sourceNote: '依据用户提供的深圳学考样卡截图重构；不是官方印刷原文件。',
      customized: false,
      height: 232,
      continuationHeight: 56,
      continuationFields: ['姓名', '准考证号', '学校'],
      modules: [
        module({ id: 'szb-title', kind: 'title', label: '考试标题', x: 0, y: 0, width: 100, height: 18, minWidth: 50, minHeight: 12 }),
        module({ id: 'szb-notice', kind: 'notice', label: '注意事项', x: 0, y: 21, width: 75, height: 45, minWidth: 46, minHeight: 32, variant: 'shenzhen-b' }),
        module({ id: 'szb-absence', kind: 'absence-mark', label: '缺考标记', x: 77, y: 21, width: 23, height: 45, minWidth: 18, minHeight: 32, variant: 'shenzhen-b', protected: true }),
        module({ id: 'szb-identity', kind: 'identity', label: '考生信息', x: 0, y: 69, width: 50, height: 31, minWidth: 36, minHeight: 24, fields: ['姓名', '准考证号', '学校'], variant: 'shenzhen-b' }),
        module({ id: 'szb-barcode', kind: 'barcode', label: '条形码粘贴处', x: 52, y: 69, width: 48, height: 31, minWidth: 32, minHeight: 24, variant: 'shenzhen-b', protected: true }),
      ],
    },
  },
  {
    id: 'guangzhou-exam-reference',
    name: '广州初中学考参考表头',
    shortName: '广州参考',
    evidenceLabel: '历年样式参考',
    description: '依据广州初中学业水平考试答题卡样式重构，含考生信息、条码、注意事项和竖向填涂栏。',
    layout: {
      preset: 'exam',
      templateId: 'guangzhou-exam-reference',
      templateName: '广州初中学考参考表头',
      evidence: 'reference-layout',
      evidenceLabel: '历年样式参考',
      sourceNote: '依据公开流传的广州答题卡样式重构，不作为官方印刷原文件。',
      customized: false,
      height: 246,
      continuationHeight: 56,
      continuationFields: ['考生号', '姓名', '考场号', '座位号'],
      modules: [
        module({ id: 'gz-title', kind: 'title', label: '考试标题', x: 0, y: 0, width: 100, height: 14, minWidth: 50, minHeight: 10 }),
        module({ id: 'gz-identity', kind: 'identity', label: '考生信息', x: 2, y: 24, width: 34, height: 29, minWidth: 26, minHeight: 22, fields: ['考生号', '姓名'], variant: 'guangzhou-identity' }),
        module({ id: 'gz-barcode', kind: 'barcode', label: '条形码粘贴处', x: 38, y: 24, width: 25, height: 29, minWidth: 20, minHeight: 22, variant: 'guangzhou', protected: true }),
        module({ id: 'gz-notice', kind: 'notice', label: '注意事项', x: 2, y: 58, width: 50, height: 39, minWidth: 38, minHeight: 30, variant: 'guangzhou' }),
        module({ id: 'gz-absence', kind: 'absence-mark', label: '缺考', x: 54, y: 58, width: 9, height: 39, minWidth: 8, minHeight: 28, variant: 'guangzhou', protected: true }),
        module({ id: 'gz-room', kind: 'candidate-number', label: '考场号', x: 68, y: 24, width: 20, height: 73, minWidth: 17, minHeight: 56, fields: ['考场号'], variant: 'guangzhou-room', protected: true }),
        module({ id: 'gz-seat', kind: 'candidate-number', label: '座位号', x: 91, y: 24, width: 9, height: 73, minWidth: 8, minHeight: 56, fields: ['座位号'], variant: 'guangzhou-seat', protected: true }),
      ],
    },
  },
]

export const examHeaderTemplates = headerTemplateCatalog.filter((item) => item.layout.preset === 'exam')

export function instantiateHeaderTemplate(id: HeaderTemplateId): HeaderLayout {
  const template = headerTemplateCatalog.find((item) => item.id === id) ?? headerTemplateCatalog[0]
  return {
    ...template.layout,
    continuationFields: [...template.layout.continuationFields],
    modules: template.layout.modules.map((item) => ({ ...item, fields: item.fields ? [...item.fields] : undefined })),
    hiddenItemIds: [],
  }
}

export function cloneHeaderLayout(header: HeaderLayout): HeaderLayout {
  return {
    ...header,
    continuationFields: [...header.continuationFields],
    modules: header.modules.map((item) => ({ ...item, fields: item.fields ? [...item.fields] : undefined })),
    hiddenItemIds: [...(header.hiddenItemIds ?? [])],
  }
}
