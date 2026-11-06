import type { AnswerSheetSettings, HeaderLayout, HeaderModule } from './types'

export interface HeaderGeometryIssue {
  type: 'out-of-bounds' | 'overlap' | 'minimum-size'
  moduleId: string
  relatedId?: string
}

const GAP = 0.6

export function clampHeaderModule(module: HeaderModule): HeaderModule {
  const width = Math.min(100, Math.max(module.minWidth, module.width))
  const height = Math.min(100, Math.max(module.minHeight, module.height))
  return {
    ...module,
    width,
    height,
    x: Math.min(100 - width, Math.max(0, module.x)),
    y: Math.min(100 - height, Math.max(0, module.y)),
  }
}

export function headerModulesOverlap(first: HeaderModule, second: HeaderModule): boolean {
  return first.x < second.x + second.width + GAP
    && first.x + first.width + GAP > second.x
    && first.y < second.y + second.height + GAP
    && first.y + first.height + GAP > second.y
}

export function isHeaderModuleVisible(module: HeaderModule, settings: AnswerSheetSettings, hiddenItemIds: string[] = []): boolean {
  if (hiddenItemIds.includes(module.id)) return false
  if (module.kind === 'notice') return settings.showNotice
  if (module.kind === 'barcode') return settings.candidateNumberLayouts.includes('barcode')
  if (module.kind === 'candidate-number') {
    return settings.candidateNumberLayouts.includes('fill') || settings.candidateNumberLayouts.includes('handwrite')
  }
  return true
}

export function visibleHeaderModules(header: HeaderLayout, settings: AnswerSheetSettings): HeaderModule[] {
  return header.modules.filter((module) => isHeaderModuleVisible(module, settings, header.hiddenItemIds))
}

export function validateHeaderGeometry(header: HeaderLayout, settings?: AnswerSheetSettings): HeaderGeometryIssue[] {
  const issues: HeaderGeometryIssue[] = []
  const modules = settings ? visibleHeaderModules(header, settings) : header.modules.filter((module) => !header.hiddenItemIds?.includes(module.id))
  modules.forEach((module, index) => {
    if (module.width < module.minWidth || module.height < module.minHeight) {
      issues.push({ type: 'minimum-size', moduleId: module.id })
    }
    if (module.x < 0 || module.y < 0 || module.x + module.width > 100 || module.y + module.height > 100) {
      issues.push({ type: 'out-of-bounds', moduleId: module.id })
    }
    modules.slice(index + 1).forEach((other) => {
      if (headerModulesOverlap(module, other)) {
        issues.push({ type: 'overlap', moduleId: module.id, relatedId: other.id })
      }
    })
  })
  return issues
}

export function updateHeaderModule(
  header: HeaderLayout,
  moduleId: string,
  patch: Partial<Pick<HeaderModule, 'x' | 'y' | 'width' | 'height'>>,
  settings?: AnswerSheetSettings,
): HeaderLayout {
  const current = header.modules.find((item) => item.id === moduleId)
  if (!current) return header
  const nextModule = clampHeaderModule({ ...current, ...patch })
  if (nextModule.x === current.x && nextModule.y === current.y && nextModule.width === current.width && nextModule.height === current.height) return header
  const others = header.modules.filter((item) => item.id !== moduleId && (!settings || isHeaderModuleVisible(item, settings, header.hiddenItemIds)))
  if (others.some((item) => headerModulesOverlap(nextModule, item))) return header
  return {
    ...header,
    customized: true,
    modules: header.modules.map((item) => item.id === moduleId ? nextModule : item),
  }
}
