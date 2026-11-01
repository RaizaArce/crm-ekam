// Cabecera blanca de cada pantalla: título, subtítulo y acciones a la derecha.
// "inicio" va antes del título, por ejemplo el botón de cerrar de un formulario.
export default function Cabecera({ titulo, subtitulo, inicio, children }) {
    return (
        <header className="cabecera-pagina">
            {inicio}
            <div className="cabecera-textos">
                <h1>{titulo}</h1>
                {subtitulo && <p>{subtitulo}</p>}
            </div>
            {children && <div className="cabecera-acciones">{children}</div>}
        </header>
    );
}
