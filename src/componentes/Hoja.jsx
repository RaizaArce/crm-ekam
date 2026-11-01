import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

// Ventana sobre la pantalla: hoja inferior en celular, centrada en escritorio.
export default function Hoja({ titulo, alCerrar, children }) {
    const ref = useRef(null);

    useEffect(() => {
        const dialogo = ref.current;
        dialogo.showModal();
        return () => dialogo.close();
    }, []);

    return (
        <dialog ref={ref} className="hoja" onCancel={alCerrar} aria-labelledby="hoja-titulo">
            <div className="hoja-cabecera">
                <h2 id="hoja-titulo">{titulo}</h2>
                <button type="button" className="boton-icono" onClick={alCerrar} aria-label="Cerrar">
                    <X size={20} aria-hidden="true" />
                </button>
            </div>
            <div className="hoja-cuerpo">{children}</div>
        </dialog>
    );
}
