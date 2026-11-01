import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { recordarSesion, supabase } from '../supabase.js';
import { useAuth } from '../auth.jsx';

// Prototipo 01: inicio de sesión (RF07).
export default function Login() {
    const { aviso, setAviso } = useAuth();
    const [correo, setCorreo] = useState('');
    const [clave, setClave] = useState('');
    const [recordar, setRecordar] = useState(true);
    const [olvido, setOlvido] = useState(false);
    const [enviando, setEnviando] = useState(false);
    const [error, setError] = useState('');

    async function entrar(e) {
        e.preventDefault();
        setError('');
        setAviso('');
        setEnviando(true);
        recordarSesion(recordar);
        const { error } = await supabase.auth.signInWithPassword({ email: correo.trim(), password: clave });
        setEnviando(false);
        if (!error) return;
        if (error.message === 'Invalid login credentials') setError('Correo o contraseña incorrectos.');
        else if (error.message.toLowerCase().includes('banned')) setError('Tu usuario está desactivado. Consulta con el administrador.');
        else setError('No se pudo iniciar sesión. Revisa tu conexión e inténtalo de nuevo.');
    }

    return (
        <main className="login">
            <div className="login-marca">
                <img src="/favicon.svg" alt="" width="72" height="72" />
                <strong>EKAM PERÚ</strong>
                <p>CRM de interesados · NAVASOFT ERP</p>
            </div>

            <div className="login-hoja">
                <form className="login-formulario" onSubmit={entrar}>
                    <h1>Inicia sesión</h1>
                    <p className="texto-suave login-ayuda">Ingresa con el correo que te asignó el administrador.</p>

                    {(error || aviso) && <p className="alerta alerta-error" role="alert">{error || aviso}</p>}

                    <label className="campo">
                        <span>Correo electrónico</span>
                        <input type="email" autoComplete="username" required value={correo}
                            onChange={(e) => setCorreo(e.target.value)} />
                    </label>
                    <label className="campo">
                        <span>Contraseña</span>
                        <input type="password" autoComplete="current-password" required value={clave}
                            onChange={(e) => setClave(e.target.value)} />
                    </label>

                    <div className="login-opciones">
                        <label className="campo-casilla">
                            <input type="checkbox" checked={recordar} onChange={(e) => setRecordar(e.target.checked)} />
                            <span>Recordarme</span>
                        </label>
                        <button type="button" className="enlace" aria-expanded={olvido} onClick={() => setOlvido(!olvido)}>
                            ¿Olvidaste tu contraseña?
                        </button>
                    </div>

                    {olvido && (
                        <p className="alerta alerta-aviso" role="status">
                            Pide al administrador del CRM que la restablezca desde la sección Usuarios.
                        </p>
                    )}

                    <button className="boton boton-principal boton-ancho" disabled={enviando}>
                        {enviando ? 'Ingresando…' : 'Ingresar'}
                    </button>

                    <p className="login-aviso">
                        <ShieldCheck size={18} aria-hidden="true" />
                        Acceso solo para personal autorizado de EKAM PERU S.A.C. Las cuentas las crea el administrador del CRM.
                    </p>
                </form>
            </div>
        </main>
    );
}
