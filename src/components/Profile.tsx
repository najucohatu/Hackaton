import { useState } from "react";
import {
  ArrowLeft,
  Pencil,
  Phone,
  MapPin,
  Mail,
  MessageCircle,
  Sparkles,
  Copy,
  ArrowUpRight,
  CalendarPlus,
  ShoppingBag,
  UserCheck,
  Trash2,
  CheckCircle2,
  Circle,
  Clock,
  Store as StoreIcon,
  Target,
  ExternalLink,
} from "lucide-react";
import type { Store, Prospect } from "../models";
import type { FormRequest } from "./Forms";
import { insights, OBJECTIONS } from "../services/insights";
import {
  activationErrors,
  addressLine,
  digits,
  validPhone,
} from "../services/business";
import { kilos, dateTime } from "../services/format";
import { Empty, SectionTitle, StageBadge, PriorityBadge } from "./ui";
export function Profile({
  p,
  store,
  onBack,
  onForm,
  onDelete,
  notify,
}: {
  p: Prospect;
  store: Store;
  onBack: () => void;
  onForm: (f: FormRequest) => void;
  onDelete: () => void;
  notify: (s: string) => void;
}) {
  const history = store.interactions
    .filter((i) => i.prospectId === p.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const orders = store.orders
    .filter((o) => o.prospectId === p.id)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const visits = store.visits.filter(
    (v) => v.prospectId === p.id && v.status === "scheduled",
  );
  const tips = insights(p, history),
    [objection, setObjection] = useState(
      tips.objection || "Já tenho fornecedor.",
    );
  const form = (kind: FormRequest["kind"]) =>
    onForm({ kind, prospectId: p.id });
  const phone = p.whatsapp || p.phone,
    wa = digits(phone).length <= 11 ? `55${digits(phone)}` : digits(phone);
  const missing = activationErrors(p);
  async function copy() {
    try {
      await navigator.clipboard.writeText(
        `${tips.opening}\n\n${tips.questions.join("\n")}\n\n${tips.argument}\n\n${tips.next}\n\n${OBJECTIONS[objection]}`,
      );
      notify("Sugestões copiadas para a área de transferência.");
    } catch {
      notify(
        "Não foi possível copiar. Selecione e copie o texto das sugestões.",
      );
    }
  }
  return (
    <>
      <button className="back-link" onClick={onBack}>
        <ArrowLeft size={16} />
        Voltar para potenciais clientes
      </button>
      <div className="profile-heading">
        <span className="business-icon large">
          <StoreIcon size={30} />
        </span>
        <div className="grow">
          <div className="eyebrow">
            {p.businessType} · PORTE {p.businessSize.toUpperCase()}
          </div>
          <h1>{p.businessName}</h1>
          <div className="row gap wrap">
            <StageBadge stage={p.stage} />
            <PriorityBadge priority={p.priority} />
            <span className="muted">
              Desde {new Date(p.createdAt).toLocaleDateString("pt-BR")}
            </span>
          </div>
        </div>
        <button
          className="button"
          onClick={() =>
            onForm({ kind: "prospect", prospectId: p.id, edit: true })
          }
        >
          <Pencil size={16} />
          Editar cadastro
        </button>
      </div>
      <div className="profile-actions">
        <button className="button primary" onClick={() => form("contact")}>
          <MessageCircle size={16} />
          Registrar contato
        </button>
        <button className="button" onClick={() => form("visit")}>
          <CalendarPlus size={16} />
          Agendar visita
        </button>
        <button className="button" onClick={() => form("return")}>
          <Clock size={16} />
          Agendar retorno
        </button>
        <button className="button" onClick={() => form("stage")}>
          <ArrowUpRight size={16} />
          Atualizar negociação
        </button>
      </div>
      <div className="profile-grid">
        <div className="profile-main">
          <section className="panel">
            <SectionTitle title="Resumo comercial" />
            <div className="detail-grid">
              {[
                ["Responsável", p.contactName],
                ["Interesse principal", p.mainInterest],
                ["Necessidade identificada", p.commercialNeed],
                ["Frequência potencial", p.purchaseFrequency],
                [
                  "Volume potencial (kg)",
                  p.estimatedPurchaseValue
                    ? kilos(p.estimatedPurchaseValue)
                    : "",
                ],
                ["Origem", p.source],
                [
                  "Último contato",
                  p.lastContactAt
                    ? dateTime(p.lastContactAt)
                    : "Ainda não registrado",
                ],
              ].map(([label, v]) => (
                <div key={label}>
                  <small>{label}</small>
                  <strong>{v || "Não informado"}</strong>
                </div>
              ))}
            </div>
            {p.notes && (
              <div className="notes">
                <small>Observações</small>
                <p>{p.notes}</p>
              </div>
            )}
          </section>
          <section className="panel insights-panel">
            <SectionTitle
              title="Rota+ Insights"
              caption="Uma abordagem que faz sentido para este cliente."
              action={<Sparkles size={21} />}
            />
            <p className="insight-intro">{tips.context}</p>
            <h3>Sugestão de abordagem</h3>
            <blockquote>{tips.opening}</blockquote>
            <h3>Perguntas que abrem a conversa</h3>
            <ul>
              {tips.questions.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ul>
            <h3>Argumento comercial</h3>
            <p>{tips.argument}</p>
            <div className="next-action">
              <Target size={18} />
              <div>
                <strong>Próxima melhor ação</strong>
                <p>{tips.next}</p>
              </div>
            </div>
            <label className="field">
              <span>Como responder à objeção</span>
              <select
                value={objection}
                onChange={(e) => setObjection(e.target.value)}
              >
                {Object.keys(OBJECTIONS).map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            <p className="objection-response">{OBJECTIONS[objection]}</p>
            <button className="button small" onClick={copy}>
              <Copy size={15} />
              Copiar sugestões
            </button>
            <small className="disclaimer">
              Recomendações demonstrativas baseadas no perfil comercial
              cadastrado.
            </small>
          </section>
          <section className="panel">
            <SectionTitle
              title="Histórico do relacionamento"
              caption={`${history.length} atividades registradas`}
              action={
                <button className="text-button" onClick={() => form("contact")}>
                  + Contato
                </button>
              }
            />
            {history.length ? (
              <div className="timeline profile-timeline">
                {history.map((i) => (
                  <article className="timeline-item" key={i.id}>
                    <span className="timeline-dot" />
                    <div>
                      <div className="row between wrap">
                        <strong>{i.type}</strong>
                        <small>{dateTime(i.createdAt)}</small>
                      </div>
                      <p>{i.description}</p>
                      {i.outcome && (
                        <span className="history-outcome">{i.outcome}</span>
                      )}
                      {i.objection && (
                        <p className="muted">Objeção: {i.objection}</p>
                      )}
                      {i.nextAction && (
                        <p className="muted">
                          Próximo passo: {i.nextAction}
                          {i.nextContactAt
                            ? ` · ${dateTime(i.nextContactAt)}`
                            : ""}
                        </p>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <Empty text="Registre o primeiro contato para começar este relacionamento." />
            )}
          </section>
        </div>
        <aside className="profile-aside">
          <section className="panel">
            <SectionTitle title="Contato e localização" />
            <div className="contact-lines">
              <span>
                <Phone size={16} />
                {p.phone || "Telefone não informado"}
              </span>
              <span>
                <Mail size={16} />
                {p.email || "E-mail não informado"}
              </span>
              <span>
                <MapPin size={16} />
                {addressLine(p) || "Endereço não informado"}
              </span>
            </div>
            <div className="contact-actions">
              {validPhone(phone) ? (
                <a
                  className="button small"
                  href={`https://wa.me/${wa}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MessageCircle size={15} />
                  WhatsApp
                </a>
              ) : (
                <small>
                  Adicione um telefone válido para abrir o WhatsApp.
                </small>
              )}
              {p.address && (
                <a
                  className="text-button"
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressLine(p))}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Abrir endereço no mapa <ExternalLink size={14} />
                </a>
              )}
            </div>
          </section>
          <section className="panel next-step-panel">
            <div className="row gap">
              <Clock size={18} />
              <h3>Próximo passo</h3>
            </div>
            <strong>
              {p.nextContactAt
                ? dateTime(p.nextContactAt)
                : "Vamos combinar um retorno?"}
            </strong>
            <p>{tips.next}</p>
            <button className="text-button" onClick={() => form("return")}>
              {p.nextContactAt ? "Reagendar retorno" : "Agendar retorno"}{" "}
              <ArrowUpRight size={15} />
            </button>
            {visits.map((v) => (
              <div className="scheduled-mini" key={v.id}>
                <small>Visita agendada · {dateTime(v.scheduledAt)}</small>
                <p>{v.objective}</p>
                <button
                  className="button small"
                  onClick={() =>
                    onForm({
                      kind: "complete",
                      visitId: v.id,
                      prospectId: p.id,
                    })
                  }
                >
                  Registrar resultado
                </button>
              </div>
            ))}
          </section>
          <section className="panel">
            <SectionTitle
              title="Cadastro comercial"
              action={<UserCheck size={19} />}
            />
            <span className={`status-label ${p.activatedAt ? "success" : ""}`}>
              {p.activatedAt ? "Cliente ativado" : "Aguardando ativação"}
            </span>
            <div className="activation-list">
              {[
                ["Dados básicos", !!p.businessName && !!p.businessType],
                [
                  "Meio de contato",
                  validPhone(p.phone) || validPhone(p.whatsapp) || !!p.email,
                ],
                ["Endereço comercial", !!p.address && !!p.city && !!p.state],
                ["Informações verificadas", !!p.confirmedBy],
              ].map(([label, ok]) => (
                <span key={String(label)}>
                  {ok ? <CheckCircle2 size={16} /> : <Circle size={16} />}{" "}
                  {label}
                </span>
              ))}
            </div>
            {!p.activatedAt && (
              <>
                <button
                  className="button primary full"
                  onClick={() => form("activate")}
                >
                  Concluir cadastro
                </button>
                {missing.length > 0 && (
                  <small className="disclaimer">
                    Complete os dados em “Editar cadastro” antes de ativar.
                  </small>
                )}
              </>
            )}
            <small className="disclaimer">
              Ativação simulada, sem cadastro em ERP.
            </small>
          </section>
          <section className="panel">
            <SectionTitle title="Compras" action={<ShoppingBag size={19} />} />
            {orders.length ? (
              <>
                {orders.map((o, i) => (
                  <div className="order-item" key={o.id}>
                    <div className="row between">
                      <strong>{kilos(o.amount)}</strong>
                      <span className="badge">
                        {i === 0 ? "1ª compra" : "Compra"}
                      </span>
                    </div>
                    <small>
                      {o.reference} · {dateTime(o.createdAt)}
                    </small>
                    {o.notes && <p>{o.notes}</p>}
                  </div>
                ))}
              </>
            ) : (
              <p className="muted">
                A primeira compra é o começo de uma nova história.
              </p>
            )}
            <button className="button full" onClick={() => form("order")}>
              <ShoppingBag size={16} />
              Registrar {orders.length ? "compra" : "primeira compra"}
            </button>
            <small className="disclaimer">
              Pedidos demonstrativos, sem pagamento.
            </small>
          </section>
          <button className="danger-link" onClick={onDelete}>
            <Trash2 size={15} />
            Excluir estabelecimento
          </button>
        </aside>
      </div>
    </>
  );
}
