import { useState } from 'react';
import { supabase } from '../supabase.js';
import { ETAPAS, datosCambioEtapa, mensajeError } from '../catalogos.js';
import Hoja from './Hoja.jsx';

// Hoja para cambiar la etapa (RF14). La usan la ficha y el tablero del embudo.
// El historial lo registra la base de datos (trigger registrar_cambio_etapa).
export default function CambiarEtapa({ interesado, etapaInicial, alCerrar, alGuardar }) {
    const [etapa, setEtapa] = useState(etapaInicial ?? interesado.etapa);
    const [motivo, setMotivo] = useState(interesado.motivo_perdida ?? '');
    const [error, setError] = useState('');
    const [guardando, setGuardando] = useState(false);

    async function guardar(e) {
        e.preventDefault();
        if (etapa === interesado.etapa && etapa !== 'perdido') return alCerrar();
        const { datos, error: invalido } = datosCambioEtapa(etapa, motivo);
        if (invalido) return setError(invalido);
        setGuardando(true);
        setError('');
        const { error: fallo } = await supabase.from('interesados').update(datos).eq('id', interesado.id);
        setGuardando(false);
        if (fallo) return setError(mensajeError(fallo));
        alGuardar(datos);
    }

    return (
        <Hoja titulo="Cambiar etapa" alCerrar={alCerrar}>
            <form onSubmit={guardar}>
                <p className="hoja-detalle"><strong>{interesado.nombre}</strong>{interesado.empresa ? ` · ${interesado.empresa}` : ''}</p>
                {error && <p className="alerta alerta-error" role="alert">{error}</p>}
                <fieldset className="opciones-etapa">
                    <legend className="texto-suave texto-pequeno">Etapa actual: {ETAPAS[interesado.etapa]}</legend>
                    {Object.entries(ETAPAS).map(([codigo, texto]) => (
                        <label key={codigo} className={etapa === codigo ? 'elegida' : ''}>
                            <input type="radio" name="etapa" value={codigo} checked={etapa === codigo} onChange={() => setEtapa(codigo)} />
                            <span className={`etapa etapa-${codigo}`}>{texto}</span>
                        </label>
                    ))}
                </fieldset>
                {etapa === 'perdido' && (
                    <label className="campo">
                        <span>Motivo de pérdida *</span>
                        <textarea
                            value={motivo} maxLength={500} required autoFocus
                            placeholder="Ej.: eligió otro proveedor por precio"
                            onChange={(ev) => setMotivo(ev.target.value)}
                        />
                    </label>
                )}
                <button className="boton boton-principal boton-ancho" disabled={guardando}>
                    {guardando ? 'Guardando…' : 'Guardar etapa'}
                </button>
            </form>
        </Hoja>
    );
}
