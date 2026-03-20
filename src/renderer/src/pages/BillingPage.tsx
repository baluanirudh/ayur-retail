import { useState, useEffect } from 'react'
import { InventoryItem, Bill } from '../types/inventory'

interface CartItem {
  productCode: string
  medicineName: string
  unit: string
  unitQuantity: number
  batchNumber: string
  mrp: number
  gst: number
  ouncePerBottle: number
  sellByOunce: boolean
  ouncesSold: number
  quantity: number
  discount: number
  totalAmount: number
}

export default function BillingPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState<InventoryItem[]>([])
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [lastBill, setLastBill] = useState<Bill | null>(null)
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'ONLINE'>('CASH')
  const [doctorName, setDoctorName] = useState('')
  const [prescriptionNumber, setPrescriptionNumber] = useState('')

  useEffect(() => {
    window.api.inventory.getAll({ isActive: true }).then(setInventory)
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
        .slice(0, 8)
    )
  }, [search, inventory])

  function addToCart(item: InventoryItem) {
  const existing = cart.find(c => c.productCode === item.productCode)
  if (existing) {
    const newQty = existing.quantity + 1
    const newOunces = existing.sellByOunce ? newQty * existing.ouncePerBottle : 0
    setCart(cart.map(c =>
      c.productCode === item.productCode
        ? {
            ...c,
            quantity: newQty,
            ouncesSold: newOunces,
            totalAmount: newQty * c.mrp * (1 - c.discount / 100)
          }
        : c
    ))
  } else {
    setCart([...cart, {
      productCode: item.productCode,
      medicineName: item.medicineName,
      unit: item.unit,
      unitQuantity: item.unitQuantity,
      batchNumber: item.batchNumber || '',
      mrp: item.mrp,
      gst: item.gst,
      ouncePerBottle: item.ounce || 0,
      sellByOunce: false,
      ouncesSold: 0,
      quantity: 1,
      discount: 0,
      totalAmount: item.mrp,
    }])
  }
  setSearch('')
  setSearchResults([])
  }

  function toggleSellMode(productCode: string) {
  setCart(cart.map(c => {
    if (c.productCode !== productCode) return c
    const newMode = !c.sellByOunce
    return {
      ...c,
      sellByOunce: newMode,
      ouncesSold: newMode ? c.quantity * c.ouncePerBottle : 0,
    }
  }))
  }

  function updateOuncesSold(productCode: string, ounces: number) {
    setCart(cart.map(c => {
      if (c.productCode !== productCode) return c
      const bottlesNeeded = c.ouncePerBottle > 0 ? ounces / c.ouncePerBottle : 0
      const total = bottlesNeeded * c.mrp * (1 - c.discount / 100)
      return {
        ...c,
        ouncesSold: ounces,
        quantity: parseFloat(bottlesNeeded.toFixed(4)),
        totalAmount: total,
      }
    }))
  }

  function updateCartItem(productCode: string, field: 'quantity' | 'discount', value: number) {
  setCart(cart.map(c => {
    if (c.productCode !== productCode) return c
    const qty = field === 'quantity' ? value : c.quantity
    const disc = field === 'discount' ? value : c.discount
    const ounces = c.sellByOunce ? qty * c.ouncePerBottle : 0
    const total = qty * c.mrp * (1 - disc / 100)
    return { ...c, [field]: value, ouncesSold: ounces, totalAmount: total }
  }))
  }

  function removeFromCart(productCode: string) {
    setCart(cart.filter(c => c.productCode !== productCode))
  }

  const subtotal = cart.reduce((sum, c) => {
    const gstAmount = c.totalAmount * c.gst / (100 + c.gst)
    return sum + c.totalAmount - gstAmount
  }, 0)

  const totalGST = cart.reduce((sum, c) => {
    return sum + c.totalAmount * c.gst / (100 + c.gst)
  }, 0)

  const totalAmount = cart.reduce((sum, c) => sum + c.totalAmount, 0)

  async function handleCreateBill() {
    if (!customerName.trim()) {
      alert('Please enter customer name')
      return
    }
    if (cart.length === 0) {
      alert('Please add items to the bill')
      return
    }
    setLoading(true)
    try {
      const bill = await window.api.sales.createBill({
        customerName,
        customerPhone,
        paymentMode,
        doctorName,
        prescriptionNumber,
        notes,
        items: cart.map(c => ({
          productCode: c.productCode,
          medicineName: c.medicineName,
          unit: c.unit,
          unitQuantity: c.unitQuantity,
          batchNumber: c.batchNumber,
          mrp: c.mrp,
          gst: c.gst,
          quantity: c.quantity,
          ouncesSold: c.ouncesSold,
          discount: c.discount,
        })),
      })
      setLastBill(bill)
      setCart([])
      setCustomerName('')
      setCustomerPhone('')
      setNotes('')
      setDoctorName('')
      setPrescriptionNumber('')
      // Refresh inventory
      window.api.inventory.getAll({ isActive: true }).then(setInventory)
    } catch (err) {
      alert('Failed to create bill')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handlePrintInvoice(billId: number) {
    try {
      const filePath = await window.api.sales.exportInvoice(billId)
      alert(`Invoice saved to: ${filePath}`)
    } catch (err) {
      alert('Failed to export invoice')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-green-700 text-white px-6 py-4 shadow">
        <h1 className="text-xl font-bold">Kottakkal Arya Vaidya Sala Wandoor</h1>
        <p className="text-green-200 text-sm">New Bill</p>
      </div>

      <div className="px-6 py-4 grid grid-cols-3 gap-6">
        {/* Left — Item Search */}
        <div className="col-span-2 space-y-4">
          {/* Customer Details */}
          <div className="bg-white rounded-xl shadow p-4">
            <h2 className="font-semibold text-green-700 mb-3">Customer Details</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Customer Name *</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="Enter customer name"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  placeholder="Enter phone number"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Doctor Name</label>
                  <input
                    type="text"
                    value={doctorName}
                    onChange={e => setDoctorName(e.target.value)}
                    placeholder="Prescribed by doctor"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Prescription Number</label>
                  <input
                    type="text"
                    value={prescriptionNumber}
                    onChange={e => setPrescriptionNumber(e.target.value)}
                    placeholder="Prescription ref. no."
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                  />
                </div>
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-500 mb-1">Payment Mode</label>
                <div className="flex gap-3">
                    {(['CASH', 'ONLINE'] as const).map(mode => (
                    <button
                        key={mode}
                        type="button"
                        onClick={() => setPaymentMode(mode)}
                        className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition ${
                        paymentMode === mode
                            ? mode === 'CASH'
                            ? 'bg-green-600 text-white border-green-600'
                            : 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                        }`}
                    >
                        {mode === 'CASH' ? '💵 Cash' : '📱 Online'}
                    </button>
                    ))}
                </div>
              </div>
            </div>
          </div>

          {/* Item Search */}
          <div className="bg-white rounded-xl shadow p-4">
            <h2 className="font-semibold text-green-700 mb-3">Search & Add Items</h2>
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by medicine name or product code..."
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              />
              {searchResults.length > 0 && (
                <div className="absolute z-50 w-full bg-white border rounded-lg shadow-lg mt-1 max-h-64 overflow-y-auto">
                  {searchResults.map(item => (
                    <div
                      key={item.productCode}
                      onClick={() => addToCart(item)}
                      className="px-4 py-2 hover:bg-green-50 cursor-pointer flex justify-between items-center border-b last:border-0"
                    >
                      <div>
                        <p className="text-sm font-medium">{item.medicineName}</p>
                        <p className="text-xs text-gray-400">{item.productCode} · {item.unitQuantity}{item.unit} · Stock: {item.quantity}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-green-700">Rs.{item.mrp.toFixed(2)}</p>
                        <p className="text-xs text-gray-400">GST: {item.gst}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Cart */}
          {cart.length > 0 && (
            <div className="bg-white rounded-xl shadow p-4">
              <h2 className="font-semibold text-green-700 mb-3">Bill Items ({cart.length})</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-green-700 text-white text-xs">
                    <th className="px-3 py-2 text-left">Medicine</th>
                    <th className="px-3 py-2 text-left">MRP</th>
                    <th className="px-3 py-2 text-left">Qty</th>
                    <th className="px-3 py-2 text-left">Disc%</th>
                    <th className="px-3 py-2 text-left">GST%</th>
                    <th className="px-3 py-2 text-left">Total</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((item, idx) => (
                    <tr key={item.productCode} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-3 py-2">
                        <p className="font-medium">{item.medicineName}</p>
                        <p className="text-xs text-gray-400">{item.productCode}</p>
                      </td>
                      <td className="px-3 py-2">Rs.{item.mrp.toFixed(2)}</td>
                      <td className="px-3 py-2">
                        {item.unit === 'ML' && item.ouncePerBottle > 0 ? (
                          <div className="space-y-1">
                            <button
                              onClick={() => toggleSellMode(item.productCode)}
                              className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                                item.sellByOunce
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {item.sellByOunce ? 'By Ounce' : 'By Bottle'}
                            </button>
                            {item.sellByOunce ? (
                              <div>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.5"
                                  value={item.ouncesSold}
                                  onChange={e => updateOuncesSold(item.productCode, Number(e.target.value))}
                                  className="w-20 border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-green-400"
                                  placeholder="oz"
                                />
                                <p className="text-xs text-gray-400 mt-0.5">
                                  = {item.quantity.toFixed(2)} bottles
                                </p>
                              </div>
                            ) : (
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={e => updateCartItem(item.productCode, 'quantity', Number(e.target.value))}
                                className="w-16 border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-green-400"
                              />
                            )}
                          </div>
                        ) : (
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={e => updateCartItem(item.productCode, 'quantity', Number(e.target.value))}
                            className="w-16 border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-green-400"
                          />
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={item.discount}
                          onChange={e => updateCartItem(item.productCode, 'discount', Number(e.target.value))}
                          className="w-16 border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-green-400"
                        />
                      </td>
                      <td className="px-3 py-2">{item.gst}%</td>
                      <td className="px-3 py-2 font-semibold">Rs.{item.totalAmount.toFixed(2)}</td>
                      <td className="px-3 py-2">
                        <button
                          onClick={() => removeFromCart(item.productCode)}
                          className="text-red-500 hover:text-red-700 text-xs"
                        >✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Notes */}
          <div className="bg-white rounded-xl shadow p-4">
            <label className="block text-xs text-gray-500 mb-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Any notes for this bill..."
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>
        </div>

        {/* Right — Bill Summary */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow p-4 sticky top-4">
            <h2 className="font-semibold text-green-700 mb-4">Bill Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Items</span>
                <span className="font-medium">{cart.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-medium">Rs.{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">GST</span>
                <span className="font-medium">Rs.{totalGST.toFixed(2)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between">
                <span className="font-bold text-green-700">Total</span>
                <span className="font-bold text-green-700 text-lg">Rs.{totalAmount.toFixed(2)}</span>
              </div>
            </div>
            <button
              onClick={handleCreateBill}
              disabled={loading || cart.length === 0 || !customerName.trim()}
              className="w-full mt-4 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-40"
            >
              {loading ? 'Creating Bill...' : 'Create Bill'}
            </button>
            <button
              onClick={() => { setCart([]); setCustomerName(''); setCustomerPhone(''); setNotes('') }}
              className="w-full mt-2 border border-gray-300 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50 transition"
            >
              Clear
            </button>
          </div>

          {/* Last Bill */}
          {lastBill && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <h3 className="font-semibold text-green-700 mb-2">Bill Created ✓</h3>
              <p className="text-sm"><b>Bill No:</b> {lastBill.billNumber}</p>
              <p className="text-sm"><b>Customer:</b> {lastBill.customerName}</p>
              <p className="text-sm"><b>Total:</b> Rs.{lastBill.totalAmount.toFixed(2)}</p>
              <p className="text-sm">
                <b>Payment:</b>{' '}
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                  lastBill.paymentMode === 'CASH'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {lastBill.paymentMode}
                </span>
              </p>
              <button
                onClick={() => handlePrintInvoice(lastBill.id)}
                className="w-full mt-3 bg-green-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition"
              >
                Print Invoice PDF
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}