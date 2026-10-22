import { useOutletContext } from 'react-router-dom';

/** Contexto compartido por las vistas admin (lo provee AdminLayout vía <Outlet context>). */
export const useAdmin = () => useOutletContext();
