import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase.js';

const AuthContext = createContext(null);

// Sesión de Supabase Auth + perfil del usuario (rol y estado) de la tabla perfiles (RF07).
export function AuthProvider({ children }) {
    const [session, setSession] = useState(undefined); // undefined mientras se lee la sesión guardada
    const [perfil, setPerfil] = useState(null);
    const [aviso, setAviso] = useState('');

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => setSession(data.session));
        const { data } = supabase.auth.onAuthStateChange((_evento, nueva) => setSession(nueva));
        return () => data.subscription.unsubscribe();
    }, []);

    const userId = session?.user?.id;

    useEffect(() => {
        if (!userId) {
            setPerfil(null);
            return;
        }
        let cancelado = false;
        supabase
            .from('perfiles')
            .select('id, nombre, rol, activo')
            .eq('id', userId)
            .maybeSingle()
            .then(({ data, error }) => {
                if (cancelado) return;
                // La política de perfiles solo deja leer a usuarios activos: un usuario
                // desactivado no recibe su propio perfil y se le cierra la sesión.
                if (error || !data || !data.activo) {
                    setAviso(error
                        ? 'No se pudo cargar tu perfil. Inténtalo de nuevo.'
                        : 'Tu usuario está desactivado. Consulta con el administrador.');
                    supabase.auth.signOut();
                    return;
                }
                setPerfil(data);
            });
        return () => { cancelado = true; };
    }, [userId]);

    const salir = useCallback(() => supabase.auth.signOut(), []);

    const cargando = session === undefined || (Boolean(session) && !perfil && !aviso);

    return (
        <AuthContext.Provider value={{
            session,
            perfil,
            esAdmin: perfil?.rol === 'administrador',
            cargando,
            aviso,
            setAviso,
            salir,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
