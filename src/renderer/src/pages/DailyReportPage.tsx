import { useState, useEffect } from 'react'
import { DailyReport } from '../types/inventory'

export default function DailyReportPage() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [report, setReport] = useState<DailyReport | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => { fetchReport() }, [date])

  async function fetchReport() {
    setLoading(true)
    try {
      const data = await window.api.sales.getDailyReport(date)
      setReport(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleExportPDF() {
    try {
      const filePath = await window.api.sales.exportDailyReport(date)
      alert(`Daily report saved to: ${filePath}`)
    } catch (err) {
      alert('Failed to export report')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-green-700 text-white px-6 py-4 shadow flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold">Kottakkal Arya Vaidya Sala Wandoor</h1>
          <p className="text-green-200 text-sm">Daily Sales Report</p>
        </div>
        <button
          onClick={handleExportPDF}
          className="bg-white text-green-700 font-semibold px-4 py-2 rounded-lg hover:bg-green-50 transition"
        >
          Export PDF
        </button>
      </div>

      <div className="px-6 py-4">
        {/* Date picker */}
        <div className="flex gap-3 items-center mb-4">
          <label className="text-sm font-medium text-gray-600">Select Date:</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
          />
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : report ? (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Total Bills', value: report.totalBills, color: 'bg-green-700' },
                { label: 'Total Sales', value: `Rs.${report.totalSales.toFixed(2)}`, color: 'bg-blue-600' },
                { label: 'Total GST', value: `Rs.${report.totalGST.toFixed(2)}`, color: 'bg-purple-600' },
                { label: 'Net Sales', value: `Rs.${(report.totalSales - report.totalGST).toFixed(2)}`, color: 'bg-orange-500' },
              ].map(card => (
                <div key={card.label} className={`${card.color} text-white rounded-xl p-4 shadow`}>
                  <p className="text-2xl font-bold">{card.value}</p>
                  <p className="text-sm opacity-90 mt-1">{card.label}</p>
                </div>
              ))}
            </div>

            {/* Bills list */}
            {report.bills.length === 0 ? (
              <div className="text-center py-12 text-gray-400 bg-white rounded-xl shadow">
                No sales recorded for this date.
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-green-700 text-white text-xs">
                      <th className="px-4 py-3 text-left">Bill No</th>
                      <th className="px-4 py-3 text-left">Time</th>
                      <th className="px-4 py-3 text-left">Customer</th>
                      <th className="px-4 py-3 text-left">Phone</th>
                      <th className="px-4 py-3 text-left">Items</th>
                      <th className="px-4 py-3 text-left">Subtotal</th>
                      <th className="px-4 py-3 text-left">GST</th>
                      <th className="px-4 py-3 text-left">Total</th>
                      <th className="px-4 py-3 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.bills.map((bill, idx) => (
                      <tr key={bill.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-2 font-mono text-xs font-semibold text-green-700">{bill.billNumber}</td>
                        <td className="px-4 py-2 text-xs">{new Date(bill.createdAt).toLocaleTimeString('en-IN')}</td>
                        <td className="px-4 py-2">{bill.customerName}</td>
                        <td className="px-4 py-2 text-xs">{bill.customerPhone || '-'}</td>
                        <td className="px-4 py-2">{bill.items.length}</td>
                        <td className="px-4 py-2">Rs.{bill.subtotal.toFixed(2)}</td>
                        <td className="px-4 py-2">Rs.{bill.totalGST.toFixed(2)}</td>
                        <td className="px-4 py-2 font-bold text-green-700">Rs.{bill.totalAmount.toFixed(2)}</td>
                        <td className="px-4 py-2">
                          <button
                            onClick={() => window.api.sales.exportInvoice(bill.id).then(f => alert(`Saved: ${f}`))}
                            className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
                          >Print</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-green-50 font-semibold">
                      <td colSpan={5} className="px-4 py-2 text-right text-sm">Totals:</td>
                      <td className="px-4 py-2">Rs.{(report.totalSales - report.totalGST).toFixed(2)}</td>
                      <td className="px-4 py-2">Rs.{report.totalGST.toFixed(2)}</td>
                      <td className="px-4 py-2 text-green-700">Rs.{report.totalSales.toFixed(2)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  )
}