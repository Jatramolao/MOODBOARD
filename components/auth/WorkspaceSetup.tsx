import { createWorkspace } from "@/app/actions";
import { SetupSubmitButton } from "./SetupSubmitButton";

export function WorkspaceSetup({
  error,
  name,
}: {
  error?: string;
  name: string;
}) {
  return (
    <main className="setup-page">
      <section className="setup-panel">
        <span className="setup-kicker">PRIMER PROYECTO</span>
        <h1>Bienvenido, {name}.</h1>
        <p>
          Crea el proyecto editorial que contendrá el tablero general. Después
          podrás extenderlo por disciplina.
        </p>
        {error ? (
          <p className="setup-error" role="alert">
            No pudimos crear el proyecto: {error}
          </p>
        ) : null}
        <form action={createWorkspace} className="setup-form">
          <label>
            Nombre del proyecto
            <input
              name="name"
              placeholder="Campaña Otoño 2026"
              required
              maxLength={90}
            />
          </label>
          <label>
            Cliente <span>(opcional)</span>
            <input name="client" placeholder="Nombre de marca" maxLength={90} />
          </label>
          <SetupSubmitButton />
        </form>
      </section>
    </main>
  );
}
