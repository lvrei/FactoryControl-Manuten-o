import { useState, useEffect } from "react";
import {
  Users,
  User,
  Clock,
  Calendar,
  Plus,
  Search,
  Filter,
  MapPin,
  Phone,
  Mail,
  Award,
  AlertTriangle,
  CheckCircle,
  Edit,
  MoreVertical,
  UserCheck,
  UserX,
  BookOpen,
  Shield,
  TrendingUp,
  BrainCircuit,
  ClipboardList,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { authService } from "@/services/authService";
import { employeesService } from "@/services/employeesService";
import { factoriesService, type FactoryRecord } from "@/services/factoriesService";
import { User as UserType } from "@/types/production";

interface Employee {
  id: string;
  name: string;
  position: string;
  department: string;
  shift: "morning" | "afternoon" | "night";
  status: "present" | "absent" | "vacation" | "training";
  email: string;
  phone: string;
  hireDate: string;
  skills: string[];
  certifications: string[];
  currentAssignment: string;
  supervisor: string;
  productivityScore: number;
  attendanceRate: number;
  machineOperatingLicense: string[];
  trainingHours: number;
  lastPresenceUpdate?: string;
  // User access fields
  username?: string;
  role?: "admin" | "supervisor" | "operator" | "quality" | "maintenance";
  accessLevel?: "full" | "limited" | "readonly";
  password?: string;
  hasSystemAccess?: boolean;
}

interface ShiftSchedule {
  id: string;
  shift: "morning" | "afternoon" | "night";
  date: string;
  startTime: string;
  endTime: string;
  requiredStaff: number;
  assignedStaff: number;
  supervisor: string;
  assignments: ShiftAssignment[];
}

interface ShiftAssignment {
  employeeId: string;
  employeeName: string;
  position: string;
  station: string;
  status: "scheduled" | "present" | "absent" | "late";
}

interface Training {
  id: string;
  title: string;
  type: "safety" | "technical" | "quality" | "compliance";
  status: "scheduled" | "in_progress" | "completed";
  startDate: string;
  duration: number;
  instructor: string;
  participants: string[];
  location: string;
  foamCuttingRelated: boolean;
}

// Dados limpos apenas para indústria de corte de espuma
const employees: Employee[] = [];

const shiftSchedules: ShiftSchedule[] = [];

const trainings: Training[] = [];

const statusConfig = {
  present: {
    color: "text-success bg-success/10",
    label: "Presente",
    icon: CheckCircle,
  },
  absent: {
    color: "text-destructive bg-destructive/10",
    label: "Ausente",
    icon: UserX,
  },
  vacation: { color: "text-info bg-info/10", label: "Férias", icon: Calendar },
  training: {
    color: "text-warning bg-warning/10",
    label: "Formação",
    icon: BookOpen,
  },
};

const shiftConfig = {
  morning: { label: "Manhã", color: "text-info", time: "06:00 - 14:00" },
  afternoon: { label: "Tarde", color: "text-warning", time: "14:00 - 22:00" },
  night: { label: "Noite", color: "text-purple-600", time: "22:00 - 06:00" },
};

const trainingTypeConfig = {
  safety: { label: "Segurança", color: "text-destructive bg-destructive/10" },
  technical: { label: "Técnico", color: "text-info bg-info/10" },
  quality: { label: "Qualidade", color: "text-success bg-success/10" },
  compliance: { label: "Compliance", color: "text-warning bg-warning/10" },
};

const foamCuttingPositions = [
  "Operador BZM",
  "Operador Carrossel",
  "Operador Pré-CNC",
  "Operador CNC",
  "Técnico de Qualidade de Espuma",
  "Supervisor de Produção",
  "Responsável de Stock",
  "Técnico de Manutenção de Máquinas de Corte",
];

const foamCuttingDepartments = [
  "Corte BZM",
  "Carrossel",
  "Pré-CNC",
  "CNC",
  "Qualidade",
  "Stock/Armazém",
  "Supervisão",
  "Manutenção",
];

export default function Team() {
  const [activeTab, setActiveTab] = useState<
    "employees" | "schedule" | "training" | "presence"
  >("employees");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null,
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [employeesList, setEmployeesList] = useState<Employee[]>(employees);
  const [factories, setFactories] = useState<FactoryRecord[]>([]);
  const [showAddFactory, setShowAddFactory] = useState(false);
  const [newFactory, setNewFactory] = useState<{ id: string; name: string }>({ id: "", name: "" });

  useEffect(() => {
    const load = async () => {
      try {
        const [list, facs] = await Promise.all([
          employeesService.list(),
          factoriesService.list().catch(() => []),
        ]);
        setEmployeesList(list as any);
        setFactories(facs as any);
      } catch (e) {
        console.error("Erro ao carregar funcionários:", e);
        setEmployeesList([]);
      }
    };
    load();
  }, []);

  const [newEmployee, setNewEmployee] = useState({
    name: "",
    position: "",
    department: "Corte BZM",
    shift: "morning" as "morning" | "afternoon" | "night",
    email: "",
    phone: "",
    skills: "",
    supervisor: "",
    currentAssignment: "",
    machineOperatingLicense: "",
    certifications: "",
    // System access fields
    hasSystemAccess: false,
    username: "",
    role: "operator" as
      | "admin"
      | "supervisor"
      | "operator"
      | "quality"
      | "maintenance",
    accessLevel: "limited" as "full" | "limited" | "readonly",
    password: "",
  });

  const filteredEmployees = employeesList.filter((employee) => {
    const matchesSearch =
      employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.department.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || employee.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalEmployees = employeesList.length;
  const presentEmployees = employeesList.filter(
    (e) => e.status === "present",
  ).length;
  const absentEmployees = employeesList.filter(
    (e) => e.status === "absent",
  ).length;
  const trainingEmployees = employeesList.filter(
    (e) => e.status === "training",
  ).length;

  const avgProductivity =
    employeesList.length > 0
      ? employeesList.reduce((sum, e) => sum + e.productivityScore, 0) /
        employeesList.length
      : 0;
  const avgAttendance =
    employeesList.length > 0
      ? employeesList.reduce((sum, e) => sum + e.attendanceRate, 0) /
        employeesList.length
      : 0;

  // Funções CRUD para funcionários
  const handleAddEmployee = async () => {
    if (!newEmployee.name || !newEmployee.position) {
      alert("Preencha pelo menos nome e cargo");
      return;
    }

    if (
      newEmployee.hasSystemAccess &&
      (!newEmployee.username || !newEmployee.password)
    ) {
      alert("Para acesso ao sistema, preencha utilizador e palavra-passe");
      return;
    }

    try {
      const employee: Employee = {
        id: Date.now().toString(),
        name: newEmployee.name,
        position: newEmployee.position,
        department: newEmployee.department,
        shift: newEmployee.shift,
        status: "absent",
        email: newEmployee.email,
        phone: newEmployee.phone,
        hireDate: new Date().toISOString().split("T")[0],
        skills: newEmployee.skills
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s),
        certifications: newEmployee.certifications
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s),
        machineOperatingLicense: newEmployee.machineOperatingLicense
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s),
        currentAssignment: newEmployee.currentAssignment,
        supervisor: newEmployee.supervisor,
        productivityScore: 85,
        attendanceRate: 95,
        trainingHours: 0,
        lastPresenceUpdate: new Date().toISOString(),
        hasSystemAccess: newEmployee.hasSystemAccess,
        username: newEmployee.username,
        role: newEmployee.role,
        accessLevel: newEmployee.accessLevel,
      };

      // Persist in DB
      await employeesService.create({
        name: employee.name,
        position: employee.position,
        department: employee.department,
        shift: employee.shift,
        status: employee.status,
        email: employee.email,
        phone: employee.phone,
        hireDate: employee.hireDate,
        skills: employee.skills,
        certifications: employee.certifications,
        machineOperatingLicense: employee.machineOperatingLicense,
        currentAssignment: employee.currentAssignment,
        supervisor: employee.supervisor,
        productivityScore: employee.productivityScore,
        attendanceRate: employee.attendanceRate,
        trainingHours: employee.trainingHours,
        lastPresenceUpdate: employee.lastPresenceUpdate,
        username: employee.username,
        role: employee.role,
        accessLevel: employee.accessLevel,
        hasSystemAccess: !!employee.hasSystemAccess,
        factoryId: newEmployee.factoryId || undefined,
        factoryName: newEmployee.factoryName || undefined,
      });

      // Create system user if access is granted (local helper)
      if (
        newEmployee.hasSystemAccess &&
        newEmployee.username &&
        newEmployee.password
      ) {
        try {
          await authService.createUser({
            username: newEmployee.username,
            name: newEmployee.name,
            email: newEmployee.email,
            password: newEmployee.password,
            role: newEmployee.role,
            accessLevel: newEmployee.accessLevel,
            isActive: true,
            factoryId: newEmployee.factoryId || undefined,
            factoryName: newEmployee.factoryName || undefined,
          });
        } catch {}
      }

      const refreshed = await employeesService.list();
      setEmployeesList(refreshed as any);
      setNewEmployee({
        name: "",
        position: "",
        department: "Corte BZM",
        shift: "morning",
        email: "",
        phone: "",
        skills: "",
        supervisor: "",
        currentAssignment: "",
        machineOperatingLicense: "",
        certifications: "",
        hasSystemAccess: false,
        username: "",
        role: "operator",
        accessLevel: "limited",
        password: "",
        factoryId: "",
        factoryName: "",
      });
      setShowAddEmployee(false);
    } catch (error) {
      console.error("Erro ao criar funcionário:", error);
      alert(
        "Erro ao criar funcionário: " +
          (error instanceof Error ? error.message : "Erro desconhecido"),
      );
    }
  };

  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    setNewEmployee({
      name: employee.name,
      position: employee.position,
      department: employee.department,
      shift: employee.shift,
      email: employee.email,
      phone: employee.phone,
      skills: employee.skills.join(", "),
      supervisor: employee.supervisor,
      currentAssignment: employee.currentAssignment,
      machineOperatingLicense: employee.machineOperatingLicense.join(", "),
      certifications: employee.certifications.join(", "),
      hasSystemAccess: !!employee.hasSystemAccess,
      username: employee.username || "",
      role: (employee.role || "operator") as any,
      accessLevel: (employee.accessLevel || "limited") as any,
      password: "",
    });
    setShowAddEmployee(true);
  };

  const handleUpdateEmployee = async () => {
    if (!editingEmployee) return;

    const updatedEmployee: Employee = {
      ...editingEmployee,
      name: newEmployee.name,
      position: newEmployee.position,
      department: newEmployee.department,
      shift: newEmployee.shift,
      email: newEmployee.email,
      phone: newEmployee.phone,
      skills: newEmployee.skills
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s),
      certifications: newEmployee.certifications
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s),
      machineOperatingLicense: newEmployee.machineOperatingLicense
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s),
      supervisor: newEmployee.supervisor,
      currentAssignment: newEmployee.currentAssignment,
    };

    try {
      await employeesService.update(editingEmployee.id, {
        name: updatedEmployee.name,
        position: updatedEmployee.position,
        department: updatedEmployee.department,
        shift: updatedEmployee.shift,
        email: updatedEmployee.email,
        phone: updatedEmployee.phone,
        skills: updatedEmployee.skills,
        certifications: updatedEmployee.certifications,
        machineOperatingLicense: updatedEmployee.machineOperatingLicense,
        supervisor: updatedEmployee.supervisor,
        currentAssignment: updatedEmployee.currentAssignment,
        hasSystemAccess: newEmployee.hasSystemAccess,
        username: newEmployee.username || undefined,
        role: newEmployee.role || undefined,
        accessLevel: newEmployee.accessLevel || undefined,
        factoryId: newEmployee.factoryId || undefined,
        factoryName: newEmployee.factoryName || undefined,
      } as any);

      // Se acesso foi concedido ou credenciais alteradas, garantir conta no auth local
      if (newEmployee.hasSystemAccess && newEmployee.username) {
        try {
          await authService.upsertUser({
            username: newEmployee.username,
            name: newEmployee.name || updatedEmployee.name,
            email: newEmployee.email || updatedEmployee.email,
            password: newEmployee.password || undefined,
            role: newEmployee.role as any,
            accessLevel: newEmployee.accessLevel,
            isActive: true,
            ...(newEmployee.factoryId
              ? { factoryId: newEmployee.factoryId }
              : {}),
            ...(newEmployee.factoryName
              ? { factoryName: newEmployee.factoryName }
              : {}),
          } as any);
        } catch {}
      }

      const refreshed = await employeesService.list();
      setEmployeesList(refreshed as any);
    } catch (e) {
      console.error("Erro ao atualizar funcionário", e);
      alert("Erro ao atualizar funcionário");
    }

    setEditingEmployee(null);
    setNewEmployee({
      name: "",
      position: "",
      department: "Corte BZM",
      shift: "morning",
      email: "",
      phone: "",
      skills: "",
      supervisor: "",
      currentAssignment: "",
      machineOperatingLicense: "",
      certifications: "",
    });
    setShowAddEmployee(false);
  };

  const handleDeleteEmployee = async (id: string) => {
    if (!confirm("Tem certeza que deseja remover este funcionário?")) return;
    try {
      await employeesService.remove(id);
      const refreshed = await employeesService.list();
      setEmployeesList(refreshed as any);
    } catch (e) {
      console.error("Erro ao remover", e);
      alert("Erro ao remover funcionário");
    }
  };

  const markPresence = async (
    employeeId: string,
    status: "present" | "absent",
  ) => {
    try {
      await employeesService.update(employeeId, {
        status,
        lastPresenceUpdate: new Date().toISOString(),
      } as any);
      const refreshed = await employeesService.list();
      setEmployeesList(refreshed as any);
    } catch (e) {
      console.error("Erro ao marcar presença", e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Gestão de Equipa
          </h1>
          <p className="text-muted-foreground">
            Controle de funcionários, turnos e formações - Indústria de Corte de
            Espuma
          </p>
        </div>

        <button
          onClick={() => setShowAddEmployee(true)}
          className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Novo Funcionário
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-6">
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total</p>
              <p className="text-2xl font-bold text-card-foreground">
                {totalEmployees}
              </p>
            </div>
            <Users className="h-6 w-6 text-muted-foreground" />
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Presentes
              </p>
              <p className="text-2xl font-bold text-success">
                {presentEmployees}
              </p>
            </div>
            <UserCheck className="h-6 w-6 text-success" />
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Ausentes
              </p>
              <p className="text-2xl font-bold text-destructive">
                {absentEmployees}
              </p>
            </div>
            <UserX className="h-6 w-6 text-destructive" />
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Formação
              </p>
              <p className="text-2xl font-bold text-warning">
                {trainingEmployees}
              </p>
            </div>
            <BookOpen className="h-6 w-6 text-warning" />
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Produtividade
              </p>
              <p className="text-2xl font-bold text-card-foreground">
                {avgProductivity.toFixed(1)}%
              </p>
            </div>
            <TrendingUp className="h-6 w-6 text-success" />
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Frequência
              </p>
              <p className="text-2xl font-bold text-card-foreground">
                {avgAttendance.toFixed(1)}%
              </p>
            </div>
            <Calendar className="h-6 w-6 text-info" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex rounded-lg bg-muted p-1">
        <button
          onClick={() => setActiveTab("employees")}
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-md transition-colors",
            activeTab === "employees"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Funcionários ({employeesList.length})
        </button>
        <button
          onClick={() => setActiveTab("presence")}
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-md transition-colors",
            activeTab === "presence"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Controle de Presença
        </button>
        <button
          onClick={() => setActiveTab("schedule")}
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-md transition-colors",
            activeTab === "schedule"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Escalas ({shiftSchedules.length})
        </button>
        <button
          onClick={() => setActiveTab("training")}
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-md transition-colors",
            activeTab === "training"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Formações ({trainings.length})
        </button>
      </div>

      {/* Content */}
      {activeTab === "employees" ? (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Employee List */}
          <div className="lg:col-span-2">
            <div className="rounded-lg border bg-card">
              <div className="border-b p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-card-foreground">
                    Lista de Funcionários
                  </h3>
                </div>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Buscar funcionário..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full rounded-lg border border-input bg-background pl-10 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="all">Todos</option>
                    <option value="present">Presente</option>
                    <option value="absent">Ausente</option>
                    <option value="vacation">Férias</option>
                    <option value="training">Formação</option>
                  </select>
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto">
                {filteredEmployees.length === 0 ? (
                  <div className="p-8 text-center">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-card-foreground mb-2">
                      Nenhum Funcionário Cadastrado
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Adicione funcionários para começar a gerir a sua equipa de
                      corte de espuma
                    </p>
                    <button
                      onClick={() => setShowAddEmployee(true)}
                      className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90"
                    >
                      Adicionar Primeiro Funcionário
                    </button>
                  </div>
                ) : (
                  filteredEmployees.map((employee) => {
                    const config = statusConfig[employee.status];
                    const StatusIcon = config.icon;

                    return (
                      <div
                        key={employee.id}
                        onClick={() => setSelectedEmployee(employee)}
                        className={cn(
                          "border-b p-4 cursor-pointer hover:bg-muted/50 transition-colors",
                          selectedEmployee?.id === employee.id && "bg-muted/50",
                        )}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium text-card-foreground">
                                {employee.name}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {employee.position}
                              </p>
                            </div>
                          </div>
                          <div
                            className={cn(
                              "flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium",
                              config.color,
                            )}
                          >
                            <StatusIcon className="h-3 w-3" />
                            {config.label}
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            {employee.department} •{" "}
                            {shiftConfig[employee.shift].label}
                          </span>
                          <span className="text-muted-foreground">
                            {employee.currentAssignment || "Não atribuído"}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Employee Details */}
          <div className="lg:col-span-1">
            {selectedEmployee ? (
              <div className="space-y-4">
                <div className="rounded-lg border bg-card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-card-foreground">
                      Detalhes do Funcionário
                    </h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditEmployee(selectedEmployee)}
                        className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
                        title="Editar funcionário"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() =>
                          handleDeleteEmployee(selectedEmployee.id)
                        }
                        className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg"
                        title="Excluir funcionário"
                      >
                        <UserX className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3 text-sm">
                    <div className="text-center mb-4">
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                        <User className="h-8 w-8 text-primary" />
                      </div>
                      <h4 className="font-medium text-card-foreground">
                        {selectedEmployee.name}
                      </h4>
                      <p className="text-muted-foreground">
                        {selectedEmployee.position}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {selectedEmployee.email || "Não informado"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {selectedEmployee.phone || "Não informado"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {selectedEmployee.currentAssignment ||
                            "Não atribuído"}
                        </span>
                      </div>
                    </div>

                    <div className="pt-4 border-t">
                      <div className="flex justify-between mb-2">
                        <span className="text-muted-foreground">
                          Departamento:
                        </span>
                        <span className="font-medium text-card-foreground">
                          {selectedEmployee.department}
                        </span>
                      </div>
                      <div className="flex justify-between mb-2">
                        <span className="text-muted-foreground">Turno:</span>
                        <span className="font-medium text-card-foreground">
                          {shiftConfig[selectedEmployee.shift].label}
                        </span>
                      </div>
                      <div className="flex justify-between mb-2">
                        <span className="text-muted-foreground">
                          Supervisor:
                        </span>
                        <span className="font-medium text-card-foreground">
                          {selectedEmployee.supervisor || "Não definido"}
                        </span>
                      </div>
                      <div className="flex justify-between mb-2">
                        <span className="text-muted-foreground">Admissão:</span>
                        <span className="font-medium text-card-foreground">
                          {new Date(
                            selectedEmployee.hireDate,
                          ).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border bg-card p-6">
                  <h4 className="text-md font-semibold text-card-foreground mb-4">
                    Performance
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-muted-foreground">
                          Produtividade
                        </span>
                        <span className="font-medium text-card-foreground">
                          {selectedEmployee.productivityScore}%
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-success h-2 rounded-full transition-all"
                          style={{
                            width: `${selectedEmployee.productivityScore}%`,
                          }}
                        ></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-muted-foreground">
                          Frequência
                        </span>
                        <span className="font-medium text-card-foreground">
                          {selectedEmployee.attendanceRate}%
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-info h-2 rounded-full transition-all"
                          style={{
                            width: `${selectedEmployee.attendanceRate}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border bg-card p-6">
                  <h4 className="text-md font-semibold text-card-foreground mb-4">
                    Competências
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">
                        Habilidades:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {selectedEmployee.skills.length > 0 ? (
                          selectedEmployee.skills.map((skill, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 text-xs bg-info/10 text-info rounded"
                            >
                              {skill}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Nenhuma habilidade registrada
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">
                        Licenças de Máquinas:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {selectedEmployee.machineOperatingLicense.length > 0 ? (
                          selectedEmployee.machineOperatingLicense.map(
                            (license, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 text-xs bg-warning/10 text-warning rounded flex items-center gap-1"
                              >
                                <Shield className="h-3 w-3" />
                                {license}
                              </span>
                            ),
                          )
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Nenhuma licença registrada
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">
                        Certificações:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {selectedEmployee.certifications.length > 0 ? (
                          selectedEmployee.certifications.map((cert, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 text-xs bg-success/10 text-success rounded flex items-center gap-1"
                            >
                              <Award className="h-3 w-3" />
                              {cert}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Nenhuma certificação registrada
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border bg-card p-8 text-center">
                <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-card-foreground mb-2">
                  Selecione um Funcionário
                </h3>
                <p className="text-muted-foreground">
                  Escolha um funcionário da lista para ver os detalhes
                </p>
              </div>
            )}
          </div>
        </div>
      ) : activeTab === "presence" ? (
        <div className="rounded-lg border bg-card p-6">
          <h3 className="text-lg font-semibold text-card-foreground mb-4">
            Controle de Presença
          </h3>
          <p className="text-muted-foreground mb-6">
            Marque a presença dos funcionários para hoje (
            {new Date().toLocaleDateString("pt-BR")})
          </p>

          {employeesList.length === 0 ? (
            <div className="text-center py-8">
              <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Nenhum funcionário cadastrado para controle de presença
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {employeesList.map((employee) => (
                <div key={employee.id} className="border rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-card-foreground">
                        {employee.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {employee.position}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => markPresence(employee.id, "present")}
                      className={cn(
                        "flex-1 px-3 py-2 text-sm rounded-lg transition-colors",
                        employee.status === "present"
                          ? "bg-success text-success-foreground"
                          : "border border-success text-success hover:bg-success/10",
                      )}
                    >
                      <CheckCircle className="h-4 w-4 inline mr-1" />
                      Presente
                    </button>
                    <button
                      onClick={() => markPresence(employee.id, "absent")}
                      className={cn(
                        "flex-1 px-3 py-2 text-sm rounded-lg transition-colors",
                        employee.status === "absent"
                          ? "bg-destructive text-destructive-foreground"
                          : "border border-destructive text-destructive hover:bg-destructive/10",
                      )}
                    >
                      <UserX className="h-4 w-4 inline mr-1" />
                      Ausente
                    </button>
                  </div>

                  {employee.lastPresenceUpdate && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Última atualização:{" "}
                      {new Date(employee.lastPresenceUpdate).toLocaleTimeString(
                        "pt-BR",
                      )}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === "schedule" ? (
        <div className="rounded-lg border bg-card p-6">
          <h3 className="text-lg font-semibold text-card-foreground mb-4">
            Gestão de Escalas
          </h3>
          <p className="text-muted-foreground text-center py-8">
            Sistema de escalas em desenvolvimento. Funcionalidade será
            implementada com base nas necessidades específicas de turnos da
            fábrica de corte de espuma.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card p-6">
          <h3 className="text-lg font-semibold text-card-foreground mb-4">
            Gestão de Formações
          </h3>
          <p className="text-muted-foreground text-center py-8">
            Sistema de formações em desenvolvimento. Incluirá formações
            específicas para operação de máquinas de corte de espuma, segurança
            e qualidade.
          </p>
        </div>
      )}

      {/* Modal de Adicionar/Editar Funcionário */}
      {showAddEmployee && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-background rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold">
                  {editingEmployee ? "Editar Funcionário" : "Novo Funcionário"}
                </h3>
                <button
                  onClick={() => {
                    setShowAddEmployee(false);
                    setEditingEmployee(null);
                    setNewEmployee({
                      name: "",
                      position: "",
                      department: "Corte BZM",
                      shift: "morning",
                      email: "",
                      phone: "",
                      skills: "",
                      supervisor: "",
                      currentAssignment: "",
                      machineOperatingLicense: "",
                      certifications: "",
                      hasSystemAccess: false,
                      username: "",
                      role: "operator",
                      accessLevel: "limited",
                      password: "",
                      factoryId: "",
                      factoryName: "",
                    });
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Nome Completo *
                    </label>
                    <input
                      type="text"
                      value={newEmployee.name}
                      onChange={(e) =>
                        setNewEmployee((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border rounded-lg bg-background"
                      placeholder="Ex: João Silva"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Cargo *
                    </label>
                    <select
                      value={newEmployee.position}
                      onChange={(e) =>
                        setNewEmployee((prev) => ({
                          ...prev,
                          position: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border rounded-lg bg-background"
                      required
                    >
                      <option value="">Selecione o cargo</option>
                      {foamCuttingPositions.map((position) => (
                        <option key={position} value={position}>
                          {position}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Departamento
                    </label>
                    <select
                      value={newEmployee.department}
                      onChange={(e) =>
                        setNewEmployee((prev) => ({
                          ...prev,
                          department: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border rounded-lg bg-background"
                    >
                      {foamCuttingDepartments.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Turno
                    </label>
                    <select
                      value={newEmployee.shift}
                      onChange={(e) =>
                        setNewEmployee((prev) => ({
                          ...prev,
                          shift: e.target.value as any,
                        }))
                      }
                      className="w-full px-3 py-2 border rounded-lg bg-background"
                    >
                      <option value="morning">Manhã (06:00-14:00)</option>
                      <option value="afternoon">Tarde (14:00-22:00)</option>
                      <option value="night">Noite (22:00-06:00)</option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={newEmployee.email}
                      onChange={(e) =>
                        setNewEmployee((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border rounded-lg bg-background"
                      placeholder="funcionario@empresa.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Telefone
                    </label>
                    <input
                      type="tel"
                      value={newEmployee.phone}
                      onChange={(e) =>
                        setNewEmployee((prev) => ({
                          ...prev,
                          phone: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border rounded-lg bg-background"
                      placeholder="+351 123 456 789"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Competências Técnicas
                  </label>
                  <input
                    type="text"
                    value={newEmployee.skills}
                    onChange={(e) =>
                      setNewEmployee((prev) => ({
                        ...prev,
                        skills: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border rounded-lg bg-background"
                    placeholder="Ex: Operação BZM, Controle de qualidade (separar por vírgulas)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Licenças de Operação de Máquinas
                  </label>
                  <input
                    type="text"
                    value={newEmployee.machineOperatingLicense}
                    onChange={(e) =>
                      setNewEmployee((prev) => ({
                        ...prev,
                        machineOperatingLicense: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border rounded-lg bg-background"
                    placeholder="Ex: BZM-01, Carrossel-01 (separar por vírgulas)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Certificações
                  </label>
                  <input
                    type="text"
                    value={newEmployee.certifications}
                    onChange={(e) =>
                      setNewEmployee((prev) => ({
                        ...prev,
                        certifications: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border rounded-lg bg-background"
                    placeholder="Ex: NR-12, Operador de Máquinas (separar por vírgulas)"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Supervisor
                    </label>
                    <input
                      type="text"
                      value={newEmployee.supervisor}
                      onChange={(e) =>
                        setNewEmployee((prev) => ({
                          ...prev,
                          supervisor: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border rounded-lg bg-background"
                      placeholder="Nome do supervisor"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Posto de Trabalho Atual
                    </label>
                    <input
                      type="text"
                      value={newEmployee.currentAssignment}
                      onChange={(e) =>
                        setNewEmployee((prev) => ({
                          ...prev,
                          currentAssignment: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border rounded-lg bg-background"
                      placeholder="Ex: BZM-01, Carrossel-01"
                    />
                  </div>
                </div>

                {/* Factory association */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      ID da Fábrica
                    </label>
                    <input
                      type="text"
                      value={newEmployee.factoryId}
                      onChange={(e) =>
                        setNewEmployee((prev) => ({
                          ...prev,
                          factoryId: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border rounded-lg bg-background"
                      placeholder="Ex: fac-porto"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Nome da Fábrica
                    </label>
                    <input
                      type="text"
                      value={newEmployee.factoryName}
                      onChange={(e) =>
                        setNewEmployee((prev) => ({
                          ...prev,
                          factoryName: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border rounded-lg bg-background"
                      placeholder="Ex: Fábrica Porto"
                    />
                  </div>
                </div>

                {/* System Access */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <input
                      type="checkbox"
                      id="systemAccess"
                      checked={newEmployee.hasSystemAccess}
                      onChange={(e) =>
                        setNewEmployee((prev) => ({
                          ...prev,
                          hasSystemAccess: e.target.checked,
                        }))
                      }
                      className="rounded border-input"
                    />
                    <label
                      htmlFor="systemAccess"
                      className="text-sm font-medium"
                    >
                      Dar acesso ao sistema FactoryControl
                    </label>
                  </div>

                  {newEmployee.hasSystemAccess && (
                    <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                      <h5 className="font-medium text-foreground">
                        Credenciais de Acesso
                      </h5>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Nome de Utilizador *
                          </label>
                          <input
                            type="text"
                            value={newEmployee.username}
                            onChange={(e) =>
                              setNewEmployee((prev) => ({
                                ...prev,
                                username: e.target.value,
                              }))
                            }
                            className="w-full px-3 py-2 border rounded-lg bg-background"
                            placeholder="Ex: joao.silva"
                            required={newEmployee.hasSystemAccess}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Palavra-passe *
                          </label>
                          <input
                            type="password"
                            value={newEmployee.password}
                            onChange={(e) =>
                              setNewEmployee((prev) => ({
                                ...prev,
                                password: e.target.value,
                              }))
                            }
                            className="w-full px-3 py-2 border rounded-lg bg-background"
                            placeholder="Palavra-passe segura"
                            required={newEmployee.hasSystemAccess}
                          />
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Perfil de Acesso
                          </label>
                          <select
                            value={newEmployee.role}
                            onChange={(e) =>
                              setNewEmployee((prev) => ({
                                ...prev,
                                role: e.target.value as any,
                              }))
                            }
                            className="w-full px-3 py-2 border rounded-lg bg-background"
                          >
                            <option value="operator">Operador</option>
                            <option value="quality">Qualidade</option>
                            <option value="maintenance">Manutenção</option>
                            <option value="supervisor">Supervisor</option>
                            <option value="admin">Administrador</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Nível de Acesso
                          </label>
                          <select
                            value={newEmployee.accessLevel}
                            onChange={(e) =>
                              setNewEmployee((prev) => ({
                                ...prev,
                                accessLevel: e.target.value as any,
                              }))
                            }
                            className="w-full px-3 py-2 border rounded-lg bg-background"
                          >
                            <option value="readonly">Apenas Leitura</option>
                            <option value="limited">Limitado</option>
                            <option value="full">Completo</option>
                          </select>
                        </div>
                      </div>

                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>
                          <strong>Perfis:</strong>
                        </p>
                        <p>
                          • <strong>Operador:</strong> Portal operador,
                          visualização básica
                        </p>
                        <p>
                          • <strong>Qualidade:</strong> Controle de qualidade +
                          operador
                        </p>
                        <p>
                          • <strong>Manutenção:</strong> Gestão de manutenção +
                          anteriores
                        </p>
                        <p>
                          • <strong>Supervisor:</strong> Gest��o completa exceto
                          admin
                        </p>
                        <p>
                          • <strong>Administrador:</strong> Acesso total ao
                          sistema
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t mt-6">
                <button
                  onClick={() => {
                    setShowAddEmployee(false);
                    setEditingEmployee(null);
                    setNewEmployee({
                      name: "",
                      position: "",
                      department: "Corte BZM",
                      shift: "morning",
                      email: "",
                      phone: "",
                      skills: "",
                      supervisor: "",
                      currentAssignment: "",
                      machineOperatingLicense: "",
                      certifications: "",
                      hasSystemAccess: false,
                      username: "",
                      role: "operator",
                      accessLevel: "limited",
                      password: "",
                      factoryId: "",
                      factoryName: "",
                    });
                  }}
                  className="px-4 py-2 border rounded-lg hover:bg-muted"
                >
                  Cancelar
                </button>
                <button
                  onClick={
                    editingEmployee ? handleUpdateEmployee : handleAddEmployee
                  }
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                >
                  {editingEmployee ? "Atualizar" : "Adicionar"} Funcionário
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
