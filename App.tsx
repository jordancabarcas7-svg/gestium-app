import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, supabaseConfigurado } from "./supabase";

type Seccion = "Inicio" | "Citas" | "Clientes" | "Profesionales" | "Servicios" | "Caja" | "Reportes";
type Estado = "Confirmada" | "Pendiente" | "En curso" | "Completada";

interface Cita {
  id: string;
  fecha: string; // AAAA-MM-DD
  hora: string; // HH:MM
  cliente: string;
  servicio: string;
  profesional: string;
  precio: number;
  estado: Estado;
}

interface Formulario {
  cliente: string;
  servicio: string;
  profesional: string;
  fecha: string;
  hora: string;
  precio: string;
  estado: Estado;
}

interface Negocio {
  id: string;
  nombre: string;
  tipo: string;
}

interface FilaCita {
  id: string;
  fecha: string;
  hora: string;
  cliente_nombre: string;
  servicio_nombre: string;
  profesional_nombre: string;
  precio: number | string;
  estado: Estado;
}

const secciones: Seccion[] = ["Inicio", "Citas", "Clientes", "Profesionales", "Servicios", "Caja", "Reportes"];
const estados: Estado[] = ["Pendiente", "Confirmada", "En curso", "Completada"];
const profesionales = ["Camilo", "Valentina", "Mariana", "Esteban"];
const servicios = [
  { nombre: "Corte clásico", precio: 35000 },
  { nombre: "Corte y barba", precio: 55000 },
  { nombre: "Perfilado de barba", precio: 25000 },
  { nombre: "Manicura tradicional", precio: 30000 },
  { nombre: "Manicura semipermanente", precio: 60000 },
  { nombre: "Uñas acrílicas", precio: 90000 },
];

const VERSION = "v0.3 (Supabase)";
const CLAVE_ALMACEN = "gestium_citas_v1";
const INGRESOS_BASE = 1_280_000; // dato ficticio
const GASTOS = 410_000; // dato ficticio

const AVISO_LOCAL =
  "Las citas nuevas se guardan solo en este navegador (localStorage). No se comparten entre dispositivos ni entre negocios.";
const AVISO_NUBE = "Las citas nuevas se guardan en la base de datos de tu negocio.";

const cop = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

const hoyISO = () => {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
};

const nuevoId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

// Citas de ejemplo: siempre aparecen con la fecha de hoy y NO se guardan.
const citasDemo = (fecha: string): Cita[] => [
  { id: "d1", fecha, hora: "09:00", cliente: "Andrés Ramírez", servicio: "Corte clásico", profesional: "Camilo", precio: 35000, estado: "En curso" },
  { id: "d2", fecha, hora: "10:00", cliente: "Laura Gómez", servicio: "Manicura semipermanente", profesional: "Valentina", precio: 60000, estado: "Confirmada" },
  { id: "d3", fecha, hora: "11:30", cliente: "Julián Torres", servicio: "Corte y barba", profesional: "Camilo", precio: 55000, estado: "Confirmada" },
  { id: "d4", fecha, hora: "14:00", cliente: "Daniela Ortiz", servicio: "Uñas acrílicas", profesional: "Mariana", precio: 90000, estado: "Pendiente" },
  { id: "d5", fecha, hora: "15:30", cliente: "Sebastián Rojas", servicio: "Perfilado de barba", profesional: "Esteban", precio: 25000, estado: "Confirmada" },
  { id: "d6", fecha, hora: "17:00", cliente: "Carolina Pardo", servicio: "Manicura tradicional", profesional: "Valentina", precio: 30000, estado: "Pendiente" },
];

function cargarLocales(): Cita[] {
  try {
    const crudo = localStorage.getItem(CLAVE_ALMACEN);
    if (!crudo) return [];
    const datos: unknown = JSON.parse(crudo);
    return Array.isArray(datos) ? (datos as Cita[]) : [];
  } catch {
    return [];
  }
}

const filaACita = (f: FilaCita): Cita => ({
  id: f.id,
  fecha: f.fecha,
  hora: f.hora.slice(0, 5),
  cliente: f.cliente_nombre,
  servicio: f.servicio_nombre,
  profesional: f.profesional_nombre,
  precio: Number(f.precio),
  estado: f.estado,
});

export default function App() {
  const [activa, setActiva] = useState<Seccion>("Inicio");
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [formAbierto, setFormAbierto] = useState(false);
  const [mensaje, setMensaje] = useState("");

  // Modo local (localStorage), igual que antes
  const [locales, setLocales] = useState<Cita[]>(cargarLocales);
  // Modo nube (Supabase)
  const [modoPrueba, setModoPrueba] = useState(!supabaseConfigurado);
  const [sesion, setSesion] = useState<Session | null>(null);
  const [cargandoSesion, setCargandoSesion] = useState(supabaseConfigurado);
  const [negocio, setNegocio] = useState<Negocio | null | undefined>(undefined); // undefined = cargando
  const [errorDatos, setErrorDatos] = useState("");
  const [nube, setNube] = useState<Cita[]>([]);

  const usuarioId = sesion?.user.id;
  const modoNube = supabaseConfigurado && !modoPrueba && Boolean(sesion) && Boolean(negocio);

  useEffect(() => {
    try {
      localStorage.setItem(CLAVE_ALMACEN, JSON.stringify(locales));
    } catch {
      /* si el navegador bloquea el almacenamiento, la app sigue funcionando */
    }
  }, [locales]);

  useEffect(() => {
    if (!mensaje) return;
    const t = window.setTimeout(() => setMensaje(""), 5000);
    return () => window.clearTimeout(t);
  }, [mensaje]);

  useEffect(() => {
    if (!supabaseConfigurado) return;
    supabase.auth
      .getSession()
      .then(({ data }) => setSesion(data.session))
      .catch(() => setSesion(null))
      .finally(() => setCargandoSesion(false));
    const { data } = supabase.auth.onAuthStateChange((_evento, s) => setSesion(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const cargarNegocio = useCallback(async () => {
    if (!usuarioId) {
      setNegocio(undefined);
      return;
    }
    setErrorDatos("");
    const { data, error } = await supabase.from("miembros").select("negocios(id, nombre, tipo)").limit(1);
    if (error) {
      setErrorDatos("No se pudo leer tu negocio: " + error.message);
      setNegocio(null);
      return;
    }
    const fila = ((data ?? []) as unknown as { negocios: Negocio | Negocio[] | null }[])[0];
    const n = fila ? (Array.isArray(fila.negocios) ? fila.negocios[0] : fila.negocios) : null;
    setNegocio(n ?? null);
  }, [usuarioId]);

  useEffect(() => {
    if (supabaseConfigurado) void cargarNegocio();
  }, [cargarNegocio]);

  const negocioId = negocio ? negocio.id : undefined;
  useEffect(() => {
    if (!negocioId) {
      setNube([]);
      return;
    }
    let cancelado = false;
    supabase
      .from("citas")
      .select("*")
      .eq("negocio_id", negocioId)
      .order("fecha")
      .order("hora")
      .then(({ data, error }) => {
        if (cancelado) return;
        if (error) setMensaje("No se pudieron cargar las citas: " + error.message);
        else setNube(((data ?? []) as unknown as FilaCita[]).map(filaACita));
      });
    return () => {
      cancelado = true;
    };
  }, [negocioId]);

  const hoy = hoyISO();
  const guardadas = modoNube ? nube : locales;
  const todas = [...citasDemo(hoy), ...guardadas];
  const citasHoy = todas.filter((c) => c.fecha === hoy).sort((a, b) => a.hora.localeCompare(b.hora));
  const otrasFechas = guardadas.filter((c) => c.fecha !== hoy).length;

  const elegir = (s: Seccion) => {
    setActiva(s);
    setMenuAbierto(false);
  };

  const cerrarSesion = async () => {
    await supabase.auth.signOut();
    setNube([]);
    setNegocio(undefined);
  };

  // Devuelve null si todo salió bien, o el texto del error.
  const guardar = async (c: Omit<Cita, "id">): Promise<string | null> => {
    if (modoNube && negocio) {
      const { data, error } = await supabase
        .from("citas")
        .insert({
          negocio_id: negocio.id,
          fecha: c.fecha,
          hora: c.hora,
          cliente_nombre: c.cliente,
          servicio_nombre: c.servicio,
          profesional_nombre: c.profesional,
          precio: c.precio,
          estado: c.estado,
        })
        .select()
        .single();
      if (error || !data) return error ? error.message : "Supabase no devolvió la cita guardada.";
      setNube((p) => [...p, filaACita(data as unknown as FilaCita)]);
      setMensaje("Cita guardada en la base de datos.");
    } else {
      setLocales((p) => [...p, { ...c, id: nuevoId() }]);
      setMensaje("Cita guardada solo en este navegador.");
    }
    setFormAbierto(false);
    return null;
  };

  if (cargandoSesion) return <Centro>Cargando…</Centro>;
  if (supabaseConfigurado && !modoPrueba) {
    if (!sesion) return <PantallaAcceso onPrueba={() => setModoPrueba(true)} />;
    if (negocio === undefined) return <Centro>Cargando tu negocio…</Centro>;
    if (negocio === null) {
      return <PantallaNegocio error={errorDatos} onCreado={cargarNegocio} onSalir={cerrarSesion} />;
    }
  }

  const fechaLarga = new Intl.DateTimeFormat("es-CO", { dateStyle: "full" }).format(new Date());

  return (
    <div className="app">
      <aside className={"lateral" + (menuAbierto ? " abierto" : "")}>
        <div className="marca">
          <span className="logo">G</span>
          <span className="nombre">GESTIUM</span>
        </div>
        <nav aria-label="Secciones">
          {secciones.map((s) => (
            <button key={s} className={"enlace" + (s === activa ? " activo" : "")} onClick={() => elegir(s)}>
              {s}
            </button>
          ))}
        </nav>
        <div className="negocio">
          {modoNube && negocio ? (
            <>
              <strong>{negocio.nombre}</strong>
              <span>{sesion?.user.email}</span>
              <button className="enlace-texto" onClick={cerrarSesion}>
                Cerrar sesión
              </button>
            </>
          ) : (
            <>
              <strong>Modo de prueba local</strong>
              <span>{supabaseConfigurado ? "Sin iniciar sesión" : "Supabase sin configurar"}</span>
              {supabaseConfigurado && (
                <button className="enlace-texto" onClick={() => setModoPrueba(false)}>
                  Iniciar sesión
                </button>
              )}
            </>
          )}
          <small className="version">GESTIUM {VERSION}</small>
        </div>
      </aside>
      {menuAbierto && <div className="velo" onClick={() => setMenuAbierto(false)} />}

      <main className="contenido">
        <header className="cabecera">
          <button className="hamburguesa" aria-label="Abrir menú" onClick={() => setMenuAbierto(true)}>
            ☰
          </button>
          <div>
            <h1>{activa === "Inicio" ? "Buenos días" : activa}</h1>
            <p>{fechaLarga}</p>
          </div>
          <button className="boton-oro" onClick={() => setFormAbierto(true)}>
            Nueva cita
          </button>
        </header>

        {activa === "Inicio" ? (
          <Inicio citasHoy={citasHoy} otrasFechas={otrasFechas} modoNube={modoNube} />
        ) : (
          <section className="proximamente">
            <h2>{activa}</h2>
            <p>Esta sección se construirá en un paso posterior.</p>
          </section>
        )}
      </main>

      {formAbierto && (
        <NuevaCita hoy={hoy} existentes={todas} modoNube={modoNube} onGuardar={guardar} onCerrar={() => setFormAbierto(false)} />
      )}
      {mensaje && (
        <div className="aviso-flotante" role="status">
          {mensaje}
        </div>
      )}
    </div>
  );
}

function Centro({ children }: { children: ReactNode }) {
  return <div className="centro">{children}</div>;
}

function traducir(mensaje: string): string {
  if (mensaje.includes("Invalid login credentials")) return "Correo o contraseña incorrectos.";
  if (mensaje.includes("Email not confirmed")) return "Confirma tu correo antes de iniciar sesión.";
  if (mensaje.includes("already registered")) return "Ese correo ya tiene una cuenta. Inicia sesión.";
  return mensaje;
}

function PantallaAcceso({ onPrueba }: { onPrueba: () => void }) {
  const [crear, setCrear] = useState(false);
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    if (!/^\S+@\S+\.\S+$/.test(correo.trim())) {
      setError("Escribe un correo válido.");
      return;
    }
    if (clave.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    setEnviando(true);
    if (crear) {
      const { data, error: err } = await supabase.auth.signUp({ email: correo.trim(), password: clave });
      if (err) setError(traducir(err.message));
      else if (!data.session) setInfo("Cuenta creada. Revisa tu correo, confirma la cuenta y luego inicia sesión.");
    } else {
      const { error: err } = await supabase.auth.signInWithPassword({ email: correo.trim(), password: clave });
      if (err) setError(traducir(err.message));
    }
    setEnviando(false);
  };

  return (
    <Centro>
      <div className="panel-auth">
        <div className="marca">
          <span className="logo">G</span>
          <span className="nombre">GESTIUM</span>
        </div>
        <h2>{crear ? "Crea tu cuenta" : "Inicia sesión"}</h2>
        <form onSubmit={enviar} noValidate>
          <Campo etiqueta="Correo electrónico">
            <input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} autoComplete="email" />
          </Campo>
          <Campo etiqueta="Contraseña">
            <input
              type="password"
              value={clave}
              onChange={(e) => setClave(e.target.value)}
              autoComplete={crear ? "new-password" : "current-password"}
            />
          </Campo>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {info && <p className="nota">{info}</p>}
          <button type="submit" className="boton-oro" disabled={enviando}>
            {enviando ? "Un momento…" : crear ? "Crear cuenta" : "Entrar"}
          </button>
        </form>
        <button className="enlace-texto" onClick={() => setCrear(!crear)}>
          {crear ? "Ya tengo cuenta" : "Crear una cuenta nueva"}
        </button>
        <button className="enlace-texto" onClick={onPrueba}>
          Probar sin cuenta (solo en este navegador)
        </button>
      </div>
    </Centro>
  );
}

function PantallaNegocio({ error, onCreado, onSalir }: { error: string; onCreado: () => Promise<void>; onSalir: () => void }) {
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState("barberia");
  const [errorForm, setErrorForm] = useState("");
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setErrorForm("");
    if (nombre.trim().length < 2) {
      setErrorForm("Escribe el nombre de tu negocio.");
      return;
    }
    setEnviando(true);
    const { error: err } = await supabase.rpc("crear_negocio", { p_nombre: nombre.trim(), p_tipo: tipo });
    if (err) {
      setErrorForm(err.message);
      setEnviando(false);
      return;
    }
    await onCreado();
  };

  return (
    <Centro>
      <div className="panel-auth">
        <h2>Crea tu negocio</h2>
        <p>Cada negocio tiene sus datos privados. Este será el tuyo.</p>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <form onSubmit={enviar} noValidate>
          <Campo etiqueta="Nombre del negocio">
            <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Barbería Central" />
          </Campo>
          <Campo etiqueta="Tipo de negocio">
            <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="barberia">Barbería</option>
              <option value="manicura">Manicura</option>
              <option value="mixto">Barbería y manicura</option>
            </select>
          </Campo>
          {errorForm && (
            <p className="error" role="alert">
              {errorForm}
            </p>
          )}
          <button type="submit" className="boton-oro" disabled={enviando}>
            {enviando ? "Creando…" : "Crear negocio"}
          </button>
        </form>
        <button className="enlace-texto" onClick={onSalir}>
          Cerrar sesión
        </button>
      </div>
    </Centro>
  );
}

function Inicio({ citasHoy, otrasFechas, modoNube }: { citasHoy: Cita[]; otrasFechas: number; modoNube: boolean }) {
  const proyectado = citasHoy.reduce((a, c) => a + c.precio, 0);
  const cobrado = citasHoy.filter((c) => c.estado === "Completada").reduce((a, c) => a + c.precio, 0);
  const ingresos = INGRESOS_BASE + cobrado;
  return (
    <>
      {!supabaseConfigurado ? (
        <p className="alerta" role="alert">
          Esta versión no encontró las variables de Supabase, por eso guarda solo en el navegador. Agrega
          VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY en Vercel (Settings → Environment Variables) y
          haz Redeploy.
        </p>
      ) : (
        !modoNube && (
          <p className="alerta" role="alert">
            Estás en modo de prueba sin cuenta: las citas no llegan a Supabase. Toca «Iniciar sesión» en el
            menú para guardarlas en tu negocio.
          </p>
        )
      )}
      <section className="tarjetas">
        <article className="tarjeta destacada">
          <span>Citas de hoy</span>
          <strong>{citasHoy.length}</strong>
          <small>{citasHoy.filter((c) => c.estado === "Pendiente").length} por confirmar</small>
        </article>
        <article className="tarjeta">
          <span>Ingresos del día</span>
          <strong>{cop(ingresos)}</strong>
          <small>Proyectado por agenda: {cop(proyectado)}</small>
        </article>
        <article className="tarjeta">
          <span>Gastos del día</span>
          <strong>{cop(GASTOS)}</strong>
          <small>Balance: {cop(ingresos - GASTOS)}</small>
        </article>
      </section>

      <section className="agenda">
        <h2>Próximas citas</h2>
        {citasHoy.length === 0 ? (
          <p className="vacio">No hay citas para hoy. Pulsa «Nueva cita» para agregar la primera.</p>
        ) : (
          <ol>
            {citasHoy.map((c) => (
              <li key={c.id} className={"cita " + c.estado.replace(" ", "-").toLowerCase()}>
                <time>{c.hora}</time>
                <div className="detalle">
                  <strong>{c.cliente}</strong>
                  <span>
                    {c.servicio} · con {c.profesional}
                  </span>
                </div>
                <div className="lado">
                  <span>{cop(c.precio)}</span>
                  <em>{c.estado}</em>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
      {otrasFechas > 0 && (
        <p className="aviso">
          Tienes {otrasFechas} {otrasFechas === 1 ? "cita guardada" : "citas guardadas"} para otras fechas.
        </p>
      )}
      <p className="aviso">
        Las citas de ejemplo son ficticias y no se guardan. {modoNube ? AVISO_NUBE : AVISO_LOCAL}
      </p>
    </>
  );
}

function Campo({ etiqueta, error, children }: { etiqueta: string; error?: string; children: ReactNode }) {
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

interface PropsNueva {
  hoy: string;
  existentes: Cita[];
  modoNube: boolean;
  onGuardar: (c: Omit<Cita, "id">) => Promise<string | null>;
  onCerrar: () => void;
}

function NuevaCita({ hoy, existentes, modoNube, onGuardar, onCerrar }: PropsNueva) {
  const [v, setV] = useState<Formulario>({
    cliente: "",
    servicio: "",
    profesional: "",
    fecha: hoy,
    hora: "",
    precio: "",
    estado: "Pendiente",
  });
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);
  const [errorGuardar, setErrorGuardar] = useState("");

  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar();
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [onCerrar]);

  const cambiar = (campo: keyof Formulario, valor: string) =>
    setV((p) => ({ ...p, [campo]: valor }) as Formulario);

  const elegirServicio = (nombre: string) => {
    const s = servicios.find((x) => x.nombre === nombre);
    setV((p) => ({ ...p, servicio: nombre, precio: s ? String(s.precio) : p.precio }));
  };

  const validar = (): Record<string, string> => {
    const e: Record<string, string> = {};
    if (v.cliente.trim().length < 2) e.cliente = "Escribe el nombre del cliente.";
    if (!v.servicio) e.servicio = "Elige un servicio.";
    if (!v.profesional) e.profesional = "Elige un profesional.";
    if (!v.fecha) e.fecha = "Elige la fecha.";
    if (!v.hora) e.hora = "Elige la hora.";
    if (!(Number(v.precio) > 0)) e.precio = "Escribe un precio mayor que 0.";
    if (
      v.fecha &&
      v.hora &&
      v.profesional &&
      existentes.some((c) => c.fecha === v.fecha && c.hora === v.hora && c.profesional === v.profesional)
    ) {
      e.hora = `${v.profesional} ya tiene una cita a esa hora.`;
    }
    return e;
  };

  const enviar = async (ev: FormEvent) => {
    ev.preventDefault();
    const err = validar();
    setErrores(err);
    setErrorGuardar("");
    if (Object.keys(err).length > 0) return;
    setEnviando(true);
    const fallo = await onGuardar({
      fecha: v.fecha,
      hora: v.hora,
      cliente: v.cliente.trim(),
      servicio: v.servicio,
      profesional: v.profesional,
      precio: Number(v.precio),
      estado: v.estado,
    });
    if (fallo) {
      setErrorGuardar("No se pudo guardar: " + fallo);
      setEnviando(false);
    }
  };

  return (
    <div className="modal-fondo">
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="titulo-cita">
        <header className="modal-cabecera">
          <h2 id="titulo-cita">Nueva cita</h2>
          <button type="button" className="cerrar" aria-label="Cerrar formulario" onClick={onCerrar}>
            ✕
          </button>
        </header>
        <p className="nota">{modoNube ? AVISO_NUBE : AVISO_LOCAL}</p>

        <form onSubmit={enviar} noValidate>
          <Campo etiqueta="Nombre del cliente" error={errores.cliente}>
            <input type="text" value={v.cliente} onChange={(e) => cambiar("cliente", e.target.value)} placeholder="Ej. Andrés Ramírez" autoComplete="off" />
          </Campo>

          <div className="fila">
            <Campo etiqueta="Servicio" error={errores.servicio}>
              <select value={v.servicio} onChange={(e) => elegirServicio(e.target.value)}>
                <option value="">Elige un servicio</option>
                {servicios.map((s) => (
                  <option key={s.nombre} value={s.nombre}>
                    {s.nombre}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo etiqueta="Profesional" error={errores.profesional}>
              <select value={v.profesional} onChange={(e) => cambiar("profesional", e.target.value)}>
                <option value="">Elige un profesional</option>
                {profesionales.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </Campo>
          </div>

          <div className="fila">
            <Campo etiqueta="Fecha" error={errores.fecha}>
              <input type="date" value={v.fecha} onChange={(e) => cambiar("fecha", e.target.value)} />
            </Campo>
            <Campo etiqueta="Hora" error={errores.hora}>
              <input type="time" value={v.hora} onChange={(e) => cambiar("hora", e.target.value)} />
            </Campo>
          </div>

          <div className="fila">
            <Campo etiqueta="Precio (COP)" error={errores.precio}>
              <input type="number" inputMode="numeric" min="0" step="1000" value={v.precio} onChange={(e) => cambiar("precio", e.target.value)} placeholder="Ej. 35000" />
              {Number(v.precio) > 0 && <span className="ayuda">{cop(Number(v.precio))}</span>}
            </Campo>
            <Campo etiqueta="Estado">
              <select value={v.estado} onChange={(e) => cambiar("estado", e.target.value)}>
                {estados.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Campo>
          </div>

          {errorGuardar && (
            <p className="error" role="alert">
              {errorGuardar}
            </p>
          )}
          <div className="acciones">
            <button type="button" className="boton-borde" onClick={onCerrar}>
              Cancelar
            </button>
            <button type="submit" className="boton-oro" disabled={enviando}>
              {enviando ? "Guardando…" : "Guardar cita"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
