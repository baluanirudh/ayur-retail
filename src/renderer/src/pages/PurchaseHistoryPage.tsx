import { useState, useEffect } from 'react'
import { Purchase } from '../types/inventory'

export default function PurchaseHistoryPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<number | null>(null)

  useEffect(() => {
    window.api.purchase.getAll().then((data: Purchase[]) => {
      setPurchases(data)
      setLoading(false)
    })
  }, [])

  const filtered = purchases.filter(p =>
    p.purchaseNumber.toLowerCase().includes(search.toLowerCase()) ||
    p.supplierName.toLowerCase().includes(search.toLowerCase()) ||
    p.invoiceNumber.toLowerCase().includes(search.toLowerCase())
  )

  async function handleDelete(id: number) {
    if (!confirm('Delete this purchase? Stock will be reversed.')) return
    try {
      await window.api.purchase.delete(id)
      setPurchases(purchases.filter(p => p.id !== id))
    } catch (err) {
      alert('Failed to delete purchase')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-green-700 text-white px-6 py-4 shadow">
        <h1 className="text-xl font-bold">Kottakkal Arya Vaidya Sala Wandoor</h1>
        <p className="text-green-200 text-sm">Purchase History</p>
      </div>

      <div className="px-6 py-4">
        <div className="flex gap-3 mb-4">
          <input
            type="text"
            placeholder="Search by PO number, supplier or invoice..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm w-96 focus:outline-none focus:ring-2 focus:ring-green-400"
          />
          <span className="ml-auto text-sm text-gray-500 self-center">{filtered.length} records</span>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400 bg-white rounded-xl shadow">
            No purchase records found.
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(purchase => (
              <div key={purchase.id} className="bg-white rounded-xl shadow overflow-hidden">
                <div
                  className="px-4 py-3 flex justify-between items-center cursor-pointer hover:bg-gray-50"
                  onClick={() => setExpanded(expanded === purchase.id ? null : purchase.id)}
                >
                  <div className="flex gap-6 items-center">
                    <div>
                      <p className="font-semibold text-green-700">{purchase.purchaseNumber}</p>
                      <p className="text-xs text-gray-400">{new Date(purchase.createdAt).toLocaleString('en-IN')}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{purchase.supplierName}</p>
                      {purchase.invoiceNumber && (
                        <p className="text-xs text-gray-400">Invoice: {purchase.invoiceNumber}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">{purchase.items.length} items</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="font-bold text-green-700">Rs.{purchase.totalAmount.toFixed(2)}</p>
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        window.api.purchase.exportPdf(purchase.id)
                          .then((f: string) => alert(`Saved: ${f}`))
                          .catch(() => alert('Failed to export PDF'))
                      }}
                      className="text-xs bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700"
                    >Print</button>
                    <button
                      onClick={e => { e.stopPropagation(); handleDelete(purchase.id) }}
                      className="text-xs bg-red-500 text-white px-3 py-1 rounded-lg hover:bg-red-600"
                    >Delete</button>
                    <span className="text-gray-400 text-xs">{expanded === purchase.id ? '▲' : '▼'}</span>
                  </div>
                </div>

                {expanded === purchase.id && (
                  <div className="border-t px-4 py-3 bg-gray-50">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-gray-500 border-b">
                          <th className="text-left py-1">Medicine</th>
                          <th className="text-left py-1">Code</th>
                          <th className="text-left py-1">Batch</th>
                          <th className="text-left py-1">Expiry</th>
                          <th className="text-left py-1">Qty</th>
                          <th className="text-left py-1">Cost Price</th>
                          <th className="text-left py-1">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {purchase.items.map(item => (
                          <tr key={item.id} className="border-b last:border-0">
                            <td className="py-1">{item.medicineName}</td>
                            <td className="py-1">{item.productCode}</td>
                            <td className="py-1">{item.batchNumber || '—'}</td>
                            <td className="py-1">{new Date(item.expiry).toLocaleDateString('en-IN')}</td>
                            <td className="py-1">{item.quantity}</td>
                            <td className="py-1">Rs.{item.costPrice.toFixed(2)}</td>
                            <td className="py-1 font-semibold">Rs.{item.totalAmount.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="flex justify-end mt-2 text-xs font-bold text-green-700">
                      Total: Rs.{purchase.totalAmount.toFixed(2)}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}