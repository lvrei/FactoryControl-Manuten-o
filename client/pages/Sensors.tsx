import { useEffect, useMemo, useState } from "react";
import { iotService, Sensor, SensorRule, Alert } from "@/services/iotService";
import { ProductionFilters } from "@/types/production";

import { apiFetch } from "@/config/api";

export default function SensorsPage() {
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [machines, setMachines] = useState<any[]>([]);
  const [rules, setRules] = useState<SensorRule[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);

  const [newSensor, setNewSensor] = useState({
    name: "",
    type: "motor",
    protocol: "OPC_UA",
    address: "",
  });
  const [binding, setBinding] = useState({
    sensorId: "",
    machineId: "",
    metric: "current",
    unit: "A",
  });
  const [rule, setRule] = useState({
    machineId: "",
    sensorId: "",
    metric: "current",
    operator: "range",
    minValue: 0,
    maxValue: 10,
    priority: "high",
    message: "Corrente fora da faixa",
  });
  const [testValue, setTestValue] = useState<number>(0);

  async function loadAll() {
    setLoading(true);
    try {
      const [sns, rls, alr] = await Promise.all([
        iotService.listSensors(),
        iotService.listRules(),
        iotService.listAlerts("active"),
      ]);
      setSensors(sns);
      setRules(rls);
      setAlerts(alr);
      // Load machines from API
      const resp = await apiFetch("machines");
      const m = await resp.json();
      setMachines(m);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (sensors.length && !binding.sensorId)
      setBinding((b) => ({ ...b, sensorId: sensors[0]?.id || "" }));
    if (machines.length && !binding.machineId)
      setBinding((b) => ({ ...b, machineId: machines[0]?.id || "" }));
  }, [sensors, machines]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Sensores e Integrações</h1>
      <p className="text-sm text-muted-foreground">
        Associe rapidamente sensores aos equipamentos e crie regras para
        alertas/alarms.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 1. Criar Sensor */}
        <div className="p-4 border rounded-lg bg-card">
          <h2 className="font-semibold mb-3">1) Criar Sensor</h2>
          <div className="space-y-3">
            <input
              className="w-full px-3 py-2 border rounded"
              placeholder="Nome do Sensor"
              value={newSensor.name}
              onChange={(e) =>
                setNewSensor({ ...newSensor, name: e.target.value })
              }
            />
            <select
              className="w-full px-3 py-2 border rounded"
              value={newSensor.type}
              onChange={(e) =>
                setNewSensor({ ...newSensor, type: e.target.value })
              }
            >
              <option value="motor">Motor</option>
              <option value="temperatura">Temperatura</option>
              <option value="vibracao">Vibração</option>
              <option value="pressao">Pressão</option>
            </select>
            <select
              className="w-full px-3 py-2 border rounded"
              value={newSensor.protocol}
              onChange={(e) =>
                setNewSensor({ ...newSensor, protocol: e.target.value })
              }
            >
              <option value="OPC_UA">OPC-UA</option>
              <option value="MQTT">MQTT</option>
              <option value="HTTP">HTTP</option>
              <option value="MODBUS_TCP">Modbus TCP</option>
            </select>
            <input
              className="w-full px-3 py-2 border rounded"
              placeholder="Endpoint/Endereço (ex: opc.tcp://...)"
              value={newSensor.address}
              onChange={(e) =>
                setNewSensor({ ...newSensor, address: e.target.value })
              }
            />
            <button
              className="w-full py-2 rounded bg-primary text-primary-foreground"
              onClick={async () => {
                const id = await iotService.createSensor(newSensor);
                setNewSensor({
                  name: "",
                  type: "motor",
                  protocol: "OPC_UA",
                  address: "",
                });
                await loadAll();
                alert(`Sensor criado: ${id}`);
              }}
            >
              Salvar Sensor
            </button>
          </div>
        </div>

        {/* 2. Associar Sensor ao Equipamento */}
        <div className="p-4 border rounded-lg bg-card">
          <h2 className="font-semibold mb-3">2) Associar ao Equipamento</h2>
          <div className="space-y-3">
            <select
              className="w-full px-3 py-2 border rounded"
              value={binding.sensorId}
              onChange={(e) =>
                setBinding({ ...binding, sensorId: e.target.value })
              }
            >
              {sensors.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <select
              className="w-full px-3 py-2 border rounded"
              value={binding.machineId}
              onChange={(e) =>
                setBinding({ ...binding, machineId: e.target.value })
              }
            >
              {machines.map((m: any) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input
                className="px-3 py-2 border rounded"
                placeholder="Métrica (ex: current)"
                value={binding.metric}
                onChange={(e) =>
                  setBinding({ ...binding, metric: e.target.value })
                }
              />
              <input
                className="px-3 py-2 border rounded"
                placeholder="Unidade (ex: A)"
                value={binding.unit}
                onChange={(e) =>
                  setBinding({ ...binding, unit: e.target.value })
                }
              />
            </div>
            <button
              className="w-full py-2 rounded bg-primary text-primary-foreground"
              onClick={async () => {
                await iotService.bindSensor(binding);
                alert("Associado com sucesso");
              }}
            >
              Associar
            </button>
          </div>
        </div>

        {/* 3. Criar Regra Rápida */}
        <div className="p-4 border rounded-lg bg-card">
          <h2 className="font-semibold mb-3">3) Regra Rápida</h2>
          <div className="space-y-3">
            <select
              className="w-full px-3 py-2 border rounded"
              value={rule.machineId}
              onChange={(e) => setRule({ ...rule, machineId: e.target.value })}
            >
              <option value="">Escolha o equipamento</option>
              {machines.map((m: any) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <select
              className="w-full px-3 py-2 border rounded"
              value={rule.sensorId}
              onChange={(e) => setRule({ ...rule, sensorId: e.target.value })}
            >
              <option value="">
                (opcional) Associar a um sensor específico
              </option>
              {sensors.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input
                className="px-3 py-2 border rounded"
                placeholder="Métrica"
                value={rule.metric}
                onChange={(e) => setRule({ ...rule, metric: e.target.value })}
              />
              <select
                className="px-3 py-2 border rounded"
                value={rule.operator}
                onChange={(e) =>
                  setRule({ ...rule, operator: e.target.value as any })
                }
              >
                <option value="range">Dentro da Faixa</option>
                <option value="gt">Maior que</option>
                <option value="lt">Menor que</option>
                <option value="eq">Igual a</option>
              </select>
            </div>
            {rule.operator === "range" ? (
              <div className="grid grid-cols-2 gap-2">
                <input
                  className="px-3 py-2 border rounded"
                  type="number"
                  placeholder="Mín"
                  value={rule.minValue as any}
                  onChange={(e) =>
                    setRule({ ...rule, minValue: Number(e.target.value) })
                  }
                />
                <input
                  className="px-3 py-2 border rounded"
                  type="number"
                  placeholder="Máx"
                  value={rule.maxValue as any}
                  onChange={(e) =>
                    setRule({ ...rule, maxValue: Number(e.target.value) })
                  }
                />
              </div>
            ) : (
              <input
                className="w-full px-3 py-2 border rounded"
                type="number"
                placeholder="Valor"
                onChange={(e) =>
                  setRule({ ...rule, thresholdValue: Number(e.target.value) })
                }
              />
            )}
            <select
              className="w-full px-3 py-2 border rounded"
              value={rule.priority}
              onChange={(e) =>
                setRule({ ...rule, priority: e.target.value as any })
              }
            >
              <option value="low">Aviso</option>
              <option value="medium">Atenção</option>
              <option value="high">Alarme</option>
              <option value="critical">Crítico</option>
            </select>
            <input
              className="w-full px-3 py-2 border rounded"
              placeholder="Mensagem"
              value={rule.message}
              onChange={(e) => setRule({ ...rule, message: e.target.value })}
            />
            <button
              className="w-full py-2 rounded bg-primary text-primary-foreground"
              onClick={async () => {
                if (!rule.machineId) {
                  alert("Escolha o equipamento");
                  return;
                }
                const id = await iotService.createRule(rule as any);
                await loadAll();
                alert(`Regra criada: ${id}`);
              }}
            >
              Criar Regra
            </button>
          </div>
        </div>
      </div>

      {/* Teste Rápido */}
      <div className="p-4 border rounded-lg bg-card">
        <h2 className="font-semibold mb-3">
          Teste de Leitura (Ex.: Corrente do Motor)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <select
            className="px-3 py-2 border rounded"
            value={binding.sensorId}
            onChange={(e) =>
              setBinding({ ...binding, sensorId: e.target.value })
            }
          >
            {sensors.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <input
            className="px-3 py-2 border rounded"
            placeholder="Métrica"
            value={binding.metric}
            onChange={(e) => setBinding({ ...binding, metric: e.target.value })}
          />
          <input
            className="px-3 py-2 border rounded"
            type="number"
            placeholder="Valor"
            value={testValue as any}
            onChange={(e) => setTestValue(Number(e.target.value))}
          />
          <button
            className="py-2 rounded bg-secondary text-secondary-foreground"
            onClick={async () => {
              const res = await iotService.ingestReading({
                sensorId: binding.sensorId,
                metric: binding.metric,
                value: testValue,
              });
              await loadAll();
              alert(`Ingest concluído. Alertas criados: ${res.alertsCreated}`);
            }}
          >
            Enviar Leitura
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Regras */}
        <div className="p-4 border rounded-lg bg-card">
          <h2 className="font-semibold mb-3">Regras Ativas</h2>
          <div className="space-y-2">
            {rules.map((r) => (
              <div
                key={r.id}
                className="p-3 rounded border flex items-center justify-between"
              >
                <div>
                  <div className="text-sm font-medium">
                    {r.metric} • {r.operator.toUpperCase()}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Equipamento:{" "}
                    {machines.find((m: any) => m.id === r.machineId)?.name ||
                      r.machineId}{" "}
                    {r.sensorId
                      ? `• Sensor: ${sensors.find((s) => s.id === r.sensorId)?.name || r.sensorId}`
                      : ""}
                  </div>
                </div>
                <div className="text-xs uppercase px-2 py-1 rounded bg-muted">
                  {r.priority}
                </div>
              </div>
            ))}
            {rules.length === 0 && (
              <p className="text-sm text-muted-foreground">Sem regras ainda.</p>
            )}
          </div>
        </div>

        {/* Alertas Ativos */}
        <div className="p-4 border rounded-lg bg-card">
          <h2 className="font-semibold mb-3">Alertas Ativos</h2>
          <div className="space-y-2">
            {alerts.map((a) => (
              <div key={a.id} className="p-3 rounded border">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-sm">
                    {machines.find((m: any) => m.id === a.machine_id)?.name ||
                      a.machine_id}
                  </div>
                  <div className="text-xs uppercase px-2 py-1 rounded bg-destructive text-destructive-foreground">
                    {a.priority}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {a.metric}: {a.value}
                </div>
                <div className="text-xs">{a.message}</div>
                <div className="text-right mt-2">
                  <button
                    className="px-2 py-1 text-xs rounded bg-muted"
                    onClick={async () => {
                      await iotService.ackAlert(a.id);
                      await loadAll();
                    }}
                  >
                    Acknowledge
                  </button>
                </div>
              </div>
            ))}
            {alerts.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Sem alertas ativos.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        Protocolos suportados: OPC-UA, MQTT, HTTP, Modbus TCP. Para gateways,
        recomendados: OPC-UA para PLCs/SCADA; MQTT para IoT distribuído.
      </div>
    </div>
  );
}
