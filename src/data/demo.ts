import type { Prospect, Store, Stage } from "../models";
import { reward } from "../services/business";
export function blankProspect(): Prospect {
  const timestamp = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    businessName: "",
    businessType: "Mercado",
    contactName: "",
    phone: "",
    whatsapp: "",
    email: "",
    address: "",
    number: "",
    city: "",
    state: "",
    neighborhood: "",
    zipCode: "",
    complement: "",
    businessSize: "pequeno",
    mainInterest: "",
    commercialNeed: "",
    purchaseFrequency: "",
    estimatedPurchaseValue: 0,
    priority: "média",
    source: "Na rota",
    stage: "new",
    createdAt: timestamp,
    updatedAt: timestamp,
    lastContactAt: null,
    nextContactAt: null,
    firstContactAt: null,
    notes: "",
    activatedAt: null,
    confirmedBy: "",
  };
}
export function demoStore(): Store {
  const s: Store = {
    schemaVersion: 1,
    seller: "Rafael Oliveira",
    prospects: [],
    visits: [],
    interactions: [],
    orders: [],
    rewards: [],
  };
  const names = [
    "Mercado Vila Nova",
    "Padaria Pão da Praça",
    "Açougue Bom Corte",
    "Mercearia Horizonte",
    "Restaurante Sabor da Vila",
    "Minimercado Central",
    "Conveniência Estação",
    "Lanchonete Ponto Certo",
    "Padaria Trigo & Afeto",
    "Mercado Boa Vizinhança",
    "Restaurante Quintal",
    "Mercearia Sol Nascente",
    "Açougue Santa Mesa",
    "Conveniência Alameda",
    "Padaria Forno da Vila",
  ];
  const types: Prospect["businessType"][] = [
    "Mercado",
    "Padaria",
    "Açougue",
    "Mercearia",
    "Restaurante",
    "Mercado",
    "Conveniência",
    "Lanchonete",
    "Padaria",
    "Mercado",
    "Restaurante",
    "Mercearia",
    "Açougue",
    "Conveniência",
    "Padaria",
  ];
  const stages: Stage[] = [
    "negotiation",
    "qualified",
    "contacted",
    "new",
    "pending",
    "purchased",
    "negotiation",
    "active",
    "new",
    "qualified",
    "purchased",
    "contacted",
    "active",
    "new",
    "negotiation",
  ];
  const relative = (days: number, hour = 10) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
  };
  names.forEach((name, i) => {
    const p = {
      ...blankProspect(),
      id: `demo-${i + 1}`,
      businessName: name,
      businessType: types[i],
      contactName:
        ["Marina", "Carlos", "Ana", "Paulo", "Joana"][i % 5] + " (fictício)",
      phone: "",
      email: `contato${i + 1}@exemplo.invalid`,
      address: ["Rua das Flores", "Rua da Praça", "Avenida Horizonte"][i % 3],
      number: String(100 + i * 12),
      neighborhood: ["Vila Nova", "Centro", "Jardim América", "Santa Clara"][
        i % 4
      ],
      city: "Campinas",
      state: "SP",
      businessSize: i % 3 === 0 ? ("médio" as const) : ("pequeno" as const),
      mainInterest: [
        "Variedade de produtos",
        "Reposição de estoque",
        "Abastecimento recorrente",
      ][i % 3],
      commercialNeed: [
        "Ampliar o mix",
        "Regularidade de entrega",
        "Conhecer o portfólio",
      ][i % 3],
      purchaseFrequency: "Semanal",
      estimatedPurchaseValue: 600 + i * 180,
      priority: (["alta", "média", "baixa"] as const)[i % 3],
      stage: stages[i],
      createdAt: relative(-15 - i),
      updatedAt: relative(-1),
      nextContactAt:
        i < 5 ? relative(i === 2 ? -2 : i < 2 ? 0 : 2, 9 + i) : null,
      notes:
        "Estabelecimento fictício para demonstração. Endereço ilustrativo.",
    };
    if (["active", "purchased"].includes(p.stage)) {
      p.activatedAt = relative(-5);
      p.confirmedBy = "Rafael Oliveira";
    }
    s.prospects.push(p);
    reward(s, "prospect", p.id, p.id, p.businessName);
    if (p.stage !== "new") {
      p.lastContactAt = relative(-2);
      p.firstContactAt = relative(-10);
      s.interactions.push({
        id: `interaction-${i}`,
        prospectId: p.id,
        type: "Ligação",
        description:
          "Apresentação comercial e levantamento das necessidades do estabelecimento.",
        outcome: "Interesse em conhecer o portfólio",
        createdAt: relative(-2),
        nextAction: "Apresentar opções adequadas ao perfil",
        nextContactAt: p.nextContactAt,
        relatedVisitId: null,
        objection: i === 0 ? "Já tenho fornecedor." : "",
      });
      reward(s, "stage", p.id, "contacted", `${name} · Primeiro contato`);
    }
    if (p.activatedAt) reward(s, "activation", p.id, p.id, name);
    if (p.stage === "purchased") {
      s.orders.push({
        id: `order-${i}`,
        prospectId: p.id,
        reference: `DEMO-${100 + i}`,
        amount: 850 + i * 50,
        createdAt: relative(-3),
        notes: "Pedido fictício, sem faturamento.",
      });
      reward(s, "order", p.id, p.id, name);
    }
    if (i < 7) {
      const completed = i === 5 || i === 6,
        vid = `visit-${i}`;
      s.visits.push({
        id: vid,
        prospectId: p.id,
        scheduledAt: relative(
          completed ? -2 : i === 2 ? -1 : i < 2 ? 0 : 2,
          9 + i,
        ),
        objective: [
          "Apresentar o portfólio",
          "Conhecer as necessidades",
          "Retomar a negociação",
        ][i % 3],
        priority: p.priority,
        status: completed ? "completed" : "scheduled",
        result: completed ? "Produtiva" : "",
        notes: completed
          ? "Responsável apresentou interesse em reposição semanal."
          : "Levar apresentação comercial.",
        completedAt: completed ? relative(-2) : null,
        nextAction: completed ? "Combinar próximo contato" : "",
      });
      if (completed) {
        s.interactions.push({
          id: `visit-activity-${i}`,
          prospectId: p.id,
          type: "Visita presencial",
          description: "Apresentação do portfólio e conversa com responsável.",
          outcome: "Produtiva",
          createdAt: relative(-2),
          nextAction: "Combinar próximo contato",
          nextContactAt: null,
          relatedVisitId: vid,
          objection: "",
        });
        reward(s, "visit", p.id, vid, name);
      }
    }
  });
  return s;
}
