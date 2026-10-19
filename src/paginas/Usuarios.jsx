import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../supabase.js';
import { useAuth } from '../auth.jsx';
import { NOMBRE_ROL } from '../componentes/Layout.jsx';

const VACIO = { nombre: '', correo: '', rol: 'consultora', clave: '' };

function fechaHora(valor) {
    return new Date(valor).toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' });
}

// Crear, desactivar y restablecer contraseñas pasa por la función usuarios-admin,
// que tiene la clave de servicio. Nombre y rol se cambian directo: RLS solo deja al administrador.
async function usuariosAdmin(cuerpo) {
    const { data, error } = await supabase.functions.invoke('usuarios-admin', { body: cuerpo });
    if (error) {
        let mensaje = 'No se pudo completar la acción.';
        try { mensaje = (await error.context.json()).error ?? mensaje; } catch { /* respuesta sin cuerpo */ }
        throw new Error(mensaje);
    }
    return data;
}

// RF08: el administrador crea, edita y desactiva usuarios.
export default function Usuarios() {
    const { perfil } = useAuth();
    const [usuarios, setUsuarios] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
    const [nuevo, setNuevo] = useState(VACIO);
    const [creando, setCreando] = useState(false);
    const [editando, setEditando] = useState(null); // { id, nombre, rol }
    const [ocupado, setOcupado] = useState('');

    const cargar = useCallback(async () => {
        const { data, error } = await supabase.rpc('listar_usuarios');
        if (error) setMensaje({ tipo: 'error', texto: 'No se pudo cargar la lista de usuarios.' });
        else setUsuarios(data);
        setCargando(false);
    }, []);

    useEffect(() => { cargar(); }, [cargar]);

    async function crear(e) {
        e.preventDefault();
        setCreando(true);
        setMensaje({ tipo: '', texto: '' });
        try {
            await usuariosAdmin({ accion: 'crear', ...nuevo });
            setMensaje({ tipo: 'ok', texto: `Usuario creado. Entrégale a ${nuevo.nombre} su correo y la contraseña temporal; podrá cambiarla en "Mi cuenta".` });
            setNuevo(VACIO);
            await cargar();
        } catch (err) {
            setMensaje({ tipo: 'error', texto: err.message });
        }
        setCreando(false);
    }

    async function guardarEdicion(e) {
        e.preventDefault();
        setOcupado(editando.id);
        const { error } = await supabase.from('perfiles')
            .update({ nombre: editando.nombre.trim(), rol: editando.rol })
            .eq('id', editando.id);
        setOcupado('');
        if (error) return setMensaje({ tipo: 'error', texto: 'No se pudieron guardar los cambios.' });
        setEditando(null);
        setMensaje({ tipo: 'ok', texto: 'Cambios guardados.' });
        cargar();
    }

    async function cambiarEstado(u) {
        const accion = u.activo ? 'desactivar' : 'activar';
        if (!window.confirm(`¿Seguro que quieres ${accion} a ${u.nombre}?${u.activo ? ' Ya no podrá iniciar sesión.' : ''}`)) return;
        setOcupado(u.id);
        try {
            await usuariosAdmin({ accion: 'estado', id: u.id, activo: !u.activo });
            setMensaje({ tipo: 'ok', texto: `${u.nombre} quedó ${u.activo ? 'desactivado' : 'activo'}.` });
            await cargar();
        } catch (err) {
            setMensaje({ tipo: 'error', texto: err.message });
        }
        setOcupado('');
    }

    async function restablecerClave(u) {
        const clave = window.prompt(`Nueva contraseña temporal para ${u.nombre} (mínimo 8 caracteres):`);
        if (clave === null) return;
        setOcupado(u.id);
        try {
            await usuariosAdmin({ accion: 'clave', id: u.id, clave });
            setMensaje({ tipo: 'ok', texto: `Contraseña de ${u.nombre} restablecida. Entrégasela en persona.` });
        } catch (err) {
            setMensaje({ tipo: 'error', texto: err.message });
        }
        setOcupado('');
    }

    return (
        <section className="pagina">
            <h1>Usuarios</h1>
            {mensaje.texto && <p className={`alerta alerta-${mensaje.tipo}`} role="status">{mensaje.texto}</p>}

            <form className="tarjeta" onSubmit={crear}>
                <h2>Nuevo usuario</h2>
                <div className="rejilla">
                    <label className="campo">
                        <span>Nombre</span>
                        <input required maxLength={120} value={nuevo.nombre}
                            onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} />
                    </label>
                    <label className="campo">
                        <span>Correo</span>
                        <input type="email" required autoComplete="off" value={nuevo.correo}
                            onChange={(e) => setNuevo({ ...nuevo, correo: e.target.value })} />
                    </label>
                    <label className="campo">
                        <span>Rol</span>
                        <select value={nuevo.rol} onChange={(e) => setNuevo({ ...nuevo, rol: e.target.value })}>
                            {Object.entries(NOMBRE_ROL).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
                        </select>
                    </label>
                    <label className="campo">
                        <span>Contraseña temporal (mínimo 8)</span>
                        <input type="text" required minLength={8} autoComplete="off" value={nuevo.clave}
                            onChange={(e) => setNuevo({ ...nuevo, clave: e.target.value })} />
                    </label>
                </div>
                <button className="boton boton-principal" disabled={creando}>
                    {creando ? 'Creando…' : 'Crear usuario'}
                </button>
            </form>

            <div className="tarjeta">
                <h2>Usuarios del sistema</h2>
                {cargando ? <p className="texto-suave">Cargando…</p> : (
                    <ul className="lista">
                        {usuarios.map((u) => (
                            <li key={u.id} className={u.activo ? '' : 'inactivo'}>
                                {editando?.id === u.id ? (
                                    <form className="fila-edicion" onSubmit={guardarEdicion}>
                                        <label className="campo">
                                            <span>Nombre</span>
                                            <input required maxLength={120} value={editando.nombre}
                                                onChange={(e) => setEditando({ ...editando, nombre: e.target.value })} />
                                        </label>
                                        <label className="campo">
                                            <span>Rol{u.id === perfil.id ? ' (no puedes cambiar el tuyo)' : ''}</span>
                                            <select value={editando.rol} disabled={u.id === perfil.id}
                                                onChange={(e) => setEditando({ ...editando, rol: e.target.value })}>
                                                {Object.entries(NOMBRE_ROL).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
                                            </select>
                                        </label>
                                        <div className="acciones">
                                            <button className="boton boton-principal boton-chico" disabled={ocupado === u.id}>Guardar</button>
                                            <button type="button" className="boton boton-chico" onClick={() => setEditando(null)}>Cancelar</button>
                                        </div>
                                    </form>
                                ) : (
                                    <>
                                        <div className="lista-principal">
                                            <strong>{u.nombre}</strong>
                                            <span className="insignia">{NOMBRE_ROL[u.rol]}</span>
                                            {!u.activo && <span className="insignia insignia-gris">Desactivado</span>}
                                            {u.id === perfil.id && <span className="insignia">Tú</span>}
                                        </div>
                                        <div className="texto-suave texto-pequeno">
                                            {u.correo} · Último ingreso: {u.ultimo_ingreso ? fechaHora(u.ultimo_ingreso) : 'nunca'}
                                        </div>
                                        <div className="acciones">
                                            <button className="boton boton-chico" disabled={ocupado === u.id}
                                                onClick={() => setEditando({ id: u.id, nombre: u.nombre, rol: u.rol })}>Editar</button>
                                            <button className="boton boton-chico" disabled={ocupado === u.id}
                                                onClick={() => restablecerClave(u)}>Restablecer contraseña</button>
                                            {u.id !== perfil.id && (
                                                <button className={`boton boton-chico ${u.activo ? 'boton-peligro' : ''}`}
                                                    disabled={ocupado === u.id} onClick={() => cambiarEstado(u)}>
                                                    {u.activo ? 'Desactivar' : 'Activar'}
                                                </button>
                                            )}
                                        </div>
                                    </>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </section>
    );
}
