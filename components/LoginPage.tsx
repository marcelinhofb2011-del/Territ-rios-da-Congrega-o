
import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

const LoginPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, signUp } = useAuth();

  const toggleMode = (loginMode: boolean) => {
    setIsLogin(loginMode);
    setName('');
    setEmail('');
    setPassword('');
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await signUp(name, email, password);
      }
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-white">
      {/* Estilos para a pulsação lenta */}
      <style>{`
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.85; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.03); }
        }
        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }
      `}</style>

      {/* Left Side: Form */}
      <div className="flex flex-col justify-center flex-1 px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
        <div className="w-full max-w-sm mx-auto lg:w-96">
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-xl mb-4 lg:hidden">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
              {isLogin ? 'Bem-vindo de volta' : 'Crie sua conta'}
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              {isLogin ? 'Gerencie os territórios da sua congregação com facilidade' : 'Cadastre-se para começar a gerenciar seus territórios'}
            </p>
          </div>

          <div className="mt-8">
            <div className="flex p-1 bg-gray-100 rounded-xl mb-6">
              <button 
                type="button"
                onClick={() => toggleMode(true)} 
                className={`w-1/2 py-2 text-sm font-semibold rounded-lg transition-all ${isLogin ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Entrar
              </button>
              <button 
                type="button"
                onClick={() => toggleMode(false)} 
                className={`w-1/2 py-2 text-sm font-semibold rounded-lg transition-all ${!isLogin ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Cadastrar
              </button>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              {error && (
                <div className="flex items-center bg-red-50 border-l-4 border-red-500 p-3 rounded-md">
                  <p className="text-xs text-red-600 font-medium">{error}</p>
                </div>
              )}

              {success && (
                <div className="flex items-center bg-green-50 border-l-4 border-green-500 p-3 rounded-md">
                  <p className="text-xs text-green-600 font-medium">{success}</p>
                </div>
              )}
              
              {!isLogin && (
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-700 uppercase ml-1">Nome Completo</label>
                  <input
                    type="text" required
                    className="block w-full px-4 py-3 border border-gray-200 bg-gray-50 text-gray-900 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                    placeholder="Ex: João Silva" value={name} onChange={(e) => setName(e.target.value)}
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-700 uppercase ml-1">E-mail</label>
                <input
                  type="email" required
                  className="block w-full px-4 py-3 border border-gray-200 bg-gray-50 text-gray-900 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                  placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-700 uppercase ml-1">Senha</label>
                <input
                  type="password" required
                  className="block w-full px-4 py-3 border border-gray-200 bg-gray-50 text-gray-900 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                  placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200 transition-all transform active:scale-95 disabled:bg-blue-300 shadow-lg"
                >
                  {loading ? (
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (isLogin ? 'Acessar Sistema' : 'Criar minha Conta')}
                </button>
              </div>
            </form>
          </div>
          
          <div className="mt-12 text-center lg:text-left text-xs text-gray-400">
            Gerenciador de Territórios v1.5
          </div>
        </div>
      </div>

      {/* Right Side: Map Illustration with Pulse */}
      <div className="hidden lg:block relative flex-1 w-0">
        <div className="absolute inset-0 bg-blue-600 flex items-center justify-center overflow-hidden">
          {/* Desenho do Mapa com Pulsação */}
          <div className="relative w-full max-w-2xl animate-pulse-slow p-12">
             <svg width="100%" height="100%" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-2xl opacity-90">
                <rect width="512" height="512" rx="48" fill="#1E40AF" />
                {/* Malha de Ruas */}
                <path d="M0 100H512" stroke="white" strokeWidth="12" strokeOpacity="0.2" />
                <path d="M0 200H512" stroke="white" strokeWidth="20" strokeOpacity="0.3" />
                <path d="M0 300H512" stroke="white" strokeWidth="12" strokeOpacity="0.2" />
                <path d="M0 400H512" stroke="white" strokeWidth="12" strokeOpacity="0.2" />
                
                <path d="M100 0V512" stroke="white" strokeWidth="12" strokeOpacity="0.2" />
                <path d="M256 0V512" stroke="white" strokeWidth="20" strokeOpacity="0.3" />
                <path d="M400 0V512" stroke="white" strokeWidth="12" strokeOpacity="0.2" />

                {/* Marcador Principal */}
                <path d="M256 160C222.863 160 196 186.863 196 220C196 265 256 320 256 320C256 320 316 265 316 220C316 186.863 289.137 160 256 160Z" fill="#EF4444" />
                <circle cx="256" cy="220" r="24" fill="white" />

                {/* Marcadores Menores Secundários */}
                <circle cx="120" cy="150" r="10" fill="#EF4444" opacity="0.6" />
                <circle cx="380" cy="350" r="10" fill="#EF4444" opacity="0.6" />
                <circle cx="420" cy="120" r="10" fill="#EF4444" opacity="0.6" />
             </svg>
          </div>
          
          <div className="absolute bottom-12 left-12 right-12 text-white">
             <h3 className="text-2xl font-bold mb-2">Seus territórios, organizados.</h3>
             <p className="text-blue-100 max-w-md">Controle de datas, mapas digitais e relatórios em um só lugar, acessível de qualquer dispositivo.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
