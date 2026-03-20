import { ipcMain } from 'electron'
import prisma from '../lib/db'
import {
  getAllInventory,
  getInventoryById,
  addInventoryItem,
  updateInventoryItem,
  toggleInventoryStatus,
  getDashboardStats,
  getItemHistory,
} from '../main-process/inventory.service'
import {
  getAllSuppliers,
  addSupplier,
  updateSupplier,
  createPurchase,
  getAllPurchases,
  getPurchaseById,
  deletePurchase,
} from '../main-process/purchase.service'
import { sendOrQueueEmail } from './email-queue'
import { exportInventoryToPDF, exportReorderListToPDF } from '../main-process/pdf.service'
import { createBill, getAllBills, getBillById, getDailySalesReport, deleteBill } from '../main-process/sales.service'
import { exportInvoiceToPDF, exportDailyReportToPDF, exportGSTReportToPDF, exportPurchaseOrderToPDF } from '../main-process/sales.pdf.service'
import fs from 'fs'
import path from 'path'
import { app, dialog } from 'electron'

export function registerIpcHandlers() {
  ipcMain.handle('inventory:getAll', async (_event, filters) => {
    return getAllInventory(filters)
  })

  ipcMain.handle('purchase:exportPdf', async (_event, purchaseId) => {
    return exportPurchaseOrderToPDF(purchaseId)
  })

  ipcMain.handle('inventory:getById', async (_event, id) => {
    return getInventoryById(id)
  })

  ipcMain.handle('inventory:stats', async () => {
    return getDashboardStats()
  })

  ipcMain.handle('inventory:history', async (_event, itemId) => {
    return getItemHistory(itemId)
  })

  ipcMain.handle('inventory:add', async (_event, data) => {
    const item = await addInventoryItem(data)
    await sendOrQueueEmail({
      recipient: process.env.ALERT_EMAIL || '',
      subject: `New Item Added: ${item.medicineName}`,
      body: `
        <h2 style="color:#166534">New Inventory Item Added</h2>
        <p><b>Product Code:</b> ${item.productCode}</p>
        <p><b>Medicine:</b> ${item.medicineName}</p>
        <p><b>Unit:</b> ${item.unitQuantity} ${item.unit}</p>
        <p><b>MRP:</b> Rs.${item.mrp}</p>
        <p><b>Stock Qty:</b> ${item.quantity}</p>
        <p><b>Expiry:</b> ${new Date(item.expiry).toLocaleDateString('en-IN')}</p>
      `,
    })
    return item
  })

  ipcMain.handle('inventory:update', async (_event, { id, data }) => {
    const item = await updateInventoryItem(id, data)
    await sendOrQueueEmail({
      recipient: process.env.ALERT_EMAIL || '',
      subject: `Item Updated: ${item.medicineName}`,
      body: `
        <h2 style="color:#166534">Inventory Item Updated</h2>
        <p><b>Product Code:</b> ${item.productCode}</p>
        <p><b>Medicine:</b> ${item.medicineName}</p>
        <p><b>Updated At:</b> ${new Date(item.updatedAt).toLocaleString('en-IN')}</p>
      `,
    })
    return item
  })

  ipcMain.handle('inventory:toggleStatus', async (_event, id) => {
    return toggleInventoryStatus(id)
  })

  ipcMain.handle('inventory:exportPdf', async () => {
    return exportInventoryToPDF()
  })

  ipcMain.handle('mail:test', async () => {
    await sendOrQueueEmail({
      recipient: process.env.ALERT_EMAIL || '',
      subject: 'Ayur Retail - Email Alert Test',
      body: `<h2 style="color:#166534">Email Alerts Working!</h2><p>This is a test email from Ayur Retail.</p>`,
    })
    return 'Email sent successfully'
  })

  ipcMain.handle('inventory:exportReorderPdf', async () => {
    return exportReorderListToPDF()
  })

  ipcMain.handle('sales:createBill', async (_event, data) => {
    const bill = await createBill(data)

    // Check for low stock after sale and send alerts
    for (const item of bill.items) {
      const inventoryItem = await prisma.inventoryItem.findUnique({
        where: { productCode: item.productCode },
      })
      if (inventoryItem && inventoryItem.quantity <= inventoryItem.minQuantity) {
        await sendOrQueueEmail({
          recipient: process.env.ALERT_EMAIL || '',
          subject: `⚠️ Low Stock Alert: ${inventoryItem.medicineName}`,
          body: `
            <h2 style="color:#ea580c">Low Stock Alert</h2>
            <p><b>Medicine:</b> ${inventoryItem.medicineName}</p>
            <p><b>Product Code:</b> ${inventoryItem.productCode}</p>
            <p><b>Current Stock:</b> ${inventoryItem.quantity}</p>
            <p><b>Minimum Stock:</b> ${inventoryItem.minQuantity}</p>
            <p><b>Position:</b> ${inventoryItem.itemPosition}</p>
            <p style="color:#ea580c"><b>Please reorder this item.</b></p>
          `,
        })
      }
    }

    return bill
  })

  ipcMain.handle('sales:getAllBills', async () => {
    return getAllBills()
  })

  ipcMain.handle('sales:getBillById', async (_event, id) => {
    return getBillById(id)
  })

  ipcMain.handle('sales:getDailyReport', async (_event, date) => {
    return getDailySalesReport(date)
  })

  ipcMain.handle('sales:deleteBill', async (_event, id) => {
    return deleteBill(id)
  })

  ipcMain.handle('sales:exportInvoice', async (_event, billId) => {
    return exportInvoiceToPDF(billId)
  })

  ipcMain.handle('sales:exportDailyReport', async (_event, date) => {
    return exportDailyReportToPDF(date)
  })

  ipcMain.handle('system:backup', async () => {
    const dbPath = path.join(process.cwd(), 'prisma', 'data', 'ayur-retail.db')
    const result = await dialog.showSaveDialog({
      title: 'Save Backup',
      defaultPath: `KAVS_Backup_${new Date().toLocaleDateString('en-IN').replace(/\//g, '-')}.db`,
      filters: [{ name: 'Database', extensions: ['db'] }],
    })
    if (result.canceled || !result.filePath) return null
    fs.copyFileSync(dbPath, result.filePath)
    return result.filePath
  })

  ipcMain.handle('system:restore', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Select Backup File',
      filters: [{ name: 'Database', extensions: ['db'] }],
      properties: ['openFile'],
    })
    if (result.canceled || !result.filePaths[0]) return null
    const dbPath = path.join(process.cwd(), 'prisma', 'data', 'ayur-retail.db')
    fs.copyFileSync(result.filePaths[0], dbPath)
    return 'restored'
  })

  ipcMain.handle('reports:stockMovement', async (_event, filters) => {
    const { productCode, dateFrom, dateTo } = filters || {}

    const where: any = {}

    if (productCode) {
      const item = await prisma.inventoryItem.findUnique({
        where: { productCode },
      })
      if (item) where.itemId = item.id
    }

    if (dateFrom || dateTo) {
      where.performedAt = {}
      if (dateFrom) where.performedAt.gte = new Date(dateFrom)
      if (dateTo) {
        const end = new Date(dateTo)
        end.setHours(23, 59, 59, 999)
        where.performedAt.lte = end
      }
    }

    const history = await prisma.itemHistory.findMany({
      where,
      orderBy: { performedAt: 'desc' },
      include: { item: true },
    })

    return history.map(h => ({
      id: h.id,
      productCode: h.item.productCode,
      medicineName: h.item.medicineName,
      unit: h.item.unit,
      action: h.action,
      changes: h.changes,
      performedAt: h.performedAt,
    }))
  })

  ipcMain.handle('reports:gst', async (_event, { month, year }) => {
    const start = new Date(year, month - 1, 1)
    const end = new Date(year, month, 0, 23, 59, 59, 999)

    const bills = await prisma.bill.findMany({
      where: { createdAt: { gte: start, lte: end } },
      include: { items: true },
      orderBy: { createdAt: 'asc' },
    })

    // Group by GST rate
    const gstSummary: Record<number, {
      rate: number
      taxableAmount: number
      cgst: number
      sgst: number
      totalGST: number
      totalAmount: number
      itemCount: number
    }> = {}

    bills.forEach(bill => {
      bill.items.forEach(item => {
        const rate = item.gst
        const taxableAmount = item.totalAmount / (1 + rate / 100)
        const gstAmount = item.totalAmount - taxableAmount
        const cgst = gstAmount / 2
        const sgst = gstAmount / 2

        if (!gstSummary[rate]) {
          gstSummary[rate] = {
            rate,
            taxableAmount: 0,
            cgst: 0,
            sgst: 0,
            totalGST: 0,
            totalAmount: 0,
            itemCount: 0,
          }
        }

        gstSummary[rate].taxableAmount += taxableAmount
        gstSummary[rate].cgst += cgst
        gstSummary[rate].sgst += sgst
        gstSummary[rate].totalGST += gstAmount
        gstSummary[rate].totalAmount += item.totalAmount
        gstSummary[rate].itemCount += 1
      })
    })

    const totalTaxable = Object.values(gstSummary).reduce((s, r) => s + r.taxableAmount, 0)
    const totalCGST = Object.values(gstSummary).reduce((s, r) => s + r.cgst, 0)
    const totalSGST = Object.values(gstSummary).reduce((s, r) => s + r.sgst, 0)
    const totalGST = Object.values(gstSummary).reduce((s, r) => s + r.totalGST, 0)
    const totalSales = Object.values(gstSummary).reduce((s, r) => s + r.totalAmount, 0)
    const totalBills = bills.length

    return {
      month,
      year,
      summary: Object.values(gstSummary).sort((a, b) => a.rate - b.rate),
      totalTaxable,
      totalCGST,
      totalSGST,
      totalGST,
      totalSales,
      totalBills,
      bills: bills.map(b => ({
        billNumber: b.billNumber,
        date: b.createdAt,
        customerName: b.customerName,
        totalAmount: b.totalAmount,
        totalGST: b.totalGST,
      })),
    }
  })

  ipcMain.handle('reports:saveGSTPdf', async (_event, buffer, filename) => {
    const outputPath = path.join(app.getPath('downloads'), `${filename}.pdf`)
    fs.writeFileSync(outputPath, Buffer.from(buffer))
    return outputPath
  })

  ipcMain.handle('reports:exportGSTPdf', async (_event, { report, monthName, year }) => {
    return exportGSTReportToPDF(report, monthName, year)
  })

  ipcMain.handle('purchase:getSuppliers', async () => {
    return getAllSuppliers()
  })

  ipcMain.handle('purchase:addSupplier', async (_event, data) => {
    return addSupplier(data)
  })

  ipcMain.handle('purchase:updateSupplier', async (_event, { id, data }) => {
    return updateSupplier(id, data)
  })

  ipcMain.handle('purchase:create', async (_event, data) => {
    return createPurchase(data)
  })

  ipcMain.handle('purchase:getAll', async () => {
    return getAllPurchases()
  })

  ipcMain.handle('purchase:getById', async (_event, id) => {
    return getPurchaseById(id)
  })

  ipcMain.handle('purchase:delete', async (_event, id) => {
    return deletePurchase(id)
  })

  ipcMain.handle('reports:profit', async () => {
    const items = await prisma.inventoryItem.findMany({
      where: { isActive: true },
      orderBy: { productCode: 'asc' },
    })

    return items.map(item => {
      const profitPerUnit = item.mrp - item.basicPrice
      const profitPercent = item.basicPrice > 0
        ? ((profitPerUnit / item.basicPrice) * 100)
        : 0
      const totalStockValue = item.basicPrice * item.quantity
      const totalMRPValue = item.mrp * item.quantity
      const totalPotentialProfit = profitPerUnit * item.quantity

      return {
        id: item.id,
        productCode: item.productCode,
        medicineName: item.medicineName,
        unit: item.unit,
        unitQuantity: item.unitQuantity,
        basicPrice: item.basicPrice,
        mrp: item.mrp,
        quantity: item.quantity,
        profitPerUnit,
        profitPercent,
        totalStockValue,
        totalMRPValue,
        totalPotentialProfit,
      }
    })
  })

  ipcMain.handle('reports:exportProfitPdf', async (_event, { items }) => {
    const { jsPDF } = require('jspdf')
    const autoTable = require('jspdf-autotable').default
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

    doc.setFontSize(14)
    doc.setTextColor(22, 101, 52)
    doc.setFont('helvetica', 'bold')
    doc.text('KOTTAKKAL ARYA VAIDYA SALA WANDOOR', 148, 12, { align: 'center' })
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(60)
    doc.text(`Profit Report — Generated: ${new Date().toLocaleString('en-IN')}`, 148, 18, { align: 'center' })

    const totalProfit = items.reduce((s: number, i: any) => s + i.totalPotentialProfit, 0)
    const totalStock = items.reduce((s: number, i: any) => s + i.totalStockValue, 0)
    doc.setFontSize(8)
    doc.setTextColor(30)
    doc.text(`Total Items: ${items.length}  |  Total Stock Value: Rs.${totalStock.toFixed(2)}  |  Total Potential Profit: Rs.${totalProfit.toFixed(2)}`, 148, 24, { align: 'center' })

    autoTable(doc, {
      startY: 28,
      margin: { left: 8, right: 8 },
      head: [['Code', 'Medicine Name', 'Unit', 'Stock', 'Cost Price', 'MRP', 'Profit/Unit', 'Margin %', 'Stock Value', 'Total Profit']],
      body: items.map((item: any) => [
        item.productCode,
        item.medicineName,
        `${item.unitQuantity}${item.unit}`,
        item.quantity,
        `Rs.${item.basicPrice.toFixed(2)}`,
        `Rs.${item.mrp.toFixed(2)}`,
        `Rs.${item.profitPerUnit.toFixed(2)}`,
        `${item.profitPercent.toFixed(1)}%`,
        `Rs.${item.totalStockValue.toFixed(2)}`,
        `Rs.${item.totalPotentialProfit.toFixed(2)}`,
      ]),
      foot: [[
        '', 'TOTAL', '', items.reduce((s: number, i: any) => s + i.quantity, 0), '', '', '', '',
        `Rs.${totalStock.toFixed(2)}`,
        `Rs.${totalProfit.toFixed(2)}`,
      ]],
      headStyles: { fillColor: [22, 101, 52], textColor: 255, fontSize: 6.5, fontStyle: 'bold', cellPadding: 2 },
      bodyStyles: { fontSize: 6.5, cellPadding: 1.5 },
      footStyles: { fillColor: [240, 253, 244], textColor: 30, fontSize: 7, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      showHead: 'everyPage',
    })

    const outputPath = path.join(
      app.getPath('downloads'),
      `Profit_Report_${new Date().toLocaleDateString('en-IN').replace(/\//g, '-')}.pdf`
    )
    fs.writeFileSync(outputPath, Buffer.from(doc.output('arraybuffer')))
    return outputPath
  })

  ipcMain.handle('auth:getPin', async () => {
    const setting = await prisma.appSettings.findUnique({
      where: { key: 'pin' }
    })
    return setting?.value || null
  })

  ipcMain.handle('auth:setPin', async (_event, pin: string) => {
    await prisma.appSettings.upsert({
      where: { key: 'pin' },
      update: { value: pin },
      create: { key: 'pin', value: pin },
    })
    return true
  })

  ipcMain.handle('auth:verifyPin', async (_event, pin: string) => {
    const setting = await prisma.appSettings.findUnique({
      where: { key: 'pin' }
    })
    if (!setting) return true // no pin set, allow access
    return setting.value === pin
  })

  ipcMain.handle('auth:removePin', async () => {
    await prisma.appSettings.deleteMany({
      where: { key: 'pin' }
    })
    return true
  })

}