import { useState } from 'react';
import { supabase } from '../supabase.js';
import { useAuth } from '../auth.jsx';
import Cabecera from '../componentes/Cabecera.jsx';
import { NOMBRE_ROL } from '../componentes/Layout.jsx';

export default function Cuenta() {
    const { session, perfil } = useAuth();
    const [clave, setClave] = useState('');
    const [repetir, setRepetir] = useState('');
    const [estado, setEstado] = useState({ tipo: '', texto: '' });
    const [guardando, setGuardando] = useState(false);

    async function cambiarClave(e) {
        e.preventDefault();
        if (clave.length < 8) return setEstado({ tipo: 'error', texto: 'La contraseña debe tener al menos 8 caracteres.' });
        if (clave !== repetir) return setEstado({ tipo: 'error', texto: 'Las contraseñas no coinciden.' });
        setGuardando(true);
        const { error } = await supabase.auth.updateUser({ password: clave });
        setGuardando(false);
        if (error) return setEstado({ tipo: 'error', texto: 'No se pudo cambiar la contraseña. Prueba con una distinta a la actual.' });
        setClave('');
        setRepetir('');
        setEstado({ tipo: 'ok', texto: 'Contraseña actualizada. Úsala la próxima vez que ingreses.' });
    }

    return (
        <section className="pagina">
            <Cabecera titulo="Mi cuenta" subtitulo="Tus datos y tu contraseña" />
            <div className="cuerpo cuerpo-angosto">
                <div className="tarjeta">
                    <dl className="datos">
                        <div><dt>Nombre</dt><dd>{perfil.nombre}</dd></div>
                        <div><dt>Correo</dt><dd>{session.user.email}</dd></div>
                        <div><dt>Rol</dt><dd>{NOMBRE_ROL[perfil.rol]}</dd></div>
                    </dl>
                </div>

                <form className="tarjeta" onSubmit={cambiarClave}>
                    <h2>Cambiar contraseña</h2>
                    {estado.texto && <p className={`alerta alerta-${estado.tipo}`} role="status">{estado.texto}</p>}
                    <label className="campo">
                        <span>Nueva contraseña (mínimo 8 caracteres)</span>
                        <input type="password" autoComplete="new-password" minLength={8} required
                            value={clave} onChange={(e) => setClave(e.target.value)} />
                    </label>
                    <label className="campo">
                        <span>Repite la contraseña</span>
                        <input type="password" autoComplete="new-password" minLength={8} required
                            value={repetir} onChange={(e) => setRepetir(e.target.value)} />
                    </label>
                    <button className="boton boton-principal" disabled={guardando}>
                        {guardando ? 'Guardando…' : 'Guardar contraseña'}
                    </button>
                </form>
            </div>
        </section>
    );
}
