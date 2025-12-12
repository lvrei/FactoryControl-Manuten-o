import { useState, useEffect } from "react";
import {
  Users,
  User,
  Plus,
  Search,
  Edit,
  Trash2,
  Shield,
  Eye,
  EyeOff,
  Mail,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { apiFetch } from "@/config/api";

interface Employee {
  id: string;
  username: string;
  full_name: string;
  email?: string;
  role: "admin" | "technician" | "operator";
  position?: string;
  department?: string;
  shift?: string;
  status?: string;
  created_at: string;
}

const roleConfig: Record<
  string,
  { label: string; color: string; bgGradient: string; description: string; icon: React.ComponentType<{ className?: string }> }
> = {
  admin: {
    label: "Administrador",
    color: "bg-red-600 hover:bg-red-700",
    bgGradient: "from-red-500/10 to-rose-500/10 border-red-200/30",
    description: "Acesso total ao sistema",
    icon: Shield,
  },
  technician: {
    label: "Técnico",
    color: "bg-blue-600 hover:bg-blue-700",
    bgGradient: "from-blue-500/10 to-cyan-500/10 border-blue-200/30",
    description: "Criar e gerir manutenções",
    icon: User,
  },
  operator: {
    label: "Operador",
    color: "bg-green-600 hover:bg-green-700",
    bgGradient: "from-green-500/10 to-emerald-500/10 border-green-200/30",
    description: "Ver informação e reportar",
    icon: User,
  },
  supervisor: {
    label: "Supervisor",
    color: "bg-purple-600 hover:bg-purple-700",
    bgGradient: "from-purple-500/10 to-pink-500/10 border-purple-200/30",
    description: "Supervisão de operações",
    icon: Shield,
  },
  maintenance: {
    label: "Manutenção",
    color: "bg-yellow-600 hover:bg-yellow-700",
    bgGradient: "from-yellow-500/10 to-amber-500/10 border-yellow-200/30",
    description: "Gestão de manutenção",
    icon: User,
  },
};

export default function Team() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    full_name: "",
    username: "",
    password: "",
    email: "",
    role: "operator" as string,
    hasSystemAccess: false,
  });

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const response = await apiFetch("users");
      if (response.ok) {
        const data = await response.json();
        setEmployees(data);
      }
    } catch (error) {
      console.error("Erro ao carregar funcionários:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.hasSystemAccess) {
      toast({
        variant: "destructive",
        title: "Erro",
        description:
          "Por favor, ative o acesso ao sistema e preencha username e password",
      });
      return;
    }

    if (!formData.username || !formData.password) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Username e password são obrigatórios",
      });
      return;
    }

    try {
      const path = editingEmployee ? `users/${editingEmployee.id}` : "users";
      const method = editingEmployee ? "PUT" : "POST";

      const payload: any = {
        username: formData.username,
        full_name: formData.full_name,
        email: formData.email,
        role: formData.role,
      };

      if (!editingEmployee || formData.password) {
        payload.password = formData.password;
      }

      const response = await apiFetch(path, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast({
          title: editingEmployee
            ? "Funcionário atualizado"
            : "Funcionário criado",
          description: "Funcionário guardado com sucesso",
        });
        loadEmployees();
        resetForm();
      } else {
        const error = await response.json();
        toast({
          variant: "destructive",
          title: "Erro",
          description: error.error || "Erro ao guardar funcionário",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao guardar funcionário",
      });
    }
  };

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      full_name: employee.full_name,
      username: employee.username,
      password: "",
      email: employee.email || "",
      role: employee.role,
      hasSystemAccess: true,
    });
    setShowAddEmployee(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem a certeza que deseja eliminar este funcionário?")) return;

    try {
      const response = await apiFetch(`users/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast({
          title: "Funcionário eliminado",
          description: "Funcionário removido com sucesso",
        });
        loadEmployees();
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao eliminar funcionário",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      full_name: "",
      username: "",
      password: "",
      email: "",
      role: "operator",
      hasSystemAccess: false,
    });
    setEditingEmployee(null);
    setShowAddEmployee(false);
    setShowPassword(false);
  };

  const filteredEmployees = employees.filter(
    (emp) =>
      emp.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.username?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const roleStats = {
    admin: employees.filter(e => e.role === "admin").length,
    technician: employees.filter(e => e.role === "technician").length,
    operator: employees.filter(e => e.role === "operator").length,
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="relative">
        <div className="absolute -top-8 -right-20 w-40 h-40 bg-indigo-600/15 rounded-full blur-3xl opacity-50"></div>
        <div className="absolute -bottom-8 -left-20 w-40 h-40 bg-indigo-600/15 rounded-full blur-3xl opacity-50"></div>

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent mb-2 flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-lg">
                <Users className="h-8 w-8 text-white" />
              </div>
              Gestão de Equipa
            </h1>
            <p className="text-lg text-muted-foreground">
              Gestão de utilizadores e permissões do sistema
            </p>
          </div>
          <Button 
            onClick={() => setShowAddEmployee(true)}
            className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all duration-300 h-11 px-6 whitespace-nowrap"
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo Funcionário
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-slate-800/60 to-slate-800/40 backdrop-blur-xl border border-blue-500/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:border-blue-500/40">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-semibold text-slate-200">Total de Funcionários</CardTitle>
            <Users className="h-5 w-5 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-50">{employees.length}</div>
            <p className="text-xs text-slate-400 mt-2">Utilizadores do sistema</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-800/60 to-slate-800/40 backdrop-blur-xl border border-red-500/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:border-red-500/40">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-semibold text-slate-200">Administradores</CardTitle>
            <Shield className="h-5 w-5 text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-50">{roleStats.admin}</div>
            <p className="text-xs text-slate-400 mt-2">Acesso total</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-800/60 to-slate-800/40 backdrop-blur-xl border border-cyan-500/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:border-cyan-500/40">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-semibold text-slate-200">Técnicos</CardTitle>
            <User className="h-5 w-5 text-cyan-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-50">{roleStats.technician}</div>
            <p className="text-xs text-slate-400 mt-2">Gestão manutenção</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-800/60 to-slate-800/40 backdrop-blur-xl border border-emerald-500/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:border-emerald-500/40">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-semibold text-slate-200">Operadores</CardTitle>
            <User className="h-5 w-5 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-50">{roleStats.operator}</div>
            <p className="text-xs text-slate-400 mt-2">Acesso básico</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Procurar por nome ou username..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 bg-gradient-to-r from-slate-800/60 to-slate-800/40 border-slate-700/30 text-slate-50 placeholder:text-slate-400"
        />
      </div>

      {/* Employees Grid */}
      {loading ? (
        <div className="text-center py-16">
          <Users className="h-12 w-12 animate-spin mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">A carregar funcionários...</p>
        </div>
      ) : filteredEmployees.length === 0 ? (
        <div className="text-center py-16">
          <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">Nenhum funcionário encontrado</p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filteredEmployees.map((employee) => {
            const roleInfo = roleConfig[employee.role];
            return (
              <Card
                key={employee.id}
                className={`bg-gradient-to-br from-slate-800/60 to-slate-800/40 backdrop-blur-xl border border-slate-700/30 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/10">
                        <User className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base text-foreground">
                          {employee.full_name}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          @{employee.username}
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-t border-border/50 pt-3">
                      <span className="text-sm text-muted-foreground">
                        Função:
                      </span>
                      <Badge className={roleInfo.color}>
                        {roleInfo.label}
                      </Badge>
                    </div>
                    {employee.email && (
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Mail className="h-4 w-4" />
                          Email:
                        </span>
                        <span className="text-sm text-foreground text-right break-all">{employee.email}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/50 pt-3">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Criado:
                      </span>
                      <span>
                        {new Date(employee.created_at).toLocaleDateString("pt-PT")}
                      </span>
                    </div>
                    <div className="flex gap-2 pt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleEdit(employee)}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Editar
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(employee.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add/Edit Employee Dialog */}
      <Dialog open={showAddEmployee} onOpenChange={setShowAddEmployee}>
        <DialogContent className="max-w-md bg-gradient-to-br from-card/80 to-card/50 backdrop-blur border-border/50">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              {editingEmployee ? "Editar Funcionário" : "Novo Funcionário"}
            </DialogTitle>
            <DialogDescription>
              Preencha os dados do funcionário
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Nome Completo *</Label>
              <Input
                id="full_name"
                required
                value={formData.full_name}
                onChange={(e) =>
                  setFormData({ ...formData, full_name: e.target.value })
                }
                className="bg-background/50 border-border/50"
                placeholder="Ex: João Silva"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="bg-background/50 border-border/50"
                placeholder="joao@exemplo.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Função *</Label>
              <Select
                value={formData.role}
                onValueChange={(value: any) =>
                  setFormData({ ...formData, role: value })
                }
              >
                <SelectTrigger className="bg-background/50 border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(roleConfig).map(([key, value]) => (
                    <SelectItem key={key} value={key}>
                      {value.label} - {value.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* System Access Section */}
            <div className="space-y-4 p-4 border border-border/50 rounded-lg bg-gradient-to-br from-muted/50 to-muted/30">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hasSystemAccess"
                  checked={formData.hasSystemAccess}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      hasSystemAccess: checked as boolean,
                    })
                  }
                />
                <Label htmlFor="hasSystemAccess" className="font-semibold cursor-pointer">
                  Acesso ao Sistema MaintenanceControl
                </Label>
              </div>

              {formData.hasSystemAccess && (
                <div className="space-y-3 pl-6 border-t border-border/50 pt-3">
                  <div className="space-y-2">
                    <Label htmlFor="username">Nome de Utilizador *</Label>
                    <Input
                      id="username"
                      required={formData.hasSystemAccess}
                      value={formData.username}
                      onChange={(e) =>
                        setFormData({ ...formData, username: e.target.value })
                      }
                      className="bg-background/50 border-border/50"
                      placeholder="joao_silva"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">
                      {editingEmployee
                        ? "Nova Password (deixar vazio para manter)"
                        : "Password *"}
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        required={!editingEmployee && formData.hasSystemAccess}
                        value={formData.password}
                        onChange={(e) =>
                          setFormData({ ...formData, password: e.target.value })
                        }
                        className="bg-background/50 border-border/50"
                        placeholder="••••••••"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="border-t border-border/50 pt-4 mt-4">
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70">
                {editingEmployee ? "Atualizar" : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
