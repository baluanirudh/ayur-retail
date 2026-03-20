import path from 'path'
import { app } from 'electron'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { getBillById, getDailySalesReport } from './sales.service'
import prisma from '../lib/db'

const autoTableFn = require('jspdf-autotable').default

export async function exportInvoiceToPDF(billId: number): Promise<string> {
  const bill = await getBillById(billId)
  if (!bill) throw new Error('Bill not found')

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  // ── Header ──────────────────────────────────────────────
  doc.setFontSize(9)
  doc.setTextColor(30)
  doc.setFont('helvetica', 'normal')
  doc.text('CASH BILL', 105, 10, { align: 'center' })

  doc.setFontSize(8)
  doc.text("Vaidvaratnam P.S. Varier's", 105, 15, { align: 'center' })

  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(22, 101, 52)
  doc.text('KOTTAKKAL ARYA VAIDYA SALA', 105, 22, { align: 'center' })

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(50)
  doc.text('Authorised Dealer, Wandoor.', 105, 27, { align: 'center' })

  doc.setFontSize(8)
  doc.setTextColor(30)
  doc.text('GST IN: 32EKRPS6948J1Z8', 15, 33)
  doc.text('Ph: 04931248158', 190, 33, { align: 'right' })

  doc.setDrawColor(22, 101, 52)
  doc.setLineWidth(0.4)
  doc.line(15, 36, 195, 36)

  // ── Bill Info ────────────────────────────────────────────
  doc.setFontSize(8)
  doc.setTextColor(30)
  doc.text(`Bill No : ${bill.billNumber}`, 15, 42)
  doc.text(`Sold to : ${bill.customerName}`, 105, 42)
  doc.text(`Date    : ${new Date(bill.createdAt).toLocaleDateString('en-IN')}`, 15, 48)
  if (bill.customerPhone) {doc.text(`Phone   : ${bill.customerPhone}`, 105, 48)}
  doc.text(`Payment : ${bill.paymentMode}`,15, 54)
  if (bill.doctorName) {doc.text(`Doctor  : ${bill.doctorName}`, 105, 54)}
  let tableStartY = 60
  if (bill.prescriptionNumber) {
    doc.text(`Rx No.  : ${bill.prescriptionNumber}`, 15, 60)
    tableStartY = 66
  }

  doc.setLineWidth(0.2)
  doc.line(15, tableStartY - 3, 195, tableStartY - 3)

  // ── Items Table ──────────────────────────────────────────
  autoTableFn(doc, {
    startY: tableStartY,
    margin: { left: 15, right: 15 },
    head: [['No.', 'Product Name', 'MRP', 'Qty', 'Discount', 'Amount']],
    body: bill.items.map((item, idx) => [
      idx + 1,
      item.medicineName,
      `Rs.${item.mrp.toFixed(2)}`,
      item.unit === 'ML' && item.ouncesSold > 0
        ? `${item.ouncesSold} oz (${item.quantity} btl)`
        : item.quantity,
      item.discount > 0 ? `${item.discount}%` : '-',
      `Rs.${item.totalAmount.toFixed(2)}`,
    ]),
    headStyles: {
      fillColor: [22, 101, 52],
      textColor: 255,
      fontSize: 7,
      fontStyle: 'bold',
      cellPadding: 2,
      halign: 'left',
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: 30,
      cellPadding: 2,
    },
    alternateRowStyles: { fillColor: [245, 255, 245] },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 85 },
      2: { cellWidth: 25 },
      3: { cellWidth: 15 },
      4: { cellWidth: 20 },
      5: { cellWidth: 25 },
    },
    showHead: 'everyPage',
  })

  const finalY = (doc as any).lastAutoTable.finalY

  // ── Totals ───────────────────────────────────────────────
  doc.setLineWidth(0.3)
  doc.line(15, finalY + 3, 195, finalY + 3)

  doc.setFontSize(8)
  doc.setTextColor(30)
  doc.setFont('helvetica', 'normal')

  if (bill.totalGST > 0) {
    doc.text('Subtotal:', 140, finalY + 9)
    doc.text(`Rs.${bill.subtotal.toFixed(2)}`, 193, finalY + 9, { align: 'right' })
    doc.text('GST:', 140, finalY + 15)
    doc.text(`Rs.${bill.totalGST.toFixed(2)}`, 193, finalY + 15, { align: 'right' })
    doc.setLineWidth(0.2)
    doc.line(135, finalY + 17, 195, finalY + 17)
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(22, 101, 52)
  const totalY = bill.totalGST > 0 ? finalY + 23 : finalY + 9
  doc.text('TOTAL :', 140, totalY)
  doc.text(`Rs.${bill.totalAmount.toFixed(2)}`, 193, totalY, { align: 'right' })

  doc.setLineWidth(0.3)
  doc.line(15, totalY + 3, 195, totalY + 3)
  doc.line(15, totalY + 5, 195, totalY + 5)

  // ── Notes ────────────────────────────────────────────────
  let notesY = totalY + 12
  if (bill.notes) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(60)
    doc.text(`Notes: ${bill.notes}`, 15, notesY)
    notesY += 7
  }

  // ── Footer ───────────────────────────────────────────────
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(60)
  doc.text('Goods once sold will not be taken back.', 15, notesY)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(22, 101, 52)
  doc.text('Thank you for your purchase!', 105, notesY + 8, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(30)
  doc.text('Pharmacist', 185, notesY + 16, { align: 'right' })

  // ── Save ─────────────────────────────────────────────────
  const outputPath = path.join(
    app.getPath('downloads'),
    `Invoice_${bill.billNumber}.pdf`
  )
  const buffer = Buffer.from(doc.output('arraybuffer'))
  require('fs').writeFileSync(outputPath, buffer)

  return outputPath
}

export async function exportDailyReportToPDF(date: string): Promise<string> {
  const report = await getDailySalesReport(date)
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  doc.setFontSize(14)
  doc.setTextColor(22, 101, 52)
  doc.text('Kottakkal Arya Vaidya Sala Wandoor - Daily Sales Report', 148, 12, { align: 'center' })
  doc.setFontSize(8)
  doc.setTextColor(80)
  doc.text(
    `Date: ${new Date(date).toLocaleDateString('en-IN')}  |  Total Bills: ${report.totalBills}  |  Total Sales: Rs.${report.totalSales.toFixed(2)}  |  Total GST: Rs.${report.totalGST.toFixed(2)}`,
    148, 19, { align: 'center' }
  )

  const rows: unknown[][] = []
  report.bills.forEach(bill => {
    bill.items.forEach((item, idx) => {
      rows.push([
        idx === 0 ? bill.billNumber : '',
        idx === 0 ? new Date(bill.createdAt).toLocaleTimeString('en-IN') : '',
        idx === 0 ? bill.customerName : '',
        item.productCode,
        item.medicineName,
        item.quantity,
        `Rs.${item.mrp.toFixed(2)}`,
        `${item.gst}%`,
        `Rs.${item.totalAmount.toFixed(2)}`,
        idx === 0 ? `Rs.${bill.totalAmount.toFixed(2)}` : '',
      ])
    })
  })

  autoTableFn(doc, {
    startY: 24,
    margin: { left: 8, right: 8 },
    head: [['Bill No', 'Time', 'Customer', 'Code', 'Medicine', 'Qty', 'MRP', 'GST%', 'Item Total', 'Bill Total']],
    body: rows,
    headStyles: { fillColor: [22, 101, 52], textColor: 255, fontSize: 6.5, fontStyle: 'bold', cellPadding: 2 },
    bodyStyles: { fontSize: 6.5, cellPadding: 1.5 },
    alternateRowStyles: { fillColor: [240, 253, 244] },
    showHead: 'everyPage',
  })

  const now = new Date()
  const dateStr = now.toLocaleDateString('en-IN').replace(/\//g, '-')
  const outputPath = path.join(app.getPath('downloads'), `Daily_Report_${dateStr}.pdf`)
  const buffer = Buffer.from(doc.output('arraybuffer'))
  require('fs').writeFileSync(outputPath, buffer)

  return outputPath
}

export async function exportGSTReportToPDF(report: any, monthName: string, year: number): Promise<string> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const autoTableFn = require('jspdf-autotable').default

  // Header
  doc.setFontSize(14)
  doc.setTextColor(22, 101, 52)
  doc.setFont('helvetica', 'bold')
  doc.text('KOTTAKKAL ARYA VAIDYA SALA', 105, 15, { align: 'center' })
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(60)
  doc.text('Authorised Dealer, Wandoor.', 105, 21, { align: 'center' })
  doc.text('GST IN: 32EKRPS6948J1Z8  |  Ph: 04931248158', 105, 26, { align: 'center' })

  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30)
  doc.text(`GST Report — ${monthName} ${year}`, 105, 34, { align: 'center' })

  doc.setDrawColor(22, 101, 52)
  doc.setLineWidth(0.4)
  doc.line(15, 37, 195, 37)

  // Summary line
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(30)
  doc.text(`Total Bills: ${report.totalBills}`, 15, 44)
  doc.text(`Total Sales: Rs.${report.totalSales.toFixed(2)}`, 70, 44)
  doc.text(`Total GST: Rs.${report.totalGST.toFixed(2)}`, 140, 44)
  doc.text(`Taxable Amount: Rs.${report.totalTaxable.toFixed(2)}`, 15, 50)
  doc.text(`Total CGST: Rs.${report.totalCGST.toFixed(2)}`, 70, 50)
  doc.text(`Total SGST: Rs.${report.totalSGST.toFixed(2)}`, 140, 50)

  // GST rate breakdown table
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30)
  doc.text('GST Rate-wise Breakdown', 15, 58)

  autoTableFn(doc, {
    startY: 61,
    margin: { left: 15, right: 15 },
    head: [['GST Rate', 'Items Sold', 'Taxable Amt', 'CGST', 'SGST', 'Total GST', 'Total Amt']],
    body: report.summary.map((row: any) => [
      `${row.rate}%`,
      row.itemCount,
      `Rs.${row.taxableAmount.toFixed(2)}`,
      `Rs.${row.cgst.toFixed(2)}`,
      `Rs.${row.sgst.toFixed(2)}`,
      `Rs.${row.totalGST.toFixed(2)}`,
      `Rs.${row.totalAmount.toFixed(2)}`,
    ]),
    foot: [[
      'TOTAL',
      report.summary.reduce((s: number, r: any) => s + r.itemCount, 0),
      `Rs.${report.totalTaxable.toFixed(2)}`,
      `Rs.${report.totalCGST.toFixed(2)}`,
      `Rs.${report.totalSGST.toFixed(2)}`,
      `Rs.${report.totalGST.toFixed(2)}`,
      `Rs.${report.totalSales.toFixed(2)}`,
    ]],
    headStyles: { fillColor: [22, 101, 52], textColor: 255, fontSize: 7, fontStyle: 'bold', cellPadding: 2 },
    bodyStyles: { fontSize: 7, cellPadding: 2 },
    footStyles: { fillColor: [240, 253, 244], textColor: 30, fontSize: 7, fontStyle: 'bold', cellPadding: 2 },
    alternateRowStyles: { fillColor: [249, 250, 251] },
  })

  const finalY = (doc as any).lastAutoTable.finalY + 8

  // Bill wise table
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30)
  doc.text('Bill-wise Summary', 15, finalY)

  autoTableFn(doc, {
    startY: finalY + 3,
    margin: { left: 15, right: 15 },
    head: [['Bill No', 'Date', 'Customer', 'Total GST', 'Total Amount']],
    body: report.bills.map((b: any) => [
      b.billNumber,
      new Date(b.date).toLocaleDateString('en-IN'),
      b.customerName,
      `Rs.${b.totalGST.toFixed(2)}`,
      `Rs.${b.totalAmount.toFixed(2)}`,
    ]),
    headStyles: { fillColor: [22, 101, 52], textColor: 255, fontSize: 7, fontStyle: 'bold', cellPadding: 2 },
    bodyStyles: { fontSize: 7, cellPadding: 1.5 },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    showHead: 'everyPage',
  })

  const outputPath = path.join(
    app.getPath('downloads'),
    `GST_Report_${monthName}_${year}.pdf`
  )
  const buffer = Buffer.from(doc.output('arraybuffer'))
  require('fs').writeFileSync(outputPath, buffer)
  return outputPath
}

export async function exportPurchaseOrderToPDF(purchaseId: number): Promise<string> {
  const purchase = await prisma.purchase.findUnique({
    where: { id: purchaseId },
    include: { items: true, supplier: true },
  })
  if (!purchase) throw new Error('Purchase not found')

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  // ── Header ──────────────────────────────────────────────
  doc.setFontSize(9)
  doc.setTextColor(30)
  doc.setFont('helvetica', 'normal')
  doc.text('PURCHASE ORDER', 105, 10, { align: 'center' })

  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(22, 101, 52)
  doc.text('KOTTAKKAL ARYA VAIDYA SALA', 105, 18, { align: 'center' })

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(50)
  doc.text('Authorised Dealer, Wandoor.', 105, 23, { align: 'center' })
  doc.text('GST IN: 32EKRPS6948J1Z8  |  Ph: 04931248158', 105, 28, { align: 'center' })

  doc.setDrawColor(22, 101, 52)
  doc.setLineWidth(0.4)
  doc.line(15, 31, 195, 31)

  // ── Purchase Info ────────────────────────────────────────
  doc.setFontSize(8)
  doc.setTextColor(30)
  doc.text(`PO Number  : ${purchase.purchaseNumber}`, 15, 38)
  doc.text(`Date       : ${new Date(purchase.createdAt).toLocaleDateString('en-IN')}`, 15, 44)
  if (purchase.invoiceNumber) {
    doc.text(`Invoice No : ${purchase.invoiceNumber}`, 15, 50)
  }

  // Supplier details on the right
  doc.text(`Supplier   : ${purchase.supplier.name}`, 105, 38)
  if (purchase.supplier.phone) {
    doc.text(`Phone      : ${purchase.supplier.phone}`, 105, 44)
  }
  if (purchase.supplier.gstin) {
    doc.text(`GSTIN      : ${purchase.supplier.gstin}`, 105, 50)
  }
  if (purchase.supplier.address) {
    doc.text(`Address    : ${purchase.supplier.address}`, 105, 56)
  }

  const tableStartY = purchase.invoiceNumber ? 56 : 50

  doc.setLineWidth(0.2)
  doc.line(15, tableStartY + 3, 195, tableStartY + 3)

  // ── Items Table ──────────────────────────────────────────
  autoTableFn(doc, {
    startY: tableStartY + 6,
    margin: { left: 15, right: 15 },
    head: [['No.', 'Product Code', 'Medicine Name', 'Unit', 'Batch No', 'Expiry', 'Qty', 'Cost Price', 'Total']],
    body: purchase.items.map((item, idx) => [
      idx + 1,
      item.productCode,
      item.medicineName,
      `${item.unitQuantity}${item.unit}`,
      item.batchNumber || '-',
      new Date(item.expiry).toLocaleDateString('en-IN'),
      item.quantity,
      `Rs.${item.costPrice.toFixed(2)}`,
      `Rs.${item.totalAmount.toFixed(2)}`,
    ]),
    headStyles: {
      fillColor: [22, 101, 52],
      textColor: 255,
      fontSize: 7,
      fontStyle: 'bold',
      cellPadding: 2,
      halign: 'left',
    },
    bodyStyles: { fontSize: 7.5, textColor: 30, cellPadding: 2 },
    alternateRowStyles: { fillColor: [245, 255, 245] },
    columnStyles: {
      0: { cellWidth: 6 },
      1: { cellWidth: 20 },
      2: { cellWidth: 55 },
      3: { cellWidth: 14 },
      4: { cellWidth: 20 },
      5: { cellWidth: 20 },
      6: { cellWidth: 10 },
      7: { cellWidth: 17 },
      8: { cellWidth: 18 },
    },
    showHead: 'everyPage',
  })

  const finalY = (doc as any).lastAutoTable.finalY

  // ── Total ────────────────────────────────────────────────
  doc.setLineWidth(0.3)
  doc.line(15, finalY + 3, 195, finalY + 3)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(22, 101, 52)
  doc.text('TOTAL AMOUNT :', 130, finalY + 10)
  doc.text(`Rs.${purchase.totalAmount.toFixed(2)}`, 193, finalY + 10, { align: 'right' })

  doc.setLineWidth(0.3)
  doc.line(15, finalY + 13, 195, finalY + 13)
  doc.line(15, finalY + 15, 195, finalY + 15)

  // ── Notes ────────────────────────────────────────────────
  if (purchase.notes) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(60)
    doc.text(`Notes: ${purchase.notes}`, 15, finalY + 22)
  }

  // ── Footer ───────────────────────────────────────────────
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(100)
  doc.text('Authorised Signatory', 170, finalY + 35, { align: 'right' })

  // ── Save ─────────────────────────────────────────────────
  const outputPath = path.join(
    app.getPath('downloads'),
    `PO_${purchase.purchaseNumber}.pdf`
  )
  const buffer = Buffer.from(doc.output('arraybuffer'))
  require('fs').writeFileSync(outputPath, buffer)
  return outputPath
}