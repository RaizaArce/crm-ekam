// Pantallas del menú que se completan en los siguientes puntos del Sprint 02.
export default function EnConstruccion({ titulo, tarea }) {
    return (
        <section className="pagina">
            <h1>{titulo}</h1>
            <div className="tarjeta">
                <p className="texto-suave">En construcción ({tarea}).</p>
            </div>
        </section>
    );
}
