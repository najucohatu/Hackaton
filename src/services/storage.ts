import { ACTIONS, storeSchema } from "../models";
import type { Store } from "../models";
import { demoStore } from "../data/demo";
import {
  activationErrors,
  validateProspect,
  canonicalPhone,
  normalized,
} from "./business";
export const STORAGE_KEY = "rota-plus:v1";

function availableStorage(): Pick<Storage, "getItem" | "setItem"> | null {
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}
function unique(items: { id: string }[]) {
  return new Set(items.map((i) => i.id)).size === items.length;
}
export function validateBackup(input: unknown): Store {
  const result = storeSchema.safeParse(input);
  if (!result.success)
    throw new Error(
      "Backup inválido: verifique os campos e a versão do arquivo Rota+.",
    );
  const s = result.data;
  for (const collection of [
    s.prospects,
    s.visits,
    s.interactions,
    s.orders,
    s.rewards,
  ])
    if (!unique(collection))
      throw new Error("Backup inválido: identificadores duplicados.");
  const ids = new Set(s.prospects.map((p) => p.id));
  for (const collection of [s.visits, s.interactions, s.orders, s.rewards])
    if (collection.some((i) => !ids.has(i.prospectId)))
      throw new Error("Backup inválido: há registros sem estabelecimento.");
  const identities = new Set<string>();
  const contacts = new Map<string, string>();
  for (const p of s.prospects) {
    const identity = JSON.stringify(
      [p.businessName, p.city, p.neighborhood].map(normalized),
    );
    if (identities.has(identity))
      throw new Error("Backup inválido: estabelecimentos duplicados.");
    identities.add(identity);
    for (const phone of [p.phone, p.whatsapp].filter(Boolean)) {
      const key = canonicalPhone(phone);
      if (contacts.has(key) && contacts.get(key) !== p.id)
        throw new Error(
          "Backup inválido: telefone duplicado entre estabelecimentos.",
        );
      contacts.set(key, p.id);
    }
    validateProspect(p);
    if (p.activatedAt && activationErrors(p).length)
      throw new Error(
        "Backup inválido: cliente ativo com cadastro incompleto.",
      );
    if (["active", "purchased"].includes(p.stage) && !p.activatedAt)
      throw new Error("Backup inválido: estágio exige ativação.");
    if (p.activatedAt && !["active", "purchased"].includes(p.stage))
      throw new Error("Backup inválido: cliente ativado em estágio anterior.");
    if (p.stage === "purchased" && !s.orders.some((o) => o.prospectId === p.id))
      throw new Error("Backup inválido: primeira compra sem pedido.");
    if (s.orders.some((o) => o.prospectId === p.id) && p.stage !== "purchased")
      throw new Error(
        "Backup inválido: compra registrada fora do estágio final.",
      );
  }
  if (
    new Set(s.orders.map((o) => o.reference.toLowerCase().trim())).size !==
    s.orders.length
  )
    throw new Error("Backup inválido: referências de pedidos duplicadas.");
  for (const o of s.orders)
    if (!s.prospects.find((p) => p.id === o.prospectId)?.activatedAt)
      throw new Error("Backup inválido: compra de cliente inativo.");
  for (const v of s.visits) {
    const entries = s.interactions.filter((i) => i.relatedVisitId === v.id);
    if (
      v.status === "completed" &&
      (!v.result || !v.completedAt || entries.length !== 1)
    )
      throw new Error(
        "Backup inválido: visita concluída sem resultado ou histórico único.",
      );
  }
  for (const i of s.interactions)
    if (
      i.relatedVisitId &&
      !s.visits.some(
        (v) =>
          v.id === i.relatedVisitId &&
          v.prospectId === i.prospectId &&
          v.status === "completed",
      )
    )
      throw new Error("Backup inválido: histórico de visita inconsistente.");
  if (new Set(s.rewards.map((r) => r.eventKey)).size !== s.rewards.length)
    throw new Error("Backup inválido: recompensas duplicadas.");
  for (const r of s.rewards) {
    const p = s.prospects.find((p) => p.id === r.prospectId)!;
    const valid =
      r.eventKey === `${r.action}:${r.prospectId}:${r.relatedEntityId}` &&
      r.xp === ACTIONS[r.action].xp &&
      ((r.action === "prospect" && r.relatedEntityId === p.id) ||
        (r.action === "activation" &&
          r.relatedEntityId === p.id &&
          !!p.activatedAt) ||
        (r.action === "order" &&
          r.relatedEntityId === p.id &&
          s.orders.some((o) => o.prospectId === p.id)) ||
        (r.action === "visit" &&
          s.visits.some(
            (v) =>
              v.id === r.relatedEntityId &&
              v.prospectId === p.id &&
              v.status === "completed",
          )) ||
        (r.action === "stage" &&
          ["contacted", "qualified", "negotiation", "pending"].includes(
            r.relatedEntityId,
          )));
    if (!valid)
      throw new Error("Backup inválido: recompensa incompatível com a ação.");
  }
  return s;
}
export function loadStore(storage?: Pick<Storage, "getItem" | "setItem">): {
  store: Store;
  warning: string;
} {
  const activeStorage = storage ?? availableStorage();
  if (!activeStorage)
    return {
      store: demoStore(),
      warning:
        "O navegador bloqueou o armazenamento local neste modo. A demonstração funciona, mas alterações serão perdidas ao fechar a página.",
    };
  let raw: string | null = null;
  try {
    raw = activeStorage.getItem(STORAGE_KEY);
  } catch {
    return {
      store: demoStore(),
      warning:
        "Armazenamento indisponível. Os dados não podem ser salvos neste navegador.",
    };
  }
  if (!raw) return { store: demoStore(), warning: "" };
  try {
    return { store: validateBackup(JSON.parse(raw)), warning: "" };
  } catch {
    try {
      activeStorage.setItem(`${STORAGE_KEY}:recovery:${Date.now()}`, raw);
    } catch {
      /* preserve original if storage is full */
    }
    return {
      store: demoStore(),
      warning:
        "Os dados locais estavam inválidos. Uma cópia de recuperação foi preservada quando possível e a demonstração foi carregada. Exporte um backup antes de continuar.",
    };
  }
}
export function persist(s: Store, storage?: Pick<Storage, "setItem">) {
  const activeStorage = storage ?? availableStorage();
  if (!activeStorage)
    throw new Error(
      "O navegador bloqueou o armazenamento local neste modo. A demonstração funciona, mas alterações serão perdidas ao fechar a página.",
    );
  try {
    activeStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    throw new Error(
      "Não foi possível salvar. O armazenamento pode estar cheio ou bloqueado. Exporte seu backup.",
    );
  }
}
