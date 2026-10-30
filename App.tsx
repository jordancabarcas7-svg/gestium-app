import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, supabaseConfigurado } from "./supabase";
import { Campo, cop, hoyISO, type Cita, type Cliente, type Estado, type Profesional, type Servicio } from "./comun";
import { ConfirmarEliminar, FormularioCita, SeccionCitas } from "./Citas";
import {
  ConfirmarEliminarCliente,
  DetalleCliente,
  FormularioCliente,
  SeccionClientes,
  citasDeCliente,
  type DatosCliente,
} from "./Clientes";

type Seccion = "Inicio" | "Citas" | "Clientes" | "Profesionales" | "Servicios" | "Caja" | "Reportes";

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
  cliente_id: string | null;
  profesional_id: string | null;
  servicio_id: string | null;
}

const secciones: Seccion[] = ["Inicio", "Citas", "Clientes", "Profesionales", "Servicios", "Caja", "Reportes"];
// Listas fijas: solo se usan en el modo de prueba local (sin cuenta).
const profesionales = ["Camilo", "Valentina", "Mariana", "Esteban"];
const servicios = [
  { nombre: "Corte clásico", precio: 35000 },
  { nombre: "Corte y barba", precio: 55000 },
  { nombre: "Perfilado de barba", precio: 25000 },
  { nombre: "Manicura tradicional", precio: 30000 },
  { nombre: "Manicura semipermanente", precio: 60000 },
  { nombre: "Uñas acrílicas", precio: 90000 },
];

const VERSION = "v0.5 (Clientes)";
const CLAVE_ALMACEN = "gestium_citas_v1";
const INGRESOS_BASE = 1_280_000; // dato ficticio
const GASTOS = 410_000; // dato ficticio

const AVISO_LOCAL =
  "Las citas nuevas se guardan solo en este navegador (localStorage). No se comparten entre dispositivos ni entre negocios.";
const AVISO_NUBE = "Las citas nuevas se guardan en la base de datos de tu negocio.";

const nuevoId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

// Citas de ejemplo (solo en Inicio): siempre aparecen con la fecha de hoy y NO se guardan.
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
  clienteId: f.cliente_id,
  profesionalId: f.profesional_id,
  servicioId: f.servicio_id,
});

function buscar<T extends { nombre: string }>(lista: T[], nombre: string): T | undefined {
  const n = nombre.trim().toLowerCase();
  return lista.find((x) => x.nombre.trim().toLowerCase() === n);
}

async function crearFila<T>(tabla: string, fila: Record<string, unknown>, etiqueta: string): Promise<T> {
  const { data, error } = await supabase.from(tabla).insert(fila).select().single();
  if (error || !data) throw new Error(`No se pudo crear ${etiqueta}: ${error ? error.message : "sin respuesta"}`);
  return data as unknown as T;
}

export default function App() {
  const [activa, setActiva] = useState<Seccion>("Inicio");
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [formAbierto, setFormAbierto] = useState(false);
  const [editando, setEditando] = useState<Cita | null>(null);
  const [eliminando, setEliminando] = useState<Cita | null>(null);
  const [mensaje, setMensaje] = useState("");

  // Modo local (localStorage)
  const [locales, setLocales] = useState<Cita[]>(cargarLocales);
  // Modo nube (Supabase)
  const [modoPrueba, setModoPrueba] = useState(!supabaseConfigurado);
  const [sesion, setSesion] = useState<Session | null>(null);
  const [cargandoSesion, setCargandoSesion] = useState(supabaseConfigurado);
  const [negocio, setNegocio] = useState<Negocio | null | undefined>(undefined); // undefined = cargando
  const [errorDatos, setErrorDatos] = useState("");
  const [nube, setNube] = useState<Cita[]>([]);
  const [cargandoCitas, setCargandoCitas] = useState(false);
  const [errorCitas, setErrorCitas] = useState("");
  const [catProf, setCatProf] = useState<Profesional[]>([]);
  const [catServ, setCatServ] = useState<Servicio[]>([]);
  const [catCli, setCatCli] = useState<Cliente[]>([]);
  const [cargandoClientes, setCargandoClientes] = useState(false);
  const [errorClientes, setErrorClientes] = useState("");
  const [formCliente, setFormCliente] = useState(false);
  const [clienteEditando, setClienteEditando] = useState<Cliente | null>(null);
  const [clienteViendo, setClienteViendo] = useState<Cliente | null>(null);
  const [clienteEliminando, setClienteEliminando] = useState<Cliente | null>(null);

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

  // Citas reales del negocio del usuario (la base de datos, con RLS, solo devuelve las suyas)
  const recargarCitas = useCallback(async () => {
    if (!negocioId) {
      setNube([]);
      return;
    }
    setCargandoCitas(true);
    const { data, error } = await supabase
      .from("citas")
      .select("*")
      .eq("negocio_id", negocioId)
      .order("fecha")
      .order("hora");
    setCargandoCitas(false);
    if (error) {
      const texto = "No se pudieron cargar las citas: " + error.message;
      setErrorCitas(texto);
      setMensaje(texto);
      return;
    }
    setErrorCitas("");
    setNube(((data ?? []) as unknown as FilaCita[]).map(filaACita));
  }, [negocioId]);

  useEffect(() => {
    void recargarCitas();
  }, [recargarCitas]);

  // Clientes reales del negocio (con teléfono y notas)
  const recargarClientes = useCallback(async () => {
    if (!negocioId) {
      setCatCli([]);
      return;
    }
    setCargandoClientes(true);
    const { data, error } = await supabase
      .from("clientes")
      .select("id, nombre, telefono, notas, creado_en")
      .eq("negocio_id", negocioId)
      .order("nombre");
    setCargandoClientes(false);
    if (error) {
      const texto = "No se pudieron cargar los clientes: " + error.message;
      setErrorClientes(texto);
      setMensaje(texto);
      return;
    }
    setErrorClientes("");
    setCatCli((data ?? []) as unknown as Cliente[]);
  }, [negocioId]);

  useEffect(() => {
    void recargarClientes();
  }, [recargarClientes]);

  // Catálogos reales: profesionales y servicios del negocio
  useEffect(() => {
    if (!negocioId) {
      setCatProf([]);
      setCatServ([]);
      return;
    }
    let cancelado = false;
    void (async () => {
      const [p, s] = await Promise.all([
        supabase.from("profesionales").select("id, nombre").eq("negocio_id", negocioId).order("nombre"),
        supabase.from("servicios").select("id, nombre, precio").eq("negocio_id", negocioId).order("nombre"),
      ]);
      if (cancelado) return;
      const err = p.error ?? s.error;
      if (err) {
        setMensaje("No se pudieron cargar profesionales o servicios: " + err.message);
        return;
      }
      setCatProf((p.data ?? []) as unknown as Profesional[]);
      setCatServ((s.data ?? []) as unknown as Servicio[]);
    })();
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

  const abrirNueva = () => {
    setEditando(null);
    setFormAbierto(true);
  };

  const cerrarForm = () => {
    setFormAbierto(false);
    setEditando(null);
  };

  const cerrarSesion = async () => {
    await supabase.auth.signOut();
    setNube([]);
    setNegocio(undefined);
  };

  // Crea o edita una cita. Devuelve null si todo salió bien, o el texto del error.
  const guardar = async (c: Omit<Cita, "id">, editarId?: string): Promise<string | null> => {
    if (modoNube && negocio) {
      try {
        // 1) Resolver (o crear) profesional, servicio y cliente reales de ESTE negocio
        let prof = buscar(catProf, c.profesional);
        if (!prof) {
          const nuevo = await crearFila<Profesional>("profesionales", { negocio_id: negocio.id, nombre: c.profesional }, "el profesional");
          setCatProf((p) => [...p, nuevo]);
          prof = nuevo;
        }
        let serv = buscar(catServ, c.servicio);
        if (!serv) {
          const nuevo = await crearFila<Servicio>("servicios", { negocio_id: negocio.id, nombre: c.servicio, precio: c.precio }, "el servicio");
          setCatServ((p) => [...p, nuevo]);
          serv = nuevo;
        }
        let cli = buscar(catCli, c.cliente);
        if (!cli) {
          const nuevo = await crearFila<Cliente>("clientes", { negocio_id: negocio.id, nombre: c.cliente }, "el cliente");
          setCatCli((p) => [...p, nuevo]);
          cli = nuevo;
        }

        // 2) Guardar la cita con sus tres relaciones
        const datos = {
          fecha: c.fecha,
          hora: c.hora,
          cliente_nombre: cli.nombre,
          servicio_nombre: serv.nombre,
          profesional_nombre: prof.nombre,
          precio: c.precio,
          estado: c.estado,
          cliente_id: cli.id,
          profesional_id: prof.id,
          servicio_id: serv.id,
        };
        if (editarId) {
          const { data, error } = await supabase
            .from("citas")
            .update(datos)
            .eq("id", editarId)
            .eq("negocio_id", negocio.id)
            .select()
            .single();
          if (error || !data) return error ? error.message : "Supabase no devolvió la cita actualizada.";
          const actualizada = filaACita(data as unknown as FilaCita);
          setNube((p) => p.map((x) => (x.id === editarId ? actualizada : x)));
          setMensaje("Cita actualizada.");
        } else {
          const { data, error } = await supabase
            .from("citas")
            .insert({ negocio_id: negocio.id, ...datos })
            .select()
            .single();
          if (error || !data) return error ? error.message : "Supabase no devolvió la cita guardada.";
          setNube((p) => [...p, filaACita(data as unknown as FilaCita)]);
          setMensaje("Cita guardada en la base de datos.");
        }
      } catch (e) {
        return e instanceof Error ? e.message : "Error desconocido.";
      }
    } else {
      setLocales((p) => [...p, { ...c, id: nuevoId() }]);
      setMensaje("Cita guardada solo en este navegador.");
    }
    cerrarForm();
    return null;
  };

  const eliminar = async (): Promise<string | null> => {
    if (!eliminando || !negocio) return "No hay una cita seleccionada.";
    const id = eliminando.id;
    const { data, error } = await supabase.from("citas").delete().eq("id", id).eq("negocio_id", negocio.id).select("id");
    if (error) return error.message;
    if (!data || data.length === 0) return "No se eliminó ninguna cita (revisa tus permisos).";
    setNube((p) => p.filter((x) => x.id !== id));
    setEliminando(null);
    setMensaje("Cita eliminada.");
    return null;
  };

  const cerrarFormCliente = () => {
    setFormCliente(false);
    setClienteEditando(null);
  };

  const textoErrorCliente = (error: { code?: string; message: string } | null): string => {
    if (!error) return "Supabase no devolvió el cliente.";
    if (error.code === "23505") return "Ya existe un cliente con ese teléfono en tu negocio.";
    if (error.code === "23514") return "El teléfono debe ser un celular colombiano de 10 dígitos que empiece por 3.";
    return error.message;
  };

  // Crea o edita un cliente. Devuelve null si todo salió bien, o el texto del error.
  const guardarCliente = async (d: DatosCliente, editarId?: string): Promise<string | null> => {
    if (!negocio) return "No hay un negocio activo.";
    try {
      if (editarId) {
        const previo = catCli.find((x) => x.id === editarId);
        const { data, error } = await supabase
          .from("clientes")
          .update({ nombre: d.nombre, telefono: d.telefono, notas: d.notas })
          .eq("id", editarId)
          .eq("negocio_id", negocio.id)
          .select()
          .single();
        if (error || !data) return textoErrorCliente(error);
        const actualizado = data as unknown as Cliente;
        setCatCli((p) => p.map((x) => (x.id === editarId ? actualizado : x)));

        // Mantener las citas coherentes: nombre actualizado y citas antiguas enlazadas a este cliente
        let aviso = "Cliente actualizado.";
        const e1 = await supabase
          .from("citas")
          .update({ cliente_nombre: actualizado.nombre })
          .eq("cliente_id", editarId)
          .eq("negocio_id", negocio.id);
        let e2: { message: string } | null = null;
        if (previo) {
          const r = await supabase
            .from("citas")
            .update({ cliente_id: editarId, cliente_nombre: actualizado.nombre })
            .is("cliente_id", null)
            .eq("cliente_nombre", previo.nombre)
            .eq("negocio_id", negocio.id);
          e2 = r.error;
        }
        if (e1.error || e2) aviso = "Cliente actualizado, pero no se pudieron actualizar sus citas.";
        setMensaje(aviso);
        void recargarCitas();
      } else {
        const { data, error } = await supabase
          .from("clientes")
          .insert({ negocio_id: negocio.id, nombre: d.nombre, telefono: d.telefono, notas: d.notas })
          .select()
          .single();
        if (error || !data) return textoErrorCliente(error);
        setCatCli((p) => [...p, data as unknown as Cliente]);
        setMensaje("Cliente guardado en la base de datos.");
      }
    } catch (e) {
      return e instanceof Error ? e.message : "Error desconocido.";
    }
    cerrarFormCliente();
    return null;
  };

  const eliminarCliente = async (): Promise<string | null> => {
    if (!clienteEliminando || !negocio) return "No hay un cliente seleccionado.";
    const id = clienteEliminando.id;
    const { data, error } = await supabase.from("clientes").delete().eq("id", id).eq("negocio_id", negocio.id).select("id");
    if (error) return error.message;
    if (!data || data.length === 0) return "No se eliminó ningún cliente (revisa tus permisos).";
    setCatCli((p) => p.filter((x) => x.id !== id));
    setClienteEliminando(null);
    setMensaje("Cliente eliminado.");
    void recargarCitas();
    return null;
  };

  const enClientes = activa === "Clientes" && modoNube;
  const accionPrincipal = () => {
    if (enClientes) {
      setClienteEditando(null);
      setFormCliente(true);
    } else {
      abrirNueva();
    }
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

  let contenido: ReactNode;
  if (activa === "Inicio") {
    contenido = <Inicio citasHoy={citasHoy} otrasFechas={otrasFechas} modoNube={modoNube} />;
  } else if (activa === "Citas") {
    contenido = modoNube ? (
      <SeccionCitas
        citas={nube}
        cargando={cargandoCitas}
        error={errorCitas}
        hoy={hoy}
        onEditar={(c) => {
          setEditando(c);
          setFormAbierto(true);
        }}
        onEliminar={(c) => setEliminando(c)}
        onActualizar={() => void recargarCitas()}
      />
    ) : (
      <section className="proximamente">
        <h2>Citas</h2>
        <p>
          {supabaseConfigurado
            ? "Inicia sesión para ver y gestionar las citas reales de tu negocio."
            : "Esta versión no encontró las variables de Supabase, así que no puede mostrar citas reales."}
        </p>
        {supabaseConfigurado && (
          <button className="boton-oro" style={{ marginTop: 16 }} onClick={() => setModoPrueba(false)}>
            Iniciar sesión
          </button>
        )}
      </section>
    );
  } else if (activa === "Clientes") {
    contenido = modoNube ? (
      <SeccionClientes
        clientes={catCli}
        citas={nube}
        cargando={cargandoClientes}
        error={errorClientes}
        onVer={(c) => setClienteViendo(c)}
        onEditar={(c) => {
          setClienteEditando(c);
          setFormCliente(true);
        }}
        onEliminar={(c) => setClienteEliminando(c)}
        onActualizar={() => void recargarClientes()}
      />
    ) : (
      <section className="proximamente">
        <h2>Clientes</h2>
        <p>
          {supabaseConfigurado
            ? "Inicia sesión para ver y gestionar los clientes reales de tu negocio."
            : "Esta versión no encontró las variables de Supabase, así que no puede mostrar clientes reales."}
        </p>
        {supabaseConfigurado && (
          <button className="boton-oro" style={{ marginTop: 16 }} onClick={() => setModoPrueba(false)}>
            Iniciar sesión
          </button>
        )}
      </section>
    );
  } else {
    contenido = (
      <section className="proximamente">
        <h2>{activa}</h2>
        <p>Esta sección se construirá en un paso posterior.</p>
      </section>
    );
  }

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
          <button className="boton-oro" onClick={accionPrincipal}>
            {enClientes ? "Nuevo cliente" : "Nueva cita"}
          </button>
        </header>

        {contenido}
      </main>

      {formAbierto && (
        <FormularioCita
          hoy={hoy}
          cita={editando}
          existentes={modoNube ? nube : todas}
          profesionales={modoNube ? catProf.map((p) => p.nombre) : profesionales}
          servicios={modoNube ? catServ.map((s) => ({ nombre: s.nombre, precio: Number(s.precio) })) : servicios}
          clientes={modoNube ? catCli.map((c) => c.nombre) : []}
          permitirNuevos={modoNube}
          nota={modoNube ? AVISO_NUBE : AVISO_LOCAL}
          onGuardar={(c) => guardar(c, editando ? editando.id : undefined)}
          onCerrar={cerrarForm}
        />
      )}
      {eliminando && <ConfirmarEliminar cita={eliminando} onConfirmar={eliminar} onCancelar={() => setEliminando(null)} />}
      {formCliente && (
        <FormularioCliente
          cliente={clienteEditando}
          existentes={catCli}
          onGuardar={(d) => guardarCliente(d, clienteEditando ? clienteEditando.id : undefined)}
          onCerrar={cerrarFormCliente}
        />
      )}
      {clienteViendo && (
        <DetalleCliente
          cliente={clienteViendo}
          citas={nube}
          onCerrar={() => setClienteViendo(null)}
          onEditar={(c) => {
            setClienteViendo(null);
            setClienteEditando(c);
            setFormCliente(true);
          }}
        />
      )}
      {clienteEliminando && (
        <ConfirmarEliminarCliente
          cliente={clienteEliminando}
          totalCitas={citasDeCliente(clienteEliminando, nube).length}
          onConfirmar={eliminarCliente}
          onCancelar={() => setClienteEliminando(null)}
        />
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
