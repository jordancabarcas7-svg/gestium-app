import { useEffect, useState, type FormEvent } from "react";
import {
  Campo,
  cop,
  fechaCorta,
  formatearTelefono,
  normalizarTelefono,
  sinTildes,
  telefonoValido,
  type Cita,
  type Cliente,
} from "./comun";

export interface DatosCliente {
  nombre: string;
  telefono: string | null; // solo dígitos
  notas: string | null;
}

// Citas de un cliente: las enlazadas por cliente_id y, para citas antiguas sin enlace, las del mismo nombre.
export function citasDeCliente(cliente: Cliente, citas: Cita[]): Cita[] {
  const nombre = sinTildes(cliente.nombre.trim());
  return citas.filter((c) => c.clienteId === cliente.id || (!c.clienteId && sinTildes(c.cliente.trim()) === nombre));
}

const masRecientesPrimero = (a: Cita, b: Cita) => (b.fecha + b.hora).localeCompare(a.fecha + a.hora);

function usarEscape(onSalir: () => void) {
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") onSalir();
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [onSalir]);
}

/* ===================== Lista y búsqueda ===================== */

interface PropsSeccion {
  clientes: Cliente[];
  citas: Cita[];
  cargando: boolean;
  error: string;
  onVer: (c: Cliente) => void;
  onEditar: (c: Cliente) => void;
  onEliminar: (c: Cliente) => void;
  onActualizar: () => void;
}

export function SeccionClientes({ clientes, citas, cargando, error, onVer, onEditar, onEliminar, onActualizar }: PropsSeccion) {
  const [q, setQ] = useState("");
  const texto = sinTildes(q.trim());
  const digitos = q.replace(/\D/g, "");

  const lista = clientes
    .filter(
      (c) =>
        !texto ||
        sinTildes(c.nombre).includes(texto) ||
        (digitos.length >= 3 && (c.telefono ?? "").includes(digitos))
    )
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

  return (
    <>
      <section className="filtros" aria-label="Buscar clientes">
        <Campo etiqueta="Buscar">
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Nombre o teléfono"
            autoComplete="off"
          />
        </Campo>
        <div className="atajos">
          {q && (
            <button type="button" className="mini" onClick={() => setQ("")}>
              Limpiar
            </button>
          )}
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
        <h2>Clientes</h2>
        <p className="resumen">
          {lista.length} {lista.length === 1 ? "cliente" : "clientes"}
          {q ? ` para «${q.trim()}»` : ""}
        </p>
        {cargando && clientes.length === 0 ? (
          <p className="vacio">Cargando clientes…</p>
        ) : lista.length === 0 ? (
          <p className="vacio">
            {clientes.length === 0
              ? "Aún no tienes clientes. Pulsa «Nuevo cliente» para registrar el primero."
              : "Ningún cliente coincide con la búsqueda."}
          </p>
        ) : (
          <ul className="lista-clientes">
            {lista.map((c) => {
              const suyas = citasDeCliente(c, citas).sort(masRecientesPrimero);
              return (
                <li key={c.id} className="cliente">
                  <span className="avatar" aria-hidden="true">
                    {c.nombre.trim().charAt(0).toUpperCase()}
                  </span>
                  <div className="detalle">
                    <strong>{c.nombre}</strong>
                    <span>{c.telefono ? formatearTelefono(c.telefono) : "Sin teléfono"}</span>
                    <span>
                      {suyas.length === 0
                        ? "Sin citas"
                        : `${suyas.length} ${suyas.length === 1 ? "cita" : "citas"} · Última: ${fechaCorta(suyas[0].fecha)}`}
                    </span>
                  </div>
                  <div className="botones">
                    <button type="button" className="mini" onClick={() => onVer(c)}>
                      Historial
                    </button>
                    <button type="button" className="mini" onClick={() => onEditar(c)}>
                      Editar
                    </button>
                    <button type="button" className="mini peligro" onClick={() => onEliminar(c)}>
                      Eliminar
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}

/* ===================== Detalle e historial ===================== */

export function DetalleCliente({
  cliente,
  citas,
  onEditar,
  onCerrar,
}: {
  cliente: Cliente;
  citas: Cita[];
  onEditar: (c: Cliente) => void;
  onCerrar: () => void;
}) {
  usarEscape(onCerrar);
  const historial = citasDeCliente(cliente, citas).sort(masRecientesPrimero);
  const completadas = historial.filter((c) => c.estado === "Completada");
  const total = completadas.reduce((a, c) => a + c.precio, 0);
  const desde = cliente.creado_en ? cliente.creado_en.slice(0, 10) : "";

  return (
    <div className="modal-fondo">
      <div className="modal ancho" role="dialog" aria-modal="true" aria-labelledby="titulo-cliente">
        <header className="modal-cabecera">
          <h2 id="titulo-cliente">{cliente.nombre}</h2>
          <button type="button" className="cerrar" aria-label="Cerrar" onClick={onCerrar}>
            ✕
          </button>
        </header>
        <p className="ficha">
          {cliente.telefono ? formatearTelefono(cliente.telefono) : "Sin teléfono"}
          {desde ? ` · Cliente desde el ${fechaCorta(desde)}` : ""}
        </p>
        {cliente.notas && <p className="nota">{cliente.notas}</p>}

        <div className="resumen-cliente">
          <div className="dato">
            <strong>{historial.length}</strong>
            <span>Citas</span>
          </div>
          <div className="dato">
            <strong>{completadas.length}</strong>
            <span>Completadas</span>
          </div>
          <div className="dato">
            <strong>{cop(total)}</strong>
            <span>Total completado</span>
          </div>
        </div>

        <section className="agenda">
          {historial.length === 0 ? (
            <p className="vacio">Este cliente todavía no tiene citas.</p>
          ) : (
            <ol>
              {historial.map((c) => (
                <li key={c.id} className={"cita " + c.estado.replace(" ", "-").toLowerCase()}>
                  <time dateTime={`${c.fecha}T${c.hora}`}>
                    {c.hora}
                    <small>{fechaCorta(c.fecha)}</small>
                  </time>
                  <div className="detalle">
                    <strong>{c.servicio}</strong>
                    <span>con {c.profesional}</span>
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

        <div className="acciones">
          <button type="button" className="boton-borde" onClick={onCerrar}>
            Cerrar
          </button>
          <button type="button" className="boton-oro" onClick={() => onEditar(cliente)}>
            Editar cliente
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===================== Formulario crear / editar ===================== */

export function FormularioCliente({
  cliente,
  existentes,
  onGuardar,
  onCerrar,
}: {
  cliente: Cliente | null; // null = crear
  existentes: Cliente[];
  onGuardar: (d: DatosCliente) => Promise<string | null>;
  onCerrar: () => void;
}) {
  usarEscape(onCerrar);
  const [nombre, setNombre] = useState(cliente ? cliente.nombre : "");
  const [telefono, setTelefono] = useState(cliente && cliente.telefono ? formatearTelefono(cliente.telefono) : "");
  const [notas, setNotas] = useState(cliente && cliente.notas ? cliente.notas : "");
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);
  const [errorGuardar, setErrorGuardar] = useState("");

  const enviar = async (ev: FormEvent) => {
    ev.preventDefault();
    const e: Record<string, string> = {};
    const tel = normalizarTelefono(telefono);
    if (nombre.trim().length < 2) e.nombre = "Escribe el nombre del cliente.";
    if (tel) {
      if (!telefonoValido(tel)) {
        e.telefono = "Escribe un celular colombiano de 10 dígitos que empiece por 3. Ej. 300 123 4567.";
      } else {
        const repetido = existentes.find((c) => c.telefono === tel && (!cliente || c.id !== cliente.id));
        if (repetido) e.telefono = `Ya existe un cliente con ese teléfono: ${repetido.nombre}.`;
      }
    }
    setErrores(e);
    setErrorGuardar("");
    if (Object.keys(e).length > 0) return;
    setEnviando(true);
    const fallo = await onGuardar({
      nombre: nombre.trim(),
      telefono: tel || null,
      notas: notas.trim() || null,
    });
    if (fallo) {
      setErrorGuardar("No se pudo guardar: " + fallo);
      setEnviando(false);
    }
  };

  return (
    <div className="modal-fondo">
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="titulo-form-cliente">
        <header className="modal-cabecera">
          <h2 id="titulo-form-cliente">{cliente ? "Editar cliente" : "Nuevo cliente"}</h2>
          <button type="button" className="cerrar" aria-label="Cerrar formulario" onClick={onCerrar}>
            ✕
          </button>
        </header>
        <p className="nota">Los clientes pertenecen a tu negocio y solo tu equipo puede verlos.</p>

        <form onSubmit={enviar} noValidate>
          <Campo etiqueta="Nombre" error={errores.nombre}>
            <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Andrés Ramírez" autoComplete="off" />
          </Campo>
          <Campo etiqueta="Teléfono (opcional)" error={errores.telefono}>
            <input
              type="tel"
              inputMode="tel"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="300 123 4567"
              autoComplete="off"
            />
          </Campo>
          <Campo etiqueta="Notas (opcional)">
            <textarea rows={3} maxLength={500} value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Preferencias, alergias, observaciones…" />
          </Campo>
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
              {enviando ? "Guardando…" : cliente ? "Guardar cambios" : "Guardar cliente"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ===================== Confirmar eliminación ===================== */

export function ConfirmarEliminarCliente({
  cliente,
  totalCitas,
  onConfirmar,
  onCancelar,
}: {
  cliente: Cliente;
  totalCitas: number;
  onConfirmar: () => Promise<string | null>;
  onCancelar: () => void;
}) {
  usarEscape(onCancelar);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

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
      <div className="modal" role="alertdialog" aria-modal="true" aria-labelledby="titulo-eliminar-cliente">
        <header className="modal-cabecera">
          <h2 id="titulo-eliminar-cliente">Eliminar cliente</h2>
        </header>
        <p className="nota">
          Se eliminará a {cliente.nombre}.{" "}
          {totalCitas > 0
            ? `Sus ${totalCitas} ${totalCitas === 1 ? "cita se conserva" : "citas se conservan"} con su nombre, pero ya no quedarán enlazadas a este cliente.`
            : "No tiene citas registradas."}{" "}
          Esta acción no se puede deshacer.
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
