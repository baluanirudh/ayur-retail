import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  sales: {
    createBill: (data: object) => ipcRenderer.invoke('sales:createBill', data),
    getAllBills: () => ipcRenderer.invoke('sales:getAllBills'),
    getBillById: (id: number) => ipcRenderer.invoke('sales:getBillById', id),
    getDailyReport: (date: string) => ipcRenderer.invoke('sales:getDailyReport', date),
    deleteBill: (id: number) => ipcRenderer.invoke('sales:deleteBill', id),
    exportInvoice: (billId: number) => ipcRenderer.invoke('sales:exportInvoice', billId),
    exportDailyReport: (date: string) => ipcRenderer.invoke('sales:exportDailyReport', date),
  },
  inventory: {
    getAll: (filters?: object) => ipcRenderer.invoke('inventory:getAll', filters),
    getById: (id: number) => ipcRenderer.invoke('inventory:getById', id),
    add: (data: object) => ipcRenderer.invoke('inventory:add', data),
    update: (id: number, data: object) => ipcRenderer.invoke('inventory:update', { id, data }),
    toggleStatus: (id: number) => ipcRenderer.invoke('inventory:toggleStatus', id),
    exportPdf: () => ipcRenderer.invoke('inventory:exportPdf'),
    testEmail: () => ipcRenderer.invoke('mail:test'),
    stats: () => ipcRenderer.invoke('inventory:stats'),
    history: (itemId: number) => ipcRenderer.invoke('inventory:history', itemId),
    exportReorderPdf: () => ipcRenderer.invoke('inventory:exportReorderPdf'),
  },
  system: {
    backup: () => ipcRenderer.invoke('system:backup'),
    restore: () => ipcRenderer.invoke('system:restore'),
  },
  reports: {
    stockMovement: (filters?: object) => ipcRenderer.invoke('reports:stockMovement', filters),
    gst: (filters: object) => ipcRenderer.invoke('reports:gst', filters),
    exportGSTPdf: (data: object) => ipcRenderer.invoke('reports:exportGSTPdf', data),
  },
  purchase: {
    getSuppliers: () => ipcRenderer.invoke('purchase:getSuppliers'),
    addSupplier: (data: object) => ipcRenderer.invoke('purchase:addSupplier', data),
    updateSupplier: (id: number, data: object) => ipcRenderer.invoke('purchase:updateSupplier', { id, data }),
    create: (data: object) => ipcRenderer.invoke('purchase:create', data),
    getAll: () => ipcRenderer.invoke('purchase:getAll'),
    getById: (id: number) => ipcRenderer.invoke('purchase:getById', id),
    delete: (id: number) => ipcRenderer.invoke('purchase:delete', id),
  },
  onNetworkStatus: (callback: (isOnline: boolean) => void) => {
    ipcRenderer.on('network-status-changed', (_event, isOnline) => callback(isOnline))
  },
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.electron = electronAPI
  // @ts-ignore
  window.api = api
}