import prisma from '../lib/db'

export interface BillItemInput {
  productCode: string
  medicineName: string
  unit: string
  unitQuantity: number
  batchNumber: string
  mrp: number
  gst: number
  quantity: number
  ouncesSold: number
  discount: number
}

export interface CreateBillInput {
  customerName: string
  customerPhone: string
  paymentMode: string
  doctorName: string
  prescriptionNumber: string
  notes: string
  items: BillItemInput[]
}

function generateBillNumber(): string {
  const now = new Date()
  const date = now.toLocaleDateString('en-IN').replace(/\//g, '')
  const time = now.getTime().toString().slice(-4)
  return `KAVS-${date}-${time}`
}

export async function createBill(data: CreateBillInput) {
  const billNumber = generateBillNumber()

  let subtotal = 0
  let totalGST = 0

  const itemsWithTotals = data.items.map(item => {
    const baseAmount = item.mrp * item.quantity
    const discountAmount = (baseAmount * item.discount) / 100
    const afterDiscount = baseAmount - discountAmount
    const gstAmount = (afterDiscount * item.gst) / 100
    const totalAmount = afterDiscount

    subtotal += afterDiscount - gstAmount
    totalGST += gstAmount

    return { ...item, totalAmount }
  })

  const totalAmount = subtotal + totalGST

  const bill = await prisma.bill.create({
    data: {
      billNumber,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      paymentMode: data.paymentMode,
      doctorName: data.doctorName,
      prescriptionNumber: data.prescriptionNumber,
      subtotal,
      totalGST,
      totalAmount,
      notes: data.notes,
      items: {
        create: itemsWithTotals,
      },
    },
    include: { items: true },
  })

  for (const item of data.items) {
    const inventoryItem = await prisma.inventoryItem.findUnique({
      where: { productCode: item.productCode },
    })
    if (inventoryItem) {
      await prisma.inventoryItem.update({
        where: { productCode: item.productCode },
        data: { quantity: Math.max(0, inventoryItem.quantity - item.quantity) },
      })
      await prisma.itemHistory.create({
        data: {
          itemId: inventoryItem.id,
          action: 'SOLD',
          changes: JSON.stringify({
            billNumber,
            quantitySold: item.quantity,
            remainingStock: Math.max(0, inventoryItem.quantity - item.quantity),
          }),
        },
      })
    }
  }

  return bill
}

export async function getAllBills() {
  return prisma.bill.findMany({
    include: { items: true },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getBillById(id: number) {
  return prisma.bill.findUnique({
    where: { id },
    include: { items: true },
  })
}

export async function getDailySalesReport(date: string) {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  const end = new Date(date)
  end.setHours(23, 59, 59, 999)

  const bills = await prisma.bill.findMany({
    where: { createdAt: { gte: start, lte: end } },
    include: { items: true },
    orderBy: { createdAt: 'asc' },
  })

  const totalSales = bills.reduce((sum, b) => sum + b.totalAmount, 0)
  const totalGST = bills.reduce((sum, b) => sum + b.totalGST, 0)
  const totalBills = bills.length

  return { bills, totalSales, totalGST, totalBills, date }
}

export async function deleteBill(id: number) {
  // Restore stock
  const bill = await prisma.bill.findUnique({
    where: { id },
    include: { items: true },
  })
  if (!bill) throw new Error('Bill not found')

  for (const item of bill.items) {
    const inventoryItem = await prisma.inventoryItem.findUnique({
      where: { productCode: item.productCode },
    })
    if (inventoryItem) {
      await prisma.inventoryItem.update({
        where: { productCode: item.productCode },
        data: { quantity: inventoryItem.quantity + item.quantity },
      })
    }
  }

  await prisma.billItem.deleteMany({ where: { billId: id } })
  await prisma.bill.delete({ where: { id } })
  return { success: true }
}