import { apiFetch } from "@/config/api";

export interface MaintenanceSchedule {
  id: string;
  equipment_id: string;
  maintenance_type: string;
  description?: string;
  interval_days: number;
  last_scheduled_date?: string;
  next_due_date?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const equipmentScheduleService = {
  async getSchedules(equipmentId?: string): Promise<MaintenanceSchedule[]> {
    const path = equipmentId
      ? `equipment-schedules?equipment_id=${equipmentId}`
      : "equipment-schedules";

    try {
      const response = await apiFetch(path);
      if (response.ok) {
        return await response.json();
      }
      return [];
    } catch (error) {
      console.error("Erro ao carregar agendamentos:", error);
      return [];
    }
  },

  async createSchedule(
    schedule: Omit<MaintenanceSchedule, "id" | "created_at" | "updated_at">
  ): Promise<string> {
    try {
      const response = await apiFetch("equipment-schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(schedule),
      });

      if (response.ok) {
        const data = await response.json();
        return data.id;
      }

      throw new Error("Erro ao criar agendamento");
    } catch (error) {
      console.error("Erro ao criar agendamento:", error);
      throw error;
    }
  },

  async updateSchedule(
    id: string,
    schedule: Partial<MaintenanceSchedule>
  ): Promise<void> {
    try {
      const response = await apiFetch(`equipment-schedules/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(schedule),
      });

      if (!response.ok) {
        throw new Error("Erro ao atualizar agendamento");
      }
    } catch (error) {
      console.error("Erro ao atualizar agendamento:", error);
      throw error;
    }
  },

  async deleteSchedule(id: string): Promise<void> {
    try {
      const response = await apiFetch(`equipment-schedules/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Erro ao eliminar agendamento");
      }
    } catch (error) {
      console.error("Erro ao eliminar agendamento:", error);
      throw error;
    }
  },

  async rescheduleAfterCompletion(scheduleId: string): Promise<void> {
    try {
      const response = await apiFetch(
        `equipment-schedules/${scheduleId}/reschedule`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (!response.ok) {
        throw new Error("Erro ao reagendar manutenção");
      }
    } catch (error) {
      console.error("Erro ao reagendar manutenção:", error);
      throw error;
    }
  },
};
