import { NextRequest, NextResponse } from 'next/server'
import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from 'pdf-lib'
import QRCode from 'qrcode'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildPixPayload, pixKeyTypeLabel } from '@/lib/pix'
import { ORDER_STATUS } from '@/lib/orderStatus'
import type { Client, Order, OrderItem, Profile } from '@/types/database'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Paleta
const TERRACOTA = rgb(0x7c / 255, 0x4a / 255, 0x35 / 255)
const CREAM = rgb(0xfd / 255, 0xfa / 255, 0xf7 / 255)
const GRAY_900 = rgb(0.1, 0.1, 0.1)
const GRAY_600 = rgb(0.42, 0.45, 0.5)
const GRAY_400 = rgb(0.6, 0.62, 0.66)
const LINE = rgb(0.9, 0.9, 0.9)

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

function formatCurrency(value: number, currency: Profile['currency']): string {
  const locale = currency === 'EUR' ? 'pt-PT' : 'pt-BR'
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value || 0)
}

function formatDate(value: string | null): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d)
}

/** WinAnsi (Helvetica) cobre os acentos do PT-BR; troca só o que não existe. */
function safeText(text: string | null | undefined): string {
  if (!text) return ''
  return text.replace(/\u2013|\u2014/g, '-').replace(/\u2018|\u2019/g, "'").replace(/\u201c|\u201d/g, '"')
}

interface OrcamentoData {
  order: Order
  client: Client | null
  profile: Profile
  items: OrderItem[]
}

async function getOrcamento(token: string): Promise<OrcamentoData | null> {
  if (!isUuid(token)) return null
  const supabase = createAdminClient()

  const { data: order, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', token)
    .single()
  if (error || !order) return null

  const [{ data: profile }, { data: client }, { data: items }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', order.user_id).single(),
    order.client_id
      ? supabase.from('clients').select('*').eq('id', order.client_id).single()
      : Promise.resolve({ data: null }),
    supabase
      .from('order_items')
      .select('*')
      .eq('order_id', order.id)
      .order('created_at', { ascending: true }),
  ])

  if (!profile) return null

  return {
    order: order as Order,
    client: (client as Client) || null,
    profile: profile as Profile,
    items: (items as OrderItem[]) || [],
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } },
) {
  const data = await getOrcamento(params.token)
  if (!data) {
    return new NextResponse('Orçamento não encontrado.', { status: 404 })
  }

  const { order, client, profile, items } = data
  const currency = profile.currency
  const atelier = profile.business_name || 'Atelier'

  const createdAt = new Date(order.created_at)
  const validUntil = new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000)

  // ─── Documento ────────────────────────────────────────────
  const pdf = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold)

  const A4 = { w: 595.28, h: 841.89 }
  let page: PDFPage = pdf.addPage([A4.w, A4.h])
  const MARGIN = 48
  const contentW = A4.w - MARGIN * 2
  let y = A4.h

  const ensureSpace = (needed: number) => {
    if (y - needed < MARGIN + 40) {
      page = pdf.addPage([A4.w, A4.h])
      y = A4.h - MARGIN
    }
  }

  const drawText = (
    text: string,
    x: number,
    yy: number,
    opts: { size?: number; font?: PDFFont; color?: ReturnType<typeof rgb> } = {},
  ) => {
    page.drawText(safeText(text), {
      x,
      y: yy,
      size: opts.size ?? 10,
      font: opts.font ?? font,
      color: opts.color ?? GRAY_900,
    })
  }

  // Truncar texto para caber numa largura
  const truncate = (text: string, size: number, f: PDFFont, maxW: number): string => {
    let t = safeText(text)
    if (f.widthOfTextAtSize(t, size) <= maxW) return t
    while (t.length > 1 && f.widthOfTextAtSize(t + '…', size) > maxW) {
      t = t.slice(0, -1)
    }
    return t + '…'
  }

  // ─── Cabeçalho (faixa terracota) ──────────────────────────
  const headerH = 110
  page.drawRectangle({ x: 0, y: A4.h - headerH, width: A4.w, height: headerH, color: TERRACOTA })
  drawText('ORÇAMENTO', MARGIN, A4.h - 40, { size: 9, font: fontBold, color: rgb(1, 1, 1) })
  drawText(atelier, MARGIN, A4.h - 66, { size: 22, font: fontBold, color: rgb(1, 1, 1) })
  if (profile.full_name) {
    drawText(profile.full_name, MARGIN, A4.h - 84, { size: 10, color: rgb(1, 1, 1) })
  }
  // Nº e status à direita
  const status = ORDER_STATUS[order.status]
  const numText = `Nº ${order.order_number ?? ''}`
  drawText(numText, A4.w - MARGIN - font.widthOfTextAtSize(numText, 10), A4.h - 40, {
    size: 10,
    color: rgb(1, 1, 1),
  })
  const stLabel = status?.label || order.status
  drawText(stLabel, A4.w - MARGIN - font.widthOfTextAtSize(stLabel, 10), A4.h - 58, {
    size: 10,
    font: fontBold,
    color: rgb(1, 1, 1),
  })

  y = A4.h - headerH - 30

  // ─── Blocos PARA / DETALHES ───────────────────────────────
  const boxGap = 16
  const boxW = (contentW - boxGap) / 2
  const boxH = 96
  // Box Para
  page.drawRectangle({ x: MARGIN, y: y - boxH, width: boxW, height: boxH, color: CREAM, borderColor: LINE, borderWidth: 1 })
  drawText('PARA', MARGIN + 14, y - 20, { size: 8, font: fontBold, color: TERRACOTA })
  drawText(truncate(client?.name || 'Cliente', 11, fontBold, boxW - 28), MARGIN + 14, y - 40, { size: 11, font: fontBold })
  let py = y - 56
  if (client?.phone) { drawText(truncate(client.phone, 9, font, boxW - 28), MARGIN + 14, py, { size: 9, color: GRAY_600 }); py -= 14 }
  if (client?.email) { drawText(truncate(client.email, 9, font, boxW - 28), MARGIN + 14, py, { size: 9, color: GRAY_600 }); py -= 14 }

  // Box Detalhes
  const bx = MARGIN + boxW + boxGap
  page.drawRectangle({ x: bx, y: y - boxH, width: boxW, height: boxH, color: CREAM, borderColor: LINE, borderWidth: 1 })
  drawText('DETALHES', bx + 14, y - 20, { size: 8, font: fontBold, color: TERRACOTA })
  drawText(`Emitido em: ${formatDate(order.created_at)}`, bx + 14, y - 40, { size: 9, color: GRAY_600 })
  drawText(`Válido até: ${formatDate(validUntil.toISOString())}`, bx + 14, y - 54, { size: 9, color: GRAY_600 })
  if (order.delivery_date) {
    const dtxt = `Entrega: ${formatDate(order.delivery_date)}${order.delivery_time ? ` · ${order.delivery_time}` : ''}`
    drawText(dtxt, bx + 14, y - 68, { size: 9, color: GRAY_600 })
  }

  y -= boxH + 28

  // ─── Tabela de itens ──────────────────────────────────────
  drawText('ITENS', MARGIN, y, { size: 8, font: fontBold, color: TERRACOTA })
  y -= 18

  // Cabeçalho da tabela
  const colItem = MARGIN + 10
  const colQtd = MARGIN + contentW - 210
  const colUnit = MARGIN + contentW - 130
  const colSub = MARGIN + contentW - 10 // right edge
  const rowH = 22

  page.drawRectangle({ x: MARGIN, y: y - rowH + 6, width: contentW, height: rowH, color: CREAM })
  drawText('Item', colItem, y - 8, { size: 8, font: fontBold, color: GRAY_600 })
  drawText('Qtd.', colQtd, y - 8, { size: 8, font: fontBold, color: GRAY_600 })
  drawText('Valor unit.', colUnit, y - 8, { size: 8, font: fontBold, color: GRAY_600 })
  const subHead = 'Subtotal'
  drawText(subHead, colSub - font.widthOfTextAtSize(subHead, 8), y - 8, { size: 8, font: fontBold, color: GRAY_600 })
  y -= rowH + 2

  if (items.length === 0) {
    drawText('Nenhum item.', colItem, y - 8, { size: 9, color: GRAY_400 })
    y -= rowH
  } else {
    for (const item of items) {
      ensureSpace(rowH + 4)
      const nameMaxW = colQtd - colItem - 10
      drawText(truncate(item.name, 10, font, nameMaxW), colItem, y - 8, { size: 10, color: GRAY_900 })
      if (item.notes) {
        drawText(truncate(item.notes, 8, font, nameMaxW), colItem, y - 19, { size: 8, color: GRAY_400 })
      }
      drawText(String(item.quantity), colQtd, y - 8, { size: 10, color: GRAY_600 })
      drawText(formatCurrency(item.unit_price, currency), colUnit, y - 8, { size: 10, color: GRAY_600 })
      const subTxt = formatCurrency(item.subtotal, currency)
      drawText(subTxt, colSub - font.widthOfTextAtSize(subTxt, 10), y - 8, { size: 10, font: fontBold, color: GRAY_900 })
      const extra = item.notes ? 11 : 0
      y -= rowH + extra
      page.drawLine({ start: { x: MARGIN, y: y + 4 }, end: { x: MARGIN + contentW, y: y + 4 }, thickness: 0.5, color: LINE })
    }
  }

  // ─── Totais ───────────────────────────────────────────────
  y -= 12
  ensureSpace(80)
  const totLabelX = MARGIN + contentW - 200
  const totValRight = MARGIN + contentW - 10
  const totRow = (label: string, value: string, bold = false, color = GRAY_600) => {
    drawText(label, totLabelX, y, { size: bold ? 12 : 10, font: bold ? fontBold : font, color: bold ? TERRACOTA : color })
    const f = bold ? fontBold : font
    const size = bold ? 12 : 10
    drawText(value, totValRight - f.widthOfTextAtSize(value, size), y, { size, font: f, color: bold ? TERRACOTA : color })
    y -= bold ? 20 : 16
  }
  totRow('Subtotal', formatCurrency(order.subtotal, currency))
  if (order.discount > 0) totRow('Desconto', `- ${formatCurrency(order.discount, currency)}`)
  page.drawLine({ start: { x: totLabelX, y: y + 6 }, end: { x: totValRight, y: y + 6 }, thickness: 0.5, color: LINE })
  y -= 6
  totRow('TOTAL', formatCurrency(order.total, currency), true)
  if (order.paid_amount > 0) {
    totRow('Pago', formatCurrency(order.paid_amount, currency))
    totRow('Restante', formatCurrency(Math.max(order.total - order.paid_amount, 0), currency), false, GRAY_900)
  }

  // ─── Como pagar ───────────────────────────────────────────
  let pixPayload: string | null = null
  let qrImage: Awaited<ReturnType<typeof pdf.embedPng>> | null = null
  if (currency === 'BRL' && profile.pix_key) {
    pixPayload = buildPixPayload({
      pixKey: profile.pix_key,
      merchantName: atelier,
      amount: order.total,
      txid: order.order_number ? `PED${order.order_number}` : undefined,
    })
    try {
      const dataUrl = await QRCode.toDataURL(pixPayload, { margin: 1, width: 300 })
      const pngBytes = Buffer.from(dataUrl.split(',')[1], 'base64')
      qrImage = await pdf.embedPng(pngBytes)
    } catch {
      qrImage = null
    }
  }

  const hasMbway = !!profile.mbway_phone
  const hasPayment = qrImage || hasMbway || profile.payment_instructions

  if (hasPayment) {
    y -= 24
    ensureSpace(qrImage ? 180 : 90)
    drawText('COMO PAGAR', MARGIN, y, { size: 8, font: fontBold, color: TERRACOTA })
    y -= 18

    if (qrImage) {
      const qrSize = 120
      const boxTop = y
      const panelH = qrSize + 24
      page.drawRectangle({ x: MARGIN, y: boxTop - panelH, width: contentW, height: panelH, color: CREAM, borderColor: LINE, borderWidth: 1 })
      page.drawImage(qrImage, { x: MARGIN + 14, y: boxTop - qrSize - 12, width: qrSize, height: qrSize })
      const tx = MARGIN + qrSize + 30
      const twMax = contentW - qrSize - 44
      drawText('Pague com Pix', tx, boxTop - 22, { size: 11, font: fontBold, color: GRAY_900 })
      drawText(`${pixKeyTypeLabel(profile.pix_key_type)}: ${profile.pix_key}`, tx, boxTop - 40, { size: 9, color: GRAY_600 })
      drawText('Pix Copia e Cola:', tx, boxTop - 58, { size: 8, color: GRAY_400 })
      // Quebrar payload em linhas
      if (pixPayload) {
        const chunkSize = Math.max(10, Math.floor(twMax / 4.2))
        let line = ''
        let ly = boxTop - 70
        for (let i = 0; i < pixPayload.length; i += chunkSize) {
          line = pixPayload.slice(i, i + chunkSize)
          if (ly < boxTop - panelH + 6) break
          drawText(line, tx, ly, { size: 7, color: GRAY_600 })
          ly -= 9
        }
      }
      y = boxTop - panelH - 16
    }

    if (hasMbway) {
      ensureSpace(30)
      drawText('Mbway', MARGIN, y, { size: 10, font: fontBold, color: GRAY_900 })
      y -= 14
      drawText(profile.mbway_phone || '', MARGIN, y, { size: 9, color: GRAY_600 })
      y -= 18
    }

    if (profile.payment_instructions) {
      ensureSpace(40)
      drawText('Instruções', MARGIN, y, { size: 10, font: fontBold, color: GRAY_900 })
      y -= 14
      // Quebra por largura
      const words = safeText(profile.payment_instructions).split(/\s+/)
      let line = ''
      for (const w of words) {
        const test = line ? `${line} ${w}` : w
        if (font.widthOfTextAtSize(test, 9) > contentW) {
          drawText(line, MARGIN, y, { size: 9, color: GRAY_600 })
          y -= 12
          line = w
          ensureSpace(14)
        } else {
          line = test
        }
      }
      if (line) { drawText(line, MARGIN, y, { size: 9, color: GRAY_600 }); y -= 12 }
    }
  }

  // ─── Observações ──────────────────────────────────────────
  if (order.notes) {
    y -= 16
    ensureSpace(50)
    drawText('OBSERVAÇÕES', MARGIN, y, { size: 8, font: fontBold, color: TERRACOTA })
    y -= 16
    const words = safeText(order.notes).split(/\s+/)
    let line = ''
    for (const w of words) {
      const test = line ? `${line} ${w}` : w
      if (font.widthOfTextAtSize(test, 9) > contentW) {
        drawText(line, MARGIN, y, { size: 9, color: GRAY_600 })
        y -= 12
        line = w
        ensureSpace(14)
      } else {
        line = test
      }
    }
    if (line) drawText(line, MARGIN, y, { size: 9, color: GRAY_600 })
  }

  // ─── Rodapé ───────────────────────────────────────────────
  const footerText = `Orçamento gerado por ${atelier} · Válido até ${formatDate(validUntil.toISOString())}`
  page.drawText(safeText(footerText), {
    x: MARGIN,
    y: MARGIN - 12,
    size: 8,
    font,
    color: GRAY_400,
  })

  const pdfBytes = await pdf.save()

  const url = new URL(req.url)
  const download = url.searchParams.get('download') === '1'
  const filename = `orcamento-${order.order_number ?? params.token.slice(0, 8)}.pdf`

  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
