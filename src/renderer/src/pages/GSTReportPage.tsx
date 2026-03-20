import { useState, useEffect } from 'react'

interface GSTSummaryRow {
  rate: number
  taxableAmount: number
  cgst: number
  sgst: number
  totalGST: number
  totalAmount: number
  itemCount: number
}

interface BillSummary {
  billNumber: string
  date: string
  customerName: string
  totalAmount: number
  totalGST: number
}

interface GSTReport {
  month: number
  year: number
  summary: GSTSummaryRow[]
  totalTaxable: number
  totalCGST: number
  totalSGST: number
  totalGST: number
  totalSales: number
  totalBills: number
  bills: BillSummary[]
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export default function GSTReportPage() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [report, setReport] = useState<GSTReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [showBills, setShowBills] = useState(false)

  useEffect(() => { fetchReport() }, [])

  async function fetchReport() {
    setLoading(true)
    try {
      const data = await window.api.reports.gst({ month, year })
      setReport(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }


  async function handleExportPDF() {
    if (!report) return
    try {
      const filePath = await window.api.reports.exportGSTPdf({
        report,
        monthName: MONTHS[month - 1],
        year,
      })
      alert(`GST Report saved to: ${filePath}`)
    } catch (err) {
      alert('Failed to export GST report')
      console.error(err)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-green-700 text-white px-6 py-4 shadow flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold">Kottakkal Arya Vaidya Sala Wandoor</h1>
          <p className="text-green-200 text-sm">GST Report</p>
        </div>
        <button
          onClick={handleExportPDF}
          disabled={!report || report.totalBills === 0}
          className="bg-white text-green-700 font-semibold px-4 py-2 rounded-lg hover:bg-green-50 transition disabled:opacity-40"
        >
          Export PDF
        </button>
      </div>

      <div className="px-6 py-4">
        {/* Month Year Picker */}
        <div className="bg-white rounded-xl shadow p-4 mb-4 flex gap-3 items-end">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Month</label>
            <select
              value={month}
              onChange={e => setMonth(Number(e.target.value))}
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            >
              {MONTHS.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Year</label>
            <select
              value={year}
              onChange={e => setYear(Number(e.target.value))}
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            >
              {[2024, 2025, 2026, 2027].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <button
            onClick={fetchReport}
            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 transition"
          >
            Generate Report
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : report ? (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              {[
                { label: 'Total Bills', value: report.totalBills, color: 'bg-green-700' },
                { label: 'Total Sales', value: `Rs.${report.totalSales.toFixed(2)}`, color: 'bg-blue-600' },
                { label: 'Total GST Collected', value: `Rs.${report.totalGST.toFixed(2)}`, color: 'bg-purple-600' },
                { label: 'Taxable Amount', value: `Rs.${report.totalTaxable.toFixed(2)}`, color: 'bg-yellow-500' },
                { label: 'Total CGST', value: `Rs.${report.totalCGST.toFixed(2)}`, color: 'bg-orange-500' },
                { label: 'Total SGST', value: `Rs.${report.totalSGST.toFixed(2)}`, color: 'bg-red-500' },
              ].map(card => (
                <div key={card.label} className={`${card.color} text-white rounded-xl p-4 shadow`}>
                  <p className="text-xl font-bold">{card.value}</p>
                  <p className="text-sm opacity-90 mt-1">{card.label}</p>
                </div>
              ))}
            </div>

            {/* GST Rate Breakdown */}
            {report.summary.length === 0 ? (
              <div className="text-center py-12 text-gray-400 bg-white rounded-xl shadow">
                No sales recorded for {MONTHS[month - 1]} {year}.
              </div>
            ) : (
              <>
                <div className="bg-white rounded-xl shadow overflow-hidden mb-4">
                  <div className="px-4 py-3 border-b bg-gray-50">
                    <h2 className="font-semibold text-green-700">GST Rate-wise Breakdown</h2>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-green-700 text-white text-xs">
                        <th className="px-4 py-3 text-left">GST Rate</th>
                        <th className="px-4 py-3 text-left">Items Sold</th>
                        <th className="px-4 py-3 text-left">Taxable Amount</th>
                        <th className="px-4 py-3 text-left">CGST ({'{rate/2}'}%)</th>
                        <th className="px-4 py-3 text-left">SGST ({'{rate/2}'}%)</th>
                        <th className="px-4 py-3 text-left">Total GST</th>
                        <th className="px-4 py-3 text-left">Total Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.summary.map((row, idx) => (
                        <tr key={row.rate} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-4 py-2 font-bold text-green-700">{row.rate}%</td>
                          <td className="px-4 py-2">{row.itemCount}</td>
                          <td className="px-4 py-2">Rs.{row.taxableAmount.toFixed(2)}</td>
                          <td className="px-4 py-2">Rs.{row.cgst.toFixed(2)}</td>
                          <td className="px-4 py-2">Rs.{row.sgst.toFixed(2)}</td>
                          <td className="px-4 py-2 font-semibold text-purple-700">Rs.{row.totalGST.toFixed(2)}</td>
                          <td className="px-4 py-2 font-semibold">Rs.{row.totalAmount.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-green-50 font-bold text-sm border-t-2 border-green-200">
                        <td className="px-4 py-2 text-green-700">TOTAL</td>
                        <td className="px-4 py-2">{report.summary.reduce((s, r) => s + r.itemCount, 0)}</td>
                        <td className="px-4 py-2">Rs.{report.totalTaxable.toFixed(2)}</td>
                        <td className="px-4 py-2">Rs.{report.totalCGST.toFixed(2)}</td>
                        <td className="px-4 py-2">Rs.{report.totalSGST.toFixed(2)}</td>
                        <td className="px-4 py-2 text-purple-700">Rs.{report.totalGST.toFixed(2)}</td>
                        <td className="px-4 py-2">Rs.{report.totalSales.toFixed(2)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Bill wise toggle */}
                <div className="bg-white rounded-xl shadow overflow-hidden">
                  <div
                    className="px-4 py-3 border-b bg-gray-50 flex justify-between items-center cursor-pointer"
                    onClick={() => setShowBills(!showBills)}
                  >
                    <h2 className="font-semibold text-green-700">
                      Bill-wise Summary ({report.bills.length} bills)
                    </h2>
                    <span className="text-gray-400 text-xs">{showBills ? '▲ Hide' : '▼ Show'}</span>
                  </div>
                  {showBills && (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-green-700 text-white text-xs">
                          <th className="px-4 py-3 text-left">Bill No</th>
                          <th className="px-4 py-3 text-left">Date</th>
                          <th className="px-4 py-3 text-left">Customer</th>
                          <th className="px-4 py-3 text-left">Total GST</th>
                          <th className="px-4 py-3 text-left">Total Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.bills.map((bill, idx) => (
                          <tr key={bill.billNumber} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-4 py-2 font-mono text-xs font-semibold text-green-700">{bill.billNumber}</td>
                            <td className="px-4 py-2 text-xs">{new Date(bill.date).toLocaleDateString('en-IN')}</td>
                            <td className="px-4 py-2">{bill.customerName}</td>
                            <td className="px-4 py-2 text-purple-700">Rs.{bill.totalGST.toFixed(2)}</td>
                            <td className="px-4 py-2 font-semibold">Rs.{bill.totalAmount.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            )}
          </>
        ) : null}
      </div>
    </div>
  )
}