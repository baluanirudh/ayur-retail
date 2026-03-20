import prisma from '../lib/db'

export interface InventoryFilters {
  search?: string
  unit?: string
  isActive?: boolean
}

export async function getAllInventory(filters: InventoryFilters = {}) {
  return prisma.inventoryItem.findMany({
    where: {
      isActive: filters.isActive !== undefined ? filters.isActive : undefined,
      unit: filters.unit || undefined,
      OR: filters.search ? [
        { medicineName: { contains: filters.search } },
        { productCode: { contains: filters.search } },
        { itemPosition: { contains: filters.search } },
      ] : undefined,
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getDashboardStats() {
  const allActive = await prisma.inventoryItem.findMany({
    where: { isActive: true },
    select: {
      quantity: true,
      minQuantity: true,
      expiry: true,
      basicPrice: true,
      mrp: true,
    },
  })

  const total = allActive.length
  const lowStock = allActive.filter(i => i.quantity <= i.minQuantity).length

  const thirtyDaysFromNow = new Date()
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
  const expiringSoon = allActive.filter(
    i => new Date(i.expiry) <= thirtyDaysFromNow
  ).length

  const inactive = await prisma.inventoryItem.count({ where: { isActive: false } })

  const totalInventoryValue = allActive.reduce(
    (sum, i) => sum + i.basicPrice * i.quantity, 0
  )
  const totalMRPValue = allActive.reduce(
    (sum, i) => sum + i.mrp * i.quantity, 0
  )

  return { total, lowStock, expiringSoon, inactive, totalInventoryValue, totalMRPValue }
}

export async function getInventoryById(id: number) {
  return prisma.inventoryItem.findUnique({ where: { id } })
}

export async function addInventoryItem(data: {
  productCode: string
  medicineName: string
  unit: string
  unitQuantity: number
  gst: number
  basicPrice: number
  mrp: number
  quantity: number
  minQuantity: number
  batchNumber: string
  expiry: Date
  itemPosition: string
}) {
  const ounce = data.unit === 'ML' ? data.unitQuantity / 25 : null
  const item = await prisma.inventoryItem.create({
    data: { ...data, ounce },
  })
  await prisma.itemHistory.create({
    data: {
      itemId: item.id,
      action: 'CREATED',
      changes: JSON.stringify(data),
    },
  })
  return item
}

export async function updateInventoryItem(
  id: number,
  data: Partial<{
    productCode: string
    medicineName: string
    unit: string
    unitQuantity: number
    gst: number
    basicPrice: number
    mrp: number
    quantity: number
    minQuantity: number
    batchNumber: string
    expiry: Date
    itemPosition: string
  }>
) {
  const existing = await prisma.inventoryItem.findUnique({ where: { id } })
  if (!existing) throw new Error('Item not found')
  const unit = data.unit || existing.unit
  const unitQuantity = data.unitQuantity !== undefined ? data.unitQuantity : existing.unitQuantity
  const ounce = unit === 'ML' ? unitQuantity / 25 : null
  const item = await prisma.inventoryItem.update({
    where: { id },
    data: { ...data, ounce },
  })
  await prisma.itemHistory.create({
    data: {
      itemId: id,
      action: 'UPDATED',
      changes: JSON.stringify(data),
    },
  })
  return item
}

export async function toggleInventoryStatus(id: number) {
  const item = await prisma.inventoryItem.findUnique({ where: { id } })
  if (!item) throw new Error('Item not found')
  const updated = await prisma.inventoryItem.update({
    where: { id },
    data: { isActive: !item.isActive },
  })
  await prisma.itemHistory.create({
    data: {
      itemId: id,
      action: updated.isActive ? 'ACTIVATED' : 'DEACTIVATED',
      changes: JSON.stringify({ isActive: updated.isActive }),
    },
  })
  return updated
}

export async function getItemHistory(itemId: number) {
  return prisma.itemHistory.findMany({
    where: { itemId },
    orderBy: { performedAt: 'desc' },
  })
}