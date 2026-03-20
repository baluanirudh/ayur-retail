import { useState, useEffect, useMemo } from 'react'
import { InventoryItem, InventoryFilters, UNITS, DashboardStats } from '../types/inventory'
import InventoryForm from '../components/InventoryForm'
import HistoryModal from '../components/HistoryModal'

type SortField = 'productCode' | 'medicineName' | 'unit' | 'mrp' | 'quantity' | 'expiry'
type SortDir = 'asc' | 'desc'

const PAGE_SIZES = [20, 50, 100]

export default function InventoryPage() {
  const [dashFilter, setDashFilter] = useState<'all' | 'lowStock' | 'expiringSoon' | 'inactive'>('all')
  const [expiryFilter, setExpiryFilter] = useState<'' | '30' | '60' | '90' | 'expired'>('')
  const [items, setItems] = useState<InventoryItem[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [filters, setFilters] = useState<InventoryFilters>({ isActive: true })
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<InventoryItem | null>(null)
  const [viewItem, setViewItem] = useState<InventoryItem | null>(null)
  const [historyItem, setHistoryItem] = useState<InventoryItem | null>(null)
  const [sortField, setSortField] = useState<SortField>('productCode')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [pageSize, setPageSize] = useState(20)
  const [currentPage, setCurrentPage] = useState(1)
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    window.api.onNetworkStatus((online: boolean) => setIsOnline(online))
  }, [])

  async function handleReorderPDF() {
    try {
      const filePath = await window.api.inventory.exportReorderPdf()
      alert(`Reorder list saved to: ${filePath}`)
    } catch (err) {
      alert('Failed to export reorder list')
    }
  }

  async function fetchItems() {
    setLoading(true)
    try {
      const [result, statsResult] = await Promise.all([
        window.api.inventory.getAll(filters),
        window.api.inventory.stats(),
      ])
      setItems(result)
      setStats(statsResult)
      setCurrentPage(1)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchItems() }, [filters])

  // Sorting
  const filtered = useMemo(() => {
    const now = new Date()
    return items.filter(item => {
      const daysToExpiry = Math.ceil(
        (new Date(item.expiry).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )

      if (dashFilter === 'lowStock' && item.quantity > item.minQuantity) return false
      if (dashFilter === 'expiringSoon' && daysToExpiry > 30) return false
      if (dashFilter === 'inactive' && item.isActive) return false

      if (expiryFilter === 'expired' && daysToExpiry > 0) return false
      if (expiryFilter === '30' && daysToExpiry > 30) return false
      if (expiryFilter === '60' && daysToExpiry > 60) return false
      if (expiryFilter === '90' && daysToExpiry > 90) return false

      return true
    })
  }, [items, dashFilter, expiryFilter])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let av: any = a[sortField]
      let bv: any = b[sortField]
      if (sortField === 'expiry') {
        av = new Date(av).getTime()
        bv = new Date(bv).getTime()
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [filtered, sortField, sortDir])

  // Pagination
  const totalPages = Math.ceil(sorted.length / pageSize)
  const paginated = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <span className="ml-1 opacity-30">↕</span>
    return <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  async function handleToggleStatus(item: InventoryItem) {
    await window.api.inventory.toggleStatus(item.id)
    fetchItems()
  }

  async function handleFormSubmit(data: object) {
    if (editItem) {
      await window.api.inventory.update(editItem.id, data)
    } else {
      await window.api.inventory.add(data)
    }
    setShowForm(false)
    setEditItem(null)
    fetchItems()
  }

  async function handleExportPDF() {
    try {
      const filePath = await window.api.inventory.exportPdf()
      alert(`PDF saved to: ${filePath}`)
    } catch (err) {
      alert('Failed to export PDF')
    }
  }

  async function handleTestEmail() {
    try {
      await window.api.inventory.testEmail()
      alert('Test email sent!')
    } catch (err) {
      alert('Failed to send test email')
    }
  }

  // Row color logic
  function getRowClass(item: InventoryItem, idx: number) {
    const now = new Date()
    const expiry = new Date(item.expiry)
    const daysToExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (daysToExpiry <= 30) return 'bg-red-50 hover:bg-red-100'
    if (daysToExpiry <= 90) return 'bg-yellow-50 hover:bg-yellow-100'
    if (item.quantity <= item.minQuantity) return 'bg-orange-50 hover:bg-orange-100'
    return idx % 2 === 0 ? 'bg-white hover:bg-green-50' : 'bg-gray-50 hover:bg-green-50'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-green-700 text-white px-6 py-4 flex items-center justify-between shadow">
        <div>
          <h1 className="text-xl font-bold">Kottakkal Arya Vaidya Sala Wandoor</h1>
          <p className="text-green-200 text-sm">Inventory Management</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-1 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}>
            {isOnline ? '● Online' : '● Offline'}
          </span>
          <button onClick={handleTestEmail} className="bg-green-600 border border-white text-white text-sm font-semibold px-3 py-2 rounded-lg hover:bg-green-800 transition">Test Email</button>
          <button onClick={handleExportPDF} className="bg-green-600 border border-white text-white text-sm font-semibold px-3 py-2 rounded-lg hover:bg-green-800 transition">Export PDF</button>
          <button onClick={() => { setEditItem(null); setShowForm(true) }} className="bg-white text-green-700 text-sm font-semibold px-3 py-2 rounded-lg hover:bg-green-50 transition">+ Add Item</button>
        </div>
      </div>

      {/* Dashboard Stats */}
      {stats && (
        <div className="px-6 py-4 grid grid-cols-6 gap-4">
          {[
            { key: 'all', label: 'Total Items', value: stats.total, color: 'bg-green-700' },
            { key: 'lowStock', label: 'Low Stock', value: stats.lowStock, color: 'bg-orange-500' },
            { key: 'expiringSoon', label: 'Expiring in 30 Days', value: stats.expiringSoon, color: 'bg-red-500' },
            { key: 'inactive', label: 'Inactive Items', value: stats.inactive, color: 'bg-gray-400' },
          ].map(card => (
            <div
              key={card.key}
              onClick={() => setDashFilter(card.key as any)}
              className={`${card.color} text-white rounded-xl p-4 shadow cursor-pointer transition hover:opacity-90 ${dashFilter === card.key ? 'ring-4 ring-white ring-offset-2' : ''}`}
            >
              <p className="text-3xl font-bold">{card.value}</p>
              <p className="text-sm opacity-90 mt-1">{card.label}</p>
            </div>
          ))}
          <div className="bg-blue-700 text-white rounded-xl p-4 shadow col-span-2">
            <p className="text-lg font-bold">Rs.{stats.totalInventoryValue.toFixed(0)}</p>
            <p className="text-xs opacity-90">Stock Value (Cost)</p>
            <p className="text-lg font-bold mt-1">Rs.{stats.totalMRPValue.toFixed(0)}</p>
            <p className="text-xs opacity-90">Stock Value (MRP)</p>
          </div>
        </div>
      )}

      {/* Dashboard filter clear */}
      {dashFilter !== 'all' && (
        <div className="px-6 pb-2">
          <button
            onClick={() => setDashFilter('all')}
            className="text-sm text-green-700 underline"
          >
            ✕ Clear filter: {dashFilter === 'lowStock' ? 'Low Stock' : dashFilter === 'expiringSoon' ? 'Expiring Soon' : 'Inactive'}
          </button>
        </div>
      )}

      {/* Legend */}
      <div className="px-6 pb-2 flex gap-4 text-xs">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100 border border-red-300"></span> Expiring ≤ 30 days</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-100 border border-yellow-300"></span> Expiring ≤ 90 days</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-100 border border-orange-300"></span> Low stock</span>
      </div>

      {/* Filters */}
      <div className="px-6 py-3 bg-white border-b shadow-sm flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Search code, name or position..."
          className="border rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-green-400"
          onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
        />
        <select
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
          onChange={(e) => setFilters(f => ({ ...f, unit: e.target.value || undefined }))}
        >
          <option value="">All Units</option>
          {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
        <select
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
          defaultValue="true"
          onChange={(e) => {
            const val = e.target.value
            setFilters(f => ({ ...f, isActive: val === '' ? undefined : val === 'true' }))
          }}
        >
          <option value="true">Active</option>
          <option value="false">Inactive</option>
          <option value="">All</option>
        </select>
        <select
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
          value={expiryFilter}
          onChange={(e) => setExpiryFilter(e.target.value as any)}
        >
          <option value="">All Expiry</option>
          <option value="expired">Already Expired</option>
          <option value="30">Expiring in 30 days</option>
          <option value="60">Expiring in 60 days</option>
          <option value="90">Expiring in 90 days</option>
        </select>
        <button
          onClick={handleReorderPDF}
          className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-orange-600 transition"
        >
          Reorder List PDF
        </button>  
        <select
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
          value={pageSize}
          onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1) }}
        >
          {PAGE_SIZES.map(s => <option key={s} value={s}>{s} per page</option>)}
        </select>
        <button onClick={fetchItems} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 transition">Refresh</button>
        <span className="ml-auto text-sm text-gray-500">{sorted.length} items found</span>
      </div>

      {/* Table */}
      <div className="px-6 py-4 overflow-x-auto">
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : paginated.length === 0 ? (
          <div className="text-center py-12 text-gray-400">No items found.</div>
        ) : (
          <>
            <table className="w-full bg-white rounded-xl shadow text-sm">
              <thead>
                <tr className="bg-green-700 text-white text-xs">
                  {([
                    ['productCode', 'Code'],
                    ['medicineName', 'Medicine'],
                    ['unit', 'Unit'],
                    [null, 'Unit Qty'],
                    [null, 'GST%'],
                    [null, 'Basic Price'],
                    ['mrp', 'MRP'],
                    ['quantity', 'Stock'],
                    [null, 'Ounce'],
                    [null, 'Total Ounce'],
                    ['expiry', 'Expiry'],
                    [null, 'Position'],
                    [null, 'Min Qty'],
                    [null, 'Status'],
                    [null, 'Actions'],
                  ] as [SortField | null, string][]).map(([field, label]) => (
                    <th
                      key={label}
                      className={`px-3 py-3 text-left ${field ? 'cursor-pointer hover:bg-green-800 select-none' : ''}`}
                      onClick={() => field && handleSort(field)}
                    >
                      {label}{field && <SortIcon field={field} />}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map((item, idx) => (
                  <tr key={item.id} className={`border-b transition ${getRowClass(item, idx)}`}>
                    <td className="px-3 py-2 font-mono text-xs">{item.productCode}</td>
                    <td className="px-3 py-2 font-medium">{item.medicineName}</td>
                    <td className="px-3 py-2">{item.unit}</td>
                    <td className="px-3 py-2">{item.unitQuantity}</td>
                    <td className="px-3 py-2">{item.gst}%</td>
                    <td className="px-3 py-2">Rs.{item.basicPrice.toFixed(2)}</td>
                    <td className="px-3 py-2 font-semibold">Rs.{item.mrp.toFixed(2)}</td>
                    <td className={`px-3 py-2 font-semibold ${item.quantity <= item.minQuantity ? 'text-orange-600' : ''}`}>
                      {item.quantity}
                    </td>
                    <td className="px-3 py-2">{item.ounce !== null ? item.ounce.toFixed(2) : '—'}</td>
                    <td className="px-3 py-2 font-medium text-blue-700">
                      {item.unit === 'ML' && item.ounce !== null
                        ? (item.ounce * item.quantity).toFixed(2)
                        : '—'}
                    </td>
                    <td className={`px-3 py-2 ${(() => {
                      const days = Math.ceil((new Date(item.expiry).getTime() - Date.now()) / 86400000)
                      return days <= 30 ? 'text-red-600 font-semibold' : days <= 90 ? 'text-yellow-600 font-semibold' : ''
                    })()}`}>
                      {new Date(item.expiry).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-3 py-2">{item.itemPosition}</td>
                    <td className="px-3 py-2">{item.minQuantity}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${item.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        {item.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <button onClick={() => setViewItem(item)} className="text-blue-600 hover:underline text-xs">View</button>
                        <button onClick={() => { setEditItem(item); setShowForm(true) }} className="text-green-600 hover:underline text-xs">Edit</button>
                        <button onClick={() => setHistoryItem(item)} className="text-purple-600 hover:underline text-xs">History</button>
                        <button onClick={() => handleToggleStatus(item)} className={`text-xs hover:underline ${item.isActive ? 'text-red-500' : 'text-green-500'}`}>
                          {item.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="flex justify-between items-center mt-4">
              <span className="text-sm text-gray-500">
                Page {currentPage} of {totalPages} — showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, sorted.length)} of {sorted.length}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 rounded border text-sm disabled:opacity-40 hover:bg-gray-100"
                >«</button>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 rounded border text-sm disabled:opacity-40 hover:bg-gray-100"
                >‹</button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page = Math.max(1, Math.min(currentPage - 2, totalPages - 4)) + i
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-1 rounded border text-sm ${currentPage === page ? 'bg-green-700 text-white border-green-700' : 'hover:bg-gray-100'}`}
                    >{page}</button>
                  )
                })}
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 rounded border text-sm disabled:opacity-40 hover:bg-gray-100"
                >›</button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 rounded border text-sm disabled:opacity-40 hover:bg-gray-100"
                >»</button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* View Modal */}
      {viewItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-green-700">Item Details</h2>
              <button onClick={() => setViewItem(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="space-y-2 text-sm">
              {([
                ['Product Code', viewItem.productCode],
                ['Medicine Name', viewItem.medicineName],
                ['Unit', viewItem.unit],
                ['Unit Quantity', viewItem.unitQuantity],
                ['GST', `${viewItem.gst}%`],
                ['Basic Price', `Rs.${viewItem.basicPrice}`],
                ['MRP', `Rs.${viewItem.mrp}`],
                ['Stock Quantity', viewItem.quantity],
                ['Min Quantity', viewItem.minQuantity],
                ['Ounce', viewItem.ounce ?? '—'],
                ['Expiry', new Date(viewItem.expiry).toLocaleDateString('en-IN')],
                ['Position', viewItem.itemPosition],
                ['Status', viewItem.isActive ? 'Active' : 'Inactive'],
              ] as [string, unknown][]).map(([label, value]) => (
                <div key={label} className="flex justify-between border-b pb-1">
                  <span className="text-gray-500">{label}</span>
                  <span className="font-medium">{String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <InventoryForm
          item={editItem}
          onSubmit={handleFormSubmit}
          onClose={() => { setShowForm(false); setEditItem(null) }}
        />
      )}

      {historyItem && (
        <HistoryModal
          item={historyItem}
          onClose={() => setHistoryItem(null)}
        />
      )}
    </div>
  )
}