import { useState, useEffect } from 'react'
import { InventoryItem, Supplier, Purchase } from '../types/inventory'

interface CartItem {
  productCode: string
  medicineName: string
  unit: string
  unitQuantity: number
  batchNumber: string
  expiry: string
  quantity: number
  costPrice: number
  totalAmount: number
}

export default function PurchasePage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState<InventoryItem[]>([])
  const [supplierId, setSupplierId] = useState<number | ''>('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [lastPurchase, setLastPurchase] = useState<Purchase | null>(null)

  useEffect(() => {
    window.api.inventory.getAll({ isActive: true }).then(setInventory)
    window.api.purchase.getSuppliers().then(setSuppliers)
  }, [])

  useEffect(() => {
    if (search.trim().length < 1) { setSearchResults([]); return }
    const q = search.toLowerCase()
    setSearchResults(
      inventory.filter(i =>
        i.medicineName.toLowerCase().includes(q) ||
        i.productCode.toLowerCase().includes(q)
      ).slice(0, 8)
    )
  }, [search, inventory])

  function addToCart(item: InventoryItem) {
    const existing = cart.find(c => c.productCode === item.productCode)
    if (existing) {
      setCart(cart.map(c =>
        c.productCode === item.productCode
          ? { ...c, quantity: c.quantity + 1, totalAmount: (c.quantity + 1) * c.costPrice }
          : c
      ))
    } else {
      setCart([...cart, {
        productCode: item.productCode,
        medicineName: item.medicineName,
        unit: item.unit,
        unitQuantity: item.unitQuantity,
        batchNumber: item.batchNumber || '',
        expiry: new Date(item.expiry).toISOString().split('T')[0],
        quantity: 1,
        costPrice: item.basicPrice,
        totalAmount: item.basicPrice,
      }])
    }
    setSearch('')
    setSearchResults([])
  }

  function updateCart(productCode: string, field: string, value: number | string) {
    setCart(cart.map(c => {
      if (c.productCode !== productCode) return c
      const updated = { ...c, [field]: value }
      updated.totalAmount = updated.quantity * updated.costPrice
      return updated
    }))
  }

  function removeFromCart(productCode: string) {
    setCart(cart.filter(c => c.productCode !== productCode))
  }

  const totalAmount = cart.reduce((s, c) => s + c.totalAmount, 0)

  async function handleSubmit() {
    if (!supplierId) { alert('Please select a supplier'); return }
    if (cart.length === 0) { alert('Please add items'); return }
    if (!invoiceDate) { alert('Please enter invoice date'); return }

    setLoading(true)
    try {
      const selectedSupplier = suppliers.find(s => s.id === supplierId)
      const purchase = await window.api.purchase.create({
        supplierId,
        supplierName: selectedSupplier?.name || '',
        invoiceNumber,
        invoiceDate: new Date(invoiceDate),
        notes,
        items: cart.map(c => ({
          ...c,
          expiry: new Date(c.expiry),
        })),
      })
      setLastPurchase(purchase)
      setCart([])
      setSupplierId('')
      setInvoiceNumber('')
      setNotes('')
      window.api.inventory.getAll({ isActive: true }).then(setInventory)
    } catch (err) {
      alert('Failed to record purchase')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-green-700 text-white px-6 py-4 shadow">
        <h1 className="text-xl font-bold">Kottakkal Arya Vaidya Sala Wandoor</h1>
        <p className="text-green-200 text-sm">New Purchase</p>
      </div>

      <div className="px-6 py-4 grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-4">
          {/* Purchase Details */}
          <div className="bg-white rounded-xl shadow p-4">
            <h2 className="font-semibold text-green-700 mb-3">Purchase Details</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Supplier *</label>
                <select
                  value={supplierId}
                  onChange={e => setSupplierId(Number(e.target.value))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Invoice Number</label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={e => setInvoiceNumber(e.target.value)}
                  placeholder="Supplier invoice no."
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Invoice Date *</label>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={e => setInvoiceDate(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Notes</label>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Optional notes"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                />
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
                        <p className="text-xs text-gray-400">{item.productCode} · Current Stock: {item.quantity}</p>
                      </div>
                      <p className="text-sm font-semibold text-green-700">Rs.{item.basicPrice.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Cart */}
          {cart.length > 0 && (
            <div className="bg-white rounded-xl shadow p-4">
              <h2 className="font-semibold text-green-700 mb-3">Purchase Items ({cart.length})</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-green-700 text-white text-xs">
                    <th className="px-3 py-2 text-left">Medicine</th>
                    <th className="px-3 py-2 text-left">Batch No</th>
                    <th className="px-3 py-2 text-left">Expiry</th>
                    <th className="px-3 py-2 text-left">Qty</th>
                    <th className="px-3 py-2 text-left">Cost Price</th>
                    <th className="px-3 py-2 text-left">Total</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((item, idx) => (
                    <tr key={item.productCode} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-3 py-2">
                        <p className="font-medium text-xs">{item.medicineName}</p>
                        <p className="text-xs text-gray-400">{item.productCode}</p>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={item.batchNumber}
                          onChange={e => updateCart(item.productCode, 'batchNumber', e.target.value)}
                          className="w-24 border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-green-400"
                          placeholder="Batch no."
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="date"
                          value={item.expiry}
                          onChange={e => updateCart(item.productCode, 'expiry', e.target.value)}
                          className="w-32 border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-green-400"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={e => updateCart(item.productCode, 'quantity', Number(e.target.value))}
                          className="w-16 border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-green-400"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.costPrice}
                          onChange={e => updateCart(item.productCode, 'costPrice', Number(e.target.value))}
                          className="w-24 border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-green-400"
                        />
                      </td>
                      <td className="px-3 py-2 font-semibold">Rs.{item.totalAmount.toFixed(2)}</td>
                      <td className="px-3 py-2">
                        <button onClick={() => removeFromCart(item.productCode)} className="text-red-500 hover:text-red-700 text-xs">✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right — Summary */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow p-4 sticky top-4">
            <h2 className="font-semibold text-green-700 mb-4">Purchase Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Items</span>
                <span className="font-medium">{cart.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Supplier</span>
                <span className="font-medium text-xs">
                  {suppliers.find(s => s.id === supplierId)?.name || '—'}
                </span>
              </div>
              <div className="border-t pt-2 flex justify-between">
                <span className="font-bold text-green-700">Total Amount</span>
                <span className="font-bold text-green-700 text-lg">Rs.{totalAmount.toFixed(2)}</span>
              </div>
            </div>
            <button
              onClick={handleSubmit}
              disabled={loading || cart.length === 0 || !supplierId}
              className="w-full mt-4 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-40"
            >
              {loading ? 'Recording...' : 'Record Purchase'}
            </button>
            <button
              onClick={() => { setCart([]); setSupplierId(''); setInvoiceNumber(''); setNotes('') }}
              className="w-full mt-2 border border-gray-300 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50 transition"
            >
              Clear
            </button>
          </div>

          {/* Last Purchase */}
          {lastPurchase && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <h3 className="font-semibold text-green-700 mb-2">Purchase Recorded ✓</h3>
              <p className="text-sm"><b>PO No:</b> {lastPurchase.purchaseNumber}</p>
              <p className="text-sm"><b>Supplier:</b> {lastPurchase.supplierName}</p>
              <p className="text-sm"><b>Total:</b> Rs.{lastPurchase.totalAmount.toFixed(2)}</p>
              <p className="text-sm"><b>Items:</b> {lastPurchase.items.length}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}