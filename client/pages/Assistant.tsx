import { useState } from 'react';
import { agentsService } from '@/services/agentsService';
import { productionService } from '@/services/productionService';

export default function Assistant() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string>('');
  const [sources, setSources] = useState<any[]>([]);
  const [machineId, setMachineId] = useState<string>('');
  const [machines, setMachines] = useState<{ id: string; name: string }[]>([]);

  const [triageType, setTriageType] = useState('alert');
  const [severity, setSeverity] = useState('medium');
  const [metric, setMetric] = useState('');
  const [value, setValue] = useState<string>('');
  const [triage, setTriage] = useState<{ priority: string; actions: string[]; rationale: string } | null>(null);

  async function ensureMachines() {
    if (machines.length === 0) {
      const ms = await productionService.getMachines();
      setMachines(ms.map((m) => ({ id: m.id, name: m.name })));
    }
  }

  const onAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    await ensureMachines();
    const res = await agentsService.ask(question, { machineId: machineId || undefined, limit: 8 });
    setAnswer(res.answer);
    setSources(res.sources);
  };

  const onTriage = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = value ? Number(value) : undefined;
    const res = await agentsService.triage({ type: triageType, severity, metric: metric || undefined, value: val, machineId: machineId || undefined });
    setTriage(res);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Assistente</h1>
        <p className="text-muted-foreground">Pergunte em linguagem natural e triagem eventos com regras inteligentes.</p>
      </div>

      <form onSubmit={onAsk} className="space-y-3">
        <div className="grid gap-3 md:grid-cols-4">
          <input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ex: histórico de paragens da BZM ontem" className="md:col-span-3 px-3 py-2 border rounded-lg bg-background" />
          <select value={machineId} onChange={(e) => setMachineId(e.target.value)} className="px-3 py-2 border rounded-lg bg-background" onFocus={ensureMachines}>
            <option value="">Todas as máquinas</option>
            {machines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        <div className="flex justify-end">
          <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">Perguntar</button>
        </div>
      </form>

      {answer && (
        <div className="space-y-2">
          <div className="font-medium">Resposta</div>
          <div className="border rounded-lg p-3 bg-card">{answer}</div>
          <div className="font-medium">Fontes</div>
          <div className="space-y-2">
            {sources.map((s) => (
              <div key={s.type+':'+s.id} className="border rounded-lg p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{s.type}</span>
                  <span className="text-xs text-muted-foreground">score {s.score}</span>
                </div>
                <div className="text-muted-foreground mt-1">{s.text}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={onTriage} className="space-y-3 border-t pt-6">
        <div className="font-medium">Triagem de Evento</div>
        <div className="grid gap-3 md:grid-cols-4">
          <select value={triageType} onChange={(e) => setTriageType(e.target.value)} className="px-3 py-2 border rounded-lg bg-background">
            <option value="alert">Alerta</option>
            <option value="downtime">Paragem</option>
            <option value="maintenance_request">Pedido de Manutenção</option>
          </select>
          <select value={severity} onChange={(e) => setSeverity(e.target.value)} className="px-3 py-2 border rounded-lg bg-background">
            <option value="low">Baixa</option>
            <option value="medium">Média</option>
            <option value="high">Alta</option>
            <option value="critical">Crítica</option>
          </select>
          <input value={metric} onChange={(e) => setMetric(e.target.value)} placeholder="Métrica (opcional)" className="px-3 py-2 border rounded-lg bg-background" />
          <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Valor (opcional)" className="px-3 py-2 border rounded-lg bg-background" />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <select value={machineId} onChange={(e) => setMachineId(e.target.value)} className="px-3 py-2 border rounded-lg bg-background" onFocus={ensureMachines}>
            <option value="">Sem máquina</option>
            {machines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">Triar</button>
        </div>
      </form>

      {triage && (
        <div className="space-y-2">
          <div className="font-medium">Resultado</div>
          <div className="border rounded-lg p-3 bg-card">
            <div><span className="text-muted-foreground">Prioridade:</span> <span className="font-medium">{triage.priority}</span></div>
            <div className="text-muted-foreground mt-2">Ações sugeridas:</div>
            <ul className="list-disc ml-6">
              {triage.actions.map((a, i) => (<li key={i}>{a}</li>))}
            </ul>
            <div className="text-xs text-muted-foreground mt-2">{triage.rationale}</div>
          </div>
        </div>
      )}
    </div>
  );
}
