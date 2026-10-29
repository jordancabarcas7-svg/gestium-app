import { useState } from "react";

// Datos ficticios: nada de esto se guarda de forma permanente.
type Seccion = "Inicio" | "Citas" | "Clientes" | "Profesionales" | "Servicios" | "Caja" | "Reportes";
type Estado = "Confirmada" | "Pendiente" | "En curso";

interface Cita {
  hora: string;
  cliente: string;
  servicio: string;
  profesional: string;
  precio: number;
  estado: Estado;
}

const secciones: Seccion[] = ["Inicio", "Citas", "Clientes", "Profesionales", "Servicios", "Caja", "Reportes"];

const citas: Cita[] = [
  { hora: "9:00", cliente: "Andrés Ramírez", servicio: "Corte clásico", profesional: "Camilo", precio: 35000, estado: "En curso" },
  { hora: "10:00", cliente: "Laura Gómez", servicio: "Manicura semipermanente", profesional: "Valentina", precio: 60000, estado: "Confirmada" },
  { hora: "11:30", cliente: "Julián Torres", servicio: "Corte y barba", profesional: "Camilo", precio: 55000, estado: "Confirmada" },
  { hora: "14:00", cliente: "Daniela Ortiz", servicio: "Uñas acrílicas", profesional: "Mariana", precio: 90000, estado: "Pendiente" },
  { hora: "15:30", cliente: "Sebastián Rojas", servicio: "Perfilado de barba", profesional: "Esteban", precio: 25000, estado: "Confirmada" },
  { hora: "17:00", cliente: "Carolina Pardo", servicio: "Manicura tradicional", profesional: "Valentina", precio: 30000, estado: "Pendiente" },
];

const cop = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

const ingresos = 1_280_000;
const gastos = 410_000;

export default function App() {
  const [activa, setActiva] = useState<Seccion>("Inicio");
  const [menuAbierto, setMenuAbierto] = useState(false);

  const elegir = (s: Seccion) => {
    setActiva(s);
    setMenuAbierto(false);
  };

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
            <p>miércoles, 28 de octubre de 2026</p>
          </div>
          <button className="boton-oro">Nueva cita</button>
        </header>

        {activa === "Inicio" ? <Inicio /> : (
          <section className="proximamente">
            <h2>{activa}</h2>
            <p>Esta sección se construirá en un paso posterior.</p>
          </section>
        )}
      </main>
    </div>
  );
}

function Inicio() {
  const total = citas.reduce((a, c) => a + c.precio, 0);
  return (
    <>
      <section className="tarjetas">
        <article className="tarjeta destacada">
          <span>Citas de hoy</span>
          <strong>{citas.length}</strong>
          <small>{citas.filter((c) => c.estado === "Pendiente").length} por confirmar</small>
        </article>
        <article className="tarjeta">
          <span>Ingresos del día</span>
          <strong>{cop(ingresos)}</strong>
          <small>Proyectado por agenda: {cop(total)}</small>
        </article>
        <article className="tarjeta">
          <span>Gastos del día</span>
          <strong>{cop(gastos)}</strong>
          <small>Balance: {cop(ingresos - gastos)}</small>
        </article>
      </section>

      <section className="agenda">
        <h2>Próximas citas</h2>
        <ol>
          {citas.map((c) => (
            <li key={c.hora + c.cliente} className={"cita " + c.estado.replace(" ", "-").toLowerCase()}>
              <time>{c.hora}</time>
              <div className="detalle">
                <strong>{c.cliente}</strong>
                <span>{c.servicio} · con {c.profesional}</span>
              </div>
              <div className="lado">
                <span>{cop(c.precio)}</span>
                <em>{c.estado}</em>
              </div>
            </li>
          ))}
        </ol>
      </section>
      <p className="aviso">Datos ficticios de demostración. Aún no se guarda nada.</p>
    </>
  );
}
