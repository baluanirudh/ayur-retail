import { useState, useEffect, useMemo } from 'react'

interface ProfitItem {
  id: number
  productCode: string
  medicineName: string
  unit: string
  unitQuantity: number
  basicPrice: number
  mrp: number
  quantity: number
  profitPerUnit: number
  profitPercent: number
  totalStockValue: number
  totalMRPValue: number
  totalPotentialProfit: number
}

type SortField = 'profitPercent' | 'profitPerUnit' | 'totalPotentialProfit' | 'medicineName' | 'quantity'
type SortDir = 'asc' | 'desc'

export default function ProfitReportPage() {
  const [items, setItems] = useState<ProfitItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<SortField>('totalPotentialProfit')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [minProfit, setMinProfit] = useState('')

  useEffect(() => {
    window.api.reports.profit().then((data: ProfitItem[]) => {
      setItems(data)
      setLoading(false)
    })
  }, [])

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <span className="ml-1 opacity-30">↕</span>
    return <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  const filtered = useMemo(() => {
    return items
      .filter(item => {
        const q = search.toLowerCase()
        const matchSearch = item.medicineName.toLowerCase().includes(q) ||
          item.productCode.toLowerCase().includes(q)
        const matchProfit = minProfit ? item.profitPercent >= Number(minProfit) : true
        return matchSearch && matchProfit
      })
      .sort((a, b) => {
        const av = a[sortField]
        const bv = b[sortField]
        if (av < bv) return sortDir === 'asc' ? -1 : 1
        if (av > bv) return sortDir === 'asc' ? 1 : -1
        return 0
      })
  }, [items, search, sortField, sortDir, minProfit])

  const totalStockValue = filtered.reduce((s, i) => s + i.totalStockValue, 0)
  const totalMRPValue = filtered.reduce((s, i) => s + i.totalMRPValue, 0)
  const totalPotentialProfit = filtered.reduce((s, i) => s + i.totalPotentialProfit, 0)
  const avgProfitPercent = filtered.length > 0
    ? filtered.reduce((s, i) => s + i.profitPercent, 0) / filtered.length
    : 0

  function getProfitColor(percent: number) {
    if (percent >= 30) return 'text-green-700 font-bold'
    if (percent >= 15) return 'text-blue-600 font-semibold'
    if (percent >= 5) return 'text-yellow-600'
    return 'text-red-500'
  }

  async function handleExportPDF() {
    try {
      const filePath = await window.api.reports.exportProfitPdf({ items: filtered })
      alert(`Profit report saved to: ${filePath}`)
    } catch (err) {
      alert('Failed to export profit report')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-green-700 text-white px-6 py-4 shadow flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold">Kottakkal Arya Vaidya Sala Wandoor</h1>
          <p className="text-green-200 text-sm">Profit Report</p>
        </div>
        <button
          onClick={handleExportPDF}
          className="bg-white text-green-700 font-semibold px-4 py-2 rounded-lg hover:bg-green-50 transition"
        >
          Export PDF
        </button>
      </div>

      <div className="px-6 py-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          {[
            { label: 'Total Items', value: filtered.length, color: 'bg-green-700', prefix: '' },
            { label: 'Stock Value (Cost)', value: totalStockValue.toFixed(0), color: 'bg-blue-600', prefix: 'Rs.' },
            { label: 'Stock Value (MRP)', value: totalMRPValue.toFixed(0), color: 'bg-purple-600', prefix: 'Rs.' },
            { label: 'Potential Profit', value: totalPotentialProfit.toFixed(0), color: 'bg-orange-500', prefix: 'Rs.' },
          ].map(card => (
            <div key={card.label} className={`${card.color} text-white rounded-xl p-4 shadow`}>
              <p className="text-2xl font-bold">{card.prefix}{card.value}</p>
              <p className="text-sm opacity-90 mt-1">{card.label}</p>
            </div>
          ))}
        </div>

        {/* Avg profit banner */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4 flex items-center gap-4">
          <span className="text-sm text-green-700 font-semibold">
            Average Profit Margin: {avgProfitPercent.toFixed(1)}%
          </span>
          <span className="text-xs text-gray-500">across {filtered.length} items</span>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow p-3 mb-4 flex gap-3 items-center flex-wrap">
          <input
            type="text"
            placeholder="Search medicine or code..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-green-400"
          />
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">Min Profit %:</label>
            <input
              type="number"
              value={minProfit}
              onChange={e => setMinProfit(e.target.value)}
              placeholder="e.g. 20"
              className="border rounded-lg px-3 py-2 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>
          <span className="ml-auto text-sm text-gray-500">{filtered.length} items</span>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-green-700 text-white text-xs">
                  <th className="px-4 py-3 text-left">Code</th>
                  <th
                    className="px-4 py-3 text-left cursor-pointer hover:bg-green-800 select-none"
                    onClick={() => handleSort('medicineName')}
                  >
                    Medicine<SortIcon field="medicineName" />
                  </th>
                  <th className="px-4 py-3 text-left">Unit</th>
                  <th
                    className="px-4 py-3 text-left cursor-pointer hover:bg-green-800 select-none"
                    onClick={() => handleSort('quantity')}
                  >
                    Stock<SortIcon field="quantity" />
                  </th>
                  <th className="px-4 py-3 text-left">Cost Price</th>
                  <th className="px-4 py-3 text-left">MRP</th>
                  <th
                    className="px-4 py-3 text-left cursor-pointer hover:bg-green-800 select-none"
                    onClick={() => handleSort('profitPerUnit')}
                  >
                    Profit/Unit<SortIcon field="profitPerUnit" />
                  </th>
                  <th
                    className="px-4 py-3 text-left cursor-pointer hover:bg-green-800 select-none"
                    onClick={() => handleSort('profitPercent')}
                  >
                    Margin %<SortIcon field="profitPercent" />
                  </th>
                  <th className="px-4 py-3 text-left">Stock Value</th>
                  <th
                    className="px-4 py-3 text-left cursor-pointer hover:bg-green-800 select-none"
                    onClick={() => handleSort('totalPotentialProfit')}
                  >
                    Total Profit<SortIcon field="totalPotentialProfit" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, idx) => (
                  <tr key={item.id} className={`border-b transition ${idx % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50 hover:bg-gray-100'}`}>
                    <td className="px-4 py-2 font-mono text-xs">{item.productCode}</td>
                    <td className="px-4 py-2 font-medium">{item.medicineName}</td>
                    <td className="px-4 py-2 text-xs">{item.unitQuantity}{item.unit}</td>
                    <td className="px-4 py-2">{item.quantity}</td>
                    <td className="px-4 py-2">Rs.{item.basicPrice.toFixed(2)}</td>
                    <td className="px-4 py-2 font-semibold">Rs.{item.mrp.toFixed(2)}</td>
                    <td className={`px-4 py-2 ${getProfitColor(item.profitPercent)}`}>
                      Rs.{item.profitPerUnit.toFixed(2)}
                    </td>
                    <td className={`px-4 py-2 ${getProfitColor(item.profitPercent)}`}>
                      {item.profitPercent.toFixed(1)}%
                    </td>
                    <td className="px-4 py-2 text-blue-700">Rs.{item.totalStockValue.toFixed(2)}</td>
                    <td className="px-4 py-2 font-semibold text-green-700">
                      Rs.{item.totalPotentialProfit.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-green-50 font-bold border-t-2 border-green-200 text-sm">
                  <td colSpan={8} className="px-4 py-2 text-right text-green-700">Totals:</td>
                  <td className="px-4 py-2 text-blue-700">Rs.{totalStockValue.toFixed(2)}</td>
                  <td className="px-4 py-2 text-green-700">Rs.{totalPotentialProfit.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}