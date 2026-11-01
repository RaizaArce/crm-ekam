// Cabecera blanca de cada pantalla: título, subtítulo y acciones a la derecha.
export default function Cabecera({ titulo, subtitulo, children }) {
    return (
        <header className="cabecera-pagina">
            <div className="cabecera-textos">
                <h1>{titulo}</h1>
                {subtitulo && <p>{subtitulo}</p>}
            </div>
            {children && <div className="cabecera-acciones">{children}</div>}
        </header>
    );
}
