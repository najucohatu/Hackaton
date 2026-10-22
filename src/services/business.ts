import { ACTIONS, LEVELS, STAGES, stageLabel } from "../models";
import type {
  Store,
  Prospect,
  Stage,
  Interaction,
  Visit,
  Priority,
  RewardAction,
} from "../models";
// `crypto.randomUUID()` is unavailable when some browsers open an HTML file
// directly. The fallback keeps the offline demonstrator operational; it is
// not intended as a security identifier for a multi-user backend.
export const uid = () =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
export const now = () => new Date().toISOString();
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
// Adapter boundary: an external gamification provider can consume these stable events.
export interface GamificationAdapter {
  publish(event: Store["rewards"][number]): Promise<void>;
}
export function reward(
  s: Store,
  action: RewardAction,
  prospectId: string,
  entity: string,
  description: string,
) {
  const key = `${action}:${prospectId}:${entity}`;
  if (s.rewards.some((e) => e.eventKey === key)) return;
  s.rewards.push({
    id: uid(),
    eventKey: key,
    action,
    prospectId,
    relatedEntityId: entity,
    xp: ACTIONS[action].xp,
    createdAt: now(),
    description,
  });
}
function activity(s: Store, p: Prospect, description: string) {
  s.interactions.push({
    id: uid(),
    prospectId: p.id,
    type: "Sistema",
    description,
    outcome: "",
    createdAt: now(),
    nextAction: "",
    nextContactAt: null,
    relatedVisitId: null,
    objection: "",
  });
  p.updatedAt = now();
}
export function getProspect(s: Store, id: string) {
  const p = s.prospects.find((p) => p.id === id);
  if (!p) throw new Error("Estabelecimento não encontrado.");
  return p;
}
export const normalized = (v: string) =>
  v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
export const digits = (v: string) => v.replace(/\D/g, "");
export const canonicalPhone = (v: string) => {
  const number = digits(v);
  return number.length > 11 && number.startsWith("55")
    ? number.slice(2)
    : number;
};
export const validPhone = (v: string) => /^(?:55)?\d{10,11}$/.test(digits(v));
export const addressLine = (p: Prospect) =>
  [p.address, p.number, p.neighborhood, p.city, p.state]
    .filter(Boolean)
    .join(", ");
export const isCommercialContact = (interaction: Interaction) =>
  !["Sistema", "Observação comercial"].includes(interaction.type);
function hasCommercialContact(s: Store, prospectId: string) {
  return s.interactions.some(
    (interaction) =>
      interaction.prospectId === prospectId && isCommercialContact(interaction),
  );
}
export function duplicate(s: Store, p: Prospect) {
  return s.prospects.find(
    (x) =>
      x.id !== p.id &&
      ([p.phone, p.whatsapp]
        .filter(Boolean)
        .some(
          (phone) =>
            canonicalPhone(phone).length >= 10 &&
            [x.phone, x.whatsapp]
              .filter(Boolean)
              .some(
                (existing) =>
                  canonicalPhone(existing) === canonicalPhone(phone),
              ),
        ) ||
        (normalized(x.businessName) === normalized(p.businessName) &&
          normalized(x.city) === normalized(p.city) &&
          normalized(x.neighborhood) === normalized(p.neighborhood))),
  );
}
export function validateProspect(p: Prospect) {
  if (p.businessName.trim().length < 2)
    throw new Error("Informe um nome com pelo menos 2 caracteres.");
  if (p.phone && !validPhone(p.phone))
    throw new Error("Informe um telefone válido com DDD.");
  if (p.whatsapp && !validPhone(p.whatsapp))
    throw new Error("Informe um WhatsApp válido com DDD.");
  if (p.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email))
    throw new Error("Informe um e-mail válido.");
  if (
    !Number.isFinite(p.estimatedPurchaseValue) ||
    p.estimatedPurchaseValue < 0
  )
    throw new Error("O valor potencial deve ser maior ou igual a zero.");
}
export function saveProspect(s: Store, p: Prospect) {
  validateProspect(p);
  const d = duplicate(s, p);
  if (d)
    throw new Error(
      `Possível duplicado: ${d.businessName}. Revise o cadastro existente antes de salvar.`,
    );
  const existing = s.prospects.find((x) => x.id === p.id);
  if (existing) {
    const updated = {
      ...p,
      stage: existing.stage,
      activatedAt: existing.activatedAt,
      confirmedBy: existing.confirmedBy,
      createdAt: existing.createdAt,
      updatedAt: now(),
    };
    if (updated.activatedAt)
      assert(
        activationErrors(updated).length === 0,
        "Um cliente ativo deve manter os dados mínimos de cadastro.",
      );
    s.prospects = s.prospects.map((x) => (x.id === p.id ? updated : x));
    activity(s, updated, "Dados do estabelecimento atualizados.");
  } else {
    assert(
      !["active", "purchased"].includes(p.stage),
      "Cadastre o potencial e depois conclua a ativação.",
    );
    s.prospects.push(p);
    activity(s, p, "Novo potencial cadastrado.");
    reward(s, "prospect", p.id, p.id, p.businessName);
  }
}
export function activationErrors(p: Prospect) {
  return [
    !p.businessName.trim() && "Nome do estabelecimento",
    !p.businessType && "Tipo de estabelecimento",
    !(validPhone(p.phone) || validPhone(p.whatsapp) || p.email) &&
      "Telefone, WhatsApp ou e-mail",
    !(p.address.trim() && p.city.trim() && p.state.trim()) &&
      "Endereço, cidade e estado",
    !p.confirmedBy.trim() && "Confirmação do responsável pelo cadastro",
  ].filter(Boolean) as string[];
}
export function changeStage(s: Store, id: string, stage: Stage) {
  const p = getProspect(s, id);
  if (p.stage === stage) return;
  const hasOrder = s.orders.some((order) => order.prospectId === id);
  assert(
    !hasOrder || stage === "purchased",
    "Um cliente com compra registrada deve permanecer em Primeira compra realizada.",
  );
  assert(
    !p.activatedAt || ["active", "purchased"].includes(stage),
    "Um cliente ativado não pode voltar para uma etapa anterior.",
  );
  assert(
    stage !== "active" || !!p.activatedAt,
    "Conclua a ativação comercial antes de selecionar Cliente ativo.",
  );
  assert(
    stage !== "purchased" || hasOrder,
    "Registre uma compra antes de selecionar este estágio.",
  );
  const before = STAGES.findIndex((x) => x.id === p.stage),
    after = STAGES.findIndex((x) => x.id === stage);
  assert(
    after === 0 || after >= 5 || hasCommercialContact(s, id),
    "Registre um contato comercial antes de avançar a negociação.",
  );
  const previous = p.stage;
  p.stage = stage;
  activity(
    s,
    p,
    `Estágio alterado: ${stageLabel(previous)} → ${stageLabel(stage)}.`,
  );
  if (after > before && after >= 1 && after <= 4)
    reward(s, "stage", id, stage, `${p.businessName} · ${stageLabel(stage)}`);
}
export function activate(s: Store, id: string, confirmedBy: string) {
  const p = getProspect(s, id);
  if (p.activatedAt) return;
  const candidate = { ...p, confirmedBy: confirmedBy.trim() };
  const errors = activationErrors(candidate);
  assert(!errors.length, `Complete o cadastro: ${errors.join("; ")}.`);
  assert(
    hasCommercialContact(s, id),
    "Registre um contato comercial antes de ativar o cliente.",
  );
  p.confirmedBy = candidate.confirmedBy;
  p.activatedAt = now();
  p.stage = "active";
  activity(s, p, "Ativação comercial simulada concluída.");
  reward(s, "activation", id, id, p.businessName);
}
export function addOrder(
  s: Store,
  input: {
    id: string;
    prospectId: string;
    reference: string;
    amount: number;
    createdAt: string;
    notes: string;
  },
) {
  const p = getProspect(s, input.prospectId);
  assert(p.activatedAt, "Ative o cliente antes de registrar uma compra.");
  assert(
    Number.isFinite(input.amount) && input.amount > 0,
    "Informe um valor de compra maior que zero.",
  );
  assert(input.reference.trim(), "Informe o identificador fictício do pedido.");
  assert(
    Number.isFinite(Date.parse(input.createdAt)) &&
      Date.parse(input.createdAt) <= Date.now(),
    "Informe uma data válida que não esteja no futuro.",
  );
  if (s.orders.some((o) => o.id === input.id)) return;
  assert(
    !s.orders.some(
      (o) => normalized(o.reference) === normalized(input.reference),
    ),
    "Já existe um pedido com esse identificador.",
  );
  const first = !s.orders.some((o) => o.prospectId === p.id);
  s.orders.push({ ...input, reference: input.reference.trim() });
  p.stage = "purchased";
  activity(
    s,
    p,
    `${first ? "Primeira compra" : "Compra"} demonstrativa registrada · ${input.reference}.`,
  );
  if (first) reward(s, "order", p.id, p.id, p.businessName);
}
export function addInteraction(s: Store, input: Interaction) {
  const p = getProspect(s, input.prospectId);
  assert(input.type !== "Sistema", "Tipo de contato inválido.");
  assert(
    input.description.trim().length >= 3,
    "Descreva a interação com pelo menos 3 caracteres.",
  );
  assert(input.outcome.trim(), "Informe o resultado do contato.");
  assert(
    Number.isFinite(Date.parse(input.createdAt)) &&
      Date.parse(input.createdAt) <= Date.now(),
    "A data do contato deve ser válida e não estar no futuro.",
  );
  if (s.interactions.some((x) => x.id === input.id)) return;
  s.interactions.push(input);
  const isContact = isCommercialContact(input);
  if (isContact) {
    p.lastContactAt =
      !p.lastContactAt || input.createdAt > p.lastContactAt
        ? input.createdAt
        : p.lastContactAt;
    p.firstContactAt ??= input.createdAt;
  }
  p.nextContactAt = input.nextContactAt;
  p.updatedAt = now();
  if (isContact && p.stage === "new") {
    p.stage = "contacted";
    activity(s, p, "Primeiro contato realizado.");
  }
}
export function scheduleVisit(s: Store, input: Visit) {
  getProspect(s, input.prospectId);
  assert(input.objective.trim().length >= 2, "Informe o objetivo da visita.");
  assert(
    Number.isFinite(Date.parse(input.scheduledAt)),
    "Informe data e horário válidos.",
  );
  assert(
    Date.parse(input.scheduledAt) >= Date.now() - 60_000,
    "Agende a visita para agora ou para uma data futura.",
  );
  const old = s.visits.find((v) => v.id === input.id);
  assert(
    !old || old.status === "scheduled",
    "Esta visita já foi concluída ou cancelada.",
  );
  if (old)
    Object.assign(old, {
      scheduledAt: input.scheduledAt,
      objective: input.objective,
      priority: input.priority,
      notes: input.notes,
    });
  else s.visits.push(input);
  activity(
    s,
    getProspect(s, input.prospectId),
    `${old ? "Reagendamento" : "Agendamento"} de visita: ${input.objective}.`,
  );
}
export function cancelVisit(s: Store, id: string) {
  const v = s.visits.find((v) => v.id === id);
  assert(v, "Visita não encontrada.");
  if (v.status !== "scheduled") return;
  v.status = "cancelled";
  activity(s, getProspect(s, v.prospectId), "Visita cancelada.");
}
export function completeVisit(
  s: Store,
  id: string,
  data: {
    result: string;
    notes: string;
    objection: string;
    nextAction: string;
    nextContactAt: string | null;
  },
) {
  const v = s.visits.find((v) => v.id === id);
  assert(v, "Visita não encontrada.");
  if (v.status === "completed") return;
  assert(
    v.status === "scheduled",
    "Uma visita cancelada não pode ser concluída.",
  );
  assert(
    [
      "Produtiva",
      "Sem contato",
      "Retorno necessário",
      "Sem interesse",
    ].includes(data.result),
    "Informe o resultado da visita.",
  );
  assert(data.notes.trim().length >= 3, "Descreva o resultado da visita.");
  assert(
    data.result !== "Retorno necessário" || !!data.nextContactAt,
    "Agende a data do retorno necessário.",
  );
  v.status = "completed";
  v.result = data.result;
  v.completedAt = now();
  v.notes = data.notes;
  v.nextAction = data.nextAction;
  addInteraction(s, {
    id: `visit-${id}`,
    prospectId: v.prospectId,
    type: "Visita presencial",
    description: data.notes,
    outcome: data.result,
    createdAt: v.completedAt,
    nextAction: data.nextAction,
    nextContactAt: data.nextContactAt,
    relatedVisitId: id,
    objection: data.objection,
  });
  reward(
    s,
    "visit",
    v.prospectId,
    id,
    getProspect(s, v.prospectId).businessName,
  );
}
export function scheduleReturn(
  s: Store,
  id: string,
  date: string,
  nextAction: string,
) {
  assert(
    Number.isFinite(Date.parse(date)) && Date.parse(date) > Date.now(),
    "Informe uma data futura válida para o retorno.",
  );
  assert(nextAction.trim().length >= 3, "Informe a próxima ação.");
  const p = getProspect(s, id);
  p.nextContactAt = date;
  s.interactions.push({
    id: uid(),
    prospectId: id,
    type: "Sistema",
    description: `Retorno agendado: ${nextAction}`,
    outcome: "",
    createdAt: now(),
    nextAction,
    nextContactAt: date,
    relatedVisitId: null,
    objection: "",
  });
  p.updatedAt = now();
}
export function deleteProspect(s: Store, id: string) {
  s.prospects = s.prospects.filter((p) => p.id !== id);
  for (const key of ["interactions", "visits", "orders", "rewards"] as const)
    s[key] = s[key].filter((x) => x.prospectId !== id) as never;
}
export const rank: Record<Priority, number> = { alta: 0, média: 1, baixa: 2 };
export function metrics(s: Store) {
  const total = s.prospects.length,
    active = s.prospects.filter((p) => p.activatedAt).length;
  const firstOrders = s.prospects.flatMap((p) => {
    const orders = s.orders
      .filter((o) => o.prospectId === p.id)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return orders[0] ? [orders[0]] : [];
  });
  return {
    total,
    active,
    open: s.prospects.filter((p) => !p.activatedAt).length,
    purchases: firstOrders.length,
    conversion: total ? (active / total) * 100 : 0,
    xp: s.rewards.reduce((n, r) => n + r.xp, 0),
    visits: s.visits.filter((v) => v.status === "completed").length,
    contacts: s.interactions.filter(isCommercialContact).length,
    volume: firstOrders.reduce((n, o) => n + o.amount, 0),
  };
}
export function levelFor(xp: number) {
  let index = 0;
  LEVELS.forEach((l, i) => {
    if (xp >= l.xp) index = i;
  });
  const current = LEVELS[index],
    next = LEVELS[index + 1];
  return {
    index,
    current,
    next,
    progress: next
      ? Math.min(100, ((xp - current.xp) / (next.xp - current.xp)) * 100)
      : 100,
  };
}
export function achievements(s: Store) {
  const m = metrics(s);
  return [
    {
      title: "Primeiro passo",
      description: "Cadastre uma oportunidade",
      unlocked: s.rewards.some((r) => r.action === "prospect"),
      action: "prospect",
    },
    {
      title: "Pé na rua",
      description: "Conclua a primeira visita",
      unlocked: m.visits > 0,
      action: "visit",
    },
    {
      title: "Portas abertas",
      description: "Ative o primeiro cliente",
      unlocked: m.active > 0,
      action: "activation",
    },
    {
      title: "Negócio fechado",
      description: "Conquiste a primeira compra",
      unlocked: m.purchases > 0,
      action: "order",
    },
    {
      title: "Conquistador",
      description: "Ative cinco clientes",
      unlocked: m.active >= 5,
      action: "activation",
    },
  ].map((a) => ({
    ...a,
    unlockedAt: a.unlocked
      ? s.rewards
          .filter((r) => r.action === a.action)
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt))[
          a.title === "Conquistador" ? 4 : 0
        ]?.createdAt
      : null,
  }));
}
