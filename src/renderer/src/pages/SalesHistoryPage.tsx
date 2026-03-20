import { useState, useEffect } from 'react'
import { Bill } from '../types/inventory'

export default function SalesHistoryPage() {
  const [bills, setBills] = useState<Bill[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expandedBill, setExpandedBill] = useState<number | null>(null)

  useEffect(() => {
    window.api.sales.getAllBills().then((data: Bill[]) => {
      setBills(data)
      setLoading(false)
    })
  }, [])

  const filtered = bills.filter(b =>
    b.billNumber.toLowerCase().includes(search.toLowerCase()) ||
    b.customerName.toLowerCase().includes(search.toLowerCase()) ||
    b.customerPhone.includes(search)
  )

  async function handleExportInvoice(billId: number) {
    try {
      const filePath = await window.api.sales.exportInvoice(billId)
      alert(`Invoice saved to: ${filePath}`)
    } catch (err) {
      alert('Failed to export invoice')
    }
  }

  async function handleDeleteBill(billId: number) {
    if (!confirm('Delete this bill? Stock will be restored.')) return
    try {
      await window.api.sales.deleteBill(billId)
      setBills(bills.filter(b => b.id !== billId))
    } catch (err) {
      alert('Failed to delete bill')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-green-700 text-white px-6 py-4 shadow">
        <h1 className="text-xl font-bold">Kottakkal Arya Vaidya Sala Wandoor</h1>
        <p className="text-green-200 text-sm">Sales History</p>
      </div>

      <div className="px-6 py-4">
        <div className="flex gap-3 mb-4">
          <input
            type="text"
            placeholder="Search by bill number, customer name or phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm w-96 focus:outline-none focus:ring-2 focus:ring-green-400"
          />
          <span className="ml-auto text-sm text-gray-500 self-center">{filtered.length} bills found</span>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">No bills found.</div>
        ) : (
          <div className="space-y-3">
            {filtered.map(bill => (
              <div key={bill.id} className="bg-white rounded-xl shadow overflow-hidden">
                <div
                  className="px-4 py-3 flex justify-between items-center cursor-pointer hover:bg-gray-50"
                  onClick={() => setExpandedBill(expandedBill === bill.id ? null : bill.id)}
                >
                  <div className="flex gap-6 items-center">
                    <div>
                      <p className="font-semibold text-green-700">{bill.billNumber}</p>
                      <p className="text-xs text-gray-400">{new Date(bill.createdAt).toLocaleString('en-IN')}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{bill.customerName}</p>
                      {bill.customerPhone && <p className="text-xs text-gray-400">{bill.customerPhone}</p>}
                    </div>
                    {bill.doctorName && (
                      <div>
                        <p className="text-sm font-medium text-purple-700">Dr. {bill.doctorName}</p>
                        {bill.prescriptionNumber && <p className="text-xs text-gray-400">Rx: {bill.prescriptionNumber}</p>}
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-gray-400">{bill.items.length} items</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="font-bold text-green-700">Rs.{bill.totalAmount.toFixed(2)}</p>
                    <button
                      onClick={e => { e.stopPropagation(); handleExportInvoice(bill.id) }}
                      className="text-xs bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700"
                    >Print</button>
                    <button
                      onClick={e => { e.stopPropagation(); handleDeleteBill(bill.id) }}
                      className="text-xs bg-red-500 text-white px-3 py-1 rounded-lg hover:bg-red-600"
                    >Delete</button>
                    <span className="text-gray-400 text-xs">{expandedBill === bill.id ? '▲' : '▼'}</span>
                  </div>
                </div>

                {expandedBill === bill.id && (
                  <div className="border-t px-4 py-3 bg-gray-50">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-gray-500 border-b">
                          <th className="text-left py-1">Medicine</th>
                          <th className="text-left py-1">Code</th>
                          <th className="text-left py-1">MRP</th>
                          <th className="text-left py-1">Qty</th>
                          <th className="text-left py-1">Disc%</th>
                          <th className="text-left py-1">GST%</th>
                          <th className="text-left py-1">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bill.items.map(item => (
                          <tr key={item.id} className="border-b last:border-0">
                            <td className="py-1">{item.medicineName}</td>
                            <td className="py-1">{item.productCode}</td>
                            <td className="py-1">Rs.{item.mrp.toFixed(2)}</td>
                            <td className="py-1">{item.quantity}</td>
                            <td className="py-1">{item.discount}%</td>
                            <td className="py-1">{item.gst}%</td>
                            <td className="py-1 font-semibold">Rs.{item.totalAmount.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="flex justify-end gap-6 mt-2 text-xs text-gray-500">
                      <span>Subtotal: Rs.{bill.subtotal.toFixed(2)}</span>
                      <span>GST: Rs.{bill.totalGST.toFixed(2)}</span>
                      <span className="font-bold text-green-700">Total: Rs.{bill.totalAmount.toFixed(2)}</span>
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