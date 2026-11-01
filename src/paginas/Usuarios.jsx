import { useCallback, useEffect, useMemo, useState } from 'react';
import { Info, Search, Shield, UserPlus } from 'lucide-react';
import { supabase } from '../supabase.js';
import { useAuth } from '../auth.jsx';
import Cabecera from '../componentes/Cabecera.jsx';
import Hoja from '../componentes/Hoja.jsx';
import Iniciales from '../componentes/Iniciales.jsx';
import { NOMBRE_ROL } from '../componentes/Layout.jsx';

const VACIO = { nombre: '', correo: '', rol: 'consultora', clave: '' };

function fechaHora(valor) {
    return new Date(valor).toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' });
}

function fechaCorta(valor) {
    const d = new Date(valor);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
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

function SelectorRol({ valor, cambiar, bloqueado }) {
    return (
        <select value={valor} disabled={bloqueado} onChange={(e) => cambiar(e.target.value)}>
            {Object.entries(NOMBRE_ROL).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
        </select>
    );
}

// Prototipo 08 (RF08): el administrador crea, edita y desactiva usuarios.
export default function Usuarios() {
    const { perfil } = useAuth();
    const [usuarios, setUsuarios] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
    const [buscando, setBuscando] = useState(false);
    const [busqueda, setBusqueda] = useState('');
    const [nuevo, setNuevo] = useState(null);
    const [editando, setEditando] = useState(null); // { ...usuario, claveNueva }
    const [errorHoja, setErrorHoja] = useState('');
    const [ocupado, setOcupado] = useState('');

    const cargar = useCallback(async () => {
        const { data, error } = await supabase.rpc('listar_usuarios');
        if (error) setMensaje({ tipo: 'error', texto: 'No se pudo cargar la lista de usuarios.' });
        else setUsuarios(data);
        setCargando(false);
    }, []);

    useEffect(() => { cargar(); }, [cargar]);

    const visibles = useMemo(() => {
        const texto = busqueda.trim().toLowerCase();
        if (!texto) return usuarios;
        return usuarios.filter((u) => `${u.nombre} ${u.correo}`.toLowerCase().includes(texto));
    }, [usuarios, busqueda]);

    const activos = usuarios.filter((u) => u.activo).length;

    function abrirNuevo() {
        setErrorHoja('');
        setNuevo(VACIO);
    }

    function abrirEdicion(u) {
        setErrorHoja('');
        setEditando({ ...u, claveNueva: '' });
    }

    async function crear(e) {
        e.preventDefault();
        setOcupado('crear');
        setErrorHoja('');
        try {
            await usuariosAdmin({ accion: 'crear', ...nuevo });
            setMensaje({ tipo: 'ok', texto: `Usuario creado. Entrégale a ${nuevo.nombre} su correo y la contraseña temporal; podrá cambiarla en "Mi cuenta".` });
            setNuevo(null);
            await cargar();
        } catch (err) {
            setErrorHoja(err.message);
        }
        setOcupado('');
    }

    async function guardarEdicion(e) {
        e.preventDefault();
        setOcupado('editar');
        setErrorHoja('');
        const { error } = await supabase.from('perfiles')
            .update({ nombre: editando.nombre.trim(), rol: editando.rol })
            .eq('id', editando.id);
        setOcupado('');
        if (error) return setErrorHoja('No se pudieron guardar los cambios.');
        setEditando(null);
        setMensaje({ tipo: 'ok', texto: 'Cambios guardados.' });
        cargar();
    }

    async function restablecerClave() {
        setOcupado('clave');
        setErrorHoja('');
        try {
            await usuariosAdmin({ accion: 'clave', id: editando.id, clave: editando.claveNueva });
            setMensaje({ tipo: 'ok', texto: `Contraseña de ${editando.nombre} restablecida. Entrégasela en persona.` });
            setEditando(null);
        } catch (err) {
            setErrorHoja(err.message);
        }
        setOcupado('');
    }

    async function cambiarEstado(u) {
        if (u.activo && !window.confirm(`¿Quitarle el acceso a ${u.nombre}? Ya no podrá iniciar sesión.`)) return;
        setOcupado(u.id);
        try {
            await usuariosAdmin({ accion: 'estado', id: u.id, activo: !u.activo });
            setMensaje({ tipo: 'ok', texto: u.activo ? `${u.nombre} ya no tiene acceso.` : `${u.nombre} volvió a tener acceso.` });
            await cargar();
        } catch (err) {
            setMensaje({ tipo: 'error', texto: err.message });
        }
        setOcupado('');
    }

    return (
        <section className="pagina">
            <Cabecera titulo="Usuarios" subtitulo="Cuentas con acceso al CRM">
                <span className="insignia insignia-admin solo-celular"><Shield size={13} aria-hidden="true" />Admin</span>
                <button type="button" className="boton boton-principal solo-escritorio" onClick={abrirNuevo}>
                    <UserPlus size={18} aria-hidden="true" />Nuevo usuario
                </button>
            </Cabecera>

            <div className="cuerpo cuerpo-medio">
                <p className="nota-informativa">
                    <Info size={18} aria-hidden="true" />
                    Solo el administrador ve esta sección. Al crear una cuenta, entrega a la persona su correo y una contraseña temporal.
                </p>

                {mensaje.texto && <p className={`alerta alerta-${mensaje.tipo}`} role="status">{mensaje.texto}</p>}

                <div className="barra-resumen">
                    {buscando ? (
                        <input type="search" className="buscador" autoFocus aria-label="Buscar por nombre o correo"
                            placeholder="Buscar por nombre o correo" value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)} />
                    ) : (
                        <span className="texto-suave texto-pequeno">
                            {usuarios.length} {usuarios.length === 1 ? 'usuario' : 'usuarios'} · {activos} {activos === 1 ? 'activo' : 'activos'}
                        </span>
                    )}
                    <button type="button" className="boton-icono" aria-label={buscando ? 'Cerrar búsqueda' : 'Buscar'}
                        aria-pressed={buscando} onClick={() => { setBuscando(!buscando); setBusqueda(''); }}>
                        <Search size={20} aria-hidden="true" />
                    </button>
                </div>

                {cargando ? <p className="texto-suave">Cargando…</p> : (
                    <ul className="tarjeta lista-usuarios">
                        {visibles.map((u) => (
                            <li key={u.id} className={u.activo ? '' : 'inactivo'}>
                                <button type="button" className="usuario-fila" onClick={() => abrirEdicion(u)}
                                    aria-label={`Editar a ${u.nombre}`}>
                                    <Iniciales nombre={u.nombre} />
                                    <span className="usuario-datos">
                                        <strong>{u.nombre}{u.id === perfil.id ? ' (tú)' : ''}</strong>
                                        <span className="usuario-correo">{u.correo}</span>
                                        <span className="usuario-marcas">
                                            <span className={`insignia insignia-${u.rol === 'administrador' ? 'admin' : 'consultora'}`}>
                                                {u.rol === 'administrador' && <Shield size={13} aria-hidden="true" />}
                                                {NOMBRE_ROL[u.rol]}
                                            </span>
                                            {!u.activo && (
                                                <span className="texto-tenue">
                                                    {u.desactivado_en ? `Sin acceso desde ${fechaCorta(u.desactivado_en)}` : 'Sin acceso'}
                                                </span>
                                            )}
                                        </span>
                                    </span>
                                </button>
                                <button type="button" role="switch" aria-checked={u.activo} className="interruptor"
                                    aria-label={`Acceso de ${u.nombre}`}
                                    title={u.id === perfil.id ? 'No puedes quitarte el acceso a ti mismo' : undefined}
                                    disabled={u.id === perfil.id || ocupado === u.id}
                                    onClick={() => cambiarEstado(u)}>
                                    <span />
                                </button>
                            </li>
                        ))}
                        {visibles.length === 0 && <li className="texto-suave">No hay usuarios con esa búsqueda.</li>}
                    </ul>
                )}
            </div>

            <button type="button" className="boton-flotante solo-celular" onClick={abrirNuevo}>
                <UserPlus size={20} aria-hidden="true" />Nuevo usuario
            </button>

            {nuevo && (
                <Hoja titulo="Nuevo usuario" alCerrar={() => setNuevo(null)}>
                    <form onSubmit={crear}>
                        {errorHoja && <p className="alerta alerta-error" role="alert">{errorHoja}</p>}
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
                            <SelectorRol valor={nuevo.rol} cambiar={(rol) => setNuevo({ ...nuevo, rol })} />
                        </label>
                        <label className="campo">
                            <span>Contraseña temporal (mínimo 8 caracteres)</span>
                            <input type="text" required minLength={8} autoComplete="off" value={nuevo.clave}
                                onChange={(e) => setNuevo({ ...nuevo, clave: e.target.value })} />
                        </label>
                        <button className="boton boton-principal boton-ancho" disabled={ocupado === 'crear'}>
                            {ocupado === 'crear' ? 'Creando…' : 'Crear usuario'}
                        </button>
                    </form>
                </Hoja>
            )}

            {editando && (
                <Hoja titulo={editando.nombre || 'Usuario'} alCerrar={() => setEditando(null)}>
                    <p className="texto-suave texto-pequeno hoja-detalle">
                        {editando.correo} · Último ingreso: {editando.ultimo_ingreso ? fechaHora(editando.ultimo_ingreso) : 'nunca'}
                    </p>
                    {errorHoja && <p className="alerta alerta-error" role="alert">{errorHoja}</p>}

                    <form onSubmit={guardarEdicion}>
                        <label className="campo">
                            <span>Nombre</span>
                            <input required maxLength={120} value={editando.nombre}
                                onChange={(e) => setEditando({ ...editando, nombre: e.target.value })} />
                        </label>
                        <label className="campo">
                            <span>Rol{editando.id === perfil.id ? ' (no puedes cambiar el tuyo)' : ''}</span>
                            <SelectorRol valor={editando.rol} bloqueado={editando.id === perfil.id}
                                cambiar={(rol) => setEditando({ ...editando, rol })} />
                        </label>
                        <button className="boton boton-principal boton-ancho" disabled={ocupado === 'editar'}>
                            {ocupado === 'editar' ? 'Guardando…' : 'Guardar cambios'}
                        </button>
                    </form>

                    <div className="hoja-seccion">
                        <label className="campo">
                            <span>Restablecer contraseña (mínimo 8 caracteres)</span>
                            <input type="text" minLength={8} autoComplete="off" value={editando.claveNueva}
                                onChange={(e) => setEditando({ ...editando, claveNueva: e.target.value })} />
                        </label>
                        <button type="button" className="boton boton-ancho"
                            disabled={editando.claveNueva.length < 8 || ocupado === 'clave'} onClick={restablecerClave}>
                            {ocupado === 'clave' ? 'Restableciendo…' : 'Restablecer contraseña'}
                        </button>
                    </div>
                </Hoja>
            )}
        </section>
    );
}
