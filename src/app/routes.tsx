import { createBrowserRouter } from 'react-router';
import { Home } from './pages/Home';
import { PersonProfile } from './pages/PersonProfile';
import { CalendarioFamiliar } from './pages/CalendarioFamiliar';
import { AdminLogin } from './pages/admin/AdminLogin';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminPessoas } from './pages/admin/AdminPessoas';
import { AdminPessoaForm } from './pages/admin/AdminPessoaForm';
import { AdminRelacionamentos } from './pages/admin/AdminRelacionamentos';
import { AdminImportacao } from './pages/admin/AdminImportacao';
import { AdminMigrarDados } from './pages/admin/AdminMigrarDados';
import { AdminDiagnostico } from './pages/admin/AdminDiagnostico';
import { ProtectedRoute } from './components/ProtectedRoute';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Home />,
  },
  {
    path: '/pessoa/:id',
    element: <PersonProfile />,
  },
  {
    path: '/calendario-familiar',
    element: <CalendarioFamiliar />,
  },
  {
    path: '/admin',
    element: <ProtectedRoute><AdminDashboard /></ProtectedRoute>,
  },
  {
    path: '/admin/login',
    element: <AdminLogin />,
  },
  {
    path: '/admin/dashboard',
    element: <ProtectedRoute><AdminDashboard /></ProtectedRoute>,
  },
  {
    path: '/admin/pessoas',
    element: <ProtectedRoute><AdminPessoas /></ProtectedRoute>,
  },
  {
    path: '/admin/pessoas/nova',
    element: <ProtectedRoute><AdminPessoaForm /></ProtectedRoute>,
  },
  {
    path: '/admin/pessoas/:id/editar',
    element: <ProtectedRoute><AdminPessoaForm /></ProtectedRoute>,
  },
  {
    path: '/admin/relacionamentos',
    element: <ProtectedRoute><AdminRelacionamentos /></ProtectedRoute>,
  },
  {
    path: '/admin/importacao',
    element: <ProtectedRoute><AdminImportacao /></ProtectedRoute>,
  },
  {
    path: '/admin/migrar-dados',
    element: <ProtectedRoute><AdminMigrarDados /></ProtectedRoute>,
  },
  {
    path: '/admin/diagnostico',
    element: <ProtectedRoute><AdminDiagnostico /></ProtectedRoute>,
  },
  {
    path: '*',
    element: <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">404</h1>
        <p className="text-gray-600 mb-4">Página não encontrada</p>
        <a href="/" className="text-blue-600 hover:underline">Voltar para home</a>
      </div>
    </div>,
  },
]);