import {
  Trophy,
  Zap,
  LockKeyhole,
  Medal,
  ArrowUpRight,
  Download,
  Upload,
  RotateCcw,
  Info,
} from "lucide-react";
import { useRef } from "react";
import type { Store } from "../models";
import { ACTIONS, LEVELS } from "../models";
import { metrics, levelFor, achievements } from "../services/business";
import { dateTime } from "../services/format";
import { StatCards } from "./Dashboard";
import { SectionTitle, Empty } from "./ui";
export function XPMatrix() {
  return (
    <section className="panel">
      <SectionTitle
        title="Boas ações. Progresso de verdade."
        caption="Como cada ação contribui para o seu desenvolvimento."
      />
      <div className="xp-matrix">
        {Object.values(ACTIONS).map((a) => (
          <div key={a.label}>
            <span className="xp-pill">+{a.xp} XP</span>
            <div>
              <strong>{a.label}</strong>
              <p>{a.skill}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="muted small-text">
        Cada marco é recompensado uma única vez por cliente; visitas usam um
        identificador único. Ativação e compra possuem recompensas próprias.
      </p>
    </section>
  );
}
export function Performance({
  store,
  onOpen,
}: {
  store: Store;
  onOpen: (id: string) => void;
}) {
  const m = metrics(store),
    level = levelFor(m.xp),
    unlocks = achievements(store);
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">O SEU ESFORÇO TEM VALOR</div>
          <h1>Desempenho e XP</h1>
          <p>
            Mais do que números: cada ponto representa uma atitude comercial.
          </p>
        </div>
        <span className="demo-label">Resultados demonstrativos</span>
      </div>
      <section className="level-hero">
        <div className="level-medal">
          <Trophy size={42} />
        </div>
        <div className="grow">
          <div className="eyebrow">
            NÍVEL {level.index + 1} DE {LEVELS.length}
          </div>
          <h2>{level.current.name}</h2>
          <p>
            {level.next
              ? `Faltam ${level.next.xp - m.xp} XP para ${level.next.name}.`
              : "Você alcançou o nível máximo. Continue construindo relacionamentos!"}
          </p>
          <div className="progress-track">
            <div style={{ width: `${level.progress}%` }} />
          </div>
          <div className="row between">
            <small>{m.xp} XP acumulados</small>
            <small>
              {level.next
                ? `${level.next.xp} XP no próximo nível`
                : "Nível máximo"}
            </small>
          </div>
        </div>
        <span className="hero-xp">
          <Zap size={24} />
          {m.xp}
          <small>XP TOTAL</small>
        </span>
      </section>
      <StatCards store={store} extended />
      <section className="panel">
        <SectionTitle
          title="Sua coleção de conquistas"
          caption="Pequenas vitórias que constroem grandes resultados."
        />
        <div className="achievement-grid">
          {unlocks.map((a) => (
            <div
              key={a.title}
              className={`achievement ${a.unlocked ? "unlocked" : ""}`}
            >
              <span>
                {a.unlocked ? <Medal size={29} /> : <LockKeyhole size={25} />}
              </span>
              <strong>{a.title}</strong>
              <p>{a.description}</p>
              <small>
                {a.unlocked
                  ? `Conquistada${a.unlockedAt ? ` · ${dateTime(a.unlockedAt)}` : ""}`
                  : "Continue avançando"}
              </small>
            </div>
          ))}
        </div>
      </section>
      <div className="dashboard-columns performance-bottom">
        <XPMatrix />
        <section className="panel">
          <SectionTitle
            title="Histórico de recompensas"
            caption="XP vinculado às suas ações comerciais."
          />
          {store.rewards.length ? (
            <div className="reward-list">
              {[...store.rewards].reverse().map((r) => (
                <button key={r.id} onClick={() => onOpen(r.prospectId)}>
                  <span className="xp-pill">+{r.xp}</span>
                  <span className="grow">
                    <strong>{ACTIONS[r.action].label}</strong>
                    <small>
                      {r.description} · {dateTime(r.createdAt)}
                    </small>
                  </span>
                  <ArrowUpRight size={15} />
                </button>
              ))}
            </div>
          ) : (
            <Empty text="Cadastre uma oportunidade para conquistar seu primeiro XP." />
          )}
        </section>
      </div>
    </>
  );
}
export function Settings({
  store,
  onSeller,
  onExport,
  onImport,
  onRestore,
}: {
  store: Store;
  onSeller: (v: string) => void;
  onExport: () => void;
  onImport: (f: File) => void;
  onRestore: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">DO SEU JEITO, NA SUA ROTA</div>
          <h1>Configurações</h1>
          <p>Cuide do seu perfil e dos dados da demonstração.</p>
        </div>
      </div>
      <div className="settings-grid">
        <div>
          <section className="panel">
            <SectionTitle
              title="Perfil do vendedor"
              caption="Sem senha, sem complicação. Este é um ambiente demonstrativo."
            />
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onSeller(
                  String(new FormData(e.currentTarget).get("seller") || ""),
                );
              }}
            >
              <label className="field">
                <span>Nome do vendedor</span>
                <input
                  name="seller"
                  defaultValue={store.seller}
                  key={store.seller}
                  required
                  minLength={2}
                  maxLength={80}
                />
              </label>
              <button className="button primary" type="submit">
                Salvar perfil
              </button>
            </form>
          </section>
          <section className="panel">
            <SectionTitle
              title="Seus dados, com você"
              caption="Os dados são salvos apenas neste navegador."
            />
            <div className="backup-row">
              <div>
                <strong>Exportar backup</strong>
                <p>Baixe clientes, visitas, histórico, pedidos e XP em JSON.</p>
              </div>
              <button className="button" onClick={onExport}>
                <Download size={16} />
                Exportar
              </button>
            </div>
            <div className="backup-row">
              <div>
                <strong>Importar backup</strong>
                <p>Substitui a base atual após validação e confirmação.</p>
              </div>
              <input
                type="file"
                ref={input}
                hidden
                accept=".json,application/json"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onImport(f);
                  e.target.value = "";
                }}
              />
              <button className="button" onClick={() => input.current?.click()}>
                <Upload size={16} />
                Importar
              </button>
            </div>
            <div className="backup-row">
              <div>
                <strong>Restaurar demonstração</strong>
                <p>
                  Recria os dados fictícios e substitui suas alterações locais.
                </p>
              </div>
              <button className="button danger" onClick={onRestore}>
                <RotateCcw size={16} />
                Restaurar
              </button>
            </div>
          </section>
          <XPMatrix />
        </div>
        <aside>
          <section className="panel about-panel">
            <span className="brand-mark">
              r<span>+</span>
            </span>
            <h2>
              Mais oportunidades.
              <br />
              Mais clientes.
              <br />
              Mais resultados.
            </h2>
            <p>
              Rota+ é um assistente de prospecção para vendedores que constroem
              relacionamentos a cada parada.
            </p>
            <span className="demo-label">Hackathon de Varejo · MVP</span>
          </section>
          <section className="panel">
            <SectionTitle
              title="Como o Rota+ ajuda"
              action={<Info size={19} />}
            />
            <ul className="help-list">
              <li>Centraliza informações de estabelecimentos.</li>
              <li>Lembra dos próximos contatos.</li>
              <li>Ajuda a priorizar oportunidades.</li>
              <li>Organiza visitas e negociações.</li>
              <li>Reconhece boas ações com XP.</li>
            </ul>
            <div className="form-note">
              Os dados são fictícios. Sem integração com CRM, ERP, pagamentos ou
              IA generativa. Insights usam regras locais. Nenhum ganho de
              produtividade é garantido.
            </div>
            <p className="muted small-text">
              Versão 1.0 · Schema 1<br />
              Faça backups regularmente. Limpar o navegador remove os dados
              locais. Não armazene dados sensíveis.
            </p>
          </section>
        </aside>
      </div>
    </>
  );
}
