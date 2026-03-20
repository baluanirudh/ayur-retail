import { useState } from 'react'

export default function SettingsPage() {
  const [backupStatus, setBackupStatus] = useState('')
  const [restoreStatus, setRestoreStatus] = useState('')

  async function handleBackup() {
    setBackupStatus('Creating backup...')
    try {
      const filePath = await window.api.system.backup()
      if (filePath) {
        setBackupStatus(`✓ Backup saved to: ${filePath}`)
      } else {
        setBackupStatus('Backup cancelled.')
      }
    } catch (err) {
      setBackupStatus('✗ Backup failed.')
    }
  }

  async function handleRestore() {
    if (!confirm('Restoring will replace all current data with the backup. Are you sure?')) return
    setRestoreStatus('Restoring...')
    try {
      const result = await window.api.system.restore()
      if (result) {
        setRestoreStatus('✓ Restore successful. Please restart the app.')
      } else {
        setRestoreStatus('Restore cancelled.')
      }
    } catch (err) {
      setRestoreStatus('✗ Restore failed.')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-green-700 text-white px-6 py-4 shadow">
        <h1 className="text-xl font-bold">Kottakkal Arya Vaidya Sala Wandoor</h1>
        <p className="text-green-200 text-sm">Settings</p>
      </div>

      <div className="px-6 py-6 max-w-2xl space-y-6">

        {/* Backup & Restore */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-bold text-green-700 mb-1">Backup & Restore</h2>
          <p className="text-sm text-gray-500 mb-4">
            Backup your database to a safe location. Restore from a previous backup if needed.
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleBackup}
              className="bg-green-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-green-700 transition"
            >
              💾 Backup Now
            </button>
            <button
              onClick={handleRestore}
              className="bg-orange-500 text-white px-5 py-2 rounded-lg font-semibold hover:bg-orange-600 transition"
            >
              🔄 Restore from Backup
            </button>
          </div>
          {backupStatus && (
            <p className={`mt-3 text-sm ${backupStatus.startsWith('✓') ? 'text-green-600' : 'text-gray-500'}`}>
              {backupStatus}
            </p>
          )}
          {restoreStatus && (
            <p className={`mt-3 text-sm ${restoreStatus.startsWith('✓') ? 'text-green-600' : 'text-red-500'}`}>
              {restoreStatus}
            </p>
          )}
        </div>

        {/* App Info */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-bold text-green-700 mb-1">App Information</h2>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex justify-between border-b pb-1">
              <span>Shop Name</span>
              <span className="font-medium">Kottakkal Arya Vaidya Sala Wandoor</span>
            </div>
            <div className="flex justify-between border-b pb-1">
              <span>Version</span>
              <span className="font-medium">1.0.0</span>
            </div>
            <div className="flex justify-between border-b pb-1">
              <span>GST Number</span>
              <span className="font-medium">32EKRPS6948J1Z8</span>
            </div>
            <div className="flex justify-between border-b pb-1">
              <span>Phone</span>
              <span className="font-medium">04931248158</span>
            </div>
            <div className="flex justify-between">
              <span>Auto Start on Windows</span>
              <span className="font-medium text-green-600">Enabled</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}