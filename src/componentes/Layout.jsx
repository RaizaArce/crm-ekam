import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Calendar, ChartColumn, LogOut, Menu, Shield, SquareKanban, Users } from 'lucide-react';
import { useAuth } from '../auth.jsx';
import Iniciales from './Iniciales.jsx';

export const NOMBRE_ROL = { administrador: 'Administrador', consultora: 'Consultora' };

const SECCIONES = [
    { a: '/interesados', texto: 'Interesados', Icono: Users },
    { a: '/embudo', texto: 'Embudo', Icono: SquareKanban },
    { a: '/agenda', texto: 'Agenda', Icono: Calendar },
    { a: '/dashboard', texto: 'Dashboard', Icono: ChartColumn },
];

// Celular: barra inferior de 5 pestañas. Escritorio: barra lateral (prototipos 02 y D1).
export default function Layout() {
    const { perfil, esAdmin, salir } = useAuth();
    const { pathname } = useLocation();
    // En celular, el formulario de registro ocupa toda la pantalla (prototipo 04).
    const sinPestanas = pathname === '/interesados/nuevo';
    const enMas = ['/mas', '/usuarios', '/cuenta'].some((ruta) => pathname.startsWith(ruta));

    return (
        <div className={`app${sinPestanas ? ' app-sin-pestanas' : ''}`}>
            <aside className="barra-lateral">
                <Link className="marca" to="/interesados">
                    <img src="/favicon.svg" alt="" width="36" height="36" />
                    <span>
                        <strong>EKAM PERÚ</strong>
                        <small>CRM de interesados</small>
                    </span>
                </Link>

                <nav className="menu-lateral" aria-label="Menú principal">
                    {SECCIONES.map(({ a, texto, Icono }) => (
                        <NavLink key={a} to={a}><Icono size={18} aria-hidden="true" />{texto}</NavLink>
                    ))}
                    {esAdmin && (
                        <NavLink to="/usuarios">
                            <Shield size={18} aria-hidden="true" />Usuarios
                            <span className="etiqueta-admin">Admin</span>
                        </NavLink>
                    )}
                </nav>

                <div className="tarjeta-usuario">
                    <Link to="/cuenta" title="Mi cuenta">
                        <Iniciales nombre={perfil.nombre} oscuro />
                        <span>
                            <strong>{perfil.nombre}</strong>
                            <small>{NOMBRE_ROL[perfil.rol]}</small>
                        </span>
                    </Link>
                    <button type="button" onClick={salir} title="Cerrar sesión" aria-label="Cerrar sesión">
                        <LogOut size={18} aria-hidden="true" />
                    </button>
                </div>
            </aside>

            <main className="principal">
                <Outlet />
            </main>

            <nav className="pestanas" aria-label="Menú principal">
                {SECCIONES.map(({ a, texto, Icono }) => (
                    <NavLink key={a} to={a}><Icono size={22} aria-hidden="true" />{texto}</NavLink>
                ))}
                <NavLink to="/mas" className={enMas ? 'active' : ''}><Menu size={22} aria-hidden="true" />Más</NavLink>
            </nav>
        </div>
    );
}
