import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import Layout from './componentes/Layout.jsx';
import EnConstruccion from './componentes/EnConstruccion.jsx';
import Login from './paginas/Login.jsx';
import Cuenta from './paginas/Cuenta.jsx';

// Si alguien escribe /usuarios sin ser administrador, vuelve a la lista de interesados.
function SoloAdmin({ children }) {
    const { esAdmin } = useAuth();
    return esAdmin ? children : <Navigate to="/interesados" replace />;
}

export default function App() {
    const { session, perfil, cargando } = useAuth();

    if (cargando) return <main className="centrado"><p className="texto-suave">Cargando…</p></main>;
    if (!session || !perfil) return <Login />;

    return (
        <Routes>
            <Route element={<Layout />}>
                <Route index element={<Navigate to="/interesados" replace />} />
                <Route path="interesados" element={<EnConstruccion titulo="Interesados" tarea="T30–T31, punto 7" />} />
                <Route path="interesados/nuevo" element={<EnConstruccion titulo="Nuevo interesado" tarea="T25–T26, punto 5" />} />
                <Route path="usuarios" element={<SoloAdmin><EnConstruccion titulo="Usuarios" tarea="T23–T24, punto 4" /></SoloAdmin>} />
                <Route path="cuenta" element={<Cuenta />} />
                <Route path="*" element={<Navigate to="/interesados" replace />} />
            </Route>
        </Routes>
    );
}
