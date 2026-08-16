import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function fileStamp(): string {
  return new Date().toISOString().slice(0, 10)
}

function resolveBackground(): string {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue('--background')
    .trim()
  if (raw) return `hsl(${raw})`
  return getComputedStyle(document.body).backgroundColor || '#0a0a0b'
}

async function captureElement(el: HTMLElement): Promise<HTMLCanvasElement> {
  return html2canvas(el, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: resolveBackground(),
    logging: false,
    scrollX: 0,
    scrollY: -window.scrollY,
  })
}

export async function exportElementAsPng(
  el: HTMLElement,
  filename = `forgelog-progress-${fileStamp()}.png`
): Promise<void> {
  const canvas = await captureElement(el)
  await new Promise<void>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('PNG export failed'))
        return
      }
      downloadBlob(blob, filename)
      resolve()
    }, 'image/png')
  })
}

export async function exportElementAsPdf(
  el: HTMLElement,
  filename = `forgelog-progress-${fileStamp()}.pdf`
): Promise<void> {
  const canvas = await captureElement(el)
  const imgData = canvas.toDataURL('image/png')
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 8
  const contentWidth = pageWidth - margin * 2
  const imgHeight = (canvas.height * contentWidth) / canvas.width

  let heightLeft = imgHeight
  let position = margin

  pdf.addImage(imgData, 'PNG', margin, position, contentWidth, imgHeight)
  heightLeft -= pageHeight - margin

  while (heightLeft > 0) {
    position = margin - (imgHeight - heightLeft)
    pdf.addPage()
    pdf.addImage(imgData, 'PNG', margin, position, contentWidth, imgHeight)
    heightLeft -= pageHeight - margin
  }

  pdf.save(filename)
}
