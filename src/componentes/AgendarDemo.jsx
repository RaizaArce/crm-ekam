import { useState } from 'react';
import { supabase } from '../supabase.js';
import { useAuth } from '../auth.jsx';
import { ETAPAS, fechaHora, mensajeError } from '../catalogos.js';
import { DURACION_MIN, MODALIDADES, cruces, datosDemo, pasaADemoAgendada } from '../demos.js';
import { aFechaLocal } from './CamposInteresado.jsx';
import Hoja from './Hoja.jsx';

// Mañana a las 10:00 como sugerencia.
function sugerencia() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(10, 0, 0, 0);
    return aFechaLocal(d);
}

// Prototipo 06 / RF16: agendar una demostración desde la ficha.
export default function AgendarDemo({ interesado, usuarios, alCerrar, alGuardar }) {
    const { perfil } = useAuth();
    const [form, setForm] = useState({
        inicio: sugerencia(),
        modalidad: 'virtual',
        consultora_id: interesado.consultora_id ?? perfil.id,
        notas: '',
        cambiarEtapa: pasaADemoAgendada(interesado.etapa),
    });
    const [error, setError] = useState('');
    const [choques, setChoques] = useState([]);
    const [guardando, setGuardando] = useState(false);

    const cambiar = (campo, valor) => {
        setChoques([]);
        setForm({ ...form, [campo]: valor });
    };

    async function guardar(e) {
        e.preventDefault();
        const { datos, error: invalido } = datosDemo(form, interesado.id);
        if (invalido) return setError(invalido);
        setGuardando(true);
        setError('');

        // Aviso (no bloqueo) si la consultora ya tiene otra demostración a esa hora.
        if (!choques.length) {
            const margen = DURACION_MIN * 60000;
            const t = new Date(datos.inicio).getTime();
            const { data } = await supabase.from('demostraciones')
                .select('id, inicio, estado, consultora_id, interesados(nombre)')
                .eq('consultora_id', datos.consultora_id).eq('estado', 'programada')
                .gt('inicio', new Date(t - margen).toISOString()).lt('inicio', new Date(t + margen).toISOString());
            const encontrados = cruces(data ?? [], datos);
            if (encontrados.length) {
                setGuardando(false);
                return setChoques(encontrados);
            }
        }

        const { error: fallo } = await supabase.from('demostraciones').insert(datos);
        if (fallo) {
            setGuardando(false);
            return setError(mensajeError(fallo));
        }
        let etapaNueva = null;
        if (form.cambiarEtapa && pasaADemoAgendada(interesado.etapa)) {
            const { error: falloEtapa } = await supabase.from('interesados')
                .update({ etapa: 'demo_agendada', motivo_perdida: null }).eq('id', interesado.id);
            if (!falloEtapa) etapaNueva = 'demo_agendada';
        }
        setGuardando(false);
        alGuardar({ ...datos, etapaNueva });
    }

    const activos = usuarios.filter((u) => u.activo || u.id === form.consultora_id);

    return (
        <Hoja titulo="Agendar demostración" alCerrar={alCerrar}>
            <form onSubmit={guardar}>
                <p className="hoja-detalle"><strong>{interesado.nombre}</strong>{interesado.empresa ? ` · ${interesado.empresa}` : ''}</p>
                {error && <p className="alerta alerta-error" role="alert">{error}</p>}
                {choques.length > 0 && (
                    <div className="alerta alerta-aviso" role="alert">
                        <p>Esta consultora ya tiene una demostración cerca de esa hora:</p>
                        <ul>
                            {choques.map((c) => <li key={c.id}>{fechaHora(c.inicio)}{c.interesados?.nombre ? ` · ${c.interesados.nombre}` : ''}</li>)}
                        </ul>
                        <p>Cambia la hora o pulsa «Agendar igual».</p>
                    </div>
                )}

                <label className="campo">
                    <span>Fecha y hora *</span>
                    <input type="datetime-local" required value={form.inicio} min={aFechaLocal(new Date())}
                        onChange={(e) => cambiar('inicio', e.target.value)} />
                </label>

                <fieldset className="opciones-modalidad">
                    <legend>Modalidad *</legend>
                    {Object.entries(MODALIDADES).map(([codigo, texto]) => (
                        <label key={codigo} className={form.modalidad === codigo ? 'elegida' : ''}>
                            <input type="radio" name="modalidad" value={codigo} checked={form.modalidad === codigo}
                                onChange={() => cambiar('modalidad', codigo)} />
                            {texto}
                        </label>
                    ))}
                </fieldset>

                <label className="campo">
                    <span>Consultora *</span>
                    <select required value={form.consultora_id} onChange={(e) => cambiar('consultora_id', e.target.value)}>
                        {activos.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                    </select>
                </label>

                <label className="campo">
                    <span>Notas</span>
                    <textarea value={form.notas} maxLength={500} placeholder="Ej.: enlace de Meet, dirección o módulos a mostrar"
                        onChange={(e) => cambiar('notas', e.target.value)} />
                </label>

                {pasaADemoAgendada(interesado.etapa) && (
                    <label className="campo-casilla">
                        <input type="checkbox" checked={form.cambiarEtapa} onChange={(e) => cambiar('cambiarEtapa', e.target.checked)} />
                        <span>Pasar de {ETAPAS[interesado.etapa]} a {ETAPAS.demo_agendada}</span>
                    </label>
                )}

                <button className="boton boton-principal boton-ancho" disabled={guardando}>
                    {guardando ? 'Guardando…' : choques.length ? 'Agendar igual' : 'Agendar demostración'}
                </button>
            </form>
        </Hoja>
    );
}
