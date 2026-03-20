import { useState, useEffect } from 'react'
import { InventoryItem } from '../types/inventory'

interface MovementRecord {
  id: number
  productCode: string
  medicineName: string
  unit: string
  action: string
  changes: string
  performedAt: string
}

export default function StockMovementPage() {
  const [records, setRecords] = useState<MovementRecord[]>([])
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [productCode, setProductCode] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0])
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState<InventoryItem[]>([])

  useEffect(() => {
    window.api.inventory.getAll({}).then(setInventory)
    fetchMovements()
  }, [])

  useEffect(() => {
    if (search.trim().length < 1) {
      setSearchResults([])
      return
    }
    const q = search.toLowerCase()
    setSearchResults(
      inventory
        .filter(i =>
          i.medicineName.toLowerCase().includes(q) ||
          i.productCode.toLowerCase().includes(q)
        )
        .slice(0, 6)
    )
  }, [search, inventory])

  async function fetchMovements() {
    setLoading(true)
    try {
      const data = await window.api.reports.stockMovement({
        productCode: productCode || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      })
      setRecords(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function selectItem(item: InventoryItem) {
    setProductCode(item.productCode)
    setSearch(item.medicineName)
    setSearchResults([])
  }

  function clearFilter() {
    setProductCode('')
    setSearch('')
    setDateFrom('')
    setDateTo(new Date().toISOString().split('T')[0])
  }

  const actionColor = (action: string) => {
    switch (action) {
      case 'CREATED': return 'bg-green-100 text-green-700'
      case 'UPDATED': return 'bg-blue-100 text-blue-700'
      case 'SOLD': return 'bg-red-100 text-red-600'
      case 'ACTIVATED': return 'bg-green-100 text-green-700'
      case 'DEACTIVATED': return 'bg-gray-100 text-gray-600'
      default: return 'bg-gray-100 text-gray-600'
    }
  }

  const actionIcon = (action: string) => {
    switch (action) {
      case 'CREATED': return '➕'
      case 'UPDATED': return '✏️'
      case 'SOLD': return '🛒'
      case 'ACTIVATED': return '✓'
      case 'DEACTIVATED': return '✗'
      default: return '•'
    }
  }

  const parseChanges = (changes: string, action: string) => {
    try {
      const data = JSON.parse(changes)
      if (action === 'SOLD') {
        return `Bill: ${data.billNumber} | Sold: ${data.quantitySold} | Remaining: ${data.remainingStock}`
      }
      if (action === 'CREATED') {
        return `MRP: Rs.${data.mrp} | Stock: ${data.quantity} | Unit: ${data.unitQuantity}${data.unit}`
      }
      if (action === 'UPDATED') {
        const keys = Object.keys(data).filter(k => !['ounce'].includes(k))
        return keys.map(k => `${k}: ${data[k]}`).join(' | ')
      }
      return JSON.stringify(data)
    } catch {
      return changes
    }
  }

  // Summary stats
  const totalSold = records.filter(r => r.action === 'SOLD').length
  const totalUpdated = records.filter(r => r.action === 'UPDATED').length
  const totalCreated = records.filter(r => r.action === 'CREATED').length

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-green-700 text-white px-6 py-4 shadow flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold">Kottakkal Arya Vaidya Sala Wandoor</h1>
          <p className="text-green-200 text-sm">Stock Movement Report</p>
        </div>
      </div>

      <div className="px-6 py-4">
        {/* Filters */}
        <div className="bg-white rounded-xl shadow p-4 mb-4">
          <h2 className="font-semibold text-green-700 mb-3">Filter</h2>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="relative">
              <label className="block text-xs text-gray-500 mb-1">Search Medicine</label>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or code..."
                className="border rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-green-400"
              />
              {searchResults.length > 0 && (
                <div className="absolute z-50 w-full bg-white border rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                  {searchResults.map(item => (
                    <div
                      key={item.productCode}
                      onClick={() => selectItem(item)}
                      className="px-3 py-2 hover:bg-green-50 cursor-pointer border-b last:border-0"
                    >
                      <p className="text-sm font-medium">{item.medicineName}</p>
                      <p className="text-xs text-gray-400">{item.productCode}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">From Date</label>
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">To Date</label>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              />
            </div>
            <button
              onClick={fetchMovements}
              className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 transition"
            >
              Apply Filter
            </button>
            <button
              onClick={() => { clearFilter(); fetchMovements() }}
              className="border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 transition"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          {[
            { label: 'Total Records', value: records.length, color: 'bg-green-700' },
            { label: 'Items Created', value: totalCreated, color: 'bg-blue-600' },
            { label: 'Items Updated', value: totalUpdated, color: 'bg-yellow-500' },
            { label: 'Sales Recorded', value: totalSold, color: 'bg-red-500' },
          ].map(card => (
            <div key={card.label} className={`${card.color} text-white rounded-xl p-4 shadow`}>
              <p className="text-2xl font-bold">{card.value}</p>
              <p className="text-sm opacity-90 mt-1">{card.label}</p>
            </div>
          ))}
        </div>

        {/* Records Table */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : records.length === 0 ? (
          <div className="text-center py-12 text-gray-400 bg-white rounded-xl shadow">
            No movement records found for the selected filter.
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-green-700 text-white text-xs">
                  <th className="px-4 py-3 text-left">Date & Time</th>
                  <th className="px-4 py-3 text-left">Product Code</th>
                  <th className="px-4 py-3 text-left">Medicine Name</th>
                  <th className="px-4 py-3 text-left">Action</th>
                  <th className="px-4 py-3 text-left">Details</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record, idx) => (
                  <tr key={record.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-2 text-xs text-gray-500">
                      {new Date(record.performedAt).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-2 font-mono text-xs">{record.productCode}</td>
                    <td className="px-4 py-2 font-medium">{record.medicineName}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${actionColor(record.action)}`}>
                        {actionIcon(record.action)} {record.action}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-600">
                      {parseChanges(record.changes, record.action)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}