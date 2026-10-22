import { useState } from "react";
import type { FormEvent } from "react";
import type { Prospect, Store, Visit, Stage, Interaction } from "../models";
import { TYPES, STAGES } from "../models";
import { blankProspect } from "../data/demo";
import { uid, now, duplicate } from "../services/business";
import { OBJECTIONS } from "../services/insights";
import { isoInput, localInput } from "../services/format";
import { Field, Input, Select } from "./ui";
export type FormKind =
  | "prospect"
  | "contact"
  | "visit"
  | "complete"
  | "return"
  | "stage"
  | "activate"
  | "order";
export interface FormRequest {
  kind: FormKind;
  prospectId?: string;
  visitId?: string;
  edit?: boolean;
}
export type FormPayload =
  | { kind: "prospect"; data: Prospect }
  | { kind: "contact"; data: Interaction }
  | { kind: "visit"; data: Visit }
  | {
      kind: "complete";
      id: string;
      data: {
        result: string;
        notes: string;
        objection: string;
        nextAction: string;
        nextContactAt: string | null;
      };
    }
  | { kind: "return"; id: string; date: string; nextAction: string }
  | { kind: "stage"; id: string; stage: Stage }
  | { kind: "activate"; id: string; confirmedBy: string }
  | {
      kind: "order";
      data: {
        id: string;
        prospectId: string;
        reference: string;
        amount: number;
        createdAt: string;
        notes: string;
      };
    };
export const formTitles: Record<FormKind, string> = {
  prospect: "Novo potencial cliente",
  contact: "Registrar contato",
  visit: "Agendar visita",
  complete: "Concluir visita",
  return: "Agendar retorno",
  stage: "Atualizar negociação",
  activate: "Concluir cadastro comercial",
  order: "Registrar compra demonstrativa",
};
function FormFooter({
  onClose,
  submit = "Salvar",
}: {
  onClose: () => void;
  submit?: string;
}) {
  return (
    <footer className="form-footer">
      <button type="button" className="button" onClick={onClose}>
        Cancelar
      </button>
      <button className="button primary" type="submit">
        {submit}
      </button>
    </footer>
  );
}
export function ProspectForm({
  store,
  prospect,
  onSubmit,
  onClose,
  onReview,
}: {
  store: Store;
  prospect?: Prospect;
  onSubmit: (p: FormPayload) => void;
  onClose: () => void;
  onReview: (id: string) => void;
}) {
  const [p, setP] = useState<Prospect>(() =>
    prospect ? { ...prospect } : blankProspect(),
  );
  const [error, setError] = useState("");
  const [dupe, setDupe] = useState<Prospect | null>(null);
  const set = <K extends keyof Prospect>(key: K, value: Prospect[K]) =>
    setP((v) => ({ ...v, [key]: value }));
  const text = (
    key: keyof Prospect,
    label: string,
    type = "text",
    required = false,
  ) => (
    <Input
      key={key}
      label={label}
      type={type}
      required={required}
      value={String(p[key] ?? "")}
      onChange={(e) => set(key, e.target.value as never)}
    />
  );
  const submit = (e: FormEvent) => {
    e.preventDefault();
    try {
      const d = duplicate(store, p);
      if (d) {
        setDupe(d);
        setError(
          "Possível cadastro duplicado. Revise o estabelecimento existente.",
        );
        return;
      }
      onSubmit({
        kind: "prospect",
        data: {
          ...p,
          businessName: p.businessName.trim(),
          nextContactAt: p.nextContactAt,
          updatedAt: now(),
        },
      });
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <form onSubmit={submit}>
      <div className="form-content">
        <div className="form-note">
          Comece pelo essencial. Você pode complementar os dados depois.
        </div>
        <h3 className="form-section">Identificação</h3>
        <div className="form-grid">
          {text("businessName", "Nome do estabelecimento *", "text", true)}
          <Select
            label="Tipo de estabelecimento *"
            value={p.businessType}
            onChange={(e) =>
              set("businessType", e.target.value as Prospect["businessType"])
            }
          >
            {TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </Select>
          {text("contactName", "Nome do responsável")}
          {text("phone", "Telefone com DDD", "tel")}
          {text("whatsapp", "WhatsApp, se diferente", "tel")}
          {text("email", "E-mail", "email")}
        </div>
        <details open={!!prospect}>
          <summary>Localização</summary>
          <div className="form-grid">
            {text("zipCode", "CEP")}
            {text("address", "Endereço")}
            {text("number", "Número")}
            {text("complement", "Complemento")}
            {text("neighborhood", "Bairro")}
            {text("city", "Cidade")}
            {text("state", "Estado (UF)")}
          </div>
        </details>
        <details open={!!prospect}>
          <summary>Perfil comercial</summary>
          <div className="form-grid">
            <Select
              label="Porte"
              value={p.businessSize}
              onChange={(e) =>
                set("businessSize", e.target.value as Prospect["businessSize"])
              }
            >
              {["pequeno", "médio", "grande"].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </Select>
            <Select
              label="Prioridade"
              value={p.priority}
              onChange={(e) =>
                set("priority", e.target.value as Prospect["priority"])
              }
            >
              {["alta", "média", "baixa"].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </Select>
            {text("mainInterest", "Interesse principal")}
            {text("commercialNeed", "Necessidade identificada")}
            {text("purchaseFrequency", "Frequência potencial de compra")}
            <Input
              label="Volume potencial (R$)"
              type="number"
              min="0"
              step="0.01"
              value={p.estimatedPurchaseValue}
              onChange={(e) =>
                set("estimatedPurchaseValue", Number(e.target.value))
              }
            />
          </div>
        </details>
        <details>
          <summary>Prospecção e observações</summary>
          <div className="form-grid">
            {text("source", "Origem do contato")}
            {!prospect && (
              <Select
                label="Estágio inicial"
                value={p.stage}
                onChange={(e) => set("stage", e.target.value as Stage)}
              >
                {STAGES.slice(0, 5).map((s) => (
                  <option value={s.id} key={s.id}>
                    {s.label}
                  </option>
                ))}
              </Select>
            )}
            <Input
              label="Primeiro contato"
              type="datetime-local"
              max={localInput(now())}
              value={p.firstContactAt ? localInput(p.firstContactAt) : ""}
              onChange={(e) => set("firstContactAt", isoInput(e.target.value))}
            />
            <Input
              label="Próximo contato"
              type="datetime-local"
              value={p.nextContactAt ? localInput(p.nextContactAt) : ""}
              onChange={(e) => set("nextContactAt", isoInput(e.target.value))}
            />
          </div>
          <Field label="Observações">
            <textarea
              value={p.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </Field>
        </details>
        {error && (
          <div className="error" role="alert">
            {error}
            {dupe && (
              <button
                type="button"
                className="text-button"
                onClick={() => onReview(dupe.id)}
              >
                Revisar {dupe.businessName} →
              </button>
            )}
          </div>
        )}
      </div>
      <FormFooter
        onClose={onClose}
        submit={prospect ? "Salvar alterações" : "Cadastrar potencial"}
      />
    </form>
  );
}
export function ActionForm({
  request,
  store,
  onSubmit,
  onClose,
}: {
  request: FormRequest;
  store: Store;
  onSubmit: (p: FormPayload) => void;
  onClose: () => void;
}) {
  const visit = store.visits.find((v) => v.id === request.visitId),
    prospect = store.prospects.find(
      (p) => p.id === (request.prospectId || visit?.prospectId),
    );
  const [error, setError] = useState("");
  const [token] = useState(uid);
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget),
      v = (key: string) => String(f.get(key) || "");
    try {
      const id = v("prospectId") || prospect?.id || "";
      switch (request.kind) {
        case "stage":
          onSubmit({ kind: "stage", id, stage: v("stage") as Stage });
          break;
        case "activate":
          onSubmit({ kind: "activate", id, confirmedBy: v("confirmedBy") });
          break;
        case "order":
          onSubmit({
            kind: "order",
            data: {
              id: token,
              prospectId: id,
              reference: v("reference"),
              amount: Number(v("amount")),
              createdAt: isoInput(v("date"))!,
              notes: v("notes"),
            },
          });
          break;
        case "return":
          onSubmit({
            kind: "return",
            id,
            date: isoInput(v("date"))!,
            nextAction: v("nextAction"),
          });
          break;
        case "visit":
          onSubmit({
            kind: "visit",
            data: {
              id: visit?.id || token,
              prospectId: id,
              scheduledAt: isoInput(v("date"))!,
              objective: v("objective"),
              priority: v("priority") as Visit["priority"],
              status: "scheduled",
              result: "",
              notes: v("notes"),
              completedAt: null,
              nextAction: "",
            },
          });
          break;
        case "complete":
          onSubmit({
            kind: "complete",
            id: visit!.id,
            data: {
              result: v("result"),
              notes: v("notes"),
              objection: v("objection"),
              nextAction: v("nextAction"),
              nextContactAt: isoInput(v("nextDate")),
            },
          });
          break;
        case "contact":
          onSubmit({
            kind: "contact",
            data: {
              id: token,
              prospectId: id,
              type: v("type") as Interaction["type"],
              description: v("description"),
              outcome: v("outcome"),
              createdAt: isoInput(v("date"))!,
              nextAction: v("nextAction"),
              nextContactAt: isoInput(v("nextDate")),
              relatedVisitId: null,
              objection: v("objection"),
            },
          });
          break;
      }
    } catch (err) {
      setError((err as Error).message);
    }
  }
  const dateField = (
    label = "Data e horário",
    name = "date",
    required = true,
    value?: string,
    max?: string,
  ) => (
    <Input
      label={label}
      name={name}
      type="datetime-local"
      required={required}
      defaultValue={value}
      max={max}
    />
  );
  const nextFields = (
    <>
      <Input label="Próxima ação" name="nextAction" />
      <Input label="Data de retorno" name="nextDate" type="datetime-local" />
    </>
  );
  const objectionField = (
    <Select label="Objeção encontrada" name="objection">
      <option value="">Nenhuma objeção registrada</option>
      {Object.keys(OBJECTIONS).map((x) => (
        <option key={x}>{x}</option>
      ))}
    </Select>
  );
  return (
    <form onSubmit={submit}>
      <div className="form-content">
        {prospect ? (
          <div className="form-note">
            <strong>{prospect.businessName}</strong>
            <br />
            {prospect.businessType} ·{" "}
            {prospect.city || "Localização não informada"}
          </div>
        ) : (
          <Select label="Estabelecimento *" name="prospectId" required>
            <option value="">Selecione um estabelecimento</option>
            {store.prospects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.businessName}
              </option>
            ))}
          </Select>
        )}
        {request.kind === "stage" && (
          <>
            <Select
              label="Novo estágio"
              name="stage"
              defaultValue={prospect?.stage}
            >
              {STAGES.map((s) => (
                <option value={s.id} key={s.id}>
                  {s.label}
                </option>
              ))}
            </Select>
            <p className="muted">
              Ativação e primeira compra exigem seus respectivos registros.
              Correções de estágio ficam no histórico e não repetem XP.
            </p>
          </>
        )}
        {request.kind === "activate" && (
          <>
            <div className="form-note green">
              Ativação simulada do protótipo. Sem integração com ERP.
            </div>
            <ul className="checklist">
              <li>Nome e tipo do estabelecimento</li>
              <li>Telefone válido ou e-mail</li>
              <li>Endereço, cidade e estado</li>
              <li>Responsável pelo cadastro</li>
            </ul>
            <Input
              label="Confirmo a verificação comercial. Meu nome é: *"
              name="confirmedBy"
              required
              minLength={2}
              defaultValue={store.seller}
            />
            <label className="check-label">
              <input type="checkbox" required /> Conferi os dados comerciais
              deste estabelecimento.
            </label>
          </>
        )}
        {request.kind === "order" && (
          <>
            <p className="muted">
              Pedido fictício. Não há cobrança, faturamento ou reserva de
              estoque.
            </p>
            {dateField(
              "Data da compra *",
              "date",
              true,
              localInput(now()),
              localInput(now()),
            )}
            <Input
              label="Identificador fictício do pedido *"
              name="reference"
              defaultValue={`ROTA-${token.slice(0, 8).toUpperCase()}`}
              required
            />
            <Input
              label="Valor total (R$) *"
              name="amount"
              type="number"
              min="0.01"
              step="0.01"
              required
            />
            <Field label="Observações">
              <textarea name="notes" />
            </Field>
          </>
        )}
        {request.kind === "return" && (
          <>
            {dateField(
              "Próximo contato *",
              "date",
              true,
              prospect?.nextContactAt
                ? localInput(prospect.nextContactAt)
                : undefined,
            )}
            <Input
              label="Próxima ação *"
              name="nextAction"
              required
              minLength={3}
            />
          </>
        )}
        {request.kind === "visit" && (
          <>
            <div className="form-grid">
              {dateField(
                "Data e horário *",
                "date",
                true,
                visit ? localInput(visit.scheduledAt) : undefined,
              )}
              <Select
                label="Prioridade"
                name="priority"
                defaultValue={visit?.priority || prospect?.priority || "média"}
              >
                {["alta", "média", "baixa"].map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </Select>
            </div>
            <Input
              label="Objetivo da visita *"
              name="objective"
              required
              minLength={2}
              defaultValue={visit?.objective}
            />
            <Field label="Observações">
              <textarea name="notes" defaultValue={visit?.notes} />
            </Field>
          </>
        )}
        {request.kind === "complete" && (
          <>
            <Select label="Resultado da visita *" name="result" required>
              <option value="">Selecione o resultado</option>
              {[
                "Produtiva",
                "Sem contato",
                "Retorno necessário",
                "Sem interesse",
              ].map((r) => (
                <option key={r}>{r}</option>
              ))}
            </Select>
            <Field label="O que aconteceu na visita? *">
              <textarea name="notes" required minLength={3} />
            </Field>
            {objectionField}
            {nextFields}
          </>
        )}
        {request.kind === "contact" && (
          <>
            <div className="form-grid">
              <Select label="Tipo de contato" name="type">
                {[
                  "Ligação",
                  "Mensagem",
                  "E-mail",
                  "Reunião",
                  "Visita presencial",
                  "Observação comercial",
                ].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </Select>
              {dateField(
                "Data e horário *",
                "date",
                true,
                localInput(now()),
                localInput(now()),
              )}
            </div>
            <Field label="Descrição do contato *">
              <textarea name="description" required minLength={3} />
            </Field>
            <Input label="Resultado *" name="outcome" required />
            {objectionField}
            {nextFields}
          </>
        )}
        {error && (
          <div className="error" role="alert">
            {error}
          </div>
        )}
      </div>
      <FormFooter
        onClose={onClose}
        submit={
          request.kind === "activate"
            ? "Ativar cliente"
            : request.kind === "complete"
              ? "Concluir visita"
              : "Salvar registro"
        }
      />
    </form>
  );
}
