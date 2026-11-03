import type { AnswerSheetDocument } from './types'

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  })[character]!)
}

function downloadText(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const anchor = window.document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 500)
}

export function downloadAnnotatedAnswerSheet(document: AnswerSheetDocument, version: number) {
  const paperDimensions = {
    A4: { width: '210mm', height: '297mm' },
    A3: { width: '420mm', height: '297mm' },
    '8K': { width: '270mm', height: '390mm' },
    '16K': { width: '195mm', height: '270mm' },
  }[document.settings.paperSize]
  const pages = Array.from({ length: document.pageCount }, (_, index) => index + 1)
    .map((page) => {
      const blocks = document.blocks.filter((block) => block.page === page)
      return `<section class="page">
        <header><h1>${escapeHtml(document.paper.title)}</h1><p>${escapeHtml(document.paper.subject)}答题卡 · 第 ${page} 面（共 ${document.pageCount} 面）</p></header>
        <div class="identity">${document.settings.identityFields.map((field) => `<span>${escapeHtml(field)}：____________</span>`).join('')}</div>
        ${blocks.map((block, index) => `<article>
          <h2>${escapeHtml(block.title)} ${block.range ? `<small>题号 ${escapeHtml(block.range)}</small>` : ''} ${block.showScore && block.score ? `<small>${block.score} 分</small>` : ''}</h2>
          <div class="answer">${escapeHtml(block.contentText || '作答区')}</div>
          ${index % 2 === 0 ? '<div class="mark">✓ 阅卷批注示例</div>' : '<div class="mark score">得分：____</div>'}
        </article>`).join('')}
        <footer>${escapeHtml(document.settings.footerText)} · V${version} 批改痕迹版</footer>
      </section>`
    }).join('')

  const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>${escapeHtml(document.paper.title)}-批改痕迹版</title><style>
    @page{size:${paperDimensions.width} ${paperDimensions.height};margin:0}*{box-sizing:border-box}body{margin:0;background:#eee;font-family:Arial,"Microsoft YaHei",sans-serif;color:#111}.page{position:relative;width:${paperDimensions.width};min-height:${paperDimensions.height};margin:12px auto;padding:15mm;background:#fff;page-break-after:always}.page:last-child{page-break-after:auto}h1{text-align:center;font-size:20px;margin:0 0 4px}header p{text-align:center;font-size:12px}.identity{display:flex;flex-wrap:wrap;gap:16px;padding:10px 0;border-bottom:2px solid #111;font-size:11px}article{position:relative;min-height:100px;margin-top:8px;border:1px solid #111}h2{margin:0;padding:6px 8px;border-bottom:1px solid #111;font-size:12px}h2 small{margin-left:10px;font-weight:400}.answer{min-height:74px;padding:10px;color:#888;font-size:10px}.mark{position:absolute;right:12px;bottom:12px;color:#d93025;font-size:14px;font-weight:700;transform:rotate(-5deg)}.mark.score{border:1px solid #d93025;padding:4px;transform:rotate(2deg)}footer{position:absolute;right:15mm;bottom:8mm;left:15mm;text-align:center;color:#666;font-size:9px}@media print{body{background:#fff}.page{margin:0}}
  </style></head><body>${pages}</body></html>`

  const safeTitle = document.paper.title.replace(/[\\/:*?"<>|]/g, '-').slice(0, 32)
  downloadText(`${safeTitle}-V${version}-批改痕迹版.html`, html, 'text/html;charset=utf-8')
}
