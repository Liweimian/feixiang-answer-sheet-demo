import type {
  EntityRepository,
  PageQuery,
  PageResult,
} from '../prototype/types'

export interface ResourceFilters {
  status?: ResourceStatus
}

export type ResourceStatus = 'draft' | 'published'

export interface Resource {
  id: string
  name: string
  subject: string
  status: ResourceStatus
  updatedAt: string
}

const resources: Resource[] = [
  {
    id: 'resource-001',
    name: '七年级英语听力训练',
    subject: '英语',
    status: 'published',
    updatedAt: '2026-09-12 14:20',
  },
  {
    id: 'resource-002',
    name: '函数基础练习',
    subject: '数学',
    status: 'draft',
    updatedAt: '2026-09-11 09:10',
  },
]

function filterResources(query: PageQuery<ResourceFilters>) {
  const keyword = query.keyword?.trim().toLowerCase()

  return resources.filter((resource) => {
    const matchesKeyword =
      !keyword || resource.name.toLowerCase().includes(keyword)
    const matchesStatus =
      !query.filters.status || resource.status === query.filters.status

    return matchesKeyword && matchesStatus
  })
}

export const resourceRepository: EntityRepository<
  Resource,
  ResourceFilters
> = {
  async list(query): Promise<PageResult<Resource>> {
    await new Promise((resolve) => window.setTimeout(resolve, 250))
    const filtered = filterResources(query)
    const start = (query.page - 1) * query.pageSize

    return {
      items: filtered.slice(start, start + query.pageSize),
      total: filtered.length,
      page: query.page,
      pageSize: query.pageSize,
    }
  },
}
