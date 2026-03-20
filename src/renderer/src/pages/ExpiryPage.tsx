import { useState, useEffect } from 'react'
import { InventoryItem } from '../types/inventory'
import InventoryForm from '../components/InventoryForm'

type ExpiryFilter = 'expired' | '30' | '60' | '90' | 'all'

export default function ExpiryPage() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<ExpiryFilter>('30')
  const [editItem, setEditItem] = useState<InventoryItem | null>(null)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => { fetchItems() }, [])

  async function fetchItems() {
    setLoading(true)
    const data = await window.api.inventory.getAll({ isActive: true })
    setItems(data)
    setLoading(false)
  }

  const now = new Date()

  function getDaysToExpiry(expiry: string) {
    return Math.ceil((new Date(expiry).getTime() - now.getTime()) / 86400000)
  }

  const filtered = items.filter(item => {
    const days = getDaysToExpiry(item.expiry)
    if (filter === 'expired') return days < 0
    if (filter === '30') return days >= 0 && days <= 30
    if (filter === '60') return days >= 0 && days <= 60
    if (filter === '90') return days >= 0 && days <= 90
    return true
  }).sort((a, b) => getDaysToExpiry(a.expiry) - getDaysToExpiry(b.expiry))

  const counts = {
    expired: items.filter(i => getDaysToExpiry(i.expiry) < 0).length,
    '30': items.filter(i => getDaysToExpiry(i.expiry) >= 0 && getDaysToExpiry(i.expiry) <= 30).length,
    '60': items.filter(i => getDaysToExpiry(i.expiry) >= 0 && getDaysToExpiry(i.expiry) <= 60).length,
    '90': items.filter(i => getDaysToExpiry(i.expiry) >= 0 && getDaysToExpiry(i.expiry) <= 90).length,
  }

  function getRowColor(days: number) {
    if (days < 0) return 'bg-red-100 hover:bg-red-200'
    if (days <= 30) return 'bg-red-50 hover:bg-red-100'
    if (days <= 60) return 'bg-orange-50 hover:bg-orange-100'
    return 'bg-yellow-50 hover:bg-yellow-100'
  }

  function getExpiryBadge(days: number) {
    if (days < 0) return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-600 text-white">Expired {Math.abs(days)}d ago</span>
    if (days === 0) return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-500 text-white">Expires Today</span>
    if (days <= 30) return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">{days} days left</span>
    if (days <= 60) return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-700">{days} days left</span>
    return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700">{days} days left</span>
  }

  async function handleToggleStatus(item: InventoryItem) {
    await window.api.inventory.toggleStatus(item.id)
    fetchItems()
  }

  async function handleFormSubmit(data: object) {
    if (editItem) await window.api.inventory.update(editItem.id, data)
    setShowForm(false)
    setEditItem(null)
    fetchItems()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-green-700 text-white px-6 py-4 shadow">
        <h1 className="text-xl font-bold">Kottakkal Arya Vaidya Sala Wandoor</h1>
        <p className="text-green-200 text-sm">Expiry Management</p>
      </div>

      <div className="px-6 py-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          {[
            { key: 'expired', label: 'Already Expired', value: counts.expired, color: 'bg-red-600' },
            { key: '30', label: 'Expiring in 30 Days', value: counts['30'], color: 'bg-red-400' },
            { key: '60', label: 'Expiring in 60 Days', value: counts['60'], color: 'bg-orange-500' },
            { key: '90', label: 'Expiring in 90 Days', value: counts['90'], color: 'bg-yellow-500' },
          ].map(card => (
            <div
              key={card.key}
              onClick={() => setFilter(card.key as ExpiryFilter)}
              className={`${card.color} text-white rounded-xl p-4 shadow cursor-pointer transition hover:opacity-90 ${filter === card.key ? 'ring-4 ring-white ring-offset-2' : ''}`}
            >
              <p className="text-3xl font-bold">{card.value}</p>
              <p className="text-sm opacity-90 mt-1">{card.label}</p>
            </div>
          ))}
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-xl shadow p-3 mb-4 flex gap-2 items-center">
          {([
            { key: 'expired', label: 'Expired' },
            { key: '30', label: 'Within 30 days' },
            { key: '60', label: 'Within 60 days' },
            { key: '90', label: 'Within 90 days' },
            { key: 'all', label: 'All' },
          ] as { key: ExpiryFilter; label: string }[]).map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
                filter === f.key
                  ? 'bg-green-700 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
          <span className="ml-auto text-sm text-gray-500">{filtered.length} items</span>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400 bg-white rounded-xl shadow">
            No items found for this filter.
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-green-700 text-white text-xs">
                  <th className="px-4 py-3 text-left">Code</th>
                  <th className="px-4 py-3 text-left">Medicine Name</th>
                  <th className="px-4 py-3 text-left">Unit</th>
                  <th className="px-4 py-3 text-left">Stock</th>
                  <th className="px-4 py-3 text-left">Expiry Date</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Position</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, idx) => {
                  const days = getDaysToExpiry(item.expiry)
                  return (
                    <tr key={item.id} className={`border-b transition ${getRowColor(days)}`}>
                      <td className="px-4 py-2 font-mono text-xs">{item.productCode}</td>
                      <td className="px-4 py-2 font-medium">{item.medicineName}</td>
                      <td className="px-4 py-2">{item.unitQuantity}{item.unit}</td>
                      <td className="px-4 py-2 font-semibold">{item.quantity}</td>
                      <td className="px-4 py-2">
                        {new Date(item.expiry).toLocaleDateString('en-IN')}
                      </td>
                      <td className="px-4 py-2">{getExpiryBadge(days)}</td>
                      <td className="px-4 py-2">{item.itemPosition}</td>
                      <td className="px-4 py-2">
                        <div className="flex gap-2">
                          <button
                            onClick={() => { setEditItem(item); setShowForm(true) }}
                            className="text-green-600 hover:underline text-xs"
                          >Edit</button>
                          <button
                            onClick={() => handleToggleStatus(item)}
                            className="text-red-500 hover:underline text-xs"
                          >Deactivate</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && editItem && (
        <InventoryForm
          item={editItem}
          onSubmit={handleFormSubmit}
          onClose={() => { setShowForm(false); setEditItem(null) }}
        />
      )}
    </div>
  )
}