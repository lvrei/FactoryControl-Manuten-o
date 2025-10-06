import { apiFetch } from "@/config/api";
export type EmployeeRecord = {
  id: string;
  name: string;
  position: string;
  department: string;
  shift: "morning" | "afternoon" | "night";
  status: "present" | "absent" | "vacation" | "training";
  email?: string;
  phone?: string;
  hireDate?: string;
  skills: string[];
  certifications: string[];
  machineOperatingLicense: string[];
  currentAssignment?: string;
  supervisor?: string;
  productivityScore?: number;
  attendanceRate?: number;
  trainingHours?: number;
  lastPresenceUpdate?: string;
  username?: string;
  role?: "admin" | "supervisor" | "operator" | "quality" | "maintenance";
  accessLevel?: "full" | "limited" | "readonly";
  hasSystemAccess?: boolean;
  factoryId?: string;
  factoryName?: string;
};

class EmployeesService {
  async list(): Promise<EmployeeRecord[]> {
    const r = await apiFetch("api/employees");
    if (!r.ok) throw new Error("Falha ao listar funcionários");
    return r.json();
  }
  async create(emp: Omit<EmployeeRecord, "id">): Promise<string> {
    const r = await apiFetch("api/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(emp),
    });
    if (!r.ok) throw new Error("Falha ao criar funcionário");
    const j = await r.json();
    return j.id as string;
  }
  async update(id: string, patch: Partial<EmployeeRecord>): Promise<void> {
    const r = await apiFetch(`api/employees/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!r.ok) throw new Error("Falha ao atualizar funcionário");
  }
  async remove(id: string): Promise<void> {
    const r = await apiFetch(`api/employees/${id}`, { method: "DELETE" });
    if (!r.ok) throw new Error("Falha ao remover funcionário");
  }
}

export const employeesService = new EmployeesService();
