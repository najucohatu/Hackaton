import { useState, useEffect } from "react";
import {
  Search,
  Plus,
  LayoutGrid,
  List,
  SlidersHorizontal,
  MapPin,
  Clock,
  Check,
  Pencil,
  X,
  ExternalLink,
} from "lucide-react";
import type { Store, Visit } from "../models";
import { STAGES, TYPES } from "../models";
import { normalized, rank, addressLine } from "../services/business";
import { dayKey, dateTime, isToday, overdue, kilos } from "../services/format";
import { Empty, ProspectCard, PriorityBadge, StageBadge } from "./ui";
import type { FormRequest } from "./Forms";
export function Prospects({
  store,
  onOpen,
  onNew,
  opportunities = false,
  initialStage = "",
}: {
  store: Store;
  onOpen: (id: string) => void;
  onNew: () => void;
  opportunities?: boolean;
  initialStage?: string;
}) {
  const [search, setSearch] = useState(""),
    [stage, setStage] = useState(initialStage),
    [type, setType] = useState(""),
    [priority, setPriority] = useState(""),
    [pending, setPending] = useState(false),
    [sort, setSort] = useState("priority"),
    [view, setView] = useState("grid");
  const [timestamp, setTimestamp] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setTimestamp(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  const found = store.prospects
    .filter(
      (p) =>
        normalized(
          [p.businessName, p.contactName, p.city, p.neighborhood].join(" "),
        ).includes(normalized(search)) &&
        (!stage || p.stage === stage) &&
        (!type || p.businessType === type) &&
        (!priority || p.priority === priority) &&
        (!pending ||
          (p.nextContactAt && Date.parse(p.nextContactAt) <= timestamp)),
    )
    .sort((a, b) =>
      sort === "name"
        ? a.businessName.localeCompare(b.businessName)
        : sort === "date"
          ? (a.nextContactAt || "9999").localeCompare(b.nextContactAt || "9999")
          : rank[a.priority] - rank[b.priority] ||
            a.businessName.localeCompare(b.businessName),
    );
  const kanban = opportunities && !stage;
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            {opportunities
              ? "DO PRIMEIRO OLÁ À PRIMEIRA COMPRA"
              : "RELACIONAMENTOS QUE ABREM PORTAS"}
          </div>
          <h1>
            {opportunities ? "Oportunidades" : "Potenciais clientes"}
            <span className="count-title">{store.prospects.length}</span>
          </h1>
          <p>
            {opportunities
              ? "Acompanhe cada conversa e transforme interesse em relacionamento."
              : "Conheça sua carteira. Encontre sua próxima oportunidade."}
          </p>
        </div>
        <button className="button primary" onClick={onNew}>
          <Plus size={17} />
          Novo potencial
        </button>
      </div>
      <div className="filter-panel">
        <div className="search-field">
          <Search size={18} />
          <input
            aria-label="Buscar estabelecimentos"
            placeholder="Buscar por nome, responsável, bairro ou cidade..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="filters">
          <SlidersHorizontal size={16} />
          <select
            aria-label="Filtrar por estágio"
            value={stage}
            onChange={(e) => setStage(e.target.value)}
          >
            <option value="">Todos os estágios</option>
            {STAGES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <select
            aria-label="Filtrar por tipo"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="">Todos os tipos</option>
            {TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <select
            aria-label="Filtrar por prioridade"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            <option value="">Todas as prioridades</option>
            {["alta", "média", "baixa"].map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
          <label className="check-label">
            <input
              type="checkbox"
              checked={pending}
              onChange={(e) => setPending(e.target.checked)}
            />
            Contatos pendentes
          </label>
          <select
            aria-label="Ordenar clientes"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="priority">Prioridade</option>
            <option value="name">Nome A–Z</option>
            <option value="date">Próximo contato</option>
          </select>
        </div>
      </div>
      <div className="list-toolbar">
        <span>
          {found.length}{" "}
          {found.length === 1
            ? "estabelecimento encontrado"
            : "estabelecimentos encontrados"}
        </span>
        {!opportunities && (
          <div className="view-switch">
            <button
              className={view === "grid" ? "selected" : ""}
              aria-label="Visualização em cards"
              onClick={() => setView("grid")}
            >
              <LayoutGrid size={17} />
            </button>
            <button
              className={view === "list" ? "selected" : ""}
              aria-label="Visualização em lista"
              onClick={() => setView("list")}
            >
              <List size={18} />
            </button>
          </div>
        )}
      </div>
      {found.length ? (
        kanban ? (
          <>
            <div className="kanban">
              {STAGES.map((s) => (
                <section key={s.id} className="kanban-column">
                  <h3>
                    <i style={{ background: s.color }} />
                    {s.short}
                    <span>{found.filter((p) => p.stage === s.id).length}</span>
                  </h3>
                  {found
                    .filter((p) => p.stage === s.id)
                    .map((p) => (
                      <div key={p.id}>
                        <ProspectCard p={p} onOpen={onOpen} />
                        {p.estimatedPurchaseValue > 0 && (
                          <span className="kanban-value">
                            Potencial {kilos(p.estimatedPurchaseValue)}
                          </span>
                        )}
                      </div>
                    ))}
                </section>
              ))}
            </div>
            <div className="mobile-opportunities prospect-grid">
              {found.map((p) => (
                <ProspectCard key={p.id} p={p} onOpen={onOpen} />
              ))}
            </div>
          </>
        ) : view === "list" && !opportunities ? (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Estabelecimento</th>
                  <th>Localização</th>
                  <th>Estágio</th>
                  <th>Prioridade</th>
                  <th>Último contato</th>
                  <th>Próximo contato</th>
                </tr>
              </thead>
              <tbody>
                {found.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <button
                        className="text-button"
                        onClick={() => onOpen(p.id)}
                      >
                        {p.businessName}
                      </button>
                      <small>
                        {p.businessType} · {p.contactName || "Sem responsável"}
                        {p.phone ? ` · ${p.phone}` : ""}
                      </small>
                    </td>
                    <td>
                      {p.neighborhood}
                      <small>{p.city}</small>
                    </td>
                    <td>
                      <StageBadge stage={p.stage} />
                    </td>
                    <td>
                      <PriorityBadge priority={p.priority} />
                    </td>
                    <td>{dateTime(p.lastContactAt)}</td>
                    <td>{dateTime(p.nextContactAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="prospect-grid">
            {found.map((p) => (
              <ProspectCard key={p.id} p={p} onOpen={onOpen} />
            ))}
          </div>
        )
      ) : (
        <Empty
          text="Tente ajustar os filtros ou cadastre seu primeiro estabelecimento."
          action="Novo potencial"
          onAction={onNew}
        />
      )}
    </>
  );
}
export function RoutePage({
  store,
  onOpen,
  onForm,
  onCancel,
}: {
  store: Store;
  onOpen: (id: string) => void;
  onForm: (r: FormRequest) => void;
  onCancel: (v: Visit) => void;
}) {
  const [filter, setFilter] = useState("all"),
    [priority, setPriority] = useState("");
  const today = store.visits.filter(
      (v) => isToday(v.scheduledAt) && v.status !== "cancelled",
    ),
    done = today.filter((v) => v.status === "completed").length;
  const visible = store.visits
    .filter(
      (v) =>
        (!priority || v.priority === priority) &&
        (filter === "all" ||
          (filter === "today" && isToday(v.scheduledAt)) ||
          (filter === "late" &&
            v.status === "scheduled" &&
            overdue(v.scheduledAt)) ||
          (filter === "future" &&
            dayKey(v.scheduledAt) > dayKey() &&
            v.status === "scheduled") ||
          (filter === "completed" && v.status === "completed")),
    )
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">CADA VISITA, UMA NOVA POSSIBILIDADE</div>
          <h1>Minha rota</h1>
          <p>Organize sua agenda. Esteja presente nos momentos que importam.</p>
        </div>
        <button
          className="button primary"
          onClick={() => onForm({ kind: "visit" })}
        >
          <Plus size={17} />
          Agendar visita
        </button>
      </div>
      <section className="agenda-summary">
        <div>
          <MapPin size={23} />
          <h2>Minha agenda de hoje</h2>
          <p>
            {new Date().toLocaleDateString("pt-BR", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
        </div>
        {[
          ["Visitas hoje", today.length],
          ["Concluídas", done],
          ["Pendentes", today.length - done],
          [
            "Retornos atrasados",
            store.prospects.filter((p) => overdue(p.nextContactAt)).length,
          ],
        ].map(([label, n]) => (
          <div className="agenda-number" key={label}>
            <strong>{n}</strong>
            <span>{label}</span>
          </div>
        ))}
      </section>
      <div className="route-filters">
        <div className="tabs">
          {[
            ["all", "Todas"],
            ["today", "Hoje"],
            ["late", "Atrasadas"],
            ["future", "Futuras"],
            ["completed", "Concluídas"],
          ].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setFilter(id)}
              className={filter === id ? "active" : ""}
            >
              {label}
            </button>
          ))}
        </div>
        <select
          aria-label="Prioridade das visitas"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
        >
          <option value="">Todas as prioridades</option>
          {["alta", "média", "baixa"].map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
      </div>
      <div className="visit-list">
        {visible.length ? (
          visible.map((v) => {
            const p = store.prospects.find((p) => p.id === v.prospectId)!;
            return (
              <article className={`visit-card ${v.status}`} key={v.id}>
                <div className="visit-date">
                  <strong>{new Date(v.scheduledAt).getDate()}</strong>
                  <span>
                    {new Date(v.scheduledAt).toLocaleDateString("pt-BR", {
                      month: "short",
                    })}
                  </span>
                </div>
                <div className="grow">
                  <div className="row gap">
                    <button
                      className="title-button"
                      onClick={() => onOpen(p.id)}
                    >
                      {p.businessName}
                    </button>
                    <PriorityBadge priority={v.priority} />
                  </div>
                  <p>{v.objective}</p>
                  <div className="visit-meta">
                    <span>
                      <Clock size={14} />
                      {dateTime(v.scheduledAt)}
                    </span>
                    <span>
                      <MapPin size={14} />
                      {p.neighborhood || p.city || "Sem endereço"}
                    </span>
                    <span
                      className={
                        v.status === "scheduled" && overdue(v.scheduledAt)
                          ? "late"
                          : ""
                      }
                    >
                      {v.status === "completed"
                        ? `Concluída · ${v.result}`
                        : v.status === "cancelled"
                          ? "Cancelada"
                          : overdue(v.scheduledAt)
                            ? "Visita atrasada"
                            : "Agendada"}
                    </span>
                  </div>
                  {v.status === "completed" && (
                    <p className="muted">{v.notes}</p>
                  )}
                </div>
                <div className="visit-actions">
                  {v.status === "scheduled" && (
                    <>
                      <button
                        className="button primary small"
                        onClick={() =>
                          onForm({
                            kind: "complete",
                            visitId: v.id,
                            prospectId: p.id,
                          })
                        }
                      >
                        <Check size={16} />
                        Concluir
                      </button>
                      <button
                        className="icon-button"
                        aria-label={`Editar visita ${p.businessName}`}
                        onClick={() =>
                          onForm({
                            kind: "visit",
                            visitId: v.id,
                            prospectId: p.id,
                          })
                        }
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        className="icon-button"
                        aria-label={`Cancelar visita ${p.businessName}`}
                        onClick={() => onCancel(v)}
                      >
                        <X size={16} />
                      </button>
                    </>
                  )}
                  {p.address && (
                    <a
                      className="icon-button"
                      title="Abrir endereço ilustrativo no Google Maps"
                      aria-label={`Abrir mapa de ${p.businessName}`}
                      target="_blank"
                      rel="noreferrer"
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressLine(p))}`}
                    >
                      <ExternalLink size={16} />
                    </a>
                  )}
                </div>
              </article>
            );
          })
        ) : (
          <Empty
            text="Nenhuma visita neste filtro. Agende a próxima conversa."
            action="Agendar visita"
            onAction={() => onForm({ kind: "visit" })}
          />
        )}
      </div>
    </>
  );
}
