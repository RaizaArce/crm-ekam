import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Building2, Briefcase, Clock, Plus, Search, SlidersHorizontal, UserRound } from 'lucide-react';
import { supabase } from '../supabase.js';
import { useAuth } from '../auth.jsx';
import { ETAPAS, fechaRelativa, useCatalogos } from '../catalogos.js';
import Cabecera from '../componentes/Cabecera.jsx';
import Etapa from '../componentes/Etapa.jsx';
import Iniciales from '../componentes/Iniciales.jsx';

const POR_PAGINA = 20;
const ETAPAS_CERRADAS = '("cerrado","perdido")';
const ORDENES = {
    proximo: { texto: 'Próximo contacto', columna: 'proximo_contacto', ascendente: true },
    recientes: { texto: 'Más recientes', columna: 'creado_en', ascendente: false },
    nombre: { texto: 'Nombre', columna: 'nombre', ascendente: true },
};

// Sin comas, paréntesis ni comodines: rompen el filtro "or" de la consulta.
export const limpiarBusqueda = (texto) => texto.replace(/[,()%*\\"]/g, ' ').trim();

// Selector con forma de pastilla: "Etapa: En curso" (prototipos 02 y D1).
function Filtro({ etiqueta, activo, valor, cambiar, children }) {
    return (
        <label className={`filtro${activo ? ' filtro-activo' : ''}`}>
            <span>{etiqueta}:</span>
            <select value={valor} onChange={(e) => cambiar(e.target.value)} aria-label={etiqueta}>{children}</select>
        </label>
    );
}

function ProximoContacto({ valor }) {
    if (!valor) return <span className="texto-tenue">Sin fecha</span>;
    const vencido = new Date(valor) < new Date();
    return <span className={vencido ? 'fecha-vencida' : ''}>{fechaRelativa(valor)}</span>;
}

// Prototipos 02 y D1 (RF12): búsqueda y filtros por sector, etapa, consultora y solución.
export default function Interesados() {
    const { perfil } = useAuth();
    const catalogos = useCatalogos();
    const [params, setParams] = useSearchParams();
    const [texto, setTexto] = useState(params.get('q') ?? '');
    const [filas, setFilas] = useState([]);
    const [total, setTotal] = useState(0);
    const [resumen, setResumen] = useState({ registrados: 0, enCurso: 0 });
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');

    const q = params.get('q') ?? '';
    const etapa = params.get('etapa') ?? 'en-curso';
    const sector = params.get('sector') ?? '';
    const consultora = params.get('consultora') ?? '';
    const solucion = params.get('solucion') ?? '';
    const orden = ORDENES[params.get('orden')] ? params.get('orden') : 'proximo';
    const pagina = Math.max(1, Number(params.get('pagina')) || 1);

    const filtrosActivos = [q, etapa !== 'todas' ? etapa : '', sector, consultora, solucion].filter(Boolean).length;
    const hayFiltrosManuales = Boolean(q || params.has('etapa') || sector || consultora || solucion);

    function cambiar(nombre, valor) {
        const nuevos = new URLSearchParams(params);
        if (valor) nuevos.set(nombre, valor);
        else nuevos.delete(nombre);
        if (nombre !== 'pagina') nuevos.delete('pagina');
        setParams(nuevos, { replace: true });
    }

    function limpiarFiltros() {
        setTexto('');
        setParams({ etapa: 'todas' }, { replace: true });
    }

    // La búsqueda se aplica cuando se deja de escribir.
    useEffect(() => {
        const espera = setTimeout(() => { if (texto !== q) cambiar('q', texto); }, 350);
        return () => clearTimeout(espera);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [texto]);

    useEffect(() => {
        Promise.all([
            supabase.from('interesados').select('id', { count: 'exact', head: true }),
            supabase.from('interesados').select('id', { count: 'exact', head: true }).not('etapa', 'in', ETAPAS_CERRADAS),
        ]).then(([todos, enCurso]) => setResumen({ registrados: todos.count ?? 0, enCurso: enCurso.count ?? 0 }));
    }, []);

    useEffect(() => {
        let cancelado = false;
        setCargando(true);
        const { columna, ascendente } = ORDENES[orden];
        const desde = (pagina - 1) * POR_PAGINA;
        let consulta = supabase
            .from('interesados')
            .select('id, nombre, empresa, telefono, correo, sector, solucion, etapa, consultora_id, proximo_contacto, creado_en', { count: 'exact' })
            .order(columna, { ascending: ascendente, nullsFirst: false })
            .range(desde, desde + POR_PAGINA - 1);

        const busqueda = limpiarBusqueda(q);
        if (busqueda) {
            const patron = `%${busqueda}%`;
            consulta = consulta.or(`nombre.ilike.${patron},empresa.ilike.${patron},correo.ilike.${patron},telefono.ilike.${patron}`);
        }
        if (etapa === 'en-curso') consulta = consulta.not('etapa', 'in', ETAPAS_CERRADAS);
        else if (etapa !== 'todas') consulta = consulta.eq('etapa', etapa);
        if (sector) consulta = consulta.eq('sector', sector);
        if (solucion) consulta = consulta.eq('solucion', solucion);
        if (consultora === 'sin-asignar') consulta = consulta.is('consultora_id', null);
        else if (consultora) consulta = consulta.eq('consultora_id', consultora);

        consulta.then(({ data, count, error }) => {
            if (cancelado) return;
            setCargando(false);
            if (error) return setError('No se pudo cargar la lista. Revisa tu conexión e inténtalo de nuevo.');
            setError('');
            setFilas(data);
            setTotal(count ?? 0);
        });
        return () => { cancelado = true; };
    }, [q, etapa, sector, consultora, solucion, orden, pagina]);

    const nombreDe = (lista, codigo) => lista.find((x) => x.codigo === codigo)?.nombre ?? '';
    const usuario = (id) => catalogos.usuarios.find((u) => u.id === id)?.nombre ?? '';
    const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
    const primero = total === 0 ? 0 : (pagina - 1) * POR_PAGINA + 1;
    const ultimo = Math.min(pagina * POR_PAGINA, total);

    return (
        <section className="pagina">
            <Cabecera titulo="Interesados" subtitulo={`${resumen.registrados} registrados · ${resumen.enCurso} en curso`}>
                <Link className="boton boton-principal solo-escritorio" to="/interesados/nuevo">
                    <Plus size={18} aria-hidden="true" />Nuevo interesado
                </Link>
            </Cabecera>

            <div className="barra-filtros">
                <label className="buscador-lista">
                    <Search size={18} aria-hidden="true" />
                    <input type="search" placeholder="Buscar por nombre, empresa, teléfono o correo" aria-label="Buscar interesados"
                        value={texto} onChange={(e) => setTexto(e.target.value)} />
                </label>
                <div className="filtros-lista">
                    <span className="contador-filtros solo-celular" aria-label={`${filtrosActivos} filtros activos`}>
                        <SlidersHorizontal size={16} aria-hidden="true" />{filtrosActivos}
                    </span>
                    <Filtro etiqueta="Etapa" activo={etapa !== 'todas'} valor={etapa} cambiar={(v) => cambiar('etapa', v)}>
                        <option value="en-curso">En curso</option>
                        <option value="todas">Todas</option>
                        {Object.entries(ETAPAS).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
                    </Filtro>
                    <Filtro etiqueta="Consultora" activo={Boolean(consultora)} valor={consultora} cambiar={(v) => cambiar('consultora', v)}>
                        <option value="">Todas</option>
                        <option value={perfil.id}>Mis interesados</option>
                        <option value="sin-asignar">Sin asignar</option>
                        {catalogos.usuarios.filter((u) => u.id !== perfil.id).map((u) => (
                            <option key={u.id} value={u.id}>{u.nombre}{u.activo ? '' : ' (inactivo)'}</option>
                        ))}
                    </Filtro>
                    <Filtro etiqueta="Sector" activo={Boolean(sector)} valor={sector} cambiar={(v) => cambiar('sector', v)}>
                        <option value="">Todos</option>
                        {catalogos.sectores.map((s) => <option key={s.codigo} value={s.codigo}>{s.nombre}</option>)}
                    </Filtro>
                    <Filtro etiqueta="Solución" activo={Boolean(solucion)} valor={solucion} cambiar={(v) => cambiar('solucion', v)}>
                        <option value="">Todas</option>
                        {catalogos.soluciones.map((s) => <option key={s.codigo} value={s.codigo}>{s.nombre}</option>)}
                    </Filtro>
                    {hayFiltrosManuales && <button type="button" className="enlace limpiar-filtros" onClick={limpiarFiltros}>Limpiar filtros</button>}
                </div>
            </div>

            <div className="cuerpo cuerpo-lista">
                {error && <p className="alerta alerta-error" role="alert">{error}</p>}

                <div className="barra-resultados">
                    <span className="texto-suave texto-pequeno" aria-live="polite">
                        {cargando ? 'Buscando…' : `${total} ${total === 1 ? 'resultado' : 'resultados'}`}
                    </span>
                    <label className="orden-lista">
                        <span className="sr-solo">Ordenar por</span>
                        <select value={orden} onChange={(e) => cambiar('orden', e.target.value)}>
                            {Object.entries(ORDENES).map(([v, o]) => <option key={v} value={v}>{o.texto}</option>)}
                        </select>
                    </label>
                </div>

                {!cargando && filas.length === 0 && !error && (
                    <div className="tarjeta aviso-pantalla">
                        <p className="texto-suave">
                            {resumen.registrados === 0 ? 'Aún no hay interesados registrados.' : 'Ningún interesado coincide con estos filtros.'}
                        </p>
                        {resumen.registrados === 0
                            ? <Link className="boton boton-principal" to="/interesados/nuevo">Registrar el primero</Link>
                            : hayFiltrosManuales && <button type="button" className="boton" onClick={limpiarFiltros}>Limpiar filtros</button>}
                    </div>
                )}

                {filas.length > 0 && (
                    <>
                        <ul className="tarjetas-interesados">
                            {filas.map((i) => (
                                <li key={i.id} className="tarjeta tarjeta-interesado">
                                    <Link to={`/interesados/${i.id}`} className="tarjeta-enlace">
                                        <div className="tarjeta-cabeza">
                                            <Iniciales nombre={i.nombre} />
                                            <div>
                                                <strong>{i.nombre}</strong>
                                                {i.empresa && <span className="texto-suave texto-pequeno">{i.empresa}</span>}
                                            </div>
                                            <Etapa etapa={i.etapa} />
                                        </div>
                                        {(i.solucion || i.sector) && (
                                            <div className="tarjeta-datos">
                                                {i.solucion && <span><Briefcase size={15} aria-hidden="true" />{nombreDe(catalogos.soluciones, i.solucion)}</span>}
                                                {i.sector && <span><Building2 size={15} aria-hidden="true" />{nombreDe(catalogos.sectores, i.sector)}</span>}
                                            </div>
                                        )}
                                        <div className="tarjeta-pie">
                                            <span><UserRound size={15} aria-hidden="true" />{usuario(i.consultora_id) || 'Sin asignar'}</span>
                                            <span><Clock size={15} aria-hidden="true" /><ProximoContacto valor={i.proximo_contacto} /></span>
                                        </div>
                                    </Link>
                                </li>
                            ))}
                        </ul>

                        <div className="tarjeta tabla-contenedor">
                            <table className="tabla-interesados">
                                <thead>
                                    <tr>
                                        <th scope="col">Nombre</th>
                                        <th scope="col">Empresa</th>
                                        <th scope="col">Sector</th>
                                        <th scope="col">Solución de interés</th>
                                        <th scope="col">Etapa</th>
                                        <th scope="col">Consultora</th>
                                        <th scope="col">Próximo contacto</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filas.map((i) => (
                                        <tr key={i.id}>
                                            <td>
                                                <div className="celda-nombre">
                                                    <Iniciales nombre={i.nombre} />
                                                    <div>
                                                        <Link to={`/interesados/${i.id}`} className="fila-enlace">{i.nombre}</Link>
                                                        <span className="texto-suave">{i.telefono || i.correo}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>{i.empresa || '—'}</td>
                                            <td>{nombreDe(catalogos.sectores, i.sector) || '—'}</td>
                                            <td>{nombreDe(catalogos.soluciones, i.solucion) || '—'}</td>
                                            <td><Etapa etapa={i.etapa} /></td>
                                            <td>{usuario(i.consultora_id) || 'Sin asignar'}</td>
                                            <td><ProximoContacto valor={i.proximo_contacto} /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <nav className="paginacion" aria-label="Páginas de resultados">
                            <span className="texto-suave texto-pequeno">Mostrando {primero}–{ultimo} de {total} interesados</span>
                            {paginas > 1 && (
                                <div>
                                    <button type="button" className="boton boton-chico" disabled={pagina <= 1}
                                        onClick={() => cambiar('pagina', String(pagina - 1))}>Anterior</button>
                                    <span className="texto-suave texto-pequeno">Página {pagina} de {paginas}</span>
                                    <button type="button" className="boton boton-chico" disabled={pagina >= paginas}
                                        onClick={() => cambiar('pagina', String(pagina + 1))}>Siguiente</button>
                                </div>
                            )}
                        </nav>
                    </>
                )}
            </div>

            <Link className="boton-flotante solo-celular" to="/interesados/nuevo">
                <Plus size={22} aria-hidden="true" />Nuevo
            </Link>
        </section>
    );
}
