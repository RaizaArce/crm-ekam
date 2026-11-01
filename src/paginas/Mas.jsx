import { Link } from 'react-router-dom';
import { ChevronRight, LogOut, Shield, UserRound } from 'lucide-react';
import { useAuth } from '../auth.jsx';
import Cabecera from '../componentes/Cabecera.jsx';
import Iniciales from '../componentes/Iniciales.jsx';
import { NOMBRE_ROL } from '../componentes/Layout.jsx';

// Pestaña "Más" del celular: lo que en escritorio está en la barra lateral.
export default function Mas() {
    const { session, perfil, esAdmin, salir } = useAuth();

    return (
        <section className="pagina">
            <Cabecera titulo="Más" subtitulo="Tu cuenta y la administración" />
            <div className="cuerpo cuerpo-angosto">
                <div className="tarjeta persona">
                    <Iniciales nombre={perfil.nombre} />
                    <div>
                        <strong>{perfil.nombre}</strong>
                        <p className="texto-suave texto-pequeno">{session.user.email} · {NOMBRE_ROL[perfil.rol]}</p>
                    </div>
                </div>

                <div className="tarjeta lista-opciones">
                    {esAdmin && (
                        <Link to="/usuarios">
                            <Shield size={20} aria-hidden="true" />
                            <span>Usuarios</span>
                            <span className="etiqueta-admin">Admin</span>
                            <ChevronRight size={18} aria-hidden="true" />
                        </Link>
                    )}
                    <Link to="/cuenta">
                        <UserRound size={20} aria-hidden="true" />
                        <span>Mi cuenta</span>
                        <ChevronRight size={18} aria-hidden="true" />
                    </Link>
                </div>

                <button type="button" className="boton boton-ancho" onClick={salir}>
                    <LogOut size={18} aria-hidden="true" />Cerrar sesión
                </button>
            </div>
        </section>
    );
}
