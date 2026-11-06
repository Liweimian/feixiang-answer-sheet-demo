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
    description: '通用大考身份区、条码区、注意事项与填涂示例。',
    layout: {
      preset: 'exam',
      templateId: 'exam-general',
      templateName: '大型考试通用表头',
      evidence: 'product-default',
      evidenceLabel: '飞象参考',
      sourceNote: '通用参考结构，正式印刷前需按当地考试机构样卡核验。',
      customized: false,
      height: 210,
      continuationHeight: 54,
      continuationFields: ['姓名', '准考证号'],
      modules: [
        module({ id: 'general-title', kind: 'title', label: '考试标题', x: 0, y: 0, width: 100, height: 14, minWidth: 42, minHeight: 10 }),
        module({ id: 'general-number', kind: 'candidate-number', label: '准考证号格', x: 0, y: 17, width: 56, height: 14, minWidth: 34, minHeight: 11, fields: ['准考证号'], variant: 'boxes', protected: true }),
        module({ id: 'general-identity', kind: 'identity', label: '考生信息', x: 0, y: 33, width: 56, height: 14, minWidth: 34, minHeight: 11, fields: ['学校名称', '姓名', '准考证号'], variant: 'lines' }),
        module({ id: 'general-barcode', kind: 'barcode', label: '条形码粘贴处', x: 60, y: 17, width: 40, height: 30, minWidth: 25, minHeight: 20, protected: true }),
        module({ id: 'general-notice', kind: 'notice', label: '注意事项', x: 0, y: 50, width: 59, height: 47, minWidth: 38, minHeight: 34, variant: 'detailed' }),
        module({ id: 'general-fill', kind: 'fill-sample', label: '填涂样例', x: 62, y: 51, width: 38, height: 46, minWidth: 24, minHeight: 30, protected: true }),
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
        module({ id: 'bj-identity', kind: 'identity', label: '考生信息', x: 0, y: 15, width: 60, height: 15, minWidth: 38, minHeight: 12, fields: ['学校名称', '姓名'], variant: 'lines' }),
        module({ id: 'bj-number', kind: 'candidate-number', label: '准考证号格', x: 60, y: 15, width: 40, height: 15, minWidth: 28, minHeight: 12, fields: ['准考证号'], variant: 'boxes', protected: true }),
        module({ id: 'bj-notice', kind: 'notice', label: '考生须知', x: 0, y: 30, width: 60, height: 55, minWidth: 38, minHeight: 34, variant: 'detailed' }),
        module({ id: 'bj-barcode', kind: 'barcode', label: '条形码粘贴处', x: 60, y: 30, width: 40, height: 70, minWidth: 26, minHeight: 32, protected: true }),
        module({ id: 'bj-fill', kind: 'fill-sample', label: '填涂要求', x: 0, y: 85, width: 30, height: 15, minWidth: 25, minHeight: 10, variant: 'beijing-footer', protected: true }),
        module({ id: 'bj-absence', kind: 'absence-mark', label: '缺考标记', x: 30, y: 85, width: 30, height: 15, minWidth: 18, minHeight: 10, variant: 'beijing-footer', protected: true }),
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
        module({ id: 'sza-identity', kind: 'identity', label: '考生信息', x: 0, y: 18, width: 42, height: 30, minWidth: 30, minHeight: 22, fields: ['考生号', '姓名', '考点', '考场号', '座位号'], variant: 'lines' }),
        module({ id: 'sza-number', kind: 'candidate-number', label: '考生号格', x: 0, y: 50, width: 42, height: 16, minWidth: 28, minHeight: 13, fields: ['考生号'], variant: 'boxes', protected: true }),
        module({ id: 'sza-barcode', kind: 'barcode', label: '条形码粘贴处', x: 45, y: 18, width: 55, height: 48, minWidth: 30, minHeight: 30, protected: true }),
        module({ id: 'sza-notice', kind: 'notice', label: '注意事项', x: 0, y: 69, width: 61, height: 31, minWidth: 38, minHeight: 24, variant: 'compact' }),
        module({ id: 'sza-absence', kind: 'absence-mark', label: '监考标记', x: 64, y: 69, width: 17, height: 31, minWidth: 14, minHeight: 22, protected: true }),
        module({ id: 'sza-fill', kind: 'fill-sample', label: '填涂样例', x: 83, y: 69, width: 17, height: 31, minWidth: 14, minHeight: 22, variant: 'compact', protected: true }),
      ],
    },
  },
  {
    id: 'shenzhen-exam-reference-b',
    name: '深圳初中学考参考表头 B',
    shortName: '深圳参考 B',
    evidenceLabel: '官方字段规则抽象',
    description: '同一套深圳公开字段，采用标题居中、身份横排、条码靠右的宽版布局。',
    layout: {
      preset: 'exam',
      templateId: 'shenzhen-exam-reference-b',
      templateName: '深圳初中学考参考表头 B',
      evidence: 'official-rules',
      evidenceLabel: '官方字段规则抽象',
      sourceNote: '字段依据深圳公开考务规则；版式为产品参考重构，不是官方原版。',
      customized: false,
      height: 230,
      continuationHeight: 56,
      continuationFields: ['考生号', '姓名', '座位号'],
      modules: [
        module({ id: 'szb-title', kind: 'title', label: '考试标题', x: 0, y: 0, width: 74, height: 16, minWidth: 44, minHeight: 10 }),
        module({ id: 'szb-barcode', kind: 'barcode', label: '条形码粘贴处', x: 77, y: 0, width: 23, height: 36, minWidth: 20, minHeight: 26, protected: true }),
        module({ id: 'szb-identity', kind: 'identity', label: '考生信息', x: 0, y: 19, width: 74, height: 17, minWidth: 45, minHeight: 14, fields: ['考生号', '姓名', '考点', '考场号', '座位号'], variant: 'lines' }),
        module({ id: 'szb-number', kind: 'candidate-number', label: '考生号格', x: 0, y: 38, width: 74, height: 15, minWidth: 34, minHeight: 12, fields: ['考生号'], variant: 'boxes', protected: true }),
        module({ id: 'szb-notice', kind: 'notice', label: '注意事项', x: 0, y: 56, width: 62, height: 44, minWidth: 38, minHeight: 34, variant: 'detailed' }),
        module({ id: 'szb-absence', kind: 'absence-mark', label: '监考标记', x: 65, y: 56, width: 16, height: 44, minWidth: 13, minHeight: 30, protected: true }),
        module({ id: 'szb-fill', kind: 'fill-sample', label: '填涂样例', x: 84, y: 56, width: 16, height: 44, minWidth: 13, minHeight: 30, variant: 'compact', protected: true }),
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
