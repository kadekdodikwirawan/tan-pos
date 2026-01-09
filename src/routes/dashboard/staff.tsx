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
  Search,
  Edit2,
  Trash2,
  UserCircle,
  Mail,
  Phone,
  Shield,
  Check,
  X,
  Loader2,
} from 'lucide-react'
import { getRoleDisplayName, getRoleColor } from '../../lib/auth'

export const Route = createFileRoute('/dashboard/staff')({
  component: () => (
    <RoleGuard allowedRoles={['admin']}>
      <StaffPage />
    </RoleGuard>
  ),
})

interface StaffMember {
  id: number
  username: string
  fullName: string
  email: string | null
  phone: string | null
  role: string
  isActive: boolean
  createdAt: Date
}

function StaffPage() {
  const trpc = useTRPC()
  const queryClient = useQueryClient()

  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    username: '',
    fullName: '',
    email: '',
    phone: '',
    role: 'server',
    password: '',
  })

  // Fetch staff from database
  const { data: staffData = [], isLoading } = useQuery(trpc.users.list.queryOptions())

  // Create user mutation
  const createUserMutation = useMutation(
    trpc.users.create.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [['users']] })
        setShowAddModal(false)
        setFormData({
          username: '',
          fullName: '',
          email: '',
          phone: '',
          role: 'server',
          password: '',
        })
      },
    })
  )

  // Update user mutation
  const updateUserMutation = useMutation(
    trpc.users.update.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [['users']] })
        setEditingStaff(null)
      },
    })
  )

  // Delete user mutation
  const deleteUserMutation = useMutation(
    trpc.users.delete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [['users']] })
      },
    })
  )

  // Transform staff data
  const staff: StaffMember[] = staffData.map((s) => ({
    id: s.id,
    username: s.username,
    fullName: s.fullName,
    email: s.email,
    phone: s.phone,
    role: s.role,
    isActive: s.isActive,
    createdAt: s.createdAt || new Date(),
  }))

  // Filter staff
  const filteredStaff = staff.filter((member) => {
    const matchesSearch =
      member.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (member.email || '').toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRole = roleFilter === 'all' || member.role === roleFilter
    return matchesSearch && matchesRole
  })

  // Count by role
  const roleCounts = {
    all: staff.length,
    admin: staff.filter((s) => s.role === 'admin').length,
    manager: staff.filter((s) => s.role === 'manager').length,
    server: staff.filter((s) => s.role === 'server').length,
    counter: staff.filter((s) => s.role === 'counter').length,
    kitchen: staff.filter((s) => s.role === 'kitchen').length,
  }

  // Toggle active status
  const toggleActive = (staffMember: StaffMember) => {
    updateUserMutation.mutate({
      id: staffMember.id,
      isActive: !staffMember.isActive,
    })
  }

  // Delete staff
  const handleDelete = (staffId: number) => {
    if (confirm('Are you sure you want to delete this staff member?')) {
      deleteUserMutation.mutate({ id: staffId })
    }
  }

  // Add staff
  const handleAdd = () => {
    createUserMutation.mutate({
      username: formData.username,
      password: formData.password,
      fullName: formData.fullName,
      email: formData.email || undefined,
      phone: formData.phone || undefined,
      role: formData.role as 'admin' | 'manager' | 'server' | 'counter' | 'kitchen',
    })
  }

  // Save edit
  const handleSaveEdit = () => {
    if (editingStaff) {
      updateUserMutation.mutate({
        id: editingStaff.id,
        fullName: editingStaff.fullName,
        email: editingStaff.email || undefined,
        phone: editingStaff.phone || undefined,
        role: editingStaff.role as 'admin' | 'manager' | 'server' | 'counter' | 'kitchen',
      })
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
          <h1 className="text-2xl font-bold text-white">Staff Management</h1>
          <p className="text-gray-400">Manage your restaurant staff</p>
        </div>
        <Button
          onClick={() => setShowAddModal(true)}
          className="bg-cyan-500 hover:bg-cyan-600"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Staff
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <Input
            placeholder="Search by name, username, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-slate-800 border-slate-700 text-white"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {Object.entries(roleCounts).map(([role, count]) => (
            <button
              key={role}
              type="button"
              onClick={() => setRoleFilter(role)}
              className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                roleFilter === role
                  ? 'bg-cyan-500 text-white'
                  : 'bg-slate-800 text-gray-300 hover:bg-slate-700'
              }`}
            >
              {role === 'all' ? 'All' : getRoleDisplayName(role)}
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-white/20 text-xs">
                {count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-700/50">
              <tr>
                <th className="text-left p-4 text-sm font-medium text-gray-400">
                  Staff Member
                </th>
                <th className="text-left p-4 text-sm font-medium text-gray-400">
                  Contact
                </th>
                <th className="text-left p-4 text-sm font-medium text-gray-400">
                  Role
                </th>
                <th className="text-left p-4 text-sm font-medium text-gray-400">
                  Status
                </th>
                <th className="text-left p-4 text-sm font-medium text-gray-400">
                  Joined
                </th>
                <th className="text-right p-4 text-sm font-medium text-gray-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {filteredStaff.map((member) => (
                <tr
                  key={member.id}
                  className="hover:bg-slate-700/30 transition-colors"
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${getRoleColor(member.role)}`}
                      >
                        {member.fullName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-white">
                          {member.fullName}
                        </p>
                        <p className="text-sm text-gray-400">
                          @{member.username}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="space-y-1">
                      <p className="text-sm text-gray-300 flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5" />
                        {member.email}
                      </p>
                      <p className="text-sm text-gray-400 flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5" />
                        {member.phone}
                      </p>
                    </div>
                  </td>
                  <td className="p-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs text-white ${getRoleColor(member.role)}`}
                    >
                      <Shield className="w-3 h-3" />
                      {getRoleDisplayName(member.role)}
                    </span>
                  </td>
                  <td className="p-4">
                    <button
                      type="button"
                      onClick={() => toggleActive(member)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border transition-colors ${
                        member.isActive
                          ? 'bg-green-500/20 text-green-400 border-green-500/30'
                          : 'bg-red-500/20 text-red-400 border-red-500/30'
                      }`}
                    >
                      {member.isActive ? (
                        <>
                          <Check className="w-3 h-3" />
                          Active
                        </>
                      ) : (
                        <>
                          <X className="w-3 h-3" />
                          Inactive
                        </>
                      )}
                    </button>
                  </td>
                  <td className="p-4 text-gray-400 text-sm">
                    {new Date(member.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingStaff(member)}
                        className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-slate-700"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(member.id)}
                        className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-slate-700"
                        disabled={member.role === 'admin'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredStaff.length === 0 && (
            <div className="h-64 flex flex-col items-center justify-center text-gray-500">
              <UserCircle className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-lg">No staff found</p>
              <p className="text-sm">Try adjusting your search</p>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || editingStaff) && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-700">
              <h2 className="text-xl font-bold text-white">
                {editingStaff ? 'Edit Staff' : 'Add New Staff'}
              </h2>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <Label className="text-gray-300">Full Name</Label>
                <Input
                  value={editingStaff?.fullName || formData.fullName}
                  onChange={(e) =>
                    editingStaff
                      ? setEditingStaff({ ...editingStaff, fullName: e.target.value })
                      : setFormData({ ...formData, fullName: e.target.value })
                  }
                  className="bg-slate-700 border-slate-600 text-white mt-1"
                  placeholder="Enter full name"
                />
              </div>

              <div>
                <Label className="text-gray-300">Username</Label>
                <Input
                  value={editingStaff?.username || formData.username}
                  onChange={(e) =>
                    editingStaff
                      ? setEditingStaff({ ...editingStaff, username: e.target.value })
                      : setFormData({ ...formData, username: e.target.value })
                  }
                  className="bg-slate-700 border-slate-600 text-white mt-1"
                  placeholder="Enter username"
                />
              </div>

              <div>
                <Label className="text-gray-300">Email</Label>
                <Input
                  type="email"
                  value={editingStaff?.email || formData.email}
                  onChange={(e) =>
                    editingStaff
                      ? setEditingStaff({ ...editingStaff, email: e.target.value })
                      : setFormData({ ...formData, email: e.target.value })
                  }
                  className="bg-slate-700 border-slate-600 text-white mt-1"
                  placeholder="Enter email"
                />
              </div>

              <div>
                <Label className="text-gray-300">Phone</Label>
                <Input
                  value={editingStaff?.phone || formData.phone}
                  onChange={(e) =>
                    editingStaff
                      ? setEditingStaff({ ...editingStaff, phone: e.target.value })
                      : setFormData({ ...formData, phone: e.target.value })
                  }
                  className="bg-slate-700 border-slate-600 text-white mt-1"
                  placeholder="Enter phone number"
                />
              </div>

              <div>
                <Label className="text-gray-300">Role</Label>
                <select
                  value={editingStaff?.role || formData.role}
                  onChange={(e) =>
                    editingStaff
                      ? setEditingStaff({ ...editingStaff, role: e.target.value })
                      : setFormData({ ...formData, role: e.target.value })
                  }
                  className="w-full mt-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="server">Server</option>
                  <option value="counter">Counter Staff</option>
                  <option value="kitchen">Kitchen Staff</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              {!editingStaff && (
                <div>
                  <Label className="text-gray-300">Password</Label>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    className="bg-slate-700 border-slate-600 text-white mt-1"
                    placeholder="Enter password"
                  />
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-700 flex gap-3">
              <Button
                variant="outline"
                className="flex-1 border-slate-600"
                onClick={() => {
                  setShowAddModal(false)
                  setEditingStaff(null)
                }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-cyan-500 hover:bg-cyan-600"
                onClick={editingStaff ? handleSaveEdit : handleAdd}
              >
                {editingStaff ? 'Save Changes' : 'Add Staff'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
