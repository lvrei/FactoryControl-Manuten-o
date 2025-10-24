import { apiFetch } from "@/config/api";
export type AskResponse = { answer: string; sources: Array<{ type: string; id: string; score: number; text: string; meta?: any }>; };
export type TriageInput = { type: string; machineId?: string; metric?: string; value?: number; severity?: string; message?: string };
export type TriageResponse = { priority: string; actions: string[]; rationale: string };

class AgentsService {
  async ask(question: string, opts?: { machineId?: string; limit?: number }): Promise<AskResponse> {
    const resp = await apiFetch('agents/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, ...(opts || {}) }),
    });
    if (!resp.ok) throw new Error('Falha no agente (ask)');
    return resp.json();
  }

  async triage(event: TriageInput): Promise<TriageResponse> {
    const resp = await apiFetch('agents/triage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });
    if (!resp.ok) throw new Error('Falha no agente (triage)');
    return resp.json();
  }
}

export const agentsService = new AgentsService();
