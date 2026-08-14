import { useState, useEffect } from "react";
import { apiClient } from "@/integrations/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  ShieldCheck, 
  UserPlus, 
  Search, 
  Key, 
  Trash2, 
  Crown, 
  User as UserIcon, 
  Mail, 
  Phone, 
  ShoppingBag, 
  Coins, 
  Calendar,
  AlertCircle,
  MoreVertical,
  CheckCircle2,
  Lock
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import AdminPageLayout from "./AdminPageLayout";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

interface AdminUser {
  id: number;
  email: string;
  phone: string | null;
  full_name: string | null;
  avatar_url: string | null;
  address: string | null;
  points: number;
  role: "admin" | "user";
  created_at: string;
  total_orders: number;
  total_spent: number;
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(price);
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  // Create User Dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    email: "",
    password: "",
    full_name: "",
    phone: "",
    role: "user",
  });
  const [createSubmitting, setCreateSubmitting] = useState(false);

  // Role Change Confirmation Dialog
  const [roleDialogUser, setRoleDialogUser] = useState<AdminUser | null>(null);
  const [roleSubmitting, setRoleSubmitting] = useState(false);

  // Reset Password Dialog
  const [pwdDialogUser, setPwdDialogUser] = useState<AdminUser | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [pwdSubmitting, setPwdSubmitting] = useState(false);

  // Delete User Dialog
  const [deleteDialogUser, setDeleteDialogUser] = useState<AdminUser | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/users");
      const json = await response.json();
      if (json.error) {
        toast.error("Gagal memuat pengguna: " + json.error.message);
      } else {
        setUsers(json.data || []);
      }
    } catch (e: any) {
      toast.error("Gagal memuat daftar pengguna");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.email || !createForm.password) {
      toast.error("Email dan password wajib diisi");
      return;
    }
    if (createForm.password.length < 6) {
      toast.error("Password minimal 6 karakter");
      return;
    }

    setCreateSubmitting(true);
    try {
      const response = await fetch("/api/admin/users/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      const json = await response.json();
      if (json.error) {
        toast.error(json.error.message);
      } else {
        toast.success(`Pengguna ${json.data.email} berhasil dibuat sebagai ${createForm.role}`);
        setCreateOpen(false);
        setCreateForm({ email: "", password: "", full_name: "", phone: "", role: "user" });
        loadUsers();
      }
    } catch (err: any) {
      toast.error("Gagal membuat pengguna");
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleToggleRole = async () => {
    if (!roleDialogUser) return;
    const targetRole = roleDialogUser.role === "admin" ? "user" : "admin";
    
    setRoleSubmitting(true);
    try {
      const response = await fetch("/api/admin/users/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: roleDialogUser.id,
          role: targetRole,
        }),
      });
      const json = await response.json();
      if (json.error) {
        toast.error(json.error.message);
      } else {
        toast.success(
          targetRole === "admin"
            ? `Berhasil mengangkat ${roleDialogUser.email} menjadi Admin 🎉`
            : `Hak Admin ${roleDialogUser.email} telah dicabut (menjadi User)`
        );
        setRoleDialogUser(null);
        loadUsers();
      }
    } catch (err: any) {
      toast.error("Gagal mengubah role pengguna");
    } finally {
      setRoleSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwdDialogUser || !newPassword) return;
    if (newPassword.length < 6) {
      toast.error("Password baru minimal 6 karakter");
      return;
    }

    setPwdSubmitting(true);
    try {
      const response = await fetch("/api/admin/users/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: pwdDialogUser.id,
          new_password: newPassword,
        }),
      });
      const json = await response.json();
      if (json.error) {
        toast.error(json.error.message);
      } else {
        toast.success(`Password untuk ${pwdDialogUser.email} berhasil diperbarui`);
        setPwdDialogUser(null);
        setNewPassword("");
      }
    } catch (err: any) {
      toast.error("Gagal mereset password");
    } finally {
      setPwdSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteDialogUser) return;

    setDeleteSubmitting(true);
    try {
      const response = await fetch(`/api/admin/users/${deleteDialogUser.id}`, {
        method: "DELETE",
      });
      const json = await response.json();
      if (json.error) {
        toast.error(json.error.message);
      } else {
        toast.success(`Pengguna ${deleteDialogUser.email} berhasil dihapus`);
        setDeleteDialogUser(null);
        loadUsers();
      }
    } catch (err: any) {
      toast.error("Gagal menghapus pengguna");
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchSearch =
      (u.email || "").toLowerCase().includes(search.toLowerCase()) ||
      (u.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (u.phone || "").toLowerCase().includes(search.toLowerCase());

    const matchRole =
      roleFilter === "all" ? true : u.role === roleFilter;

    return matchSearch && matchRole;
  });

  const totalAdmins = users.filter((u) => u.role === "admin").length;
  const totalRegularUsers = users.filter((u) => u.role === "user").length;
  const totalTransactions = users.reduce((acc, u) => acc + (u.total_spent || 0), 0);

  return (
    <AdminPageLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
              Kelola Pengguna & Role
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Atur hak akses admin, kelola akun pelanggan, dan reset password pengguna.
            </p>
          </div>
          <Button 
            onClick={() => setCreateOpen(true)}
            className="rounded-xl shadow-sm gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Tambah Pengguna / Admin
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-sm flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Pengguna</p>
              <p className="text-xl font-bold text-foreground">{users.length}</p>
            </div>
          </div>

          <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-sm flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Admin</p>
              <p className="text-xl font-bold text-foreground">{totalAdmins}</p>
            </div>
          </div>

          <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-sm flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
              <UserIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">User Reguler</p>
              <p className="text-xl font-bold text-foreground">{totalRegularUsers}</p>
            </div>
          </div>

          <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-sm flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Belanja</p>
              <p className="text-sm font-bold text-foreground truncate">{formatPrice(totalTransactions)}</p>
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama, email, telepon..."
              className="pl-9 rounded-xl bg-background"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-44 rounded-xl bg-background">
                <SelectValue placeholder="Filter Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Role</SelectItem>
                <SelectItem value="admin">Hanya Admin</SelectItem>
                <SelectItem value="user">Hanya User</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={loadUsers} className="rounded-xl shrink-0">
              Refresh
            </Button>
          </div>
        </div>

        {/* Users Table / List */}
        <div className="bg-card border border-border/80 rounded-2xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
              <p className="text-sm">Memuat daftar pengguna...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground space-y-2">
              <Users className="w-12 h-12 mx-auto text-muted-foreground/50" />
              <p className="font-semibold text-foreground">Tidak ada pengguna ditemukan</p>
              <p className="text-sm text-muted-foreground">Coba sesuaikan kata kunci pencarian atau filter role.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-semibold border-b border-border">
                  <tr>
                    <th className="px-5 py-3.5">Pengguna</th>
                    <th className="px-4 py-3.5">Kontak</th>
                    <th className="px-4 py-3.5">Role</th>
                    <th className="px-4 py-3.5 text-center">Pesanan</th>
                    <th className="px-4 py-3.5">Total Belanja</th>
                    <th className="px-4 py-3.5">Terdaftar</th>
                    <th className="px-4 py-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredUsers.map((u) => {
                    const isAdmin = u.role === "admin";
                    const isMainAdmin = u.id === 1;

                    return (
                      <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                        {/* User Profile */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 border ${
                              isAdmin 
                                ? "bg-amber-500/10 text-amber-600 border-amber-500/30" 
                                : "bg-primary/10 text-primary border-primary/20"
                            }`}>
                              {u.full_name?.charAt(0).toUpperCase() || u.email.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 font-semibold text-foreground truncate">
                                <span>{u.full_name || "Tanpa Nama"}</span>
                                {isMainAdmin && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                                    Owner
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                            </div>
                          </div>
                        </td>

                        {/* Contact */}
                        <td className="px-4 py-4">
                          <div className="space-y-0.5 text-xs text-muted-foreground">
                            {u.phone ? (
                              <div className="flex items-center gap-1 text-foreground">
                                <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                <span>{u.phone}</span>
                              </div>
                            ) : (
                              <span className="italic text-muted-foreground/60">Tanpa HP</span>
                            )}
                            {u.address && (
                              <p className="truncate max-w-[180px] text-muted-foreground" title={u.address}>
                                {u.address}
                              </p>
                            )}
                          </div>
                        </td>

                        {/* Role */}
                        <td className="px-4 py-4">
                          {isAdmin ? (
                            <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 gap-1 hover:bg-amber-500/20 font-semibold px-2.5 py-1">
                              <Crown className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                              Admin
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground gap-1 font-medium px-2.5 py-1">
                              <UserIcon className="w-3.5 h-3.5 text-muted-foreground" />
                              User
                            </Badge>
                          )}
                        </td>

                        {/* Orders count */}
                        <td className="px-4 py-4 text-center">
                          <span className="font-semibold text-foreground">{u.total_orders || 0}</span>
                        </td>

                        {/* Total Spent */}
                        <td className="px-4 py-4">
                          <span className="font-semibold text-primary">{formatPrice(u.total_spent || 0)}</span>
                        </td>

                        {/* Registered date */}
                        <td className="px-4 py-4 text-xs text-muted-foreground whitespace-nowrap">
                          {u.created_at
                            ? format(new Date(u.created_at), "d MMM yyyy", { locale: idLocale })
                            : "-"}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-lg">
                              {/* Toggle Admin Role Action */}
                              <DropdownMenuItem
                                onClick={() => setRoleDialogUser(u)}
                                disabled={isMainAdmin}
                                className="cursor-pointer gap-2"
                              >
                                {isAdmin ? (
                                  <>
                                    <UserIcon className="w-4 h-4 text-muted-foreground" />
                                    <span>Ubah jadi User</span>
                                  </>
                                ) : (
                                  <>
                                    <Crown className="w-4 h-4 text-amber-500" />
                                    <span className="font-semibold text-amber-600 dark:text-amber-400">Jadikan Admin</span>
                                  </>
                                )}
                              </DropdownMenuItem>

                              {/* Reset Password */}
                              <DropdownMenuItem
                                onClick={() => {
                                  setPwdDialogUser(u);
                                  setNewPassword("");
                                }}
                                className="cursor-pointer gap-2"
                              >
                                <Key className="w-4 h-4 text-muted-foreground" />
                                <span>Reset Password</span>
                              </DropdownMenuItem>

                              {!isMainAdmin && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => setDeleteDialogUser(u)}
                                    className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    <span>Hapus Pengguna</span>
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ----------------- Dialog: Tambah Pengguna / Admin Baru ----------------- */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display">
              <UserPlus className="w-5 h-5 text-primary" />
              Tambah Pengguna / Admin Baru
            </DialogTitle>
            <DialogDescription>
              Buat akun baru dan tentukan apakah akun ini memiliki hak akses Admin atau Pengguna reguler.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateUser} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                required
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                placeholder="nama@email.com"
                className="rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                required
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                placeholder="Minimal 6 karakter"
                className="rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="full_name">Nama Lengkap</Label>
              <Input
                id="full_name"
                value={createForm.full_name}
                onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })}
                placeholder="Contoh: Budi Santoso"
                className="rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">Nomor Telepon / WhatsApp</Label>
              <Input
                id="phone"
                value={createForm.phone}
                onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                placeholder="08123456789"
                className="rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="role">Role / Hak Akses</Label>
              <Select
                value={createForm.role}
                onValueChange={(val) => setCreateForm({ ...createForm, role: val })}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">
                    <div className="flex items-center gap-2">
                      <UserIcon className="w-4 h-4 text-muted-foreground" />
                      <span>User Reguler (Pelanggan)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-semibold">
                      <Crown className="w-4 h-4 text-amber-500" />
                      <span>Admin (Akses Penuh Dashboard Admin)</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} className="rounded-xl">
                Batal
              </Button>
              <Button type="submit" disabled={createSubmitting} className="rounded-xl">
                {createSubmitting ? "Memproses..." : "Buat Akun"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ----------------- Dialog: Konfirmasi Ubah Role ----------------- */}
      <Dialog open={!!roleDialogUser} onOpenChange={(open) => !open && setRoleDialogUser(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display">
              {roleDialogUser?.role === "admin" ? (
                <>
                  <UserIcon className="w-5 h-5 text-muted-foreground" />
                  Cabut Hak Akses Admin?
                </>
              ) : (
                <>
                  <Crown className="w-5 h-5 text-amber-500" />
                  Jadikan Pengguna sebagai Admin?
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {roleDialogUser?.role === "admin" ? (
                <span>
                  Pengguna <strong>{roleDialogUser?.email}</strong> akan diubah menjadi <strong>User Reguler</strong> dan tidak akan bisa lagi mengakses panel admin.
                </span>
              ) : (
                <span>
                  Pengguna <strong>{roleDialogUser?.email}</strong> akan diangkat menjadi <strong>Admin</strong> dan memiliki akses penuh untuk mengelola produk, pesanan, kategori, laporan, dan pengaturan toko.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-3">
            <Button variant="outline" onClick={() => setRoleDialogUser(null)} className="rounded-xl">
              Batal
            </Button>
            <Button
              onClick={handleToggleRole}
              disabled={roleSubmitting}
              className={`rounded-xl ${
                roleDialogUser?.role === "admin"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : "bg-amber-500 hover:bg-amber-600 text-white"
              }`}
            >
              {roleSubmitting
                ? "Memproses..."
                : roleDialogUser?.role === "admin"
                ? "Cabut Akses Admin"
                : "Ya, Jadikan Admin"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ----------------- Dialog: Reset Password ----------------- */}
      <Dialog open={!!pwdDialogUser} onOpenChange={(open) => !open && setPwdDialogUser(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display">
              <Key className="w-5 h-5 text-primary" />
              Reset Password Pengguna
            </DialogTitle>
            <DialogDescription>
              Masukkan password baru untuk akun <strong>{pwdDialogUser?.email}</strong>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleResetPassword} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="new_pwd">Password Baru *</Label>
              <Input
                id="new_pwd"
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                className="rounded-xl"
              />
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setPwdDialogUser(null)} className="rounded-xl">
                Batal
              </Button>
              <Button type="submit" disabled={pwdSubmitting} className="rounded-xl">
                {pwdSubmitting ? "Menyimpan..." : "Simpan Password Baru"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ----------------- Dialog: Konfirmasi Hapus Pengguna ----------------- */}
      <Dialog open={!!deleteDialogUser} onOpenChange={(open) => !open && setDeleteDialogUser(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display text-destructive">
              <AlertCircle className="w-5 h-5 text-destructive" />
              Hapus Pengguna?
            </DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus akun <strong>{deleteDialogUser?.email}</strong>? Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-3">
            <Button variant="outline" onClick={() => setDeleteDialogUser(null)} className="rounded-xl">
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteUser}
              disabled={deleteSubmitting}
              className="rounded-xl"
            >
              {deleteSubmitting ? "Menghapus..." : "Ya, Hapus Pengguna"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPageLayout>
  );
}
