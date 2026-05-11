import { RouterProvider } from 'react-router/dom';
import { useEffect } from 'react';
import { router } from './routes';
import { Toaster } from 'sonner';
import { AuthProvider } from './contexts/AuthContext';

export default function App() {
  useEffect(() => {
    document.title = 'Família Souza Barros - Minha Árvore';
  }, []);

  return (
    <AuthProvider>
      <RouterProvider router={router} />
      <Toaster position="bottom-right" richColors />
    </AuthProvider>
  );
}
