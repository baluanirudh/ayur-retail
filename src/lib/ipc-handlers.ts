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
import { exportInvoiceToPDF, exportDailyReportToPDF } from '../main-process/sales.pdf.service'
import { exportInvoiceToPDF, exportDailyReportToPDF, exportGSTReportToPDF } from '../main-process/sales.pdf.service'
import fs from 'fs'
import path from 'path'
import { app, dialog } from 'electron'

export function registerIpcHandlers() {
  ipcMain.handle('inventory:getAll', async (_event, filters) => {
    return getAllInventory(filters)
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
    return createBill(data)
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

}