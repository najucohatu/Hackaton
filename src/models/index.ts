import { z } from "zod";
export const STAGES = [
  { id: "new", label: "Novo potencial", short: "Novos", color: "#526b92" },
  {
    id: "contacted",
    label: "Primeiro contato realizado",
    short: "Em contato",
    color: "#2e63ad",
  },
  {
    id: "qualified",
    label: "Qualificado",
    short: "Qualificados",
    color: "#6551b8",
  },
  {
    id: "negotiation",
    label: "Em negociação",
    short: "Negociação",
    color: "#91601c",
  },
  {
    id: "pending",
    label: "Cadastro pendente",
    short: "Cadastro",
    color: "#a04668",
  },
  { id: "active", label: "Cliente ativo", short: "Ativos", color: "#19765f" },
  {
    id: "purchased",
    label: "Primeira compra realizada",
    short: "1ª compra",
    color: "#176448",
  },
] as const;
export const stageSchema = z.enum([
  "new",
  "contacted",
  "qualified",
  "negotiation",
  "pending",
  "active",
  "purchased",
]);
export type Stage = z.infer<typeof stageSchema>;
export const TYPES = [
  "Mercado",
  "Padaria",
  "Açougue",
  "Mercearia",
  "Restaurante",
  "Lanchonete",
  "Conveniência",
] as const;
export const prioritySchema = z.enum(["baixa", "média", "alta"]);
export type Priority = z.infer<typeof prioritySchema>;
const id = z.string().min(1).max(100);
const date = z.string().datetime({ offset: true });
const text = z.string().max(5000);
export const prospectSchema = z.object({
  id,
  businessName: z.string().trim().min(2).max(120),
  businessType: z.enum(TYPES),
  contactName: text,
  phone: text,
  whatsapp: text,
  email: z.union([z.literal(""), z.string().email()]),
  address: text,
  number: text,
  city: text,
  state: text,
  neighborhood: text,
  zipCode: text,
  complement: text,
  businessSize: z.enum(["pequeno", "médio", "grande"]),
  mainInterest: text,
  commercialNeed: text,
  purchaseFrequency: text,
  estimatedPurchaseValue: z.number().finite().nonnegative(),
  priority: prioritySchema,
  source: text,
  stage: stageSchema,
  createdAt: date,
  updatedAt: date,
  lastContactAt: date.nullable(),
  nextContactAt: date.nullable(),
  firstContactAt: date.nullable(),
  notes: text,
  activatedAt: date.nullable(),
  confirmedBy: text,
});
export type Prospect = z.infer<typeof prospectSchema>;
export const interactionSchema = z.object({
  id,
  prospectId: id,
  type: z.enum([
    "Visita presencial",
    "Ligação",
    "Mensagem",
    "E-mail",
    "Reunião",
    "Observação comercial",
    "Sistema",
  ]),
  description: z.string().min(1).max(5000),
  outcome: text,
  createdAt: date,
  nextAction: text,
  nextContactAt: date.nullable(),
  relatedVisitId: id.nullable(),
  objection: text,
});
export type Interaction = z.infer<typeof interactionSchema>;
export const visitSchema = z.object({
  id,
  prospectId: id,
  scheduledAt: date,
  objective: z.string().trim().min(2).max(500),
  priority: prioritySchema,
  status: z.enum(["scheduled", "completed", "cancelled"]),
  result: text,
  notes: text,
  completedAt: date.nullable(),
  nextAction: text,
});
export type Visit = z.infer<typeof visitSchema>;
export const orderSchema = z.object({
  id,
  prospectId: id,
  reference: z.string().trim().min(1).max(100),
  amount: z.number().finite().positive(),
  createdAt: date,
  notes: text,
});
export type Order = z.infer<typeof orderSchema>;
export const ACTIONS = {
  prospect: {
    xp: 10,
    label: "Novo potencial cadastrado",
    skill: "Organização e identificação de oportunidades",
  },
  visit: {
    xp: 25,
    label: "Visita concluída",
    skill: "Execução e acompanhamento comercial",
  },
  stage: { xp: 50, label: "Avanço de negociação", skill: "Tomada de decisão" },
  activation: {
    xp: 100,
    label: "Cliente ativado",
    skill: "Organização e conversão comercial",
  },
  order: { xp: 200, label: "Primeira compra", skill: "Tino comercial" },
} as const;
export type RewardAction = keyof typeof ACTIONS;
export const rewardSchema = z.object({
  id,
  eventKey: id,
  action: z.enum(["prospect", "visit", "stage", "activation", "order"]),
  prospectId: id,
  relatedEntityId: id,
  xp: z.number().int().min(0).max(200),
  createdAt: date,
  description: text,
});
export type Reward = z.infer<typeof rewardSchema>;
export const storeSchema = z.object({
  schemaVersion: z.literal(1),
  seller: z.string().trim().min(2).max(80),
  prospects: z.array(prospectSchema).max(10000),
  interactions: z.array(interactionSchema).max(50000),
  visits: z.array(visitSchema).max(20000),
  orders: z.array(orderSchema).max(20000),
  rewards: z.array(rewardSchema).max(50000),
});
export type Store = z.infer<typeof storeSchema>;
export const LEVELS = [
  { name: "Explorador Comercial", xp: 0 },
  { name: "Prospectador", xp: 100 },
  { name: "Negociador", xp: 300 },
  { name: "Conquistador", xp: 700 },
  { name: "Mestre das Rotas", xp: 1500 },
];
export const stageLabel = (stage: Stage) =>
  STAGES.find((s) => s.id === stage)!.label;
