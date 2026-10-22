import { useEffect, useRef, useId } from "react";
import type {
  ReactNode,
  SelectHTMLAttributes,
  InputHTMLAttributes,
} from "react";
import {
  X,
  ArrowUpRight,
  Store,
  MapPin,
  Clock,
  Plus,
  Inbox,
} from "lucide-react";
import { STAGES } from "../models";
import type { Prospect, Stage, Priority } from "../models";
import { dateTime } from "../services/format";
export function Modal({
  title,
  subtitle,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null),
    label = useId();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current
      ?.querySelector<HTMLElement>("input,select,textarea,button")
      ?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const nodes = ref.current?.querySelectorAll<HTMLElement>(
          "button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href]",
        );
        if (!nodes?.length) return;
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
        if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = old;
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, [onClose]);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={label}
        className={`modal ${wide ? "wide" : ""}`}
      >
        <header className="modal-header">
          <div>
            <h2 id={label}>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Fechar">
            <X size={20} />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function Input({
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <Field label={label}>
      <input {...props} />
    </Field>
  );
}
export function Select({
  label,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return (
    <Field label={label}>
      <select {...props}>{children}</select>
    </Field>
  );
}
export function StageBadge({ stage }: { stage: Stage }) {
  const s = STAGES.find((s) => s.id === stage)!;
  return (
    <span
      className="badge"
      style={{ color: s.color, background: `${s.color}14` }}
    >
      <i style={{ background: s.color }} />
      {s.label}
    </span>
  );
}
export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span
      className={`priority ${priority === "alta" ? "high" : priority === "média" ? "medium" : "low"}`}
    >
      <i />
      {priority[0].toUpperCase() + priority.slice(1)}
    </span>
  );
}
export function Empty({
  text,
  action,
  onAction,
}: {
  text: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="empty">
      <Inbox size={32} />
      <h3>Nada por aqui, por enquanto</h3>
      <p>{text}</p>
      {action && (
        <button className="button primary" onClick={onAction}>
          <Plus size={16} />
          {action}
        </button>
      )}
    </div>
  );
}
export function ProspectCard({
  p,
  onOpen,
}: {
  p: Prospect;
  onOpen: (id: string) => void;
}) {
  return (
    <button className="prospect-card" onClick={() => onOpen(p.id)}>
      <div className="row between">
        <span className={`business-icon type-${p.businessType}`}>
          <Store size={20} />
        </span>
        <PriorityBadge priority={p.priority} />
      </div>
      <h3>{p.businessName}</h3>
      <p>
        {p.businessType} · {p.contactName || "Responsável não informado"}
      </p>
      <div className="location">
        <MapPin size={13} />
        {[p.neighborhood, p.city].filter(Boolean).join(", ") ||
          "Localização não informada"}
      </div>
      <StageBadge stage={p.stage} />
      <p className="card-last-contact">
        Último contato:{" "}
        {p.lastContactAt ? dateTime(p.lastContactAt) : "Ainda não realizado"}
      </p>
      {p.phone && <p className="card-phone">{p.phone}</p>}
      <div className="card-bottom">
        <span>
          <Clock size={13} />
          {p.nextContactAt
            ? dateTime(p.nextContactAt)
            : "Agendar próximo contato"}
        </span>
        <ArrowUpRight size={16} />
      </div>
    </button>
  );
}
export function SectionTitle({
  title,
  caption,
  action,
}: {
  title: string;
  caption?: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-title">
      <div>
        <h2>{title}</h2>
        {caption && <p>{caption}</p>}
      </div>
      {action}
    </div>
  );
}
