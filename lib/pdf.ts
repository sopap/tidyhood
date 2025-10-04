import PDFDocument from 'pdfkit'
import { formatMoney } from './pricing'

export interface InvoiceData {
  order_id: string
  order_number: string
  created_at: string
  customer_name: string
  customer_email: string
  service_type: string
  items: Array<{
    label: string
    quantity?: number
    unit_price_cents: number
    total_cents: number
    taxable: boolean
  }>
  subtotal_cents: number
  tax_cents: number
  delivery_cents: number
  credit_cents?: number
  total_cents: number
  tax_breakdown: {
    taxable_subtotal_cents: number
    tax_exempt_subtotal_cents: number
    tax_rate: number
  }
}

/**
 * Generate PDF invoice
 * Returns a Buffer that can be streamed to the response
 */
export function generateInvoicePDF(data: InvoiceData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 50 })
    const buffers: Buffer[] = []
    
    doc.on('data', buffers.push.bind(buffers))
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(buffers)
      resolve(pdfBuffer)
    })
    doc.on('error', reject)
    
    try {
      // Header
      doc
        .fontSize(24)
        .text('TIDYHOOD', 50, 50)
        .fontSize(10)
        .text('Harlem Laundry + Home Cleaning', 50, 80)
        .text('New York, NY', 50, 95)
      
      // Invoice title and details
      doc
        .fontSize(20)
        .text('INVOICE', 400, 50, { align: 'right' })
        .fontSize(10)
        .text(`Invoice #${data.order_number}`, 400, 80, { align: 'right' })
        .text(`Date: ${new Date(data.created_at).toLocaleDateString()}`, 400, 95, { align: 'right' })
      
      // Customer info
      doc
        .fontSize(12)
        .text('Bill To:', 50, 140)
        .fontSize(10)
        .text(data.customer_name, 50, 160)
        .text(data.customer_email, 50, 175)
      
      // Service type
      doc
        .fontSize(12)
        .text('Service:', 300, 140)
        .fontSize(10)
        .text(data.service_type === 'LAUNDRY' ? 'Laundry Service' : 'Home Cleaning', 300, 160)
      
      // Line items table
      const tableTop = 230
      let y = tableTop
      
      // Table header
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('Description', 50, y)
        .text('Qty', 300, y, { width: 50, align: 'right' })
        .text('Unit Price', 360, y, { width: 80, align: 'right' })
        .text('Amount', 450, y, { width: 100, align: 'right' })
      
      doc
        .moveTo(50, y + 15)
        .lineTo(550, y + 15)
        .stroke()
      
      y += 25
      
      // Line items
      doc.font('Helvetica')
      for (const item of data.items) {
        doc
          .fontSize(9)
          .text(item.label + (item.taxable ? ' *' : ''), 50, y, { width: 240 })
          .text(item.quantity?.toString() || '-', 300, y, { width: 50, align: 'right' })
          .text(formatMoney(item.unit_price_cents), 360, y, { width: 80, align: 'right' })
          .text(formatMoney(item.total_cents), 450, y, { width: 100, align: 'right' })
        
        y += 20
      }
      
      // Separator
      y += 10
      doc
        .moveTo(50, y)
        .lineTo(550, y)
        .stroke()
      
      y += 20
      
      // Totals
      doc
        .fontSize(10)
        .text('Subtotal:', 400, y)
        .text(formatMoney(data.subtotal_cents), 450, y, { width: 100, align: 'right' })
      
      y += 20
      
      if (data.tax_cents > 0) {
        doc
          .text(`Tax (${(data.tax_breakdown.tax_rate * 100).toFixed(3)}%):`, 400, y)
          .text(formatMoney(data.tax_cents), 450, y, { width: 100, align: 'right' })
        y += 20
      }
      
      if (data.credit_cents && data.credit_cents > 0) {
        doc
          .text('Credit Applied:', 400, y)
          .text(`-${formatMoney(data.credit_cents)}`, 450, y, { width: 100, align: 'right' })
        y += 20
      }
      
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('Total:', 400, y)
        .text(formatMoney(data.total_cents - (data.credit_cents || 0)), 450, y, { width: 100, align: 'right' })
      
      // Tax breakdown
      y += 40
      doc
        .fontSize(8)
        .font('Helvetica')
        .text('Tax Breakdown:', 50, y)
      
      y += 15
      doc
        .text(`Taxable Amount: ${formatMoney(data.tax_breakdown.taxable_subtotal_cents)}`, 50, y)
      
      y += 12
      doc
        .text(`Tax-Exempt Amount: ${formatMoney(data.tax_breakdown.tax_exempt_subtotal_cents)}`, 50, y)
      
      y += 12
      doc
        .text(`Tax Rate: ${(data.tax_breakdown.tax_rate * 100).toFixed(3)}%`, 50, y)
      
      // Footer note
      if (data.tax_breakdown.tax_exempt_subtotal_cents > 0) {
        y += 20
        doc
          .fontSize(8)
          .text('* Items marked with asterisk are subject to NYC sales tax.', 50, y)
        y += 12
        doc
          .text('Laundry services are tax-exempt in New York State.', 50, y)
      }
      
      // Footer
      doc
        .fontSize(8)
        .text('Thank you for your business!', 50, 720, { align: 'center' })
        .text('Questions? Contact support@tidyhood.com', 50, 735, { align: 'center' })
      
      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}
