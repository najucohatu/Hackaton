import { describe, it, expect } from "vitest";
import { blankProspect, demoStore } from "../src/data/demo";
import type { Store, Interaction, Visit } from "../src/models";
import {
  saveProspect,
  addInteraction,
  changeStage,
  activate,
  addOrder,
  scheduleVisit,
  completeVisit,
  cancelVisit,
  scheduleReturn,
  deleteProspect,
  metrics,
  levelFor,
  achievements,
  duplicate,
  now,
} from "../src/services/business";
import {
  validateBackup,
  loadStore,
  persist,
  STORAGE_KEY,
} from "../src/services/storage";
import { insights } from "../src/services/insights";
import { dayKey, overdue } from "../src/services/format";
const empty = (): Store => ({
  schemaVersion: 1,
  seller: "Rafael",
  prospects: [],
  interactions: [],
  visits: [],
  orders: [],
  rewards: [],
});
function setup() {
  const s = empty();
  const p = {
    ...blankProspect(),
    businessName: "Padaria Teste",
    businessType: "Padaria" as const,
    email: "teste@exemplo.invalid",
    address: "Rua Fictícia",
    city: "Campinas",
    state: "SP",
  };
  saveProspect(s, p);
  return { s, p };
}
const contact = (id: string): Interaction => ({
  id: "contact-1",
  prospectId: id,
  type: "Ligação",
  createdAt: now(),
  description: "Apresentação do portfólio",
  outcome: "Interesse",
  nextAction: "Retornar",
  nextContactAt: null,
  relatedVisitId: null,
  objection: "Já tenho fornecedor.",
});
const visit = (id: string): Visit => ({
  id: "visit-1",
  prospectId: id,
  scheduledAt: now(),
  objective: "Apresentar o portfólio",
  priority: "alta",
  status: "scheduled",
  result: "",
  notes: "",
  completedAt: null,
  nextAction: "",
});
const order = (id: string) => ({
  id: "order-1",
  prospectId: id,
  reference: "DEMO-1",
  amount: 250,
  createdAt: now(),
  notes: "Fictício",
});
describe("cadastro, métricas e histórico", () => {
  it("valida obrigatórios e contato antes de conceder XP", () => {
    const s = empty();
    expect(() => saveProspect(s, blankProspect())).toThrow("nome");
    expect(s.rewards).toHaveLength(0);
    const p = { ...blankProspect(), businessName: "Teste", phone: "123" };
    expect(() => saveProspect(s, p)).toThrow("telefone");
  });
  it("edita e mantém o mesmo evento de cadastro", () => {
    const { s, p } = setup();
    saveProspect(s, { ...p, businessName: "Padaria Editada" });
    expect(s.prospects[0].businessName).toBe("Padaria Editada");
    expect(metrics(s).xp).toBe(1);
    expect(s.interactions).toHaveLength(2);
  });
  it("detecta duplicações por nome e localização normalizados e por telefone", () => {
    const { s, p } = setup();
    expect(
      duplicate(s, { ...p, id: "outro", businessName: " PADARIA TÉSTE " }),
    ).toBeTruthy();
    expect(() => saveProspect(s, { ...p, id: "outro" })).toThrow("duplicado");
  });
  it("registra contato uma vez e atualiza datas e primeiro estágio", () => {
    const { s, p } = setup();
    const i = contact(p.id);
    addInteraction(s, i);
    addInteraction(s, i);
    expect(s.interactions.filter((x) => x.id === i.id)).toHaveLength(1);
    expect(s.prospects[0].lastContactAt).toBe(i.createdAt);
    expect(s.prospects[0].stage).toBe("contacted");
    expect(metrics(s).contacts).toBe(1);
    expect(metrics(s).xp).toBe(1);
  });
  it("não deixa um contato antigo sobrescrever a data do mais recente", () => {
    const { s, p } = setup();
    addInteraction(s, contact(p.id));
    const last = s.prospects[0].lastContactAt;
    addInteraction(s, {
      ...contact(p.id),
      id: "older",
      createdAt: "2020-01-01T10:00:00.000Z",
    });
    expect(s.prospects[0].lastContactAt).toBe(last);
  });
  it("agenda retorno no cliente e no histórico", () => {
    const { s, p } = setup();
    const d = "2027-01-01T10:00:00.000Z";
    scheduleReturn(s, p.id, d, "Apresentar proposta");
    expect(p.nextContactAt).toBe(d);
    expect(s.interactions.at(-1)?.nextAction).toBe("Apresentar proposta");
  });
  it("exclui relações e recalcula métricas", () => {
    const { s, p } = setup();
    scheduleVisit(s, visit(p.id));
    deleteProspect(s, p.id);
    expect(s.visits).toHaveLength(0);
    expect(s.interactions).toHaveLength(0);
    expect(metrics(s)).toMatchObject({ total: 0, xp: 0, conversion: 0 });
  });
});
describe("negociação, ativação e compras", () => {
  it("impede etapas finais sem registros correspondentes", () => {
    const { s, p } = setup();
    expect(() => changeStage(s, p.id, "active")).toThrow("ativação");
    expect(() => changeStage(s, p.id, "purchased")).toThrow("compra");
    expect(() => addOrder(s, order(p.id))).toThrow("Ative");
  });
  it("retrocessos não apagam conquistas e não repetem XP", () => {
    const { s, p } = setup();
    changeStage(s, p.id, "negotiation");
    changeStage(s, p.id, "contacted");
    changeStage(s, p.id, "negotiation");
    changeStage(s, p.id, "negotiation");
    expect(metrics(s).xp).toBe(4);
    expect(
      s.interactions.filter((i) => i.description.startsWith("Estágio")),
    ).toHaveLength(3);
  });
  it("exige cadastro comercial completo e confirmação", () => {
    const { s, p } = setup();
    p.address = "";
    expect(() => activate(s, p.id, "Rafael")).toThrow("Endereço");
    expect(p.activatedAt).toBeNull();
    expect(metrics(s).xp).toBe(1);
    p.address = "Rua";
    expect(() => activate(s, p.id, "")).toThrow("Confirmação");
  });
  it("ativação idempotente dá 4 XP e preserva os requisitos ao editar", () => {
    const { s, p } = setup();
    activate(s, p.id, "Rafael");
    activate(s, p.id, "Rafael");
    expect(metrics(s)).toMatchObject({ active: 1, conversion: 100, xp: 5 });
    expect(() => saveProspect(s, { ...p, email: "" })).toThrow("mínimos");
  });
  it("valida valor e data do pedido e rejeita referência repetida", () => {
    const { s, p } = setup();
    activate(s, p.id, "Rafael");
    expect(() => addOrder(s, { ...order(p.id), amount: 0 })).toThrow("valor");
    expect(() =>
      addOrder(s, { ...order(p.id), createdAt: "2099-01-01T00:00:00Z" }),
    ).toThrow("data");
    addOrder(s, order(p.id));
    expect(() => addOrder(s, { ...order(p.id), id: "another" })).toThrow(
      "identificador",
    );
  });
  it("primeira compra gera 5 XP uma vez; compras posteriores não inflam conversão ou volume de primeiras compras", () => {
    const { s, p } = setup();
    activate(s, p.id, "Rafael");
    const o = order(p.id);
    addOrder(s, o);
    addOrder(s, o);
    addOrder(s, { ...o, id: "order-2", reference: "DEMO-2", amount: 999 });
    expect(s.orders).toHaveLength(2);
    expect(metrics(s)).toMatchObject({
      total: 1,
      active: 1,
      purchases: 1,
      volume: 250,
      conversion: 100,
      xp: 10,
    });
    expect(s.prospects[0].stage).toBe("purchased");
    expect(validateBackup(s)).toEqual(s);
  });
  it("executa a jornada do hackathon com histórico e 15 XP", () => {
    const { s, p } = setup();
    scheduleVisit(s, visit(p.id));
    completeVisit(s, "visit-1", {
      result: "Produtiva",
      notes: "Cliente interessado",
      objection: "",
      nextAction: "Proposta",
      nextContactAt: null,
    });
    changeStage(s, p.id, "negotiation");
    activate(s, p.id, "Rafael");
    addOrder(s, order(p.id));
    expect(metrics(s)).toMatchObject({
      xp: 15,
      visits: 1,
      active: 1,
      purchases: 1,
      contacts: 1,
    });
    expect(s.rewards.map((r) => r.xp)).toEqual([1, 2, 3, 4, 5]);
    expect(achievements(s).filter((a) => a.unlocked)).toHaveLength(4);
  });
});
describe("visitas", () => {
  it("agenda e edita sem conceder XP", () => {
    const { s, p } = setup();
    scheduleVisit(s, visit(p.id));
    scheduleVisit(s, { ...visit(p.id), objective: "Objetivo atualizado" });
    expect(s.visits).toHaveLength(1);
    expect(s.visits[0].objective).toBe("Objetivo atualizado");
    expect(metrics(s).xp).toBe(1);
  });
  it("conclui uma vez, com um único histórico e recompensa", () => {
    const { s, p } = setup();
    scheduleVisit(s, visit(p.id));
    const result = {
      result: "Produtiva",
      notes: "Conversa concluída",
      objection: "",
      nextAction: "Retornar",
      nextContactAt: null,
    };
    completeVisit(s, "visit-1", result);
    completeVisit(s, "visit-1", result);
    expect(
      s.interactions.filter((i) => i.relatedVisitId === "visit-1"),
    ).toHaveLength(1);
    expect(s.rewards.filter((r) => r.action === "visit")).toHaveLength(1);
    expect(metrics(s).visits).toBe(1);
    expect(validateBackup(s)).toEqual(s);
  });
  it("exige resultado e exige data para retorno necessário", () => {
    const { s, p } = setup();
    scheduleVisit(s, visit(p.id));
    expect(() =>
      completeVisit(s, "visit-1", {
        result: "",
        notes: "Teste",
        objection: "",
        nextAction: "",
        nextContactAt: null,
      }),
    ).toThrow("resultado");
    expect(() =>
      completeVisit(s, "visit-1", {
        result: "Retorno necessário",
        notes: "Teste",
        objection: "",
        nextAction: "",
        nextContactAt: null,
      }),
    ).toThrow("retorno");
  });
  it("cancela sem prêmio e não permite concluir ou editar canceladas", () => {
    const { s, p } = setup();
    scheduleVisit(s, visit(p.id));
    cancelVisit(s, "visit-1");
    expect(() =>
      completeVisit(s, "visit-1", {
        result: "Produtiva",
        notes: "Teste",
        objection: "",
        nextAction: "",
        nextContactAt: null,
      }),
    ).toThrow("cancelada");
    expect(() => scheduleVisit(s, visit(p.id))).toThrow("cancelada");
    expect(metrics(s).xp).toBe(1);
  });
});
describe("armazenamento e consistência", () => {
  it("dados demonstrativos passam pela validação completa", () => {
    const s = demoStore();
    expect(validateBackup(s)).toEqual(s);
    expect(s.prospects).toHaveLength(15);
    expect(metrics(s)).toMatchObject({
      active: 4,
      purchases: 2,
      visits: 2,
      conversion: (4 / 15) * 100,
    });
    expect(metrics(s).xp).toBe(s.rewards.reduce((sum, r) => sum + r.xp, 0));
  });
  it("exportação/importação roundtrip preserva a base e o XP", () => {
    const { s, p } = setup();
    activate(s, p.id, "Rafael");
    addOrder(s, order(p.id));
    const parsed = validateBackup(JSON.parse(JSON.stringify(s)));
    expect(parsed).toEqual(s);
  });
  it("rejeita schema inválido, referências órfãs e eventos duplicados", () => {
    expect(() => validateBackup({ schemaVersion: 99 })).toThrow(
      "Backup inválido",
    );
    const { s, p } = setup();
    s.rewards.push({ ...s.rewards[0], id: "duplicate" });
    expect(() => validateBackup(s)).toThrow("duplicadas");
    s.rewards.pop();
    s.interactions[0].prospectId = "ghost";
    expect(() => validateBackup(s)).toThrow("sem estabelecimento");
    expect(p).toBeDefined();
  });
  it("rejeita primeira compra sem pedido e XP adulterado", () => {
    const { s, p } = setup();
    p.stage = "purchased";
    expect(() => validateBackup(s)).toThrow();
    p.stage = "new";
    s.rewards[0].xp = 5;
    expect(() => validateBackup(s)).toThrow("recompensa");
  });
  it("salva, recarrega sem resemear e recupera dados corrompidos", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (k: string) => values.get(k) ?? null,
      setItem: (k: string, v: string) => {
        values.set(k, v);
      },
    };
    const { s } = setup();
    persist(s, storage);
    expect(loadStore(storage).store).toEqual(s);
    values.set(STORAGE_KEY, "broken json");
    const result = loadStore(storage);
    expect(result.warning).toContain("inválidos");
    expect(result.store.prospects).toHaveLength(15);
    expect([...values.keys()].some((k) => k.includes("recovery"))).toBe(true);
  });
  it("reporta bloqueio de armazenamento sem fingir sucesso", () => {
    expect(() =>
      persist(empty(), {
        setItem: () => {
          throw new Error("quota");
        },
      }),
    ).toThrow("Não foi possível salvar");
  });
  it("níveis usam limiares configurados e conquistas derivam de ações reais", () => {
    expect(levelFor(0).index).toBe(0);
    expect(levelFor(30).current.name).toBe("Prospectador");
    expect(levelFor(79).index).toBe(1);
    expect(levelFor(300).progress).toBe(100);
    expect(achievements(empty()).every((a) => !a.unlocked)).toBe(true);
  });
  it("recomendações usam tipo, necessidade, estágio, objeção e histórico", () => {
    const { s, p } = setup();
    p.commercialNeed = "Abastecimento regular";
    addInteraction(s, contact(p.id));
    const tips = insights(p, s.interactions);
    expect(tips.opening).toContain("Padaria Teste");
    expect(tips.questions.join()).toContain("abastecimento regular");
    expect(tips.response).toContain("parceria");
    expect(tips.next).toContain("perfil de consumo");
  });
  it("datas locais distinguem retornos atrasados de hoje", () => {
    expect(dayKey(new Date())).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(overdue("2020-01-01T00:00:00Z")).toBe(true);
    expect(overdue(now())).toBe(false);
  });
});
