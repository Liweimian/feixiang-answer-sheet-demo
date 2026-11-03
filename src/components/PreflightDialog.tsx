import { MetisButton, MetisDialog, MetisTag } from '@yuanfudao/metis-web-component'
import { AlertTriangle, CheckCircle2, Download, ShieldCheck, WandSparkles, XCircle } from 'lucide-react'
import type { PreflightCheck, PublishedVersion } from '../features/answer-sheet/types'

interface PreflightDialogProps {
  open: boolean
  checks: PreflightCheck[]
  publishing: boolean
  published?: PublishedVersion
  draftVersion: number
  onClose: () => void
  onAutoFix: () => void
  onPublish: () => void
  onLocate: (blockId: string) => void
  onDownload: () => void
}

const severityMeta = {
  pass: { icon: CheckCircle2, label: '通过', preset: 'success' as const },
  warning: { icon: AlertTriangle, label: '建议优化', preset: 'warning' as const },
  blocking: { icon: XCircle, label: '必须处理', preset: 'error' as const },
}

export function PreflightDialog(props: PreflightDialogProps) {
  const blockingCount = props.checks.filter((check) => check.severity === 'blocking').length
  const fixableCount = props.checks.filter((check) => check.fixable && check.severity !== 'pass').length
  const isPublishedCurrent = props.published?.version === props.draftVersion

  const footer = isPublishedCurrent ? (
    <div className="dialog-footer-actions">
      <MetisButton type="bordered" onClick={props.onClose}>关闭</MetisButton>
      <MetisButton type="primary" icon={<Download size={15} />} onClick={props.onDownload}>下载打印版</MetisButton>
    </div>
  ) : (
    <div className="dialog-footer-actions">
      <MetisButton type="borderless" onClick={props.onClose}>稍后处理</MetisButton>
      {fixableCount > 0 && <MetisButton type="bordered" icon={<WandSparkles size={15} />} onClick={props.onAutoFix}>一键优化 {fixableCount} 项</MetisButton>}
      <MetisButton type="primary" disabled={blockingCount > 0} loading={props.publishing} onClick={props.onPublish}>生成 V{props.draftVersion} 印刷版</MetisButton>
    </div>
  )

  return (
    <MetisDialog open={props.open} title="印前校验与发布" width={720} footer={footer} onCancel={props.onClose}>
      {isPublishedCurrent && props.published ? (
        <div className="publish-success">
          <span><ShieldCheck size={34} /></span>
          <h3>V{props.published.version} 印刷版已发布</h3>
          <p>结构已锁定。后续修改会自动创建 V{props.published.version + 1} 草稿，已关联考试继续使用当前版本。</p>
          <div><span>发布时间</span><strong>{props.published.publishedAt}</strong></div>
        </div>
      ) : (
        <div className="preflight-content">
          <div className={`preflight-summary ${blockingCount ? 'has-blocking' : 'ready'}`}>
            <ShieldCheck size={26} />
            <div>
              <strong>{blockingCount ? `发现 ${blockingCount} 项必须处理` : '关键检查已通过'}</strong>
              <span>{blockingCount ? (fixableCount ? `其中 ${fixableCount} 项可一键优化` : '请先完善结构后再生成印刷版本') : fixableCount ? `另有 ${fixableCount} 项可一键优化` : '可以生成不可变印刷版本'}</span>
            </div>
          </div>
          <div className="check-list">
            {props.checks.map((check) => {
              const meta = severityMeta[check.severity]
              const Icon = meta.icon
              return (
                <div key={check.id} className={`check-row ${check.severity}`}>
                  <Icon size={19} />
                  <div><strong>{check.label}</strong><span>{check.detail}</span></div>
                  <MetisTag preset={meta.preset}>{meta.label}</MetisTag>
                  {check.blockId && check.severity !== 'pass' && (
                    <MetisButton type="borderless" size="s" onClick={() => props.onLocate(check.blockId!)}>定位</MetisButton>
                  )}
                </div>
              )
            })}
          </div>
          <p className="preflight-footnote">正式投产前仍需使用实际打印机、扫描仪和阅卷参数完成一次闭环测试。</p>
        </div>
      )}
    </MetisDialog>
  )
}
