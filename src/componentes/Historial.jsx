import { useCallback, useEffect, useState } from 'react';
import { FileText, Mail, MessageCircle, Phone, Plus, Video } from 'lucide-react';
import { supabase } from '../supabase.js';
import { useAuth } from '../auth.jsx';
import { ETAPAS, TIPOS_INTERACCION, fechaHora, mensajeError } from '../catalogos.js';
import { aFechaLocal } from './CamposInteresado.jsx';
import Hoja from './Hoja.jsx';

const ICONOS = { llamada: Phone, mensaje: MessageCircle, correo: Mail, reunion: Video, observacion: FileText };

// RF11: llamadas, mensajes y reuniones, junto con los cambios de etapa, del más reciente al más antiguo.
export default function Historial({ interesadoId, etapas, usuario }) {
    const { perfil, esAdmin } = useAuth();
    const [interacciones, setInteracciones] = useState([]);
    const [nueva, setNueva] = useState(null);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState('');

    const cargar = useCallback(async () => {
        const { data } = await supabase.from('interacciones').select('*')
            .eq('interesado_id', interesadoId).order('fecha', { ascending: false });
        setInteracciones(data ?? []);
    }, [interesadoId]);

    useEffect(() => { cargar(); }, [cargar]);

    function abrir() {
        setError('');
        setNueva({ tipo: 'llamada', detalle: '', fecha: aFechaLocal(new Date()) });
    }

    async function agregar(e) {
        e.preventDefault();
        setGuardando(true);
        setError('');
        const { error } = await supabase.from('interacciones').insert({
            interesado_id: interesadoId,
            tipo: nueva.tipo,
            detalle: nueva.detalle.trim(),
            fecha: new Date(nueva.fecha).toISOString(),
            usuario_id: perfil.id,
        });
        setGuardando(false);
        if (error) return setError(mensajeError(error));
        setNueva(null);
        cargar();
    }

    async function borrar(it) {
        if (!window.confirm('¿Borrar este registro del historial?')) return;
        const { error } = await supabase.from('interacciones').delete().eq('id', it.id);
        if (error) return setError(mensajeError(error));
        cargar();
    }

    const linea = [
        ...interacciones.map((it) => ({ clase: 'contacto', fecha: it.fecha, ...it })),
        ...etapas.map((h) => ({ clase: 'etapa', fecha: h.cambiado_en, ...h })),
    ].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    return (
        <div className="tarjeta">
            <div className="titulo-tarjeta">
                <h2>Historial de contactos</h2>
                <button type="button" className="boton-suave" onClick={abrir}>
                    <Plus size={16} aria-hidden="true" />Registrar
                </button>
            </div>

            {error && !nueva && <p className="alerta alerta-error" role="alert">{error}</p>}
            {interacciones.length === 0 && <p className="texto-suave texto-pequeno historial-vacio">Todavía no hay contactos registrados.</p>}

            <ol className="linea-tiempo">
                {linea.map((item) => {
                    if (item.clase === 'etapa') {
                        return (
                            <li key={`etapa-${item.id}`} className="linea-etapa">
                                <span className="chip-etapa">
                                    Etapa: {item.etapa_anterior ? `${ETAPAS[item.etapa_anterior]} → ` : ''}{ETAPAS[item.etapa_nueva]}
                                </span>
                                <span className="linea-pie">{fechaHora(item.fecha)}{usuario(item.cambiado_por) ? ` · por ${usuario(item.cambiado_por)}` : ''}</span>
                            </li>
                        );
                    }
                    const Icono = ICONOS[item.tipo];
                    return (
                        <li key={item.id}>
                            <span className="linea-icono"><Icono size={16} aria-hidden="true" /></span>
                            <div className="linea-cabeza">
                                <strong>{TIPOS_INTERACCION[item.tipo]}</strong>
                                <span className="linea-pie">{fechaHora(item.fecha)}</span>
                            </div>
                            <p className="texto-largo">{item.detalle}</p>
                            <div className="linea-cabeza">
                                <span className="linea-pie">por {usuario(item.usuario_id) || 'usuario eliminado'}</span>
                                {(item.usuario_id === perfil.id || esAdmin) && (
                                    <button type="button" className="enlace enlace-tenue" onClick={() => borrar(item)}>Borrar</button>
                                )}
                            </div>
                        </li>
                    );
                })}
            </ol>

            {nueva && (
                <Hoja titulo="Registrar contacto" alCerrar={() => setNueva(null)}>
                    <form onSubmit={agregar}>
                        {error && <p className="alerta alerta-error" role="alert">{error}</p>}
                        <label className="campo">
                            <span>Tipo</span>
                            <select value={nueva.tipo} onChange={(e) => setNueva({ ...nueva, tipo: e.target.value })}>
                                {Object.entries(TIPOS_INTERACCION).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
                            </select>
                        </label>
                        <label className="campo">
                            <span>Fecha y hora</span>
                            <input type="datetime-local" required value={nueva.fecha}
                                onChange={(e) => setNueva({ ...nueva, fecha: e.target.value })} />
                        </label>
                        <label className="campo">
                            <span>¿Qué se habló?</span>
                            <textarea required maxLength={2000} value={nueva.detalle}
                                placeholder="Ej.: Pidió que le envíe la cotización el jueves."
                                onChange={(e) => setNueva({ ...nueva, detalle: e.target.value })} />
                        </label>
                        <button className="boton boton-principal boton-ancho" disabled={guardando || !nueva.detalle.trim()}>
                            {guardando ? 'Guardando…' : 'Guardar'}
                        </button>
                    </form>
                </Hoja>
            )}
        </div>
    );
}
