"use client";

import { useFormStatus } from "react-dom";

export function SetupSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending}>
      {pending ? "Creando espacio…" : "Crear espacio de trabajo"}
    </button>
  );
}
