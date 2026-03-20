export interface InventoryItem {
  id: number
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
  ounce: number | null
  expiry: string
  itemPosition: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface ItemHistory {
  id: number
  itemId: number
  action: string
  changes: string
  performedAt: string
}

export interface DashboardStats {
  total: number
  lowStock: number
  expiringSoon: number
  inactive: number
  totalInventoryValue: number
  totalMRPValue: number
}

export interface InventoryFilters {
  search?: string
  unit?: string
  isActive?: boolean
}

export const UNITS = ['ML', 'GM', 'TAB', 'CAP', 'OIL', 'PWD', 'SYP', 'NOS', 'NA']
export const GST_RATES = [0, 5, 12, 18, 28]

export interface BillItem {
  id: number
  billId: number
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
  totalAmount: number
}

export interface Bill {
  id: number
  billNumber: string
  customerName: string
  customerPhone: string
  paymentMode: string
  doctorName: string
  prescriptionNumber: string
  subtotal: number
  totalGST: number
  totalAmount: number
  notes: string
  createdAt: string
  items: BillItem[]
}

export interface DailyReport {
  bills: Bill[]
  totalSales: number
  totalGST: number
  totalBills: number
  date: string
}

export interface Supplier {
  id: number
  name: string
  phone: string
  email: string
  address: string
  gstin: string
  isActive: boolean
  createdAt: string
}

export interface PurchaseItem {
  id: number
  purchaseId: number
  productCode: string
  medicineName: string
  unit: string
  unitQuantity: number
  batchNumber: string
  expiry: string
  quantity: number
  costPrice: number
  totalAmount: number
}

export interface Purchase {
  id: number
  purchaseNumber: string
  supplierId: number
  supplierName: string
  invoiceNumber: string
  invoiceDate: string
  totalAmount: number
  notes: string
  createdAt: string
  items: PurchaseItem[]
  supplier: Supplier
}