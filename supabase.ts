import { createClient } from "@supabase/supabase-js";

// Solo se usa la clave PÚBLICA (publishable). Nunca pongas aquí una clave secreta o service_role.
// Se limpian errores comunes al pegar los valores en Vercel: espacios, comillas,
// barra final o rutas como /rest/v1.
const limpiar = (v: unknown): string =>
  typeof v === "string" ? v.trim().replace(/^["']+|["']+$/g, "") : "";

const url = limpiar(import.meta.env.VITE_SUPABASE_URL)
  .replace(/\/+$/, "")
  .replace(/\/(rest|auth)\/v1$/, "");
const clave = limpiar(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);

export const supabaseConfigurado = url.startsWith("https://") && clave.length > 20;

// Si faltan las variables, se crea un cliente inofensivo que nunca se usa
// (la app queda en modo local).
export const supabase = createClient(
  supabaseConfigurado ? url : "http://localhost",
  supabaseConfigurado ? clave : "sin-configurar"
);
