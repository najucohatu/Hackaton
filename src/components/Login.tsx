import { Compass, LockKeyhole, Mail } from "lucide-react";
import type { FormEvent } from "react";

export function Login({ onEnter }: { onEnter: () => void }) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onEnter();
  }

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <div className="login-brand">
          <span className="logo-symbol">
            <Compass size={26} />
          </span>
          rota<span className="logo-plus">+</span>
        </div>
        <div className="eyebrow">ESPAÇO DO VENDEDOR</div>
        <h1 id="login-title">Bem-vindo de volta.</h1>
        <p className="login-intro">
          Entre para acompanhar suas oportunidades e deixar cada rota mais
          produtiva.
        </p>
        <form className="login-form" onSubmit={submit}>
          <label className="field">
            <span>E-mail</span>
            <div className="input-with-icon">
              <Mail size={17} />
              <input
                type="email"
                name="email"
                placeholder="voce@empresa.com"
                required
              />
            </div>
          </label>
          <label className="field">
            <span>Senha</span>
            <div className="input-with-icon">
              <LockKeyhole size={17} />
              <input
                type="password"
                name="password"
                placeholder="••••••••"
                required
              />
            </div>
          </label>
          <button className="button primary login-submit" type="submit">
            Entrar
          </button>
        </form>
        <p className="login-demo-note">
          Ambiente demonstrativo: os dados de acesso não são verificados.
        </p>
      </section>
    </main>
  );
}
