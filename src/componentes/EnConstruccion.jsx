import { Hourglass } from 'lucide-react';
import Cabecera from './Cabecera.jsx';

// Secciones del menú que todavía no existen: Embudo y Agenda (Sprint 03), Dashboard (Sprint 04).
export default function EnConstruccion({ titulo, sprint }) {
    return (
        <section className="pagina">
            <Cabecera titulo={titulo} />
            <div className="cuerpo">
                <div className="tarjeta aviso-pantalla">
                    <Hourglass size={28} aria-hidden="true" />
                    <p className="texto-suave">Disponible en el Sprint {sprint}.</p>
                </div>
            </div>
        </section>
    );
}
