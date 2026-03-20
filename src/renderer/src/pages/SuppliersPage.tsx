import { useState, useEffect } from 'react'
import { Supplier } from '../types/inventory'

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null)
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', gstin: '' })

  useEffect(() => { fetchSuppliers() }, [])

  async function fetchSuppliers() {
    const data = await window.api.purchase.getSuppliers()
    setSuppliers(data)
    setLoading(false)
  }

  function openAdd() {
    setForm({ name: '', phone: '', email: '', address: '', gstin: '' })
    setEditSupplier(null)
    setShowForm(true)
  }

  function openEdit(s: Supplier) {
    setForm({ name: s.name, phone: s.phone, email: s.email, address: s.address, gstin: s.gstin })
    setEditSupplier(s)
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (editSupplier) {
      await window.api.purchase.updateSupplier(editSupplier.id, form)
    } else {
      await window.api.purchase.addSupplier(form)
    }
    setShowForm(false)
    fetchSuppliers()
  }

  async function handleDeactivate(id: number) {
    await window.api.purchase.updateSupplier(id, { isActive: false })
    fetchSuppliers()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-green-700 text-white px-6 py-4 shadow flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold">Kottakkal Arya Vaidya Sala Wandoor</h1>
          <p className="text-green-200 text-sm">Suppliers</p>
        </div>
        <button
          onClick={openAdd}
          className="bg-white text-green-700 font-semibold px-4 py-2 rounded-lg hover:bg-green-50 transition"
        >
          + Add Supplier
        </button>
      </div>

      <div className="px-6 py-4">
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : suppliers.length === 0 ? (
          <div className="text-center py-12 text-gray-400 bg-white rounded-xl shadow">
            No suppliers added yet. Add your first supplier.
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-green-700 text-white text-xs">
                  <th className="px-4 py-3 text-left">Supplier Name</th>
                  <th className="px-4 py-3 text-left">Phone</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">GSTIN</th>
                  <th className="px-4 py-3 text-left">Address</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((s, idx) => (
                  <tr key={s.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-2 font-medium">{s.name}</td>
                    <td className="px-4 py-2">{s.phone || '—'}</td>
                    <td className="px-4 py-2">{s.email || '—'}</td>
                    <td className="px-4 py-2 font-mono text-xs">{s.gstin || '—'}</td>
                    <td className="px-4 py-2 text-xs">{s.address || '—'}</td>
                    <td className="px-4 py-2">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(s)} className="text-green-600 hover:underline text-xs">Edit</button>
                        <button onClick={() => handleDeactivate(s.id)} className="text-red-500 hover:underline text-xs">Remove</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-green-700">
                {editSupplier ? 'Edit Supplier' : 'Add Supplier'}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              {[
                { label: 'Supplier Name *', name: 'name', required: true },
                { label: 'Phone', name: 'phone', required: false },
                { label: 'Email', name: 'email', required: false },
                { label: 'GSTIN', name: 'gstin', required: false },
                { label: 'Address', name: 'address', required: false },
              ].map(field => (
                <div key={field.name}>
                  <label className="block text-sm text-gray-600 mb-1">{field.label}</label>
                  <input
                    type="text"
                    name={field.name}
                    value={form[field.name as keyof typeof form]}
                    onChange={e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))}
                    required={field.required}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                  />
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700 transition">
                  {editSupplier ? 'Update' : 'Add Supplier'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg hover:bg-gray-50 transition">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}