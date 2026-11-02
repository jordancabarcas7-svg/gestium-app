import { useEffect, useState, type FormEvent } from "react";
import { Campo, sinTildes, type Cita, type Profesional } from "./comun";

export interface DatosProfesional {
  nombre: string;
  especialidad: string | null;
}

// Citas de un profesional: las enlazadas por profesional_id y, para citas antiguas sin enlace, las del mismo nombre.
export function citasDeProfesional(p: Profesional, citas: Cita[]): Cita[] {
  const nombre = sinTildes(p.nombre.trim());
  return citas.filter((c) => c.profesionalId === p.id || (!c.profesionalId && sinTildes(c.profesional.trim()) === nombre));
}

function usarEscape(onSalir: () => void) {
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") onSalir();
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [onSalir]);
}

/* ===================== Lista, búsqueda y filtros ===================== */

type FiltroEstado = "Todos" | "Activos" | "Inactivos";

interface PropsSeccion {
  profesionales: Profesional[];
  citas: Cita[];
  cargando: boolean;
  error: string;
  onEditar: (p: Profesional) => void;
  onAlternar: (p: Profesional) => void;
  onEliminar: (p: Profesional) => void;
  onActualizar: () => void;
}

export function SeccionProfesionales({
  profesionales,
  citas,
  cargando,
  error,
  onEditar,
  onAlternar,
  onEliminar,
  onActualizar,
}: PropsSeccion) {
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState<FiltroEstado>("Todos");
  const texto = sinTildes(q.trim());

  const lista = profesionales
    .filter((p) => filtro === "Todos" || (filtro === "Activos") === (p.activo !== false))
    .filter((p) => !texto || sinTildes(p.nombre).includes(texto) || sinTildes(p.especialidad ?? "").includes(texto))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  const activos = profesionales.filter((p) => p.activo !== false).length;

  return (
    <>
      <section className="filtros" aria-label="Buscar y filtrar profesionales">
        <Campo etiqueta="Buscar">
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nombre o especialidad" autoComplete="off" />
        </Campo>
        <Campo etiqueta="Estado">
          <select value={filtro} onChange={(e) => setFiltro(e.target.value as FiltroEstado)}>
            <option value="Todos">Todos</option>
            <option value="Activos">Activos</option>
            <option value="Inactivos">Inactivos</option>
          </select>
        </Campo>
        <div className="atajos">
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
        <h2>Profesionales</h2>
        <p className="resumen">
          {lista.length} {lista.length === 1 ? "profesional" : "profesionales"} · {activos} {activos === 1 ? "activo" : "activos"} en total
        </p>
        {cargando && profesionales.length === 0 ? (
          <p className="vacio">Cargando profesionales…</p>
        ) : lista.length === 0 ? (
          <p className="vacio">
            {profesionales.length === 0
              ? "Aún no tienes profesionales. Pulsa «Nuevo profesional» para registrar el primero."
              : "Ningún profesional coincide con la búsqueda o el filtro."}
          </p>
        ) : (
          <ul className="lista-clientes">
            {lista.map((p) => {
              const activo = p.activo !== false;
              const suyas = citasDeProfesional(p, citas);
              return (
                <li key={p.id} className={"cliente" + (activo ? "" : " inactivo")}>
                  <span className="avatar" aria-hidden="true">
                    {p.nombre.trim().charAt(0).toUpperCase()}
                  </span>
                  <div className="detalle">
                    <strong>{p.nombre}</strong>
                    <span>{p.especialidad ? p.especialidad : "Sin especialidad"}</span>
                    <span>
                      {suyas.length === 0 ? "Sin citas" : `${suyas.length} ${suyas.length === 1 ? "cita" : "citas"}`}
                    </span>
                    <small className={"insignia" + (activo ? "" : " off")}>{activo ? "Activo" : "Inactivo"}</small>
                  </div>
                  <div className="botones">
                    <button type="button" className="mini" onClick={() => onEditar(p)}>
                      Editar
                    </button>
                    <button type="button" className="mini" onClick={() => onAlternar(p)}>
                      {activo ? "Desactivar" : "Activar"}
                    </button>
                    {suyas.length === 0 && (
                      <button type="button" className="mini peligro" onClick={() => onEliminar(p)}>
                        Eliminar
                      </button>
                    )}
                  </div>
                  {suyas.length > 0 && (
                    <p className="pista">Tiene citas: para conservar su historial se desactiva, no se elimina.</p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}

/* ===================== Formulario crear / editar ===================== */

export function FormularioProfesional({
  profesional,
  existentes,
  onGuardar,
  onCerrar,
}: {
  profesional: Profesional | null; // null = crear
  existentes: Profesional[];
  onGuardar: (d: DatosProfesional) => Promise<string | null>;
  onCerrar: () => void;
}) {
  usarEscape(onCerrar);
  const [nombre, setNombre] = useState(profesional ? profesional.nombre : "");
  const [especialidad, setEspecialidad] = useState(profesional && profesional.especialidad ? profesional.especialidad : "");
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);
  const [errorGuardar, setErrorGuardar] = useState("");

  const enviar = async (ev: FormEvent) => {
    ev.preventDefault();
    const e: Record<string, string> = {};
    const limpio = nombre.trim();
    if (limpio.length < 2) {
      e.nombre = "Escribe el nombre del profesional.";
    } else {
      const repetido = existentes.find(
        (x) => sinTildes(x.nombre.trim()) === sinTildes(limpio) && (!profesional || x.id !== profesional.id)
      );
      if (repetido) e.nombre = `Ya existe un profesional con ese nombre${repetido.activo === false ? " (está inactivo)" : ""}.`;
    }
    setErrores(e);
    setErrorGuardar("");
    if (Object.keys(e).length > 0) return;
    setEnviando(true);
    const fallo = await onGuardar({ nombre: limpio, especialidad: especialidad.trim() || null });
    if (fallo) {
      setErrorGuardar("No se pudo guardar: " + fallo);
      setEnviando(false);
    }
  };

  return (
    <div className="modal-fondo">
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="titulo-form-prof">
        <header className="modal-cabecera">
          <h2 id="titulo-form-prof">{profesional ? "Editar profesional" : "Nuevo profesional"}</h2>
          <button type="button" className="cerrar" aria-label="Cerrar formulario" onClick={onCerrar}>
            ✕
          </button>
        </header>
        <p className="nota">Los profesionales pertenecen a tu negocio y solo tu equipo puede verlos.</p>
        <form onSubmit={enviar} noValidate>
          <Campo etiqueta="Nombre" error={errores.nombre}>
            <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Camilo Herrera" autoComplete="off" />
          </Campo>
          <Campo etiqueta="Especialidad (opcional)">
            <input
              type="text"
              maxLength={60}
              value={especialidad}
              onChange={(e) => setEspecialidad(e.target.value)}
              placeholder="Ej. Barbero, Manicurista"
              autoComplete="off"
            />
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
              {enviando ? "Guardando…" : profesional ? "Guardar cambios" : "Guardar profesional"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ===================== Confirmaciones ===================== */

export function ConfirmarEliminarProfesional({
  profesional,
  onConfirmar,
  onCancelar,
}: {
  profesional: Profesional;
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
      setError(fallo);
      setEnviando(false);
    }
  };

  return (
    <div className="modal-fondo">
      <div className="modal" role="alertdialog" aria-modal="true" aria-labelledby="titulo-eliminar-prof">
        <header className="modal-cabecera">
          <h2 id="titulo-eliminar-prof">Eliminar profesional</h2>
        </header>
        <p className="nota">Se eliminará a {profesional.nombre}, que no tiene citas registradas. Esta acción no se puede deshacer.</p>
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

export function ConfirmarDesactivar({
  profesional,
  pendientes,
  onConfirmar,
  onCancelar,
}: {
  profesional: Profesional;
  pendientes: number;
  onConfirmar: () => Promise<string | null>;
  onCancelar: () => void;
}) {
  usarEscape(onCancelar);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  const desactivar = async () => {
    setEnviando(true);
    setError("");
    const fallo = await onConfirmar();
    if (fallo) {
      setError("No se pudo desactivar: " + fallo);
      setEnviando(false);
    }
  };

  return (
    <div className="modal-fondo">
      <div className="modal" role="alertdialog" aria-modal="true" aria-labelledby="titulo-desactivar">
        <header className="modal-cabecera">
          <h2 id="titulo-desactivar">Desactivar profesional</h2>
        </header>
        <p className="nota">
          {profesional.nombre} tiene {pendientes} {pendientes === 1 ? "cita futura sin completar" : "citas futuras sin completar"}.
          Seguirán en la agenda con su nombre, pero ya no podrás asignarle citas nuevas.
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
          <button type="button" className="boton-oro" onClick={desactivar} disabled={enviando}>
            {enviando ? "Desactivando…" : "Desactivar"}
          </button>
        </div>
      </div>
    </div>
  );
}
