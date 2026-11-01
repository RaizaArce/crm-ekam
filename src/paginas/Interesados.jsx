import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import Cabecera from '../componentes/Cabecera.jsx';

// La lista con buscador y filtros llega con T30-T31; aquí ya queda el acceso a registrar.
export default function Interesados() {
    return (
        <section className="pagina">
            <Cabecera titulo="Interesados" subtitulo="Personas y empresas interesadas en NAVASOFT">
                <Link className="boton boton-principal solo-escritorio" to="/interesados/nuevo">
                    <Plus size={18} aria-hidden="true" />Nuevo interesado
                </Link>
            </Cabecera>
            <div className="cuerpo">
                <div className="tarjeta aviso-pantalla">
                    <p className="texto-suave">La lista con buscador y filtros se está construyendo (T30–T31).</p>
                </div>
            </div>
            <Link className="boton-flotante solo-celular" to="/interesados/nuevo">
                <Plus size={22} aria-hidden="true" />Nuevo
            </Link>
        </section>
    );
}
