import { useAuth } from './auth.jsx';
import Login from './paginas/Login.jsx';

const NOMBRE_ROL = { administrador: 'Administrador', consultora: 'Consultora' };

export default function App() {
    const { session, perfil, cargando, salir } = useAuth();

    if (cargando) return <main className="centrado"><p className="texto-suave">Cargando…</p></main>;
    if (!session || !perfil) return <Login />;

    // Pantalla provisional: los menús según rol llegan con T22.
    return (
        <main className="centrado">
            <div className="tarjeta tarjeta-login">
                <img src="/favicon.svg" alt="" width="56" height="56" />
                <h1>Hola, {perfil.nombre}</h1>
                <p className="texto-suave">Ingresaste como {NOMBRE_ROL[perfil.rol]} ({session.user.email}).</p>
                <button className="boton boton-ancho" onClick={salir}>Cerrar sesión</button>
            </div>
        </main>
    );
}
