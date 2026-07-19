import { NextResponse } from "next/server"
import { readFile } from "node:fs/promises"
import { PDFDocument, StandardFonts, rgb } from "pdf-lib"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"

type InvoiceItemRow = {
  quantity: number
  selling_price: number
  total: number
  products?: { name?: string | null } | { name?: string | null }[] | null
}

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(Number(value || 0))
}

// Standard PDF fonts only support WinAnsi (Latin) characters. Strip anything
// else (Arabic, emoji, etc.) so drawText never throws and the PDF still renders.
function winAnsiSafe(value: unknown): string {
  const text = String(value ?? "")
  return text
    .replace(/\t/g, " ")
    .replace(
      /[^\u0020-\u007E\u00A0-\u00FF\u0152\u0153\u0160\u0161\u0178\u017D\u017E\u0192\u2013\u2014\u2018\u2019\u201A\u201C\u201D\u201E\u2020\u2021\u2022\u2026\u2030\u2039\u203A\u20AC\u2122\n\r]/g,
      ""
    )
}

async function getLogoBytes(logoUrl?: string | null) {
  if (logoUrl) {
    try {
      const response = await fetch(logoUrl)
      if (response.ok) {
        return new Uint8Array(await response.arrayBuffer())
      }
    } catch {
      // Ignore external logo fetch issues and fallback.
    }
  }

  const fallbackPath = process.env.COMPANY_LOGO_PATH
  if (!fallbackPath) return null

  try {
    return await readFile(fallbackPath)
  } catch {
    return null
  }
}

function getItemName(item: InvoiceItemRow) {
  if (Array.isArray(item.products)) {
    return item.products[0]?.name || "Item"
  }
  return item.products?.name || "Item"
}

async function embedLogoImage(pdfDoc: PDFDocument, logoBytes: Uint8Array) {
  try {
    return await pdfDoc.embedPng(logoBytes)
  } catch {
    try {
      return await pdfDoc.embedJpg(logoBytes)
    } catch {
      return null
    }
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const url = new URL(request.url)
    const shouldDownload = url.searchParams.get("download") === "1"
    const template = url.searchParams.get("template") === "receipt" ? "receipt" : "invoice"
    const isReceipt = template === "receipt"
    const supabase = await createClient()

    const [{ data: invoice, error: invoiceError }, { data: items }, { data: company }] =
      await Promise.all([
        supabase
          .from("invoices")
          .select("*, customers(name, phone, address, company_name)")
          .eq("id", id)
          .single(),
        supabase
          .from("invoice_items")
          .select("quantity, selling_price, total, products(name)")
          .eq("invoice_id", id),
        supabase.from("company_settings").select("*").limit(1).maybeSingle(),
      ])

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    const pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage([595, 842]) // A4
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    const drawText: typeof page.drawText = (text, options) =>
      page.drawText(winAnsiSafe(text), options)

    const colors = {
      brand: rgb(10 / 255, 89 / 255, 70 / 255),
      brandDark: rgb(8 / 255, 68 / 255, 53 / 255),
      accent: rgb(242 / 255, 249 / 255, 246 / 255),
      text: rgb(30 / 255, 41 / 255, 59 / 255),
      muted: rgb(100 / 255, 116 / 255, 139 / 255),
      border: rgb(226 / 255, 232 / 255, 240 / 255),
      rowAlt: rgb(248 / 255, 250 / 255, 252 / 255),
      soft: rgb(241 / 255, 245 / 255, 249 / 255),
    }

    const left = 36
    const right = 559
    const fullWidth = right - left

    const customer = invoice.customers as
      | { name?: string; phone?: string; address?: string; company_name?: string }
      | undefined

    const statusText =
      typeof invoice.payment_status === "string"
        ? invoice.payment_status.charAt(0).toUpperCase() +
          invoice.payment_status.slice(1)
        : "Unpaid"

    // Base background card.
    page.drawRectangle({
      x: 24,
      y: 24,
      width: 547,
      height: 794,
      borderColor: colors.border,
      borderWidth: 1,
      color: rgb(1, 1, 1),
    })

    // Decorative top stripe.
    page.drawRectangle({
      x: 24,
      y: 808,
      width: 547,
      height: 10,
      color: colors.brandDark,
    })

    // Logo and company block.
    page.drawRectangle({
      x: left,
      y: 744,
      width: fullWidth,
      height: 58,
      borderColor: colors.border,
      borderWidth: 1,
      color: rgb(1, 1, 1),
    })

    const logoBytes = await getLogoBytes(company?.logo_url)
    if (logoBytes) {
      const logo = await embedLogoImage(pdfDoc, logoBytes)
      if (logo) {
        const maxW = 110
        const maxH = 44
        const ratio = Math.min(maxW / logo.width, maxH / logo.height, 1)
        const drawWidth = logo.width * ratio
        const drawHeight = logo.height * ratio
        page.drawImage(logo, {
          x: left + 12,
          y: 751 + (44 - drawHeight) / 2,
          width: drawWidth,
          height: drawHeight,
        })
      }
    }

    const companyName = company?.company_name || "Danbiil Distributor"
    drawText(companyName, {
      x: left + 140,
      y: 779,
      size: 16,
      font: fontBold,
      color: colors.brand,
    })
    if (company?.address) {
      drawText(`${company.address}`, {
        x: left + 140,
        y: 764,
        size: 9,
        font,
        color: colors.muted,
      })
    }
    if (company?.phone) {
      drawText(`Phone: ${company.phone}`, {
        x: left + 140,
        y: 750,
        size: 9,
        font,
        color: colors.muted,
      })
    }
    if (company?.email) {
      drawText(`Email: ${company.email}`, {
        x: 410,
        y: 750,
        size: 9,
        font,
        color: colors.muted,
      })
    }

    // Main invoice banner.
    page.drawRectangle({
      x: left,
      y: 682,
      width: fullWidth,
      height: 48,
      color: colors.brandDark,
    })
    page.drawRectangle({
      x: left,
      y: 682,
      width: 150,
      height: 48,
      color: colors.brand,
    })
    drawText(isReceipt ? "RECEIPT" : "INVOICE", {
      x: left + 16,
      y: 699,
      size: 18,
      font: fontBold,
      color: colors.accent,
    })
    drawText(`${isReceipt ? "Receipt" : "Invoice"} #: ${invoice.invoice_number}`, {
      x: 350,
      y: 705,
      size: 11,
      font: fontBold,
      color: colors.accent,
    })
    drawText(`Date: ${invoice.date}`, {
      x: 350,
      y: 690,
      size: 10,
      font,
      color: colors.accent,
    })
    drawText(`${isReceipt ? "Type" : "Status"}: ${statusText}`, {
      x: 455,
      y: 690,
      size: 10,
      font,
      color: colors.accent,
    })

    // Bill-to card.
    page.drawRectangle({
      x: left,
      y: 604,
      width: 260,
      height: 62,
      borderColor: colors.border,
      borderWidth: 1,
      color: colors.soft,
    })
    drawText(isReceipt ? "Received From" : "Bill To", {
      x: left + 12,
      y: 646,
      size: 11,
      font: fontBold,
      color: colors.brand,
    })
    drawText(customer?.company_name || customer?.name || "Customer", {
      x: left + 12,
      y: 630,
      size: 11,
      font,
      color: colors.text,
    })
    if (customer?.phone) {
      drawText(`Phone: ${customer.phone}`, {
        x: left + 12,
        y: 616,
        size: 9,
        font,
        color: colors.muted,
      })
    }
    if (customer?.address) {
      drawText(`Address: ${customer.address}`, {
        x: left + 12,
        y: 603,
        size: 9,
        font,
        color: colors.muted,
      })
    }

    // Quick summary card.
    page.drawRectangle({
      x: 315,
      y: 604,
      width: 244,
      height: 62,
      borderColor: colors.border,
      borderWidth: 1,
      color: rgb(1, 1, 1),
    })
    drawText(isReceipt ? "Receipt Summary" : "Payment Summary", {
      x: 327,
      y: 646,
      size: 11,
      font: fontBold,
      color: colors.brand,
    })
    drawText(`Paid: ${money(invoice.paid_amount)}`, {
      x: 327,
      y: 628,
      size: 10,
      font,
      color: colors.text,
    })
    drawText(`Remaining: ${money(invoice.remaining_balance)}`, {
      x: 327,
      y: 612,
      size: 10,
      font,
      color: colors.text,
    })

    const startY = 570
    page.drawRectangle({
      x: left,
      y: startY,
      width: fullWidth,
      height: 26,
      color: colors.brandDark,
    })
    drawText(isReceipt ? "Description" : "Item", {
      x: left + 10,
      y: startY + 9,
      size: 10,
      font: fontBold,
      color: colors.accent,
    })
    drawText("Qty", {
      x: 318,
      y: startY + 9,
      size: 10,
      font: fontBold,
      color: colors.accent,
    })
    drawText(isReceipt ? "Amount" : "Price", {
      x: 390,
      y: startY + 9,
      size: 10,
      font: fontBold,
      color: colors.accent,
    })
    drawText(isReceipt ? "Line Total" : "Total", {
      x: 495,
      y: startY + 9,
      size: 10,
      font: fontBold,
      color: colors.accent,
    })

    let y = startY - 18
    const rows = (items ?? []) as InvoiceItemRow[]
    rows.slice(0, 12).forEach((item, index) => {
      if (index % 2 === 0) {
        page.drawRectangle({
          x: left,
          y: y - 3,
          width: fullWidth,
          height: 22,
          color: colors.rowAlt,
        })
      }
      drawText(getItemName(item), {
        x: left + 10,
        y,
        size: 10,
        font,
        color: colors.text,
      })
      drawText(String(item.quantity), {
        x: 322,
        y,
        size: 10,
        font,
        color: colors.text,
      })
      drawText(money(item.selling_price), {
        x: 390,
        y,
        size: 10,
        font,
        color: colors.text,
      })
      drawText(money(item.total), {
        x: 495,
        y,
        size: 10,
        font,
        color: colors.text,
      })
      y -= 22
    })

    const summaryTop = y - 14

    page.drawRectangle({
      x: left,
      y: summaryTop - 84,
      width: 250,
      height: 84,
      borderColor: colors.border,
      borderWidth: 1,
      color: colors.soft,
    })
    drawText(isReceipt ? "Receipt Notes" : "Notes", {
      x: left + 12,
      y: summaryTop - 16,
      size: 10,
      font: fontBold,
      color: colors.brand,
    })
    drawText(
      invoice.notes ||
        (isReceipt
          ? "This receipt confirms payment received for the invoice above."
          : "No additional notes."),
      {
      x: left + 12,
      y: summaryTop - 34,
      size: 9,
      font,
      color: colors.text,
      maxWidth: 226,
      lineHeight: 12,
    })
    if (!isReceipt && invoice.payment_terms) {
      drawText("Payment Terms", {
        x: left + 12,
        y: summaryTop - 58,
        size: 10,
        font: fontBold,
        color: colors.brand,
      })
      drawText(String(invoice.payment_terms), {
        x: left + 12,
        y: summaryTop - 72,
        size: 9,
        font,
        color: colors.text,
        maxWidth: 226,
        lineHeight: 12,
      })
    }

    page.drawRectangle({
      x: 332,
      y: summaryTop - 116,
      width: 227,
      height: 116,
      borderColor: colors.border,
      borderWidth: 1,
      color: rgb(1, 1, 1),
    })
    drawText(isReceipt ? "Invoice Total" : "Subtotal", {
      x: 344,
      y: summaryTop - 16,
      size: 10,
      font,
      color: colors.text,
    })
    drawText(money(isReceipt ? invoice.total_amount : invoice.subtotal), {
      x: 488,
      y: summaryTop - 16,
      size: 10,
      font,
      color: colors.text,
    })
    drawText(isReceipt ? "Amount Paid" : "Discount", {
      x: 344,
      y: summaryTop - 34,
      size: 10,
      font,
      color: colors.text,
    })
    drawText(money(isReceipt ? invoice.paid_amount : invoice.discount), {
      x: 488,
      y: summaryTop - 34,
      size: 10,
      font,
      color: colors.text,
    })
    drawText(isReceipt ? "Remaining" : "VAT", {
      x: 344,
      y: summaryTop - 52,
      size: 10,
      font,
      color: colors.text,
    })
    drawText(money(isReceipt ? invoice.remaining_balance : invoice.vat_amount), {
      x: 488,
      y: summaryTop - 52,
      size: 10,
      font,
      color: colors.text,
    })
    drawText(isReceipt ? "Status" : "Delivery", {
      x: 344,
      y: summaryTop - 70,
      size: 10,
      font,
      color: colors.text,
    })
    drawText(
      isReceipt ? statusText : money(invoice.delivery_cost),
      {
      x: 488,
      y: summaryTop - 70,
      size: 10,
      font,
      color: colors.text,
    })
    page.drawRectangle({
      x: 338,
      y: summaryTop - 108,
      width: 215,
      height: 24,
      color: colors.brand,
    })
    drawText(isReceipt ? "Receipt Total" : "Total", {
      x: 346,
      y: summaryTop - 98,
      size: 12,
      font: fontBold,
      color: colors.accent,
    })
    drawText(money(invoice.total_amount), {
      x: 484,
      y: summaryTop - 98,
      size: 12,
      font: fontBold,
      color: colors.accent,
    })

    page.drawRectangle({
      x: 24,
      y: 24,
      width: 547,
      height: 18,
      color: colors.brandDark,
    })
    drawText("Thank you for your business.", {
      x: left,
      y: 30,
      size: 9,
      font,
      color: colors.accent,
    })
    drawText("Generated by Danbiil Invoice Manager", {
      x: 420,
      y: 30,
      size: 8,
      font,
      color: colors.accent,
    })

    const pdfBytes = await pdfDoc.save()
    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${shouldDownload ? "attachment" : "inline"}; filename="${invoice.invoice_number}-${template}.pdf"`,
        "Cache-Control": "no-store",
      },
    })
  }  catch (error) {
    console.error("Failed to generate invoice PDF", error)
    const detail = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { error: "Failed to generate invoice PDF", detail },
      { status: 500 }
    )
  }
}
