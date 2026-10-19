import { useState } from 'react';
import { supabase } from '../supabase.js';
import { useAuth } from '../auth.jsx';

export default function Login() {
    const { aviso, setAviso } = useAuth();
    const [correo, setCorreo] = useState('');
    const [clave, setClave] = useState('');
    const [enviando, setEnviando] = useState(false);
    const [error, setError] = useState('');

    async function entrar(e) {
        e.preventDefault();
        setError('');
        setAviso('');
        setEnviando(true);
        const { error } = await supabase.auth.signInWithPassword({ email: correo.trim(), password: clave });
        setEnviando(false);
        if (!error) return;
        if (error.message === 'Invalid login credentials') setError('Correo o contraseña incorrectos.');
        else if (error.message.toLowerCase().includes('banned')) setError('Tu usuario está desactivado. Consulta con el administrador.');
        else setError('No se pudo iniciar sesión. Revisa tu conexión e inténtalo de nuevo.');
    }

    return (
        <main className="centrado">
            <form className="tarjeta tarjeta-login" onSubmit={entrar}>
                <img src="/favicon.svg" alt="" width="56" height="56" />
                <h1>CRM EKAM</h1>
                <p className="texto-suave">Ingresa con el usuario que te dio el administrador.</p>

                {(error || aviso) && <p className="alerta alerta-error" role="alert">{error || aviso}</p>}

                <label className="campo">
                    <span>Correo</span>
                    <input type="email" autoComplete="username" required value={correo}
                        onChange={(e) => setCorreo(e.target.value)} />
                </label>
                <label className="campo">
                    <span>Contraseña</span>
                    <input type="password" autoComplete="current-password" required value={clave}
                        onChange={(e) => setClave(e.target.value)} />
                </label>
                <button className="boton boton-principal boton-ancho" disabled={enviando}>
                    {enviando ? 'Ingresando…' : 'Ingresar'}
                </button>
                <p className="texto-suave texto-pequeno">¿Olvidaste tu contraseña? Pide al administrador que la restablezca.</p>
            </form>
        </main>
    );
}
