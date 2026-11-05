import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, FileSpreadsheet } from 'lucide-react';
import { BarController, BarElement, CategoryScale, Chart, LinearScale, Tooltip } from 'chart.js';
import { supabase } from '../supabase.js';
import { useAuth } from '../auth.jsx';
import { ETAPAS, MEDIOS, PLAZOS, fecha, useCatalogos } from '../catalogos.js';
import {
    aCsv, cierrePorConsultora, contarPor, conversion, conversionPorEtapa, demosRealizadasDelMes,
    inicioPeriodo, interesadosDelMes, interesadosPorMes, perdidos, tiempoPromedioCierre,
} from '../metricas.js';
import Cabecera from '../componentes/Cabecera.jsx';
import Iniciales from '../componentes/Iniciales.jsx';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip);

const PERIODOS = { 3: 'Últimos 3 meses', 6: 'Últimos 6 meses', 12: 'Últimos 12 meses' };
const CAMPOS = 'id, nombre, empresa, telefono, correo, sector, solucion, medio_contacto, plazo, etapa, etapa_desde, motivo_perdida, consultora_id, creado_en';
const porcentaje = (x) => `${(x * 100).toLocaleString('es-PE', { maximumFractionDigits: 1 })} %`;

function Indicador({ titulo, valor, detalle, tendencia }) {
    return (
        <div className="tarjeta indicador">
            <span className="texto-suave texto-pequeno">{titulo}</span>
            <strong>{valor}</strong>
            {detalle && (
                <span className={`texto-pequeno${tendencia ? ` tendencia-${tendencia}` : ' texto-suave'}`}>
                    {tendencia === 'sube' && <ArrowUp size={13} aria-hidden="true" />}
                    {tendencia === 'baja' && <ArrowDown size={13} aria-hidden="true" />}
                    {detalle}
                </span>
            )}
        </div>
    );
}

// Barras horizontales del prototipo 07 (por etapa, sector, solución y medio).
function Ranking({ titulo, subtitulo, filas, formato = (f) => f.total, maximo, pie }) {
    const tope = maximo ?? Math.max(1, ...filas.map((f) => f.total));
    return (
        <div className="tarjeta">
            <h2>{titulo}</h2>
            {subtitulo && <p className="texto-suave texto-pequeno">{subtitulo}</p>}
            {filas.length === 0 ? <p className="texto-suave texto-pequeno">Sin datos en este periodo.</p> : (
                <ul className="ranking">
                    {filas.map((f) => (
                        <li key={f.clave}>
                            <span className="ranking-nombre">{f.nombre}</span>
                            <span className="ranking-barra" aria-hidden="true"><i style={{ width: `${(f.total / tope) * 100}%` }} /></span>
                            <span className="ranking-valor">{formato(f)}</span>
                        </li>
                    ))}
                </ul>
            )}
            {pie && <p className="texto-suave texto-pequeno ranking-pie">{pie}</p>}
        </div>
    );
}

function GraficoMeses({ meses }) {
    const lienzo = useRef(null);
    useEffect(() => {
        const grafico = new Chart(lienzo.current, {
            type: 'bar',
            data: {
                labels: meses.map((m) => m.mes.toLocaleDateString('es-PE', { month: 'short' }).replace('.', '')),
                datasets: [{ data: meses.map((m) => m.total), backgroundColor: '#1677B8', borderRadius: 4, maxBarThickness: 36 }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => `${c.parsed.y} interesados` } } },
                scales: {
                    x: { grid: { display: false }, ticks: { color: '#5B6B7C' } },
                    y: { beginAtZero: true, ticks: { precision: 0, color: '#5B6B7C' }, grid: { color: '#EEF2F6' } },
                },
            },
        });
        return () => grafico.destroy();
    }, [meses]);
    const total = meses.reduce((a, m) => a + m.total, 0);
    return (
        <div className="grafico-meses">
            <canvas ref={lienzo} role="img" aria-label={`Interesados por mes: ${meses.map((m) => `${m.mes.toLocaleDateString('es-PE', { month: 'long' })} ${m.total}`).join(', ')}. Total ${total}.`} />
        </div>
    );
}

// Prototipo 07 (RF19 a RF22): indicadores de la gerencia y exportación a Excel.
export default function Dashboard() {
    const { perfil } = useAuth();
    const catalogos = useCatalogos();
    const [meses, setMeses] = useState(6);
    const [consultora, setConsultora] = useState('');
    const [datos, setDatos] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelado = false;
        setDatos(null);
        const desde = inicioPeriodo(meses).toISOString();
        let consulta = supabase.from('interesados').select(CAMPOS).gte('creado_en', desde).order('creado_en');
        let demos = supabase.from('demostraciones').select('id, inicio, estado, consultora_id').gte('inicio', desde);
        if (consultora === 'sin-asignar') consulta = consulta.is('consultora_id', null);
        else if (consultora) {
            consulta = consulta.eq('consultora_id', consultora);
            demos = demos.eq('consultora_id', consultora);
        }
        Promise.all([consulta, demos]).then(async ([i, d]) => {
            if (cancelado) return;
            if (i.error || d.error) return setError('No se pudieron cargar los indicadores. Revisa tu conexión e inténtalo de nuevo.');
            const ids = i.data.map((x) => x.id);
            // El historial se pide por partes para no armar una URL demasiado larga.
            const historial = [];
            for (let k = 0; k < ids.length; k += 150) {
                const h = await supabase.from('historial_etapas').select('interesado_id, etapa_anterior, etapa_nueva, cambiado_en').in('interesado_id', ids.slice(k, k + 150));
                if (h.error) return !cancelado && setError('No se pudo cargar el historial de etapas.');
                historial.push(...h.data);
            }
            if (cancelado) return;
            setError('');
            setDatos({ interesados: i.data, demos: d.data, historial });
        });
        return () => { cancelado = true; };
    }, [meses, consultora]);

    const nombres = useMemo(() => ({
        sectores: Object.fromEntries(catalogos.sectores.map((s) => [s.codigo, s.nombre])),
        soluciones: Object.fromEntries(catalogos.soluciones.map((s) => [s.codigo, s.nombre])),
        usuarios: Object.fromEntries(catalogos.usuarios.map((u) => [u.id, u.nombre])),
    }), [catalogos]);

    const m = useMemo(() => {
        if (!datos) return null;
        const { interesados, historial, demos } = datos;
        return {
            porMes: interesadosPorMes(interesados, meses),
            delMes: interesadosDelMes(interesados),
            conversion: conversion(interesados),
            cierre: tiempoPromedioCierre(interesados, historial),
            demos: demosRealizadasDelMes(demos),
            etapas: conversionPorEtapa(interesados, historial),
            perdidos: perdidos(interesados),
            sector: contarPor(interesados, 'sector', nombres.sectores),
            solucion: contarPor(interesados, 'solucion', nombres.soluciones),
            medio: contarPor(interesados, 'medio_contacto', MEDIOS),
            consultoras: cierrePorConsultora(interesados, historial),
        };
    }, [datos, meses, nombres]);

    function exportar() {
        const columnas = [
            { titulo: 'Nombre', valor: (i) => i.nombre },
            { titulo: 'Empresa', valor: (i) => i.empresa },
            { titulo: 'Teléfono', valor: (i) => i.telefono },
            { titulo: 'Correo', valor: (i) => i.correo },
            { titulo: 'Sector', valor: (i) => nombres.sectores[i.sector] ?? i.sector },
            { titulo: 'Solución', valor: (i) => nombres.soluciones[i.solucion] ?? i.solucion },
            { titulo: 'Medio de contacto', valor: (i) => MEDIOS[i.medio_contacto] },
            { titulo: 'Plazo', valor: (i) => PLAZOS[i.plazo] ?? i.plazo },
            { titulo: 'Etapa', valor: (i) => ETAPAS[i.etapa] },
            { titulo: 'Motivo de pérdida', valor: (i) => i.motivo_perdida },
            { titulo: 'Consultora', valor: (i) => nombres.usuarios[i.consultora_id] ?? 'Sin asignar' },
            { titulo: 'Registrado', valor: (i) => fecha(i.creado_en) },
        ];
        const blob = new Blob([aCsv(datos.interesados, columnas)], { type: 'text/csv;charset=utf-8' });
        const enlace = document.createElement('a');
        enlace.href = URL.createObjectURL(blob);
        enlace.download = `interesados-ekam-${new Date().toISOString().slice(0, 10)}.csv`;
        enlace.click();
        URL.revokeObjectURL(enlace.href);
    }

    const mesAnterior = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toLocaleDateString('es-PE', { month: 'long' }).toLowerCase();
    const hoy = new Date();

    return (
        <section className="pagina">
            <Cabecera titulo="Dashboard comercial" subtitulo={`Gerencia · datos al ${fecha(hoy)}`}>
                <button type="button" className="boton boton-principal solo-escritorio" onClick={exportar} disabled={!datos}>
                    <FileSpreadsheet size={18} aria-hidden="true" />Exportar a Excel
                </button>
            </Cabecera>

            <div className="barra-embudo barra-dashboard">
                <label className="filtro">
                    <span>Periodo:</span>
                    <select value={meses} onChange={(e) => setMeses(Number(e.target.value))} aria-label="Periodo">
                        {Object.entries(PERIODOS).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
                    </select>
                </label>
                <label className={`filtro${consultora ? ' filtro-activo' : ''}`}>
                    <span>Consultora:</span>
                    <select value={consultora} onChange={(e) => setConsultora(e.target.value)} aria-label="Consultora">
                        <option value="">Todas</option>
                        <option value={perfil.id}>Mis interesados</option>
                        <option value="sin-asignar">Sin asignar</option>
                        {catalogos.usuarios.filter((u) => u.id !== perfil.id).map((u) => (
                            <option key={u.id} value={u.id}>{u.nombre}{u.activo ? '' : ' (inactivo)'}</option>
                        ))}
                    </select>
                </label>
                <button type="button" className="boton boton-principal boton-ancho solo-celular" onClick={exportar} disabled={!datos}>
                    <FileSpreadsheet size={18} aria-hidden="true" />Exportar a Excel
                </button>
            </div>

            <div className="cuerpo">
                {error && <p className="alerta alerta-error" role="alert">{error}</p>}
                {!m && !error && <p className="texto-suave">Calculando…</p>}
                {m && (
                    <>
                        <div className="indicadores">
                            <Indicador
                                titulo="Interesados del mes" valor={m.delMes.actual}
                                tendencia={m.delMes.diferencia > 0 ? 'sube' : m.delMes.diferencia < 0 ? 'baja' : null}
                                detalle={m.delMes.diferencia === 0 ? `Igual que ${mesAnterior}` : `${Math.abs(m.delMes.diferencia)} ${m.delMes.diferencia > 0 ? 'más' : 'menos'} que ${mesAnterior}`}
                            />
                            <Indicador
                                titulo="Tasa de conversión" valor={m.conversion.tasa === null ? '—' : porcentaje(m.conversion.tasa)}
                                detalle={`${m.conversion.cerrados} cerrados de ${m.conversion.total}`}
                            />
                            <Indicador
                                titulo="Tiempo promedio de cierre" valor={m.cierre.dias === null ? '—' : `${m.cierre.dias} ${m.cierre.dias === 1 ? 'día' : 'días'}`}
                                detalle={m.cierre.cierres ? `Promedio de ${m.cierre.cierres} ${m.cierre.cierres === 1 ? 'venta' : 'ventas'}` : 'Aún no hay ventas cerradas'}
                            />
                            <Indicador
                                titulo="Demos realizadas" valor={m.demos}
                                detalle={`En ${hoy.toLocaleDateString('es-PE', { month: 'long' }).toLowerCase()}, al día ${hoy.getDate()}`}
                            />
                        </div>

                        <div className="dashboard-columnas">
                            <div className="tarjeta">
                                <h2>Interesados por mes</h2>
                                <GraficoMeses meses={m.porMes} />
                            </div>

                            <Ranking
                                titulo="Conversión por etapa"
                                subtitulo="Interesados que llegaron a cada etapa"
                                filas={m.etapas.map((e) => ({ clave: e.etapa, nombre: ETAPAS[e.etapa], total: e.llegaron, porcentaje: e.porcentaje }))}
                                maximo={Math.max(1, m.conversion.total)}
                                formato={(f) => porcentaje(f.porcentaje)}
                                pie={`Perdidos: ${m.perdidos.total}${m.perdidos.motivo ? ` · motivo más frecuente: ${m.perdidos.motivo.texto.toLowerCase()}` : ''}`}
                            />
                            <Ranking titulo="Por sector" filas={m.sector} />
                            <Ranking titulo="Por solución de interés" filas={m.solucion} />
                            <Ranking titulo="Por medio de contacto" filas={m.medio} />

                            <div className="tarjeta">
                                <h2>Cierre por consultora</h2>
                                {m.consultoras.length === 0 ? <p className="texto-suave texto-pequeno">Aún no hay ventas cerradas en este periodo.</p> : (
                                    <ul className="cierre-consultoras">
                                        {m.consultoras.map((c) => {
                                            const nombre = c.consultora_id ? (nombres.usuarios[c.consultora_id] ?? '—') : 'Sin asignar';
                                            return (
                                                <li key={c.consultora_id ?? 'sin'}>
                                                    <Iniciales nombre={nombre} />
                                                    <span><strong>{nombre}</strong><span className="texto-suave texto-pequeno">{c.cerrados} {c.cerrados === 1 ? 'cerrado' : 'cerrados'}</span></span>
                                                    <span className="cierre-dias"><strong>{c.dias} {c.dias === 1 ? 'día' : 'días'}</strong><span className="texto-suave texto-pequeno">promedio</span></span>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </section>
    );
}
