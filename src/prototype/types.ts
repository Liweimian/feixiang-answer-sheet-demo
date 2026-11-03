export type EntityId = string

export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error'

export interface PageQuery<Filters extends object> {
  page: number
  pageSize: number
  keyword?: string
  filters: Filters
}

export interface PageResult<Item> {
  items: Item[]
  total: number
  page: number
  pageSize: number
}

export interface EntityRepository<Item, Filters extends object> {
  list(query: PageQuery<Filters>): Promise<PageResult<Item>>
}
