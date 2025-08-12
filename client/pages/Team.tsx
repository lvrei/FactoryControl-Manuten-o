import { useState } from "react";
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
  TrendingUp
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Employee {
  id: string;
  name: string;
  position: string;
  department: string;
  shift: 'morning' | 'afternoon' | 'night';
  status: 'active' | 'absent' | 'vacation' | 'training';
  email: string;
  phone: string;
  hireDate: string;
  skills: string[];
  certifications: string[];
  currentAssignment: string;
  supervisor: string;
  productivityScore: number;
  attendanceRate: number;
}

interface ShiftSchedule {
  id: string;
  shift: 'morning' | 'afternoon' | 'night';
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
  status: 'scheduled' | 'present' | 'absent' | 'late';
}

interface Training {
  id: string;
  title: string;
  type: 'safety' | 'technical' | 'quality' | 'compliance';
  status: 'scheduled' | 'in_progress' | 'completed';
  startDate: string;
  duration: number;
  instructor: string;
  participants: string[];
  location: string;
}

const employees: Employee[] = [
  {
    id: "1",
    name: "João Silva",
    position: "Operador de Máquina",
    department: "Produção",
    shift: "morning",
    status: "active",
    email: "joao.silva@empresa.com",
    phone: "(11) 99999-0001",
    hireDate: "2020-03-15",
    skills: ["Prensa Hidráulica", "CNC", "Soldagem"],
    certifications: ["NR-12", "Operador CNC"],
    currentAssignment: "Linha 1 - Prensa",
    supervisor: "Carlos Mendes",
    productivityScore: 92,
    attendanceRate: 98
  },
  {
    id: "2",
    name: "Maria Santos",
    position: "Técnica de Qualidade",
    department: "Qualidade",
    shift: "afternoon",
    status: "active",
    email: "maria.santos@empresa.com",
    phone: "(11) 99999-0002", 
    hireDate: "2019-07-22",
    skills: ["Inspeção", "Metrologia", "ISO 9001"],
    certifications: ["Inspetor de Qualidade", "Auditor Interno"],
    currentAssignment: "Laboratório de Qualidade",
    supervisor: "Ana Silva",
    productivityScore: 96,
    attendanceRate: 99
  },
  {
    id: "3",
    name: "Pedro Costa",
    position: "Mecânico de Manutenção",
    department: "Manutenção",
    shift: "night",
    status: "training",
    email: "pedro.costa@empresa.com",
    phone: "(11) 99999-0003",
    hireDate: "2021-01-10",
    skills: ["Manutenção Mecânica", "Pneumática", "Hidráulica"],
    certifications: ["NR-10", "Mecânico Industrial"],
    currentAssignment: "Manutenção Preventiva",
    supervisor: "Roberto Santos",
    productivityScore: 88,
    attendanceRate: 95
  },
  {
    id: "4",
    name: "Ana Oliveira",
    position: "Supervisora de Produção",
    department: "Produção",
    shift: "morning",
    status: "active",
    email: "ana.oliveira@empresa.com",
    phone: "(11) 99999-0004",
    hireDate: "2018-05-03",
    skills: ["Liderança", "Planejamento", "Lean Manufacturing"],
    certifications: ["Supervisor de Produção", "Green Belt"],
    currentAssignment: "Supervisão Geral",
    supervisor: "Diretor de Produção",
    productivityScore: 94,
    attendanceRate: 97
  }
];

const shiftSchedules: ShiftSchedule[] = [
  {
    id: "1",
    shift: "morning",
    date: "2024-01-23",
    startTime: "06:00",
    endTime: "14:00",
    requiredStaff: 12,
    assignedStaff: 11,
    supervisor: "Ana Oliveira",
    assignments: [
      { employeeId: "1", employeeName: "João Silva", position: "Operador", station: "Linha 1", status: "present" },
      { employeeId: "4", employeeName: "Ana Oliveira", position: "Supervisora", station: "Supervisão", status: "present" }
    ]
  },
  {
    id: "2",
    shift: "afternoon",
    date: "2024-01-23",
    startTime: "14:00",
    endTime: "22:00",
    requiredStaff: 10,
    assignedStaff: 9,
    supervisor: "Carlos Mendes",
    assignments: [
      { employeeId: "2", employeeName: "Maria Santos", position: "Técnica", station: "Qualidade", status: "present" }
    ]
  },
  {
    id: "3",
    shift: "night",
    date: "2024-01-23",
    startTime: "22:00",
    endTime: "06:00",
    requiredStaff: 8,
    assignedStaff: 8,
    supervisor: "Roberto Santos",
    assignments: [
      { employeeId: "3", employeeName: "Pedro Costa", position: "Mecânico", station: "Manutenção", status: "present" }
    ]
  }
];

const trainings: Training[] = [
  {
    id: "1",
    title: "Segurança em Máquinas - NR-12",
    type: "safety",
    status: "scheduled",
    startDate: "2024-01-25T08:00",
    duration: 8,
    instructor: "José Segurança",
    participants: ["1", "3"],
    location: "Sala de Treinamento A"
  },
  {
    id: "2",
    title: "Lean Manufacturing Básico",
    type: "technical",
    status: "in_progress",
    startDate: "2024-01-22T14:00",
    duration: 16,
    instructor: "Consultora Externa",
    participants: ["4"],
    location: "Auditório"
  }
];

const statusConfig = {
  active: { color: "text-success bg-success/10", label: "Ativo", icon: CheckCircle },
  absent: { color: "text-destructive bg-destructive/10", label: "Ausente", icon: UserX },
  vacation: { color: "text-info bg-info/10", label: "Férias", icon: Calendar },
  training: { color: "text-warning bg-warning/10", label: "Treinamento", icon: BookOpen }
};

const shiftConfig = {
  morning: { label: "Manhã", color: "text-info", time: "06:00 - 14:00" },
  afternoon: { label: "Tarde", color: "text-warning", time: "14:00 - 22:00" },
  night: { label: "Noite", color: "text-purple-600", time: "22:00 - 06:00" }
};

const trainingTypeConfig = {
  safety: { label: "Segurança", color: "text-destructive bg-destructive/10" },
  technical: { label: "Técnico", color: "text-info bg-info/10" },
  quality: { label: "Qualidade", color: "text-success bg-success/10" },
  compliance: { label: "Compliance", color: "text-warning bg-warning/10" }
};

export default function Team() {
  const [activeTab, setActiveTab] = useState<'employees' | 'schedule' | 'training'>('employees');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         employee.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         employee.department.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || employee.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalEmployees = employees.length;
  const activeEmployees = employees.filter(e => e.status === 'active').length;
  const absentEmployees = employees.filter(e => e.status === 'absent').length;
  const trainingEmployees = employees.filter(e => e.status === 'training').length;

  const avgProductivity = employees.reduce((sum, e) => sum + e.productivityScore, 0) / employees.length;
  const avgAttendance = employees.reduce((sum, e) => sum + e.attendanceRate, 0) / employees.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gestão de Equipe</h1>
          <p className="text-muted-foreground">
            Controle de funcionários, turnos e treinamentos
          </p>
        </div>
        
        <button className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 flex items-center gap-2">
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
              <p className="text-2xl font-bold text-card-foreground">{totalEmployees}</p>
            </div>
            <Users className="h-6 w-6 text-muted-foreground" />
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Ativos</p>
              <p className="text-2xl font-bold text-success">{activeEmployees}</p>
            </div>
            <UserCheck className="h-6 w-6 text-success" />
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Ausentes</p>
              <p className="text-2xl font-bold text-destructive">{absentEmployees}</p>
            </div>
            <UserX className="h-6 w-6 text-destructive" />
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Treinamento</p>
              <p className="text-2xl font-bold text-warning">{trainingEmployees}</p>
            </div>
            <BookOpen className="h-6 w-6 text-warning" />
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Produtividade</p>
              <p className="text-2xl font-bold text-card-foreground">{avgProductivity.toFixed(1)}%</p>
            </div>
            <TrendingUp className="h-6 w-6 text-success" />
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Frequência</p>
              <p className="text-2xl font-bold text-card-foreground">{avgAttendance.toFixed(1)}%</p>
            </div>
            <Calendar className="h-6 w-6 text-info" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex rounded-lg bg-muted p-1">
        <button
          onClick={() => setActiveTab('employees')}
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-md transition-colors",
            activeTab === 'employees'
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Funcionários ({employees.length})
        </button>
        <button
          onClick={() => setActiveTab('schedule')}
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-md transition-colors",
            activeTab === 'schedule'
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Escalas ({shiftSchedules.length})
        </button>
        <button
          onClick={() => setActiveTab('training')}
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-md transition-colors",
            activeTab === 'training'
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Treinamentos ({trainings.length})
        </button>
      </div>

      {/* Content */}
      {activeTab === 'employees' ? (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Employee List */}
          <div className="lg:col-span-2">
            <div className="rounded-lg border bg-card">
              <div className="border-b p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-card-foreground">Lista de Funcionários</h3>
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
                    <option value="active">Ativo</option>
                    <option value="absent">Ausente</option>
                    <option value="vacation">Férias</option>
                    <option value="training">Treinamento</option>
                  </select>
                </div>
              </div>
              
              <div className="max-h-96 overflow-y-auto">
                {filteredEmployees.map((employee) => {
                  const config = statusConfig[employee.status];
                  const StatusIcon = config.icon;
                  
                  return (
                    <div
                      key={employee.id}
                      onClick={() => setSelectedEmployee(employee)}
                      className={cn(
                        "border-b p-4 cursor-pointer hover:bg-muted/50 transition-colors",
                        selectedEmployee?.id === employee.id && "bg-muted/50"
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-card-foreground">{employee.name}</p>
                            <p className="text-sm text-muted-foreground">{employee.position}</p>
                          </div>
                        </div>
                        <div className={cn("flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium", config.color)}>
                          <StatusIcon className="h-3 w-3" />
                          {config.label}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {employee.department} • {shiftConfig[employee.shift].label}
                        </span>
                        <span className="text-muted-foreground">
                          {employee.currentAssignment}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Employee Details */}
          <div className="lg:col-span-1">
            {selectedEmployee ? (
              <div className="space-y-4">
                <div className="rounded-lg border bg-card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-card-foreground">Detalhes do Funcionário</h3>
                    <div className="flex gap-2">
                      <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg">
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3 text-sm">
                    <div className="text-center mb-4">
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                        <User className="h-8 w-8 text-primary" />
                      </div>
                      <h4 className="font-medium text-card-foreground">{selectedEmployee.name}</h4>
                      <p className="text-muted-foreground">{selectedEmployee.position}</p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">{selectedEmployee.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">{selectedEmployee.phone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">{selectedEmployee.currentAssignment}</span>
                      </div>
                    </div>

                    <div className="pt-4 border-t">
                      <div className="flex justify-between mb-2">
                        <span className="text-muted-foreground">Departamento:</span>
                        <span className="font-medium text-card-foreground">{selectedEmployee.department}</span>
                      </div>
                      <div className="flex justify-between mb-2">
                        <span className="text-muted-foreground">Turno:</span>
                        <span className="font-medium text-card-foreground">{shiftConfig[selectedEmployee.shift].label}</span>
                      </div>
                      <div className="flex justify-between mb-2">
                        <span className="text-muted-foreground">Supervisor:</span>
                        <span className="font-medium text-card-foreground">{selectedEmployee.supervisor}</span>
                      </div>
                      <div className="flex justify-between mb-2">
                        <span className="text-muted-foreground">Admissão:</span>
                        <span className="font-medium text-card-foreground">
                          {new Date(selectedEmployee.hireDate).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border bg-card p-6">
                  <h4 className="text-md font-semibold text-card-foreground mb-4">Performance</h4>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-muted-foreground">Produtividade</span>
                        <span className="font-medium text-card-foreground">{selectedEmployee.productivityScore}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-success h-2 rounded-full transition-all"
                          style={{ width: `${selectedEmployee.productivityScore}%` }}
                        ></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-muted-foreground">Frequência</span>
                        <span className="font-medium text-card-foreground">{selectedEmployee.attendanceRate}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-info h-2 rounded-full transition-all"
                          style={{ width: `${selectedEmployee.attendanceRate}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border bg-card p-6">
                  <h4 className="text-md font-semibold text-card-foreground mb-4">Competências</h4>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">Habilidades:</p>
                      <div className="flex flex-wrap gap-1">
                        {selectedEmployee.skills.map((skill, index) => (
                          <span key={index} className="px-2 py-1 text-xs bg-info/10 text-info rounded">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">Certificações:</p>
                      <div className="flex flex-wrap gap-1">
                        {selectedEmployee.certifications.map((cert, index) => (
                          <span key={index} className="px-2 py-1 text-xs bg-success/10 text-success rounded flex items-center gap-1">
                            <Award className="h-3 w-3" />
                            {cert}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border bg-card p-8 text-center">
                <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-card-foreground mb-2">Selecione um Funcionário</h3>
                <p className="text-muted-foreground">
                  Escolha um funcionário da lista para ver os detalhes
                </p>
              </div>
            )}
          </div>
        </div>
      ) : activeTab === 'schedule' ? (
        <div className="space-y-6">
          {shiftSchedules.map((schedule) => {
            const shiftInfo = shiftConfig[schedule.shift];
            const staffingRate = (schedule.assignedStaff / schedule.requiredStaff) * 100;
            
            return (
              <div key={schedule.id} className="rounded-lg border bg-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-card-foreground">
                      Turno da {shiftInfo.label} - {new Date(schedule.date).toLocaleDateString('pt-BR')}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {shiftInfo.time} • Supervisor: {schedule.supervisor}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-card-foreground">
                      {schedule.assignedStaff}/{schedule.requiredStaff} funcionários
                    </p>
                    <div className={cn(
                      "text-xs",
                      staffingRate >= 100 ? "text-success" : staffingRate >= 80 ? "text-warning" : "text-destructive"
                    )}>
                      {staffingRate.toFixed(0)}% da capacidade
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {schedule.assignments.map((assignment, index) => (
                    <div key={index} className="p-3 rounded-lg border bg-muted/50">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium text-card-foreground">{assignment.employeeName}</p>
                        <span className={cn(
                          "text-xs px-2 py-1 rounded",
                          assignment.status === 'present' ? "bg-success/10 text-success" :
                          assignment.status === 'late' ? "bg-warning/10 text-warning" :
                          assignment.status === 'absent' ? "bg-destructive/10 text-destructive" :
                          "bg-muted text-muted-foreground"
                        )}>
                          {assignment.status === 'present' ? 'Presente' :
                           assignment.status === 'late' ? 'Atrasado' :
                           assignment.status === 'absent' ? 'Ausente' : 'Agendado'}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{assignment.position}</p>
                      <p className="text-sm text-muted-foreground">{assignment.station}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-6">
          {trainings.map((training) => {
            const typeConfig = trainingTypeConfig[training.type];
            
            return (
              <div key={training.id} className="rounded-lg border bg-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-card-foreground">{training.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      Instrutor: {training.instructor} • Local: {training.location}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-medium", typeConfig.color)}>
                      {typeConfig.label}
                    </span>
                    <p className="text-sm text-muted-foreground mt-1">
                      {training.duration}h de duração
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {new Date(training.startDate).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {training.participants.length} participantes
                      </span>
                    </div>
                  </div>
                  <span className={cn(
                    "px-2 py-1 text-xs rounded",
                    training.status === 'completed' ? "bg-success/10 text-success" :
                    training.status === 'in_progress' ? "bg-warning/10 text-warning" :
                    "bg-info/10 text-info"
                  )}>
                    {training.status === 'completed' ? 'Concluído' :
                     training.status === 'in_progress' ? 'Em Andamento' : 'Agendado'}
                  </span>
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Participantes:</p>
                  <div className="flex flex-wrap gap-2">
                    {training.participants.map((participantId) => {
                      const participant = employees.find(e => e.id === participantId);
                      return participant ? (
                        <span key={participantId} className="px-2 py-1 text-xs bg-muted text-card-foreground rounded">
                          {participant.name}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
