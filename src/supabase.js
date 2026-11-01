import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
    throw new Error('Faltan VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY en el archivo .env (ver .env.example).');
}

const NO_RECORDAR = 'crm-no-recordar';

// "Recordarme" apagado: la sesión se guarda solo hasta cerrar el navegador.
const almacenamiento = {
    getItem: (clave) => sessionStorage.getItem(clave) ?? localStorage.getItem(clave),
    setItem: (clave, valor) => {
        const destino = localStorage.getItem(NO_RECORDAR) ? sessionStorage : localStorage;
        destino.setItem(clave, valor);
    },
    removeItem: (clave) => {
        sessionStorage.removeItem(clave);
        localStorage.removeItem(clave);
    },
};

export function recordarSesion(recordar) {
    if (recordar) localStorage.removeItem(NO_RECORDAR);
    else localStorage.setItem(NO_RECORDAR, '1');
}

export const supabase = createClient(url, key, { auth: { storage: almacenamiento } });
