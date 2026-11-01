import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import Layout from './componentes/Layout.jsx';
import EnConstruccion from './componentes/EnConstruccion.jsx';
import Login from './paginas/Login.jsx';
import Cuenta from './paginas/Cuenta.jsx';
import Interesados from './paginas/Interesados.jsx';
import Mas from './paginas/Mas.jsx';
import NuevoInteresado from './paginas/NuevoInteresado.jsx';
import Usuarios from './paginas/Usuarios.jsx';

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
                <Route path="interesados" element={<Interesados />} />
                <Route path="interesados/nuevo" element={<NuevoInteresado />} />
                <Route path="embudo" element={<EnConstruccion titulo="Embudo de ventas" sprint="03" />} />
                <Route path="agenda" element={<EnConstruccion titulo="Agenda de demostraciones" sprint="03" />} />
                <Route path="dashboard" element={<EnConstruccion titulo="Dashboard comercial" sprint="04" />} />
                <Route path="usuarios" element={<SoloAdmin><Usuarios /></SoloAdmin>} />
                <Route path="cuenta" element={<Cuenta />} />
                <Route path="mas" element={<Mas />} />
                <Route path="*" element={<Navigate to="/interesados" replace />} />
            </Route>
        </Routes>
    );
}
