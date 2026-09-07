// Export a Chart.js instance as a downloadable PNG. Composites the chart
// onto a white background (Chart.js canvases are transparent) and adds a
// small footer with the site URL, so a chart shared on social still points
// home. Backing-store resolution — retina-sharp.

export function chartToPngDataUrl(chart, { source = '' } = {}) {
  const src = chart?.canvas
  if (!src || !src.width || !src.height) return null
  const dpr = window.devicePixelRatio || 1
  const footer = Math.round(30 * dpr)
  const pad = Math.round(14 * dpr)

  const out = document.createElement('canvas')
  out.width = src.width
  out.height = src.height + footer

  const ctx = out.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, out.width, out.height)
  ctx.drawImage(src, 0, 0)

  ctx.textBaseline = 'middle'
  ctx.font = `${Math.round(12 * dpr)}px system-ui, -apple-system, sans-serif`
  ctx.fillStyle = '#0a0a0a'
  ctx.textAlign = 'left'
  ctx.fillText('whywedie.org', pad, src.height + footer / 2)

  if (source) {
    ctx.fillStyle = '#737373'
    ctx.textAlign = 'right'
    ctx.font = `${Math.round(11 * dpr)}px system-ui, -apple-system, sans-serif`
    ctx.fillText(source, out.width - pad, src.height + footer / 2)
  }

  return out.toDataURL('image/png')
}

export function downloadDataUrl(filename, dataUrl) {
  if (!dataUrl) return
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename.endsWith('.png') ? filename : `${filename}.png`
  document.body.appendChild(a)
  a.click()
  a.remove()
}
