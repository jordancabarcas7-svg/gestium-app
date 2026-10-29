import { useEffect, useState, type FormEvent, type ReactNode } from "react";

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

const CLAVE_ALMACEN = "gestium_citas_v1";
const INGRESOS_BASE = 1_280_000; // dato ficticio
const GASTOS = 410_000; // dato ficticio

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

function cargarGuardadas(): Cita[] {
  try {
    const crudo = localStorage.getItem(CLAVE_ALMACEN);
    if (!crudo) return [];
    const datos: unknown = JSON.parse(crudo);
    return Array.isArray(datos) ? (datos as Cita[]) : [];
  } catch {
    return [];
  }
}

const AVISO_LOCAL =
  "Las citas nuevas se guardan solo en este navegador (localStorage). Todavía no se comparten entre dispositivos ni entre negocios.";

export default function App() {
  const [activa, setActiva] = useState<Seccion>("Inicio");
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [formAbierto, setFormAbierto] = useState(false);
  const [guardadas, setGuardadas] = useState<Cita[]>(cargarGuardadas);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    try {
      localStorage.setItem(CLAVE_ALMACEN, JSON.stringify(guardadas));
    } catch {
      /* si el navegador bloquea el almacenamiento, la app sigue funcionando */
    }
  }, [guardadas]);

  useEffect(() => {
    if (!mensaje) return;
    const t = window.setTimeout(() => setMensaje(""), 4000);
    return () => window.clearTimeout(t);
  }, [mensaje]);

  const hoy = hoyISO();
  const todas = [...citasDemo(hoy), ...guardadas];
  const citasHoy = todas.filter((c) => c.fecha === hoy).sort((a, b) => a.hora.localeCompare(b.hora));
  const otrasFechas = guardadas.filter((c) => c.fecha !== hoy).length;

  const elegir = (s: Seccion) => {
    setActiva(s);
    setMenuAbierto(false);
  };

  const guardar = (cita: Cita) => {
    setGuardadas((prev) => [...prev, cita]);
    setFormAbierto(false);
    setMensaje(cita.fecha === hoy ? "Cita guardada en la agenda de hoy." : "Cita guardada para otra fecha.");
  };

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
          <strong>Barbería Demo</strong>
          <span>Versión de prueba</span>
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
          <Inicio citasHoy={citasHoy} otrasFechas={otrasFechas} />
        ) : (
          <section className="proximamente">
            <h2>{activa}</h2>
            <p>Esta sección se construirá en un paso posterior.</p>
          </section>
        )}
      </main>

      {formAbierto && <NuevaCita hoy={hoy} existentes={todas} onGuardar={guardar} onCerrar={() => setFormAbierto(false)} />}
      {mensaje && (
        <div className="aviso-flotante" role="status">
          {mensaje}
        </div>
      )}
    </div>
  );
}

function Inicio({ citasHoy, otrasFechas }: { citasHoy: Cita[]; otrasFechas: number }) {
  const proyectado = citasHoy.reduce((a, c) => a + c.precio, 0);
  const cobrado = citasHoy.filter((c) => c.estado === "Completada").reduce((a, c) => a + c.precio, 0);
  const ingresos = INGRESOS_BASE + cobrado;
  return (
    <>
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
      <p className="aviso">Las citas de ejemplo son ficticias y no se guardan. {AVISO_LOCAL}</p>
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
  onGuardar: (c: Cita) => void;
  onCerrar: () => void;
}

function NuevaCita({ hoy, existentes, onGuardar, onCerrar }: PropsNueva) {
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

  const enviar = (ev: FormEvent) => {
    ev.preventDefault();
    const err = validar();
    setErrores(err);
    if (Object.keys(err).length > 0) return;
    onGuardar({
      id: nuevoId(),
      fecha: v.fecha,
      hora: v.hora,
      cliente: v.cliente.trim(),
      servicio: v.servicio,
      profesional: v.profesional,
      precio: Number(v.precio),
      estado: v.estado,
    });
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
        <p className="nota">{AVISO_LOCAL}</p>

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

          <div className="acciones">
            <button type="button" className="boton-borde" onClick={onCerrar}>
              Cancelar
            </button>
            <button type="submit" className="boton-oro">
              Guardar cita
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
