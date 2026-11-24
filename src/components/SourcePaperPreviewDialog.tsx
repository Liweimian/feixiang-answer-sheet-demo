import { useEffect, useState } from 'react'
import { MetisButton, MetisDialog } from '@yuanfudao/metis-web-component'
import { Download } from 'lucide-react'

interface SourcePaperPreviewDialogProps {
  file?: File
  onClose: () => void
}

export function SourcePaperPreviewDialog({ file, onClose }: SourcePaperPreviewDialogProps) {
  const [url, setUrl] = useState('')
  const [text, setText] = useState('')

  useEffect(() => {
    if (!file) return
    const nextUrl = URL.createObjectURL(file)
    setUrl(nextUrl)
    setText('')
    let active = true
    if (file.name.toLowerCase().endsWith('.docx')) {
      void file.arrayBuffer().then(async (arrayBuffer) => {
        const mammoth = await import('mammoth')
        return mammoth.extractRawText({ arrayBuffer })
      }).then((result) => { if (active) setText(result.value) }).catch(() => { if (active) setText('原卷文字读取失败，请下载文件查看。') })
    } else if (file.type.startsWith('text/') || /\.(txt|md|csv)$/i.test(file.name)) {
      void file.text().then((value) => { if (active) setText(value) })
    }
    return () => { active = false; URL.revokeObjectURL(nextUrl); setUrl('') }
  }, [file])

  return <MetisDialog open={Boolean(file)} title={file?.name ?? '原卷'} width={900} footer={<MetisButton type="bordered" icon={<Download size={15} />} onClick={() => {
    if (!url || !file) return
    const link = document.createElement('a')
    link.href = url
    link.download = file.name
    link.click()
  }}>下载原卷</MetisButton>} onCancel={onClose}>
    <div className="record-source-preview">
      {url && file?.type.startsWith('image/') ? <img src={url} alt={file.name} />
        : url && (file?.type === 'application/pdf' || file?.name.toLowerCase().endsWith('.pdf')) ? <iframe src={url} title={file.name} />
          : text ? <pre>{text}</pre>
            : <div className="record-source-fallback">{file?.name.toLowerCase().endsWith('.docx') ? '正在读取原卷内容…' : '此格式暂不支持在线预览，请下载原卷查看。'}</div>}
    </div>
  </MetisDialog>
}
