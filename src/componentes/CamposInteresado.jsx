import { TriangleAlert } from 'lucide-react';
import { MEDIOS, MEDIOS_MANUALES, PLAZOS } from '../catalogos.js';

export const INTERESADO_VACIO = {
    nombre: '', empresa: '', ruc: '', telefono: '', correo: '',
    sector: '', solucion: '', medio_contacto: 'whatsapp', plazo: '', necesidad: '',
    es_cliente_actual: false, consultora_id: '', proximo_contacto: '',
};

// Los campos vacíos van como null: así funcionan los checks de la base (RUC, teléfono o correo).
export function datosParaGuardar(f) {
    const limpio = (v) => v.trim() || null;
    return {
        nombre: f.nombre.trim(),
        empresa: limpio(f.empresa),
        ruc: limpio(f.ruc),
        telefono: limpio(f.telefono),
        correo: limpio(f.correo)?.toLowerCase() ?? null,
        sector: f.sector || null,
        solucion: f.solucion || null,
        medio_contacto: f.medio_contacto,
        plazo: f.plazo || null,
        necesidad: limpio(f.necesidad),
        es_cliente_actual: f.es_cliente_actual,
        consultora_id: f.consultora_id || null,
        proximo_contacto: f.proximo_contacto ? new Date(f.proximo_contacto).toISOString() : null,
    };
}

function CampoContacto({ etiqueta, resaltado, ...props }) {
    return (
        <label className={`campo ancho-completo${resaltado ? ' campo-resaltado' : ''}`}>
            <span>{etiqueta}</span>
            <span className="campo-control">
                <input {...props} />
                {resaltado && <TriangleAlert size={18} aria-hidden="true" />}
            </span>
        </label>
    );
}

// Campos del interesado en tres secciones, como el prototipo 04 (RF09).
// El aviso de duplicado aparece justo debajo del dato que coincide.
export default function CamposInteresado({ valores, cambiar, catalogos, alSalirContacto, duplicadoPor, alerta }) {
    const campo = (nombre) => ({
        value: valores[nombre],
        onChange: (e) => cambiar({ ...valores, [nombre]: e.target.value }),
    });
    const consultoras = catalogos.usuarios.filter((u) => u.activo || u.id === valores.consultora_id);

    return (
        <>
            <fieldset className="seccion-formulario">
                <legend>Contacto</legend>
                <div className="rejilla">
                    <label className="campo ancho-completo">
                        <span>Nombre completo *</span>
                        <input required maxLength={120} autoComplete="off" {...campo('nombre')} />
                    </label>
                    <CampoContacto etiqueta="Teléfono" type="tel" inputMode="tel" maxLength={30} placeholder="+51 900 000 000"
                        autoComplete="off" resaltado={duplicadoPor === 'telefono'} {...campo('telefono')} onBlur={alSalirContacto} />
                    {duplicadoPor === 'telefono' && alerta}
                    <CampoContacto etiqueta="Correo electrónico" type="email" maxLength={150} placeholder="correo@empresa.com"
                        autoComplete="off" resaltado={duplicadoPor === 'correo'} {...campo('correo')} onBlur={alSalirContacto} />
                    {duplicadoPor === 'correo' && alerta}
                </div>
            </fieldset>

            <fieldset className="seccion-formulario">
                <legend>Empresa</legend>
                <div className="rejilla">
                    <label className="campo ancho-completo">
                        <span>Empresa</span>
                        <input maxLength={150} autoComplete="off" {...campo('empresa')} />
                    </label>
                    <label className="campo">
                        <span>RUC</span>
                        <input inputMode="numeric" pattern="\d{11}" maxLength={11} title="11 dígitos" placeholder="11 dígitos"
                            autoComplete="off" {...campo('ruc')} />
                    </label>
                    <label className="campo">
                        <span>Sector</span>
                        <select {...campo('sector')}>
                            <option value="">Sin indicar</option>
                            {catalogos.sectores.map((s) => <option key={s.codigo} value={s.codigo}>{s.nombre}</option>)}
                        </select>
                    </label>
                    <label className="campo campo-casilla ancho-completo">
                        <input type="checkbox" checked={valores.es_cliente_actual}
                            onChange={(e) => cambiar({ ...valores, es_cliente_actual: e.target.checked })} />
                        <span>Ya es cliente de NAVASOFT</span>
                    </label>
                </div>
            </fieldset>

            <fieldset className="seccion-formulario">
                <legend>Oportunidad</legend>
                <div className="rejilla">
                    <label className="campo">
                        <span>Solución de interés</span>
                        <select {...campo('solucion')}>
                            <option value="">Sin indicar</option>
                            {catalogos.soluciones.map((s) => <option key={s.codigo} value={s.codigo}>{s.nombre}</option>)}
                        </select>
                    </label>
                    <label className="campo">
                        <span>Medio de contacto *</span>
                        <select required {...campo('medio_contacto')}>
                            {MEDIOS_MANUALES.map((m) => <option key={m} value={m}>{MEDIOS[m]}</option>)}
                        </select>
                    </label>
                    <label className="campo">
                        <span>Plazo</span>
                        <select {...campo('plazo')}>
                            <option value="">Sin indicar</option>
                            {Object.entries(PLAZOS).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
                        </select>
                    </label>
                    <label className="campo">
                        <span>Próximo contacto</span>
                        <input type="datetime-local" {...campo('proximo_contacto')} />
                    </label>
                    <label className="campo ancho-completo">
                        <span>Necesidad</span>
                        <textarea maxLength={1000} placeholder="¿Qué necesita resolver? Ej.: llevar la contabilidad de tres obras."
                            {...campo('necesidad')} />
                    </label>
                    <label className="campo ancho-completo">
                        <span>Consultora asignada</span>
                        <select {...campo('consultora_id')}>
                            <option value="">Sin asignar</option>
                            {consultoras.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                        </select>
                    </label>
                </div>
            </fieldset>
        </>
    );
}
