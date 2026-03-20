import prisma from '../lib/db'

export async function getAllSuppliers() {
  return prisma.supplier.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  })
}

export async function addSupplier(data: {
  name: string
  phone: string
  email: string
  address: string
  gstin: string
}) {
  return prisma.supplier.create({ data })
}

export async function updateSupplier(id: number, data: Partial<{
  name: string
  phone: string
  email: string
  address: string
  gstin: string
  isActive: boolean
}>) {
  return prisma.supplier.update({ where: { id }, data })
}

function generatePurchaseNumber(): string {
  const now = new Date()
  const date = now.toLocaleDateString('en-IN').replace(/\//g, '')
  const time = now.getTime().toString().slice(-4)
  return `PO-${date}-${time}`
}

export async function createPurchase(data: {
  supplierId: number
  supplierName: string
  invoiceNumber: string
  invoiceDate: Date
  notes: string
  items: {
    productCode: string
    medicineName: string
    unit: string
    unitQuantity: number
    batchNumber: string
    expiry: Date
    quantity: number
    costPrice: number
  }[]
}) {
  const purchaseNumber = generatePurchaseNumber()

  const itemsWithTotals = data.items.map(item => ({
    ...item,
    totalAmount: item.quantity * item.costPrice,
  }))

  const totalAmount = itemsWithTotals.reduce((s, i) => s + i.totalAmount, 0)

  const purchase = await prisma.purchase.create({
    data: {
      purchaseNumber,
      supplierId: data.supplierId,
      supplierName: data.supplierName,
      invoiceNumber: data.invoiceNumber,
      invoiceDate: data.invoiceDate,
      totalAmount,
      notes: data.notes,
      items: { create: itemsWithTotals },
    },
    include: { items: true },
  })

  // Update inventory stock for each item
  for (const item of data.items) {
    const existing = await prisma.inventoryItem.findUnique({
      where: { productCode: item.productCode },
    })
    if (existing) {
      await prisma.inventoryItem.update({
        where: { productCode: item.productCode },
        data: {
          quantity: existing.quantity + item.quantity,
          batchNumber: item.batchNumber || existing.batchNumber,
          expiry: item.expiry,
        },
      })
      await prisma.itemHistory.create({
        data: {
          itemId: existing.id,
          action: 'PURCHASED',
          changes: JSON.stringify({
            purchaseNumber,
            supplierName: data.supplierName,
            quantityAdded: item.quantity,
            newStock: existing.quantity + item.quantity,
            costPrice: item.costPrice,
            batchNumber: item.batchNumber,
          }),
        },
      })
    }
  }

  return purchase
}

export async function getAllPurchases() {
  return prisma.purchase.findMany({
    include: { items: true, supplier: true },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getPurchaseById(id: number) {
  return prisma.purchase.findUnique({
    where: { id },
    include: { items: true, supplier: true },
  })
}

export async function deletePurchase(id: number) {
  const purchase = await prisma.purchase.findUnique({
    where: { id },
    include: { items: true },
  })
  if (!purchase) throw new Error('Purchase not found')

  // Reverse stock update
  for (const item of purchase.items) {
    const existing = await prisma.inventoryItem.findUnique({
      where: { productCode: item.productCode },
    })
    if (existing) {
      await prisma.inventoryItem.update({
        where: { productCode: item.productCode },
        data: { quantity: Math.max(0, existing.quantity - item.quantity) },
      })
    }
  }

  await prisma.purchaseItem.deleteMany({ where: { purchaseId: id } })
  await prisma.purchase.delete({ where: { id } })
  return { success: true }
}