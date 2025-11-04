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
  id: number;
  username: string;
  full_name: string;
  email?: string;
  role: "admin" | "technician" | "operator";
  created_at: string;
}

const roleConfig = {
  admin: {
    label: "Administrador",
    color: "bg-red-600",
    description: "Acesso total ao sistema",
  },
  technician: {
    label: "Técnico",
    color: "bg-blue-600",
    description: "Criar e gerir manutenções",
  },
  operator: {
    label: "Operador",
    color: "bg-green-600",
    description: "Ver informação e reportar",
  },
};

export default function Team() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    full_name: "",
    username: "",
    password: "",
    email: "",
    role: "operator" as "admin" | "technician" | "operator",
    hasSystemAccess: false,
  });

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      const response = await apiFetch("users");
      if (response.ok) {
        const data = await response.json();
        setEmployees(data);
      }
    } catch (error) {
      console.error("Erro ao carregar funcionários:", error);
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

      // Only include password if it's a new user or if password was changed
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
      password: "", // Don't show existing password
      email: employee.email || "",
      role: employee.role,
      hasSystemAccess: true,
    });
    setShowAddEmployee(true);
  };

  const handleDelete = async (id: number) => {
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8" />
            Gestão de Equipa
          </h1>
          <p className="text-muted-foreground">
            Gestão de utilizadores e permissões do sistema
          </p>
        </div>
        <Button onClick={() => setShowAddEmployee(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Funcionário
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Procurar funcionários..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Employees Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredEmployees.map((employee) => {
          const roleInfo = roleConfig[employee.role];
          return (
            <Card key={employee.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">
                        {employee.full_name}
                      </CardTitle>
                      <CardDescription>@{employee.username}</CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Função:
                    </span>
                    <Badge className={roleInfo.color}>{roleInfo.label}</Badge>
                  </div>
                  {employee.email && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Email:
                      </span>
                      <span className="text-sm">{employee.email}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Criado em:</span>
                    <span>
                      {new Date(employee.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex gap-2 pt-2">
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

      {/* Add/Edit Employee Dialog */}
      <Dialog open={showAddEmployee} onOpenChange={setShowAddEmployee}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
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
                <SelectTrigger>
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
            <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
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
                <Label htmlFor="hasSystemAccess" className="font-semibold">
                  Acesso ao Sistema MaintenanceControl
                </Label>
              </div>

              {formData.hasSystemAccess && (
                <div className="space-y-3 pl-6">
                  <div className="space-y-2">
                    <Label htmlFor="username">Nome de Utilizador *</Label>
                    <Input
                      id="username"
                      required={formData.hasSystemAccess}
                      value={formData.username}
                      onChange={(e) =>
                        setFormData({ ...formData, username: e.target.value })
                      }
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
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
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

            <DialogFooter>
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingEmployee ? "Atualizar" : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
