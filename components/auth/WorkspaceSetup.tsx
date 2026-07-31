import { createWorkspace } from "@/app/actions";

export function WorkspaceSetup({ name }: { name: string }) {
  return (
    <main className="setup-page">
      <section className="setup-panel">
        <span className="setup-kicker">PRIMER PROYECTO</span>
        <h1>Bienvenido, {name}.</h1>
        <p>
          Crea el proyecto editorial que contendrá el tablero general. Después
          podrás extenderlo por disciplina.
        </p>
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
          <button type="submit">Crear espacio de trabajo</button>
        </form>
      </section>
    </main>
  );
}
