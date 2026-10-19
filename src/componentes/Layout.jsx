import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

// Menú según rol (RF07): la consultora trabaja con interesados; el administrador
// además gestiona usuarios. Embudo, agenda y dashboard se suman en los sprints 03 y 04.
const MENU = [
    { a: '/interesados', texto: 'Interesados', roles: ['administrador', 'consultora'], exacto: true },
    { a: '/interesados/nuevo', texto: 'Nuevo interesado', roles: ['administrador', 'consultora'] },
    { a: '/usuarios', texto: 'Usuarios', roles: ['administrador'] },
    { a: '/cuenta', texto: 'Mi cuenta', roles: ['administrador', 'consultora'] },
];

export const NOMBRE_ROL = { administrador: 'Administrador', consultora: 'Consultora' };

export default function Layout() {
    const { perfil, salir } = useAuth();
    const opciones = MENU.filter((m) => m.roles.includes(perfil.rol));

    return (
        <div className="app">
            <header className="cabecera">
                <div className="cabecera-fila">
                    <Link className="marca" to="/interesados">
                        <img src="/favicon.svg" alt="" width="32" height="32" />
                        <span>CRM EKAM</span>
                    </Link>
                    <div className="usuario">
                        <span className="usuario-nombre">{perfil.nombre}</span>
                        <span className={`etiqueta etiqueta-${perfil.rol}`}>{NOMBRE_ROL[perfil.rol]}</span>
                        <button className="boton boton-chico" onClick={salir}>Salir</button>
                    </div>
                </div>
                <nav className="menu" aria-label="Menú principal">
                    {opciones.map((m) => (
                        <NavLink key={m.a} to={m.a} end={m.exacto}>{m.texto}</NavLink>
                    ))}
                </nav>
            </header>
            <main className="contenido">
                <Outlet />
            </main>
        </div>
    );
}
