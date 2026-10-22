import { useState, useRef, useEffect, useCallback } from "react";
import {
  LayoutDashboard,
  Users,
  GitBranch,
  MapPin,
  Trophy,
  Settings as SettingsIcon,
  ChevronRight,
  ChevronLeft,
  Zap,
  CheckCircle2,
  X,
  Compass,
  ShieldCheck,
  Menu,
  HelpCircle,
} from "lucide-react";
import type { Store } from "./models";
import { loadStore, persist, validateBackup } from "./services/storage";
import {
  saveProspect,
  changeStage,
  activate,
  addOrder,
  addInteraction,
  scheduleVisit,
  completeVisit,
  cancelVisit,
  scheduleReturn,
  deleteProspect,
  metrics,
  levelFor,
} from "./services/business";
import { demoStore } from "./data/demo";
import { Dashboard } from "./components/Dashboard";
import { Prospects, RoutePage } from "./components/Lists";
import { Profile } from "./components/Profile";
import { Performance, Settings } from "./components/Performance";
import { Modal, Empty } from "./components/ui";
import { ProspectForm, ActionForm, formTitles } from "./components/Forms";
import type { FormRequest, FormPayload } from "./components/Forms";
const navigation = [
  { id: "dashboard", label: "Visão geral", icon: LayoutDashboard },
  { id: "prospects", label: "Potenciais clientes", icon: Users },
  { id: "opportunities", label: "Oportunidades", icon: GitBranch },
  { id: "route", label: "Minha rota", icon: MapPin },
  { id: "performance", label: "Desempenho e XP", icon: Trophy },
  { id: "settings", label: "Configurações", icon: SettingsIcon },
];
interface Confirmation {
  title: string;
  message: string;
  label: string;
  action: () => void;
}
export default function App() {
  const [loaded] = useState(() => loadStore());
  const [store, setStore] = useState(loaded.store);
  const current = useRef(store);
  const [route, setRoute] = useState(
    () => location.hash.slice(1) || "dashboard",
  );
  const [form, setForm] = useState<FormRequest | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null),
    [toast, setToast] = useState<{ message: string; error?: boolean } | null>(
      loaded.warning ? { message: loaded.warning, error: true } : null,
    );
  const [mobileMenu, setMobileMenu] = useState(false),
    [help, setHelp] = useState(false);
  const [storageWarning, setStorageWarning] = useState(loaded.warning);
  const notify = useCallback(
    (message: string, error = false) => setToast({ message, error }),
    [],
  );
  useEffect(() => {
    try {
      persist(current.current);
    } catch (e) {
      setStorageWarning((e as Error).message);
    }
  }, []);
  useEffect(() => {
    const handler = () => {
      setRoute(location.hash.slice(1) || "dashboard");
      setMobileMenu(false);
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 6500);
    return () => clearTimeout(t);
  }, [toast]);
  // Keep tabs in sync. A pending form uses the latest committed store, not a stale render.
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key !== "rota-plus:v1" || !e.newValue) return;
      try {
        const next = validateBackup(JSON.parse(e.newValue));
        current.current = next;
        setStore(next);
        notify("Dados atualizados em outra aba.");
      } catch {
        notify(
          "Uma alteração de outra aba foi rejeitada por conter dados inválidos.",
          true,
        );
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [notify]);
  const go = (page: string) => {
    location.hash = page;
  };
  const open = (id: string) => go(`prospects/${id}`);
  const newProspect = () => setForm({ kind: "prospect" });
  function transact(
    change: (s: Store) => void,
    message = "Registro salvo com sucesso.",
  ) {
    const next = structuredClone(current.current),
      before = metrics(next).xp;
    change(next);
    const valid = validateBackup(next);
    persist(valid);
    current.current = valid;
    setStore(valid);
    setStorageWarning("");
    const xp = metrics(valid).xp - before;
    notify(`${message}${xp > 0 ? ` Boa! +${xp} XP` : ""}`);
  }
  function safe(action: () => void) {
    try {
      action();
    } catch (e) {
      notify((e as Error).message, true);
    }
  }
  function submit(payload: FormPayload) {
    transact((s) => {
      switch (payload.kind) {
        case "prospect":
          saveProspect(s, payload.data);
          break;
        case "contact":
          addInteraction(s, payload.data);
          break;
        case "visit":
          scheduleVisit(s, payload.data);
          break;
        case "complete":
          completeVisit(s, payload.id, payload.data);
          break;
        case "return":
          scheduleReturn(s, payload.id, payload.date, payload.nextAction);
          break;
        case "stage":
          changeStage(s, payload.id, payload.stage);
          break;
        case "activate":
          activate(s, payload.id, payload.confirmedBy);
          break;
        case "order":
          addOrder(s, payload.data);
          break;
      }
    });
    setForm(null);
    if (payload.kind === "prospect") open(payload.data.id);
  }
  const closeForm = useCallback(() => setForm(null), []),
    closeConfirm = useCallback(() => setConfirmation(null), []),
    closeHelp = useCallback(() => setHelp(false), []);
  function replace(next: Store, message: string) {
    persist(next);
    current.current = next;
    setStore(next);
    setStorageWarning("");
    notify(message);
  }
  async function importBackup(file: File) {
    try {
      if (file.size > 10 * 1024 * 1024)
        throw new Error("O backup deve ter no máximo 10 MB.");
      const next = validateBackup(JSON.parse(await file.text()));
      setConfirmation({
        title: "Importar backup?",
        message: `O arquivo contém ${next.prospects.length} estabelecimentos e ${next.visits.length} visitas. A base local será substituída. Exporte seus dados atuais antes de continuar.`,
        label: "Importar e substituir",
        action: () => replace(next, "Backup importado com sucesso."),
      });
    } catch (e) {
      notify(
        e instanceof SyntaxError
          ? "Arquivo JSON inválido. Selecione um backup exportado pelo Rota+."
          : (e as Error).message,
        true,
      );
    }
  }
  function exportBackup() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(current.current, null, 2)], {
        type: "application/json",
      }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `rota-plus-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify("Backup exportado. Guarde o arquivo em um local seguro.");
  }
  const page = route.split(/[/?]/)[0],
    activeNav = navigation.find((n) => n.id === page),
    prospect = route.startsWith("prospects/")
      ? store.prospects.find((p) => p.id === route.split("/")[1])
      : null;
  const m = metrics(store),
    level = levelFor(m.xp);
  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileMenu ? "open" : ""}`}>
        <a className="logo" href="#dashboard" aria-label="Rota+ início">
          <span className="logo-symbol">
            <Compass size={26} />
          </span>
          rota<span className="logo-plus">+</span>
        </a>
        <div className="workspace-label">ESPAÇO DO VENDEDOR</div>
        <nav aria-label="Navegação principal">
          {navigation.map(({ id, label, icon: Icon }) => (
            <a key={id} href={`#${id}`} className={page === id ? "active" : ""}>
              <Icon size={19} />
              <span>{label}</span>
              {id === "prospects" && <small>{store.prospects.length}</small>}
              {page === id && (
                <ChevronRight className="nav-chevron" size={14} />
              )}
            </a>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-progress">
            <div className="row between">
              <Trophy size={18} />
              <span>Nível {level.index + 1}</span>
              <span className="sidebar-xp">
                <Zap size={12} />
                {m.xp} XP
              </span>
            </div>
            <strong>{level.current.name}</strong>
            <div className="progress-track">
              <div style={{ width: `${level.progress}%` }} />
            </div>
            <small>
              {level.next
                ? `${level.next.xp - m.xp} XP para o próximo nível`
                : "Você chegou ao topo!"}
            </small>
          </div>
          <button className="help-button" onClick={() => setHelp(true)}>
            <HelpCircle size={18} />
            Conheça o Rota+ <ArrowIcon />
          </button>
          <div className="sidebar-user">
            <span className="user-avatar">
              {store.seller
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")}
            </span>
            <div>
              <strong>{store.seller}</strong>
              <small>Vendedor de rota</small>
            </div>
            <button
              className="icon-button"
              onClick={() => go("settings")}
              aria-label="Configurações do vendedor"
            >
              <SettingsIcon size={16} />
            </button>
          </div>
        </div>
      </aside>
      {mobileMenu && (
        <button
          className="nav-overlay"
          onClick={() => setMobileMenu(false)}
          aria-label="Fechar menu"
        />
      )}
      <div className="main-shell">
        <header className="topbar">
          <div className="row gap">
            <button
              className="icon-button mobile-menu"
              onClick={() => setMobileMenu(!mobileMenu)}
              aria-label="Abrir menu"
            >
              <Menu size={21} />
            </button>
            <span className="breadcrumb">
              Meu espaço <ChevronRight size={14} />{" "}
              <strong>{activeNav?.label || "Visão geral"}</strong>
              {prospect && (
                <>
                  <ChevronRight size={14} />
                  <span className="breadcrumb-detail">
                    {prospect.businessName}
                  </span>
                </>
              )}
            </span>
          </div>
          <div className="topbar-right">
            <span className="today-date">
              {new Date().toLocaleDateString("pt-BR", {
                weekday: "short",
                day: "numeric",
                month: "long",
              })}
            </span>
            <span className="demo-label">
              <i />
              Ambiente demonstrativo
            </span>
            <button
              className="user-avatar"
              onClick={() => go("settings")}
              aria-label="Meu perfil"
            >
              {store.seller.charAt(0)}
            </button>
          </div>
        </header>
        <main>
          {storageWarning && (
            <div className="storage-warning" role="alert">
              <ShieldCheck size={18} />
              {storageWarning}
              <button className="text-button" onClick={exportBackup}>
                Exportar backup
              </button>
              <button
                className="icon-button"
                onClick={() => setStorageWarning("")}
                aria-label="Dispensar aviso"
              >
                <X size={16} />
              </button>
            </div>
          )}
          {page === "dashboard" && (
            <Dashboard
              store={store}
              onOpen={open}
              onPage={go}
              onNew={newProspect}
            />
          )}
          {page === "prospects" &&
            (route.includes("/") ? (
              prospect ? (
                <Profile
                  key={prospect.id}
                  p={prospect}
                  store={store}
                  onBack={() => go("prospects")}
                  onForm={setForm}
                  notify={notify}
                  onDelete={() =>
                    setConfirmation({
                      title: "Excluir estabelecimento?",
                      message: `${prospect.businessName} será excluído com seu histórico, visitas, pedidos e recompensas. Os indicadores serão recalculados. Esta ação não pode ser desfeita.`,
                      label: "Excluir estabelecimento",
                      action: () => {
                        transact(
                          (s) => deleteProspect(s, prospect.id),
                          "Estabelecimento excluído.",
                        );
                        go("prospects");
                      },
                    })
                  }
                />
              ) : (
                <Empty
                  text="Este estabelecimento não existe mais."
                  action="Ver clientes"
                  onAction={() => go("prospects")}
                />
              )
            ) : (
              <Prospects store={store} onOpen={open} onNew={newProspect} />
            ))}
          {page === "opportunities" && (
            <Prospects
              key={route}
              store={store}
              onOpen={open}
              onNew={newProspect}
              opportunities
              initialStage={
                new URLSearchParams(route.split("?")[1]).get("stage") || ""
              }
            />
          )}
          {page === "route" && (
            <RoutePage
              store={store}
              onOpen={open}
              onForm={setForm}
              onCancel={(v) =>
                setConfirmation({
                  title: "Cancelar visita?",
                  message:
                    "O agendamento será marcado como cancelado. O histórico será preservado e nenhum XP será concedido.",
                  label: "Cancelar visita",
                  action: () =>
                    transact((s) => cancelVisit(s, v.id), "Visita cancelada."),
                })
              }
            />
          )}
          {page === "performance" && (
            <Performance store={store} onOpen={open} />
          )}
          {page === "settings" && (
            <Settings
              store={store}
              onSeller={(name) =>
                safe(() => {
                  if (name.trim().length < 2)
                    throw new Error(
                      "Informe um nome com pelo menos 2 caracteres.",
                    );
                  transact((s) => {
                    s.seller = name.trim();
                  }, "Perfil atualizado.");
                })
              }
              onExport={exportBackup}
              onImport={importBackup}
              onRestore={() =>
                setConfirmation({
                  title: "Restaurar dados demonstrativos?",
                  message:
                    "Seus dados atuais serão substituídos por 15 estabelecimentos fictícios com histórico, agenda e XP. Exporte um backup para guardar suas alterações.",
                  label: "Restaurar demonstração",
                  action: () =>
                    replace(
                      validateBackup(demoStore()),
                      "Demonstração restaurada.",
                    ),
                })
              }
            />
          )}
          {!activeNav && (
            <Empty
              text="Esta página não foi encontrada."
              action="Ir para visão geral"
              onAction={() => go("dashboard")}
            />
          )}
          <footer className="page-footer">
            <span>
              Rota<span className="blue-text">+</span> · Mais oportunidades.
              Mais clientes. Mais resultados.
            </span>
            <span>
              <ShieldCheck size={13} />
              Dados locais · Demonstração
            </span>
          </footer>
        </main>
      </div>
      <nav className="bottom-nav" aria-label="Navegação mobile">
        {navigation.slice(0, 5).map(({ id, label, icon: Icon }) => (
          <a key={id} href={`#${id}`} className={page === id ? "active" : ""}>
            <Icon size={20} />
            <span>
              {id === "prospects"
                ? "Clientes"
                : id === "performance"
                  ? "Meu XP"
                  : id === "opportunities"
                    ? "Funil"
                    : label}
            </span>
          </a>
        ))}
      </nav>
      {form && (
        <Modal
          title={
            form.kind === "prospect" && form.edit
              ? "Editar estabelecimento"
              : formTitles[form.kind]
          }
          subtitle={
            form.kind === "visit" && form.visitId
              ? "Atualize o agendamento da visita."
              : undefined
          }
          wide={form.kind === "prospect"}
          onClose={closeForm}
        >
          {form.kind === "prospect" ? (
            <ProspectForm
              store={store}
              prospect={
                form.edit
                  ? store.prospects.find((p) => p.id === form.prospectId)
                  : undefined
              }
              onSubmit={submit}
              onClose={closeForm}
              onReview={(id) => {
                setForm(null);
                open(id);
              }}
            />
          ) : (
            <ActionForm
              request={form}
              store={store}
              onSubmit={submit}
              onClose={closeForm}
            />
          )}
        </Modal>
      )}
      {confirmation && (
        <Modal title={confirmation.title} onClose={closeConfirm}>
          <div className="form-content">
            <p>{confirmation.message}</p>
          </div>
          <footer className="form-footer">
            <button className="button" onClick={closeConfirm}>
              Voltar
            </button>
            <button
              className="button danger"
              onClick={() =>
                safe(() => {
                  confirmation.action();
                  setConfirmation(null);
                })
              }
            >
              {confirmation.label}
            </button>
          </footer>
        </Modal>
      )}
      {help && (
        <Modal title="Cada parada pode ser um começo." onClose={closeHelp}>
          <div className="form-content">
            <p>
              O Rota+ acompanha seu trabalho do primeiro contato à primeira
              compra. Tudo fica conectado à sua carteira e ao seu progresso.
            </p>
            <ol className="help-list">
              <li>Cadastre um potencial cliente.</li>
              <li>Consulte Insights e registre o primeiro contato.</li>
              <li>Agende a visita e registre seu resultado.</li>
              <li>Avance a negociação e complete o cadastro.</li>
              <li>Ative o cliente e registre a primeira compra.</li>
            </ol>
            <p className="muted">
              Os dados e pedidos são fictícios. A ativação é simulada. Os
              Insights são sugestões baseadas em regras, sem IA generativa ou
              serviços externos.
            </p>
            <button
              className="button primary"
              onClick={() => {
                closeHelp();
                newProspect();
              }}
            >
              Começar uma oportunidade
            </button>
          </div>
        </Modal>
      )}
      {toast && (
        <div
          className={`toast ${toast.error ? "toast-error" : ""}`}
          role={toast.error ? "alert" : "status"}
        >
          <CheckCircle2 size={20} />
          <span>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            aria-label="Fechar notificação"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
function ArrowIcon() {
  return (
    <ChevronLeft
      style={{ transform: "rotate(180deg)", marginLeft: "auto" }}
      size={15}
    />
  );
}
