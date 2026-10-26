import {
  ArrowRight,
  ArrowUpRight,
  Users,
  Target,
  UserCheck,
  ShoppingBag,
  TrendingUp,
  Zap,
  Clock,
  Sparkles,
  ChevronRight,
  MapPin,
} from "lucide-react";
import type { Store } from "../models";
import { STAGES } from "../models";
import { metrics, rank } from "../services/business";
import { kilos, dateTime, isToday, overdue } from "../services/format";
import { Empty, SectionTitle, PriorityBadge } from "./ui";
export function StatCards({
  store,
  extended = false,
}: {
  store: Store;
  extended?: boolean;
}) {
  const m = metrics(store);
  const items = [
    {
      label: "Potenciais clientes",
      value: m.total,
      icon: Users,
      caption: "Estabelecimentos na sua carteira",
      color: "blue",
    },
    {
      label: "Oportunidades abertas",
      value: m.open,
      icon: Target,
      caption: "Relacionamentos em construção",
      color: "purple",
    },
    {
      label: "Clientes conquistados",
      value: m.active,
      icon: UserCheck,
      caption: "Cadastros comerciais ativados",
      color: "green",
    },
    {
      label: "Primeiras compras",
      value: m.purchases,
      icon: ShoppingBag,
      caption: "Relacionamentos que viraram vendas",
      color: "orange",
    },
    {
      label: "Taxa de conversão",
      value: `${m.conversion.toFixed(1).replace(".", ",")}%`,
      icon: TrendingUp,
      caption: "Potenciais convertidos em clientes",
      color: "blue",
    },
    {
      label: "XP acumulado",
      value: m.xp,
      icon: Zap,
      caption: "Cada boa ação conta",
      color: "purple",
    },
  ];
  if (extended)
    items.push(
      {
        label: "Visitas concluídas",
        value: m.visits,
        icon: MapPin,
        caption: "Visitas com resultado registrado",
        color: "green",
      },
      {
        label: "Contatos realizados",
        value: m.contacts,
        icon: Clock,
        caption: "Interações comerciais registradas",
        color: "blue",
      },
      {
        label: "Volume de primeiras compras",
        value: kilos(m.volume),
        icon: ShoppingBag,
        caption: "Quantidade demonstrativa, sem faturamento",
        color: "orange",
      },
    );
  return (
    <div className="stats-grid">
      {items.map(({ label, value, icon: Icon, caption, color }) => (
        <article className="stat-card" key={label}>
          <div className="row between">
            <span>{label}</span>
            <span className={`stat-icon ${color}`}>
              <Icon size={18} />
            </span>
          </div>
          <strong>{value}</strong>
          <small>{caption}</small>
        </article>
      ))}
    </div>
  );
}
export function Dashboard({
  store,
  onOpen,
  onPage,
  onNew,
}: {
  store: Store;
  onOpen: (id: string) => void;
  onPage: (p: string) => void;
  onNew: () => void;
}) {
  const m = metrics(store),
    returns = store.prospects.filter(
      (p) =>
        p.nextContactAt &&
        (isToday(p.nextContactAt) || overdue(p.nextContactAt)),
    );
  const priorities = store.prospects
    .filter(
      (p) =>
        returns.includes(p) ||
        p.stage === "negotiation" ||
        store.visits.some(
          (v) =>
            v.prospectId === p.id &&
            v.status === "scheduled" &&
            (isToday(v.scheduledAt) || overdue(v.scheduledAt)),
        ),
    )
    .sort(
      (a, b) =>
        Number(overdue(b.nextContactAt)) - Number(overdue(a.nextContactAt)) ||
        rank[a.priority] - rank[b.priority],
    )
    .slice(0, 4);
  const activities = [...store.interactions]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);
  const visits = store.visits
    .filter((v) => v.status === "scheduled" && isToday(v.scheduledAt))
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  const negotiation = store.prospects.filter(
    (p) => p.stage === "negotiation",
  ).length;
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">SEU DIA, COM MAIS DIREÇÃO</div>
          <h1>
            Vamos conquistar novos caminhos<span className="blue-text">.</span>
          </h1>
          <p>
            Olá, {store.seller.split(" ")[0]}! Você tem{" "}
            <strong>{returns.length} retornos pendentes</strong> e {negotiation}{" "}
            oportunidades em negociação.
          </p>
        </div>
        <button className="button primary" onClick={onNew}>
          + Novo potencial
        </button>
      </div>
      <StatCards store={store} />
      <div className="dashboard-columns">
        <section className="panel">
          <SectionTitle
            title="Prioridades do dia"
            caption="As conversas que merecem sua atenção."
            action={
              <button
                className="text-button"
                onClick={() => onPage("prospects")}
              >
                Ver todos <ArrowRight size={15} />
              </button>
            }
          />
          {priorities.length ? (
            priorities.map((p) => (
              <button
                className="priority-row"
                key={p.id}
                onClick={() => onOpen(p.id)}
              >
                <span className="avatar-business">
                  {p.businessName
                    .split(" ")
                    .map((w) => w[0])
                    .slice(0, 2)
                    .join("")}
                </span>
                <span className="grow">
                  <strong>{p.businessName}</strong>
                  <small>
                    {p.businessType} · {p.neighborhood || p.city}
                  </small>
                  <span
                    className={`schedule-note ${overdue(p.nextContactAt) ? "late" : ""}`}
                  >
                    <Clock size={12} />
                    {p.nextContactAt
                      ? `${overdue(p.nextContactAt) ? "Retorno atrasado · " : ""}${dateTime(p.nextContactAt)}`
                      : "Retomar negociação"}
                  </span>
                </span>
                <PriorityBadge priority={p.priority} />
                <ChevronRight size={17} />
              </button>
            ))
          ) : (
            <Empty
              text="Cadastre oportunidades e agende os próximos passos."
              action="Novo potencial"
              onAction={onNew}
            />
          )}
        </section>
        <section className="insight-feature">
          <span className="insight-tag">
            <Sparkles size={15} /> ROTA+ INSIGHTS
          </span>
          <h2>
            Uma boa conversa
            <br />
            abre novas portas.
          </h2>
          <p>
            Conheça o perfil do estabelecimento e encontre o melhor caminho para
            a próxima abordagem.
          </p>
          <div className="insight-orbit">
            <Target size={50} />
            <span className="orbit-one" />
            <span className="orbit-two" />
          </div>
          <button
            className="button"
            onClick={() => (priorities[0] ? onOpen(priorities[0].id) : onNew())}
          >
            Explorar recomendações <ArrowUpRight size={16} />
          </button>
          <small>Sugestões baseadas em regras comerciais.</small>
        </section>
      </div>
      <div className="dashboard-columns lower">
        <section className="panel">
          <SectionTitle
            title="Seu funil comercial"
            caption={`${m.total} oportunidades. Cada etapa, um novo avanço.`}
            action={
              <button
                className="icon-button"
                onClick={() => onPage("opportunities")}
                aria-label="Abrir oportunidades"
              >
                <ArrowUpRight size={18} />
              </button>
            }
          />
          <div className="funnel">
            {STAGES.map((stage) => {
              const count = store.prospects.filter(
                (p) => p.stage === stage.id,
              ).length;
              return (
                <button
                  key={stage.id}
                  className="funnel-row"
                  onClick={() => onPage(`opportunities?stage=${stage.id}`)}
                >
                  <span>{stage.label}</span>
                  <div className="funnel-track">
                    <div
                      style={{
                        width: `${m.total ? Math.max(3, (count / m.total) * 100) : 0}%`,
                        background: stage.color,
                      }}
                    />
                  </div>
                  <strong>{count}</strong>
                </button>
              );
            })}
          </div>
        </section>
        <section className="panel">
          <SectionTitle
            title="Últimas atividades"
            caption="Seu progresso acontece em cada interação."
          />
          {activities.length ? (
            <div className="timeline">
              {activities.map((a) => (
                <button
                  key={a.id}
                  className="timeline-item"
                  onClick={() => onOpen(a.prospectId)}
                >
                  <span className="timeline-dot" />
                  <span>
                    <strong>
                      {
                        store.prospects.find((p) => p.id === a.prospectId)
                          ?.businessName
                      }
                    </strong>
                    <p>{a.description}</p>
                    <small>{dateTime(a.createdAt)}</small>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <Empty text="As ações realizadas aparecerão aqui." />
          )}
        </section>
      </div>
      <section className="route-banner">
        <span className="route-icon">
          <MapPin size={24} />
        </span>
        <div className="grow">
          <h3>Sua próxima parada está esperando.</h3>
          <p>
            {visits.length
              ? `${visits.length} visitas agendadas para hoje. Próxima: ${store.prospects.find((p) => p.id === visits[0].prospectId)?.businessName}.`
              : "Organize suas visitas e acompanhe cada oportunidade."}
          </p>
        </div>
        <button className="button" onClick={() => onPage("route")}>
          Ver minha rota <ArrowRight size={16} />
        </button>
      </section>
    </>
  );
}
