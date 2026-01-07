import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useTRPC } from '../../integrations/trpc/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { RoleGuard } from '../../components/RoleGuard'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import {
  Plus,
  Edit2,
  Trash2,
  Users,
  MapPin,
  Check,
  UtensilsCrossed,
  Clock,
  Sparkles,
  Loader2,
} from 'lucide-react'

export const Route = createFileRoute('/dashboard/tables')({
  component: () => (
    <RoleGuard allowedRoles={['admin', 'manager', 'server']}>
      <TablesPage />
    </RoleGuard>
  ),
})

type TableStatus = 'available' | 'occupied' | 'reserved' | 'cleaning'

interface TableFormData {
  tableNumber: string
  capacity: number
  location: string
}

function TablesPage() {
  const trpc = useTRPC()
  const queryClient = useQueryClient()

  const [filterLocation, setFilterLocation] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<TableStatus | 'all'>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingTable, setEditingTable] = useState<{
    id: number
    tableNumber: string
    capacity: number
    location: string
    status: TableStatus
    currentOrder?: string | null
    reservedFor?: string | null
  } | null>(null)

  // New table form state
  const [formData, setFormData] = useState<TableFormData>({
    tableNumber: '',
    capacity: 4,
    location: 'Indoor',
  })

  // Fetch tables from database
  const { data: tablesData = [], isLoading } = useQuery(trpc.tables.list.queryOptions())

  // Create table mutation
  const createTableMutation = useMutation(
    trpc.tables.create.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['tables'] })
        setShowAddModal(false)
        setFormData({ tableNumber: '', capacity: 4, location: 'Indoor' })
      },
    })
  )

  // Update table mutation
  const updateTableMutation = useMutation(
    trpc.tables.update.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['tables'] })
        setEditingTable(null)
      },
    })
  )

  // Update table status mutation
  const updateStatusMutation = useMutation(
    trpc.tables.updateStatus.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['tables'] })
      },
    })
  )

  // Delete table mutation
  const deleteTableMutation = useMutation(
    trpc.tables.delete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['tables'] })
      },
    })
  )

  // Transform tables data
  const tables = tablesData.map((t) => ({
    id: t.id,
    tableNumber: t.tableNumber,
    capacity: t.capacity,
    status: t.status as TableStatus,
    location: t.location || 'Indoor',
    currentOrder: t.currentOrderNumber,
    reservedFor: t.reservedFor,
  }))

  // Get unique locations
  const locations = ['all', ...new Set(tables.map((t) => t.location).filter(Boolean))] as string[]

  // Filter tables
  const filteredTables = tables.filter((table) => {
    const matchesLocation = filterLocation === 'all' || table.location === filterLocation
    const matchesStatus = filterStatus === 'all' || table.status === filterStatus
    return matchesLocation && matchesStatus
  })

  // Get status color and icon
  const getStatusInfo = (status: TableStatus) => {
    switch (status) {
      case 'available':
        return {
          color: 'bg-green-500/20 border-green-500/50 text-green-400',
          bgColor: 'from-green-500/10 to-green-600/5',
          icon: Check,
          label: 'Available',
        }
      case 'occupied':
        return {
          color: 'bg-blue-500/20 border-blue-500/50 text-blue-400',
          bgColor: 'from-blue-500/10 to-blue-600/5',
          icon: UtensilsCrossed,
          label: 'Occupied',
        }
      case 'reserved':
        return {
          color: 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400',
          bgColor: 'from-yellow-500/10 to-yellow-600/5',
          icon: Clock,
          label: 'Reserved',
        }
      case 'cleaning':
        return {
          color: 'bg-purple-500/20 border-purple-500/50 text-purple-400',
          bgColor: 'from-purple-500/10 to-purple-600/5',
          icon: Sparkles,
          label: 'Cleaning',
        }
    }
  }

  // Count stats
  const stats = {
    total: tables.length,
    available: tables.filter((t) => t.status === 'available').length,
    occupied: tables.filter((t) => t.status === 'occupied').length,
    reserved: tables.filter((t) => t.status === 'reserved').length,
    cleaning: tables.filter((t) => t.status === 'cleaning').length,
  }

  // Update table status
  const updateTableStatus = (tableId: number, newStatus: TableStatus) => {
    updateStatusMutation.mutate({ id: tableId, status: newStatus })
  }

  // Add new table
  const handleAddTable = () => {
    createTableMutation.mutate(formData)
  }

  // Delete table
  const handleDeleteTable = (tableId: number) => {
    if (confirm('Are you sure you want to delete this table?')) {
      deleteTableMutation.mutate({ id: tableId })
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Table Management</h1>
          <p className="text-gray-400">Manage restaurant tables and seating</p>
        </div>
        <Button
          onClick={() => setShowAddModal(true)}
          className="bg-cyan-500 hover:bg-cyan-600"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Table
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <p className="text-sm text-gray-400">Total Tables</p>
          <p className="text-2xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border border-green-500/30">
          <p className="text-sm text-green-400">Available</p>
          <p className="text-2xl font-bold text-green-400">{stats.available}</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border border-blue-500/30">
          <p className="text-sm text-blue-400">Occupied</p>
          <p className="text-2xl font-bold text-blue-400">{stats.occupied}</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border border-yellow-500/30">
          <p className="text-sm text-yellow-400">Reserved</p>
          <p className="text-2xl font-bold text-yellow-400">{stats.reserved}</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border border-purple-500/30">
          <p className="text-sm text-purple-400">Cleaning</p>
          <p className="text-2xl font-bold text-purple-400">{stats.cleaning}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex gap-2">
          {locations.map((location) => (
            <button
              key={location}
              type="button"
              onClick={() => setFilterLocation(location)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterLocation === location
                  ? 'bg-cyan-500 text-white'
                  : 'bg-slate-800 text-gray-300 hover:bg-slate-700'
              }`}
            >
              {location === 'all' ? 'All Locations' : location}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {(['all', 'available', 'occupied', 'reserved', 'cleaning'] as const).map(
            (status) => (
              <button
                key={status}
                type="button"
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterStatus === status
                    ? 'bg-cyan-500 text-white'
                    : 'bg-slate-800 text-gray-300 hover:bg-slate-700'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            )
          )}
        </div>
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {filteredTables.map((table) => {
          const statusInfo = getStatusInfo(table.status)
          const StatusIcon = statusInfo.icon

          return (
            <div
              key={table.id}
              className={`relative bg-gradient-to-br ${statusInfo.bgColor} bg-slate-800 rounded-xl border ${statusInfo.color.split(' ')[1]} overflow-hidden group`}
            >
              {/* Actions */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                <button
                  type="button"
                  onClick={() => setEditingTable(table)}
                  className="p-1.5 rounded-lg bg-slate-800/80 text-gray-400 hover:text-white"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteTable(table.id)}
                  className="p-1.5 rounded-lg bg-slate-800/80 text-gray-400 hover:text-red-400"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="p-4">
                {/* Table Number */}
                <div className="text-center mb-3">
                  <div className="w-14 h-14 mx-auto rounded-full bg-slate-700/50 flex items-center justify-center mb-2">
                    <span className="text-xl font-bold text-white">
                      {table.tableNumber}
                    </span>
                  </div>
                  <div className="flex items-center justify-center gap-1 text-sm text-gray-400">
                    <Users className="w-4 h-4" />
                    <span>{table.capacity}</span>
                  </div>
                </div>

                {/* Status Badge */}
                <div
                  className={`flex items-center justify-center gap-1.5 px-2 py-1 rounded-full text-xs ${statusInfo.color}`}
                >
                  <StatusIcon className="w-3 h-3" />
                  {statusInfo.label}
                </div>

                {/* Order/Reservation Info */}
                {table.currentOrder && (
                  <p className="text-xs text-gray-400 text-center mt-2 truncate">
                    {table.currentOrder}
                  </p>
                )}
                {table.reservedFor && (
                  <p className="text-xs text-yellow-400 text-center mt-2 truncate">
                    {table.reservedFor}
                  </p>
                )}

                {/* Location */}
                <div className="flex items-center justify-center gap-1 text-xs text-gray-500 mt-2">
                  <MapPin className="w-3 h-3" />
                  {table.location}
                </div>
              </div>

              {/* Quick Actions */}
              {table.status !== 'occupied' && (
                <div className="px-3 pb-3 pt-1 border-t border-slate-700/50">
                  <div className="flex gap-1">
                    {table.status !== 'available' && (
                      <button
                        type="button"
                        onClick={() => updateTableStatus(table.id, 'available')}
                        className="flex-1 text-xs py-1.5 rounded bg-green-500/20 text-green-400 hover:bg-green-500/30"
                      >
                        Available
                      </button>
                    )}
                    {table.status === 'available' && (
                      <button
                        type="button"
                        onClick={() => updateTableStatus(table.id, 'reserved')}
                        className="flex-1 text-xs py-1.5 rounded bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30"
                      >
                        Reserve
                      </button>
                    )}
                    {table.status === 'cleaning' && (
                      <button
                        type="button"
                        onClick={() => updateTableStatus(table.id, 'available')}
                        className="flex-1 text-xs py-1.5 rounded bg-green-500/20 text-green-400 hover:bg-green-500/30"
                      >
                        Done
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {filteredTables.length === 0 && (
        <div className="h-64 flex flex-col items-center justify-center text-gray-500">
          <UtensilsCrossed className="w-12 h-12 mb-3 opacity-50" />
          <p className="text-lg">No tables found</p>
          <p className="text-sm">Try adjusting your filters</p>
        </div>
      )}

      {/* Add/Edit Table Modal */}
      {(showAddModal || editingTable) && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-md">
            <div className="p-6 border-b border-slate-700">
              <h2 className="text-xl font-bold text-white">
                {editingTable ? 'Edit Table' : 'Add New Table'}
              </h2>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <Label className="text-gray-300">Table Number</Label>
                <Input
                  value={editingTable?.tableNumber || formData.tableNumber}
                  onChange={(e) =>
                    editingTable
                      ? setEditingTable({ ...editingTable, tableNumber: e.target.value })
                      : setFormData({ ...formData, tableNumber: e.target.value })
                  }
                  className="bg-slate-700 border-slate-600 text-white mt-1"
                  placeholder="e.g., 1, A1, V1"
                />
              </div>

              <div>
                <Label className="text-gray-300">Capacity</Label>
                <Input
                  type="number"
                  min="1"
                  max="20"
                  value={editingTable?.capacity || formData.capacity}
                  onChange={(e) =>
                    editingTable
                      ? setEditingTable({ ...editingTable, capacity: parseInt(e.target.value) })
                      : setFormData({ ...formData, capacity: parseInt(e.target.value) })
                  }
                  className="bg-slate-700 border-slate-600 text-white mt-1"
                />
              </div>

              <div>
                <Label className="text-gray-300">Location</Label>
                <select
                  value={editingTable?.location || formData.location}
                  onChange={(e) =>
                    editingTable
                      ? setEditingTable({ ...editingTable, location: e.target.value })
                      : setFormData({ ...formData, location: e.target.value })
                  }
                  className="w-full mt-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="Indoor">Indoor</option>
                  <option value="Outdoor">Outdoor</option>
                  <option value="VIP">VIP</option>
                  <option value="Bar">Bar</option>
                </select>
              </div>
            </div>

            <div className="p-6 border-t border-slate-700 flex gap-3">
              <Button
                variant="outline"
                className="flex-1 border-slate-600"
                onClick={() => {
                  setShowAddModal(false)
                  setEditingTable(null)
                }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-cyan-500 hover:bg-cyan-600"
                onClick={() => {
                  if (editingTable) {
                    updateTableMutation.mutate({
                      id: editingTable.id,
                      tableNumber: editingTable.tableNumber,
                      capacity: editingTable.capacity,
                      location: editingTable.location,
                    })
                  } else {
                    handleAddTable()
                  }
                }}
              >
                {editingTable ? 'Save Changes' : 'Add Table'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
