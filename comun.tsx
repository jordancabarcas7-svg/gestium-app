import type { ReactNode } from "react";

export type Estado = "Confirmada" | "Pendiente" | "En curso" | "Completada";

export interface Cita {
  id: string;
  fecha: string; // AAAA-MM-DD
  hora: string; // HH:MM
  cliente: string;
  servicio: string;
  profesional: string;
  precio: number;
  estado: Estado;
  clienteId?: string | null;
  profesionalId?: string | null;
  servicioId?: string | null;
}

export interface Profesional {
  id: string;
  nombre: string;
}
export interface Servicio {
  id: string;
  nombre: string;
  precio: number | string;
}
export interface Cliente {
  id: string;
  nombre: string;
  telefono?: string | null; // solo dígitos, p. ej. 3001234567
  notas?: string | null;
  creado_en?: string;
}

export const estados: Estado[] = ["Pendiente", "Confirmada", "En curso", "Completada"];

export const cop = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

export const hoyISO = () => {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
};

// "2026-10-29" -> "29 oct"
export const fechaCorta = (f: string) => {
  const [a, m, d] = f.split("-").map(Number);
  if (!a || !m || !d) return f;
  return new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short" }).format(new Date(a, m - 1, d));
};

export function Campo({ etiqueta, error, children }: { etiqueta: string; error?: string; children: ReactNode }) {
  return (
    <label className={"campo" + (error ? " con-error" : "")}>
      <span className="etiqueta">{etiqueta}</span>
      {children}
      {error && (
        <span className="error" role="alert">
          {error}
        </span>
      )}
    </label>
  );
}

// Minúsculas y sin tildes, para buscar sin importar cómo se escriba.
export const sinTildes = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

// "+57 300 123 4567" -> "3001234567"
export const normalizarTelefono = (t: string): string => {
  let d = t.replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("57")) d = d.slice(2);
  return d;
};

// Celular colombiano: 10 dígitos que empiezan por 3.
export const telefonoValido = (d: string) => /^3\d{9}$/.test(d);

export const formatearTelefono = (d: string | null | undefined): string =>
  d && d.length === 10 ? `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}` : d ?? "";
