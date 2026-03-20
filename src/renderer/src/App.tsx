import { useState, useEffect } from 'react'
import InventoryPage from './pages/InventoryPage'
import BillingPage from './pages/BillingPage'
import SalesHistoryPage from './pages/SalesHistoryPage'
import DailyReportPage from './pages/DailyReportPage'
import SettingsPage from './pages/SettingsPage'
import StockMovementPage from './pages/StockMovementPage'
import GSTReportPage from './pages/GSTReportPage'
import PurchasePage from './pages/PurchasePage'
import PurchaseHistoryPage from './pages/PurchaseHistoryPage'
import SuppliersPage from './pages/SuppliersPage'
import ExpiryPage from './pages/ExpiryPage'
import ProfitReportPage from './pages/ProfitReportPage'
import PinLock from './components/PinLock'

type Page = 'inventory' | 'billing' | 'history' | 'daily' | 'stock-movement' | 'gst-report' | 'purchase' | 'purchase-history' | 'suppliers' | 'expiry' | 'profit-report' | 'settings'

function App() {
  const [page, setPage] = useState<Page>('inventory')

  const navGroups = [
    {
      label: 'Inventory',
      items: [
        { key: 'inventory', label: 'Stock Ledger', icon: '📦' },
        { key: 'expiry', label: 'Expiry Management', icon: '⏰' },
      ]
    },
    {
      label: 'Sales',
      items: [
        { key: 'billing', label: 'New Bill', icon: '🧾' },
        { key: 'history', label: 'Sales History', icon: '📋' },
        { key: 'daily', label: 'Daily Report', icon: '📊' },
      ]
    },
    {
      label: 'Purchase',
      items: [
        { key: 'purchase', label: 'New Purchase', icon: '🛒' },
        { key: 'purchase-history', label: 'Purchase History', icon: '📦' },
        { key: 'suppliers', label: 'Suppliers', icon: '🏭' },
      ]
    },
    {
      label: 'Reports',
      items: [
        { key: 'stock-movement', label: 'Stock Movement', icon: '📈' },
        { key: 'gst-report', label: 'GST Report', icon: '🧾' },
        { key: 'profit-report', label: 'Profit Report', icon: '💰' },
      ]
    },
    {
      label: 'System',
      items: [
        { key: 'settings', label: 'Settings', icon: '⚙️' },
      ]
    },
  ]

  const [locked, setLocked] = useState(true)
  const [hasPin, setHasPin] = useState(false)
  const [checkingPin, setCheckingPin] = useState(true)

  useEffect(() => {
    window.api.auth.getPin().then((pin: string | null) => {
      if (pin) {
        setHasPin(true)
        setLocked(true)
      } else {
        setLocked(false)
      }
      setCheckingPin(false)
    })
  }, [])

  if (checkingPin) {
    return (
      <div className="min-h-screen bg-green-800 flex items-center justify-center">
        <p className="text-white text-lg">Loading...</p>
      </div>
    )
  }

  if (locked && hasPin) {
    return <PinLock onUnlock={() => setLocked(false)} />
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar Navigation */}
      <div className="w-48 bg-green-800 text-white flex flex-col shrink-0">
        <div className="px-4 py-5 border-b border-green-700">
          <p className="text-xs font-bold text-green-300 uppercase tracking-wider">KAVS Wandoor</p>
          <p className="text-xs text-green-400 mt-0.5">Management System</p>
        </div>
        <nav className="flex-1 py-2 overflow-y-auto">
          {navGroups.map(group => (
            <div key={group.label} className="mb-2">
              <p className="px-4 pt-3 pb-1 text-xs font-bold text-green-400 uppercase tracking-wider">
                {group.label}
              </p>
              {group.items.map(item => (
                <button
                  key={item.key}
                  onClick={() => setPage(item.key as Page)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition ${
                    page === item.key
                      ? 'bg-green-600 text-white'
                      : 'text-green-200 hover:bg-green-700 hover:text-white'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="px-4 py-3 border-t border-green-700">
          <p className="text-xs text-green-400">v1.0.0</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {page === 'inventory' && <InventoryPage />}
        {page === 'billing' && <BillingPage />}
        {page === 'history' && <SalesHistoryPage />}
        {page === 'daily' && <DailyReportPage />}
        {page === 'stock-movement' && <StockMovementPage />}
        {page === 'gst-report' && <GSTReportPage />}
        {page === 'purchase' && <PurchasePage />}
        {page === 'purchase-history' && <PurchaseHistoryPage />}
        {page === 'suppliers' && <SuppliersPage />}
        {page === 'expiry' && <ExpiryPage />}
        {page === 'profit-report' && <ProfitReportPage />}
        {page === 'settings' && <SettingsPage />}
      </div>
    </div>
  )
}

export default App