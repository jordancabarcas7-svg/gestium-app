import { useEffect, useState, type FormEvent } from "react";
import { Campo, cop, estados, fechaCorta, type Cita, type Estado } from "./comun";

const NUEVO = "__nuevo__";

export type DatosCita = Omit<Cita, "id">;

/* ===================== Sección Citas ===================== */

interface PropsSeccion {
  citas: Cita[];
  cargando: boolean;
  error: string;
  hoy: string;
  onEditar: (c: Cita) => void;
  onEliminar: (c: Cita) => void;
  onActualizar: () => void;
}

export function SeccionCitas({ citas, cargando, error, hoy, onEditar, onEliminar, onActualizar }: PropsSeccion) {
  const [fecha, setFecha] = useState(hoy);
  const [estado, setEstado] = useState<Estado | "Todos">("Todos");

  const lista = citas
    .filter((c) => (!fecha || c.fecha === fecha) && (estado === "Todos" || c.estado === estado))
    .sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));
  const total = lista.reduce((a, c) => a + c.precio, 0);
  const titulo = !fecha ? "Todas las citas" : fecha === hoy ? "Citas de hoy" : "Citas del " + fechaCorta(fecha);

  return (
    <>
      <section className="filtros" aria-label="Filtros de citas">
        <Campo etiqueta="Fecha">
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </Campo>
        <Campo etiqueta="Estado">
          <select value={estado} onChange={(e) => setEstado(e.target.value as Estado | "Todos")}>
            <option value="Todos">Todos los estados</option>
            {estados.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Campo>
        <div className="atajos">
          <button type="button" className="mini" onClick={() => setFecha(hoy)}>
            Hoy
          </button>
          <button type="button" className="mini" onClick={() => setFecha("")}>
            Todas las fechas
          </button>
          <button type="button" className="mini" onClick={onActualizar} disabled={cargando}>
            {cargando ? "Actualizando…" : "Actualizar"}
          </button>
        </div>
      </section>

      {error && (
        <p className="alerta" role="alert">
          {error}
        </p>
      )}

      <section className="agenda">
        <h2>{titulo}</h2>
        <p className="resumen">
          {lista.length} {lista.length === 1 ? "cita" : "citas"} · {cop(total)}
        </p>
        {cargando && citas.length === 0 ? (
          <p className="vacio">Cargando citas…</p>
        ) : lista.length === 0 ? (
          <p className="vacio">
            {citas.length === 0
              ? "Aún no tienes citas guardadas. Pulsa «Nueva cita» para crear la primera."
              : "No hay citas con estos filtros."}
          </p>
        ) : (
          <ol>
            {lista.map((c) => (
              <li key={c.id} className={"cita " + c.estado.replace(" ", "-").toLowerCase()}>
                <time dateTime={`${c.fecha}T${c.hora}`}>
                  {c.hora}
                  <small>{fechaCorta(c.fecha)}</small>
                </time>
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
                <div className="botones">
                  <button type="button" className="mini" onClick={() => onEditar(c)}>
                    Editar
                  </button>
                  <button type="button" className="mini peligro" onClick={() => onEliminar(c)}>
                    Eliminar
                  </button>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </>
  );
}

/* ===================== Confirmar eliminación ===================== */

export function ConfirmarEliminar({
  cita,
  onConfirmar,
  onCancelar,
}: {
  cita: Cita;
  onConfirmar: () => Promise<string | null>;
  onCancelar: () => void;
}) {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancelar();
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [onCancelar]);

  const eliminar = async () => {
    setEnviando(true);
    setError("");
    const fallo = await onConfirmar();
    if (fallo) {
      setError("No se pudo eliminar: " + fallo);
      setEnviando(false);
    }
  };

  return (
    <div className="modal-fondo">
      <div className="modal" role="alertdialog" aria-modal="true" aria-labelledby="titulo-eliminar">
        <header className="modal-cabecera">
          <h2 id="titulo-eliminar">Eliminar cita</h2>
        </header>
        <p className="nota">
          Se eliminará la cita de {cita.cliente} del {fechaCorta(cita.fecha)} a las {cita.hora}. Esta acción no se
          puede deshacer.
        </p>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="acciones">
          <button type="button" className="boton-borde" onClick={onCancelar}>
            Cancelar
          </button>
          <button type="button" className="boton-oro boton-peligro" onClick={eliminar} disabled={enviando}>
            {enviando ? "Eliminando…" : "Eliminar"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===================== Formulario crear / editar ===================== */

interface PropsFormulario {
  hoy: string;
  cita: Cita | null; // null = crear
  existentes: Cita[];
  profesionales: string[];
  servicios: { nombre: string; precio: number }[];
  clientes: string[];
  permitirNuevos: boolean;
  nota: string;
  onGuardar: (c: DatosCita) => Promise<string | null>;
  onCerrar: () => void;
}

interface Campos {
  cliente: string;
  servicio: string;
  servicioNuevo: string;
  profesional: string;
  profesionalNuevo: string;
  fecha: string;
  hora: string;
  precio: string;
  estado: Estado;
}

const canonico = (lista: string[], nombre: string) =>
  lista.find((x) => x.toLowerCase() === nombre.toLowerCase()) ?? nombre;

export function FormularioCita({
  hoy,
  cita,
  existentes,
  profesionales,
  servicios,
  clientes,
  permitirNuevos,
  nota,
  onGuardar,
  onCerrar,
}: PropsFormulario) {
  const nombresServ = servicios.map((s) => s.nombre);
  const servInicial = cita ? canonico(nombresServ, cita.servicio) : "";
  const profInicial = cita ? canonico(profesionales, cita.profesional) : "";
  // Si la cita guardada usa un nombre que ya no está en el catálogo, se conserva como opción.
  const opcionesServ =
    servInicial && !nombresServ.includes(servInicial)
      ? [...servicios, { nombre: servInicial, precio: cita ? cita.precio : 0 }]
      : servicios;
  const opcionesProf = profInicial && !profesionales.includes(profInicial) ? [...profesionales, profInicial] : profesionales;

  const [v, setV] = useState<Campos>({
    cliente: cita ? cita.cliente : "",
    servicio: servInicial,
    servicioNuevo: "",
    profesional: profInicial,
    profesionalNuevo: "",
    fecha: cita ? cita.fecha : hoy,
    hora: cita ? cita.hora : "",
    precio: cita ? String(cita.precio) : "",
    estado: cita ? cita.estado : "Pendiente",
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

  const cambiar = (campo: keyof Campos, valor: string) => setV((p) => ({ ...p, [campo]: valor }) as Campos);

  const elegirServicio = (nombre: string) => {
    const s = opcionesServ.find((x) => x.nombre === nombre);
    setV((p) => ({ ...p, servicio: nombre, precio: s ? String(s.precio) : p.precio }));
  };

  const nombreServicio = v.servicio === NUEVO ? v.servicioNuevo.trim() : v.servicio;
  const nombreProfesional = v.profesional === NUEVO ? v.profesionalNuevo.trim() : v.profesional;

  const validar = (): Record<string, string> => {
    const e: Record<string, string> = {};
    if (v.cliente.trim().length < 2) e.cliente = "Escribe el nombre del cliente.";
    if (!nombreServicio) e.servicio = v.servicio === NUEVO ? "Escribe el nombre del servicio nuevo." : "Elige un servicio.";
    if (!nombreProfesional) {
      e.profesional = v.profesional === NUEVO ? "Escribe el nombre del profesional nuevo." : "Elige un profesional.";
    }
    if (!v.fecha) e.fecha = "Elige la fecha.";
    if (!v.hora) e.hora = "Elige la hora.";
    if (!(Number(v.precio) > 0)) e.precio = "Escribe un precio mayor que 0.";
    if (
      v.fecha &&
      v.hora &&
      nombreProfesional &&
      existentes.some(
        (c) =>
          (!cita || c.id !== cita.id) &&
          c.fecha === v.fecha &&
          c.hora === v.hora &&
          c.profesional.toLowerCase() === nombreProfesional.toLowerCase()
      )
    ) {
      e.hora = `${nombreProfesional} ya tiene una cita a esa hora.`;
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
      servicio: nombreServicio,
      profesional: nombreProfesional,
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
          <h2 id="titulo-cita">{cita ? "Editar cita" : "Nueva cita"}</h2>
          <button type="button" className="cerrar" aria-label="Cerrar formulario" onClick={onCerrar}>
            ✕
          </button>
        </header>
        <p className="nota">{nota}</p>

        <form onSubmit={enviar} noValidate>
          <Campo etiqueta="Nombre del cliente" error={errores.cliente}>
            <input
              type="text"
              list={clientes.length > 0 ? "lista-clientes" : undefined}
              value={v.cliente}
              onChange={(e) => cambiar("cliente", e.target.value)}
              placeholder="Ej. Andrés Ramírez"
              autoComplete="off"
            />
            {clientes.length > 0 && (
              <datalist id="lista-clientes">
                {clientes.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
            )}
            {permitirNuevos && <span className="ayuda">Si el cliente no existe, se crea automáticamente.</span>}
          </Campo>

          <div className="fila">
            <Campo etiqueta="Servicio" error={errores.servicio}>
              <select value={v.servicio} onChange={(e) => elegirServicio(e.target.value)}>
                <option value="">Elige un servicio</option>
                {opcionesServ.map((s) => (
                  <option key={s.nombre} value={s.nombre}>
                    {s.nombre}
                  </option>
                ))}
                {permitirNuevos && <option value={NUEVO}>+ Agregar servicio nuevo…</option>}
              </select>
              {v.servicio === NUEVO && (
                <input
                  type="text"
                  aria-label="Nombre del servicio nuevo"
                  value={v.servicioNuevo}
                  onChange={(e) => cambiar("servicioNuevo", e.target.value)}
                  placeholder="Nombre del servicio"
                />
              )}
            </Campo>
            <Campo etiqueta="Profesional" error={errores.profesional}>
              <select value={v.profesional} onChange={(e) => cambiar("profesional", e.target.value)}>
                <option value="">Elige un profesional</option>
                {opcionesProf.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
                {permitirNuevos && <option value={NUEVO}>+ Agregar profesional nuevo…</option>}
              </select>
              {v.profesional === NUEVO && (
                <input
                  type="text"
                  aria-label="Nombre del profesional nuevo"
                  value={v.profesionalNuevo}
                  onChange={(e) => cambiar("profesionalNuevo", e.target.value)}
                  placeholder="Nombre del profesional"
                />
              )}
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
              <input
                type="number"
                inputMode="numeric"
                min="0"
                step="1000"
                value={v.precio}
                onChange={(e) => cambiar("precio", e.target.value)}
                placeholder="Ej. 35000"
              />
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
              {enviando ? "Guardando…" : cita ? "Guardar cambios" : "Guardar cita"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
