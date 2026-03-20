import { useState, useEffect } from 'react'
import { InventoryItem, UNITS, GST_RATES } from '../types/inventory'

interface Props {
  item: InventoryItem | null
  onSubmit: (data: object) => void
  onClose: () => void
}

export default function InventoryForm({ item, onSubmit, onClose }: Props) {
  const [form, setForm] = useState({
    productCode: '',
    medicineName: '',
    unit: 'TAB',
    unitQuantity: '',
    gst: 5,
    basicPrice: '',
    mrp: '',
    quantity: '',
    minQuantity: '5',
    expiry: '',
    itemPosition: '',
    batchNumber: '',
  })

  useEffect(() => {
    if (item) {
      setForm({
        productCode: item.productCode,
        medicineName: item.medicineName,
        unit: item.unit,
        unitQuantity: String(item.unitQuantity),
        gst: item.gst,
        basicPrice: String(item.basicPrice),
        mrp: String(item.mrp),
        quantity: String(item.quantity),
        minQuantity: String(item.minQuantity),
        expiry: new Date(item.expiry).toISOString().split('T')[0],
        itemPosition: item.itemPosition,
        batchNumber: item.batchNumber || '',
      })
    }
  }, [item])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
  }

  const previewOunce = form.unit === 'ML' && form.unitQuantity
    ? (Number(form.unitQuantity) / 25).toFixed(2)
    : null

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit({
      ...form,
      gst: Number(form.gst),
      unitQuantity: Number(form.unitQuantity),
      basicPrice: Number(form.basicPrice),
      mrp: Number(form.mrp),
      quantity: Number(form.quantity),
      minQuantity: Number(form.minQuantity),
      expiry: new Date(form.expiry),
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-green-700">
            {item ? 'Edit Item' : 'Add New Item'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Product Code</label>
            <input type="text" name="productCode" value={form.productCode}
              onChange={handleChange} required
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Medicine Name</label>
            <input type="text" name="medicineName" value={form.medicineName}
              onChange={handleChange} required
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Unit</label>
              <select name="unit" value={form.unit} onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400">
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Unit Quantity
                {previewOunce && (
                  <span className="ml-2 text-green-600 font-semibold">→ {previewOunce} oz</span>
                )}
              </label>
              <input type="number" name="unitQuantity" value={form.unitQuantity}
                onChange={handleChange} required placeholder="e.g. 450"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">GST Rate</label>
            <select name="gst" value={form.gst} onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400">
              {GST_RATES.map((r) => <option key={r} value={r}>{r}%</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Basic Price (Rs.)</label>
              <input type="number" name="basicPrice" value={form.basicPrice}
                onChange={handleChange} required step="0.01"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">MRP (Rs.)</label>
              <input type="number" name="mrp" value={form.mrp}
                onChange={handleChange} required step="0.01"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Stock Quantity</label>
              <input type="number" name="quantity" value={form.quantity}
                onChange={handleChange} required
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Min Quantity
                <span className="ml-1 text-xs text-orange-500">(low stock alert)</span>
              </label>
              <input type="number" name="minQuantity" value={form.minQuantity}
                onChange={handleChange} required
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Item Position</label>
              <input type="text" name="itemPosition" value={form.itemPosition}
                onChange={handleChange} required placeholder="e.g. A1"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Batch Number</label>
              <input type="text" name="batchNumber" value={form.batchNumber}
                onChange={handleChange} placeholder="e.g. BT2024001"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            </div>    
            <div>
              <label className="block text-sm text-gray-600 mb-1">Expiry Date</label>
              <input type="date" name="expiry" value={form.expiry}
                onChange={handleChange} required
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit"
              className="flex-1 bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700 transition">
              {item ? 'Update Item' : 'Add Item'}
            </button>
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg hover:bg-gray-50 transition">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}