import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  MetisButton,
  MetisEmpty,
  MetisInput,
  MetisMessage,
  MetisSelect,
  MetisTable,
  MetisTag,
} from '@yuanfudao/metis-web-component'
import {
  resourceRepository,
  type Resource,
  type ResourceFilters,
  type ResourceStatus,
} from '../data/resourceRepository'
import type { AsyncStatus, PageQuery, PageResult } from '../prototype/types'

const initialQuery: PageQuery<ResourceFilters> = {
  page: 1,
  pageSize: 10,
  keyword: '',
  filters: {},
}

const emptyResult: PageResult<Resource> = {
  items: [],
  total: 0,
  page: 1,
  pageSize: 10,
}

export function ResourceListPage() {
  const [query, setQuery] = useState(initialQuery)
  const [result, setResult] = useState(emptyResult)
  const [status, setStatus] = useState<AsyncStatus>('idle')

  const load = useCallback(async () => {
    setStatus('loading')
    try {
      setResult(await resourceRepository.list(query))
      setStatus('success')
    } catch {
      setStatus('error')
    }
  }, [query])

  useEffect(() => {
    void load()
  }, [load])

  const columns = useMemo(
    () => [
      { title: '资源名称', dataIndex: 'name', key: 'name' },
      { title: '学科', dataIndex: 'subject', key: 'subject' },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        render: (value: ResourceStatus) => (
          <MetisTag color={value === 'published' ? 'success' : 'default'}>
            {value === 'published' ? '已发布' : '草稿'}
          </MetisTag>
        ),
      },
      { title: '更新时间', dataIndex: 'updatedAt', key: 'updatedAt' },
      {
        title: '操作',
        key: 'actions',
        render: (_: unknown, resource: Resource) => (
          <MetisButton
            type="borderless"
            onClick={() => MetisMessage.success(`打开：${resource.name}`)}
          >
            查看
          </MetisButton>
        ),
      },
    ],
    [],
  )

  return (
    <main className="page-shell">
      <header className="page-header">
        <div>
          <h1>资源管理</h1>
          <p>模板示例：替换为真实页面标题、说明和主操作。</p>
        </div>
        <MetisButton type="primary">新建资源</MetisButton>
      </header>

      <section className="filter-panel" aria-label="资源筛选">
        <MetisInput
          value={query.keyword}
          placeholder="搜索资源名称"
          onChange={(event) =>
            setQuery((current) => ({
              ...current,
              page: 1,
              keyword: event.target.value,
            }))
          }
        />
        <MetisSelect
          allowClear
          value={query.filters.status}
          placeholder="全部状态"
          options={[
            { label: '草稿', value: 'draft' },
            { label: '已发布', value: 'published' },
          ]}
          onChange={(value) =>
            setQuery((current) => ({
              ...current,
              page: 1,
              filters: {
                ...current.filters,
                status: value as ResourceStatus | undefined,
              },
            }))
          }
        />
      </section>

      <section className="content-panel">
        {status === 'error' ? (
          <div className="feedback-state">
            <MetisEmpty description="资源加载失败" />
            <MetisButton onClick={() => void load()}>重新加载</MetisButton>
          </div>
        ) : (
          <MetisTable<Resource>
            rowKey="id"
            loading={status === 'loading'}
            columns={columns}
            dataSource={result.items}
            pagination={{
              current: query.page,
              pageSize: query.pageSize,
              total: result.total,
              onChange: (page: number, pageSize: number) =>
                setQuery((current) => ({ ...current, page, pageSize })),
            }}
          />
        )}
      </section>
    </main>
  )
}
