import path from 'path'
import { app } from 'electron'
import prisma from '../lib/db'
import { jsPDF } from 'jspdf'
const autoTable = require('jspdf-autotable').default

export async function exportInventoryToPDF(): Promise<string> {
  const items = await prisma.inventoryItem.findMany({
    where: { isActive: true },
    orderBy: { productCode: 'asc' },
  })

  const now = new Date()
  const dateStr = now.toLocaleDateString('en-IN').replace(/\//g, '-')
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }).replace(':', '-')
  const outputPath = path.join(
    app.getPath('downloads'),
    `Inventory_Report_${dateStr}_${timeStr}.pdf`
  )

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  // Title
  doc.setFontSize(14)
  doc.setTextColor(22, 101, 52)
  doc.text('Kottakkal Arya Vaidya Sala Wandoor - Inventory Report', 148, 12, { align: 'center' })

  doc.setFontSize(8)
  doc.setTextColor(100)
  doc.text(
    `Generated: ${new Date().toLocaleString('en-IN')}  |  Total Items: ${items.length}`,
    148, 18, { align: 'center' }
  )

  // Table
  autoTable(doc, {
    startY: 22,
    margin: { left: 8, right: 8 },
    head: [[
      'Code', 'Medicine Name', 'Unit', 'Unit Qty',
      'GST%', 'Basic Price', 'MRP', 'Stock',
      'Ounce', 'Expiry', 'Position', 'Status'
    ]],
    body: items.map(item => [
      item.productCode,
      item.medicineName,
      item.unit,
      item.unitQuantity,
      `${item.gst}%`,
      `Rs.${item.basicPrice.toFixed(2)}`,
      `Rs.${item.mrp.toFixed(2)}`,
      item.quantity,
      item.ounce !== null ? item.ounce.toFixed(2) : '-',
      new Date(item.expiry).toLocaleDateString('en-IN'),
      item.itemPosition,
      item.isActive ? 'Active' : 'Inactive',
    ]),
    headStyles: {
      fillColor: [22, 101, 52],
      textColor: 255,
      fontSize: 6.5,
      fontStyle: 'bold',
      halign: 'left',
      cellPadding: 2,
    },
    bodyStyles: {
      fontSize: 6.5,
      textColor: 30,
      cellPadding: 1.5,
    },
    alternateRowStyles: {
      fillColor: [240, 253, 244],
    },
    columnStyles: {
      0: { cellWidth: 18 },
      1: { cellWidth: 42 },
      2: { cellWidth: 12 },
      3: { cellWidth: 14 },
      4: { cellWidth: 10 },
      5: { cellWidth: 20 },
      6: { cellWidth: 18 },
      7: { cellWidth: 12 },
      8: { cellWidth: 14 },
      9: { cellWidth: 20 },
      10: { cellWidth: 18 },
      11: { cellWidth: 16 },
    },
    didParseCell: (data: import('jspdf-autotable').CellHookData) => {
      if (data.section === 'body' && data.column.index === 11) {
        const val = data.cell.raw as string
        data.cell.styles.textColor = val === 'Active' ? [22, 101, 52] : [220, 38, 38]
      }
    },
    showHead: 'everyPage',
  })

  const buffer = Buffer.from(doc.output('arraybuffer'))
  require('fs').writeFileSync(outputPath, buffer)

  return outputPath
}

export async function exportReorderListToPDF(): Promise<string> {
  const items = await prisma.inventoryItem.findMany({
    where: {
      isActive: true,
    },
    orderBy: { productCode: 'asc' },
  })

  const lowStockItems = items.filter(i => i.quantity <= i.minQuantity)

  const now = new Date()
  const dateStr = now.toLocaleDateString('en-IN').replace(/\//g, '-')
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }).replace(':', '-')
  const outputPath = path.join(
    app.getPath('downloads'),
    `Reorder_List_${dateStr}_${timeStr}.pdf`
  )

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  doc.setFontSize(14)
  doc.setTextColor(22, 101, 52)
  doc.text('Kottakkal Arya Vaidya Sala Wandoor - Reorder List', 148, 12, { align: 'center' })

  doc.setFontSize(8)
  doc.setTextColor(100)
  doc.text(
    `Generated: ${new Date().toLocaleString('en-IN')}  |  Items to reorder: ${lowStockItems.length}`,
    148, 18, { align: 'center' }
  )

  autoTable(doc, {
    startY: 22,
    margin: { left: 8, right: 8 },
    head: [[
      'Code', 'Medicine Name', 'Unit', 'Unit Qty',
      'Current Stock', 'Min Stock', 'Shortage',
      'Basic Price', 'Position', 'Batch No'
    ]],
    body: lowStockItems.map(item => [
      item.productCode,
      item.medicineName,
      item.unit,
      item.unitQuantity,
      item.quantity,
      item.minQuantity,
      Math.max(0, item.minQuantity - item.quantity),
      `Rs.${item.basicPrice.toFixed(2)}`,
      item.itemPosition,
      item.batchNumber || '-',
    ]),
    headStyles: {
      fillColor: [234, 88, 12],
      textColor: 255,
      fontSize: 6.5,
      fontStyle: 'bold',
      halign: 'left',
      cellPadding: 2,
    },
    bodyStyles: {
      fontSize: 6.5,
      textColor: 30,
      cellPadding: 1.5,
    },
    alternateRowStyles: {
      fillColor: [255, 247, 237],
    },
    columnStyles: {
      0: { cellWidth: 18 },
      1: { cellWidth: 50 },
      2: { cellWidth: 12 },
      3: { cellWidth: 14 },
      4: { cellWidth: 20 },
      5: { cellWidth: 18 },
      6: { cellWidth: 18 },
      7: { cellWidth: 22 },
      8: { cellWidth: 20 },
      9: { cellWidth: 20 },
    },
    showHead: 'everyPage',
  })

  const buffer = Buffer.from(doc.output('arraybuffer'))
  require('fs').writeFileSync(outputPath, buffer)

  return outputPath
}