import { useState, useEffect } from 'react'
import { InventoryItem, ItemHistory } from '../types/inventory'

interface Props {
  item: InventoryItem
  onClose: () => void
}

export default function HistoryModal({ item, onClose }: Props) {
  const [history, setHistory] = useState<ItemHistory[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    window.api.inventory.history(item.id).then((data: ItemHistory[]) => {
      setHistory(data)
      setLoading(false)
    })
  }, [item.id])

  const actionColor = (action: string) => {
    if (action === 'CREATED') return 'bg-green-100 text-green-700'
    if (action === 'UPDATED') return 'bg-blue-100 text-blue-700'
    if (action === 'ACTIVATED') return 'bg-green-100 text-green-700'
    if (action === 'DEACTIVATED') return 'bg-red-100 text-red-600'
    return 'bg-gray-100 text-gray-600'
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-lg font-bold text-green-700">Item History</h2>
            <p className="text-xs text-gray-500">{item.productCode} — {item.medicineName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <p className="text-center text-gray-400 py-8">Loading history...</p>
          ) : history.length === 0 ? (
            <p className="text-center text-gray-400 py-8">No history found.</p>
          ) : (
            <div className="space-y-3">
              {history.map((h) => {
                let changes: Record<string, unknown> = {}
                try { changes = JSON.parse(h.changes) } catch {}
                return (
                  <div key={h.id} className="border rounded-lg p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${actionColor(h.action)}`}>
                        {h.action}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(h.performedAt).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 space-y-0.5">
                      {Object.entries(changes).map(([key, val]) => (
                        <div key={key} className="flex gap-2">
                          <span className="text-gray-400 w-28 shrink-0">{key}:</span>
                          <span className="font-medium">{String(val)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}