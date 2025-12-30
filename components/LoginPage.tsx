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
      <style>{`
        @keyframes pulse-slow {
          0%, 100% { transform: scale(1); opacity: 0.98; }
          50% { transform: scale(1.03); opacity: 1; }
        }
        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }
      `}</style>

      {/* Esquerda: Formulário */}
      <div className="flex flex-col justify-center flex-1 px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
        <div className="w-full max-w-sm mx-auto lg:w-96">
          <div className="text-center lg:text-left">
            <div className="mb-8 lg:hidden flex justify-center">
              <div className="text-8xl p-8 bg-blue-50 rounded-[3rem] border-4 border-blue-100 shadow-2xl">
                 🗺️
              </div>
            </div>
            <h2 className="text-3xl font-black text-gray-900 tracking-tight">
              {isLogin ? 'Bem-vindo' : 'Crie sua conta'}
            </h2>
            <p className="mt-2 text-sm text-gray-500 font-medium">
              {isLogin ? 'Gerencie os territórios da sua congregação' : 'Cadastre-se para começar a gerenciar seus territórios'}
            </p>
          </div>

          <div className="mt-8">
            <div className="flex p-1 bg-gray-100 rounded-xl mb-6">
              <button 
                type="button"
                onClick={() => toggleMode(true)} 
                className={`w-1/2 py-2 text-sm font-bold rounded-lg transition-all ${isLogin ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Entrar
              </button>
              <button 
                type="button"
                onClick={() => toggleMode(false)} 
                className={`w-1/2 py-2 text-sm font-bold rounded-lg transition-all ${!isLogin ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Cadastrar
              </button>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded-md animate-bounce">
                  <p className="text-xs text-red-600 font-bold">{error}</p>
                </div>
              )}

              {success && (
                <div className="bg-green-50 border-l-4 border-green-500 p-3 rounded-md">
                  <p className="text-xs text-green-600 font-bold">{success}</p>
                </div>
              )}
              
              {!isLogin && (
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-700 uppercase ml-1">Nome Completo</label>
                  <input
                    type="text" required
                    className="block w-full px-4 py-3 border border-gray-200 bg-gray-50 text-gray-900 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none font-medium"
                    placeholder="Ex: João Silva" value={name} onChange={(e) => setName(e.target.value)}
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-700 uppercase ml-1">E-mail</label>
                <input
                  type="email" required
                  className="block w-full px-4 py-3 border border-gray-200 bg-gray-50 text-gray-900 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none font-medium"
                  placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-700 uppercase ml-1">Senha</label>
                <input
                  type="password" required
                  className="block w-full px-4 py-3 border border-gray-200 bg-gray-50 text-gray-900 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none font-medium"
                  placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-4 px-4 border border-transparent text-sm font-black rounded-xl text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200 transition-all transform active:scale-95 disabled:bg-blue-300 shadow-xl"
                >
                  {loading ? (
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (isLogin ? 'Entrar no Sistema' : 'Criar Conta')}
                </button>
              </div>
            </form>
          </div>
          
          <div className="mt-12 text-center lg:text-left text-xs font-bold text-gray-300 tracking-widest uppercase">
            territorio v1.7
          </div>
        </div>
      </div>

      {/* Direita: Ilustração */}
      <div className="hidden lg:block relative flex-1 w-0">
        <div className="absolute inset-0 bg-blue-600 flex items-center justify-center overflow-hidden">
          <div className="relative w-full max-w-lg animate-pulse-slow p-12 text-[20rem] text-center filter drop-shadow-2xl">
             🗺️
          </div>
          
          <div className="absolute bottom-12 left-12 right-12 text-white">
             <h3 className="text-3xl font-black mb-2">Seus territórios, organizados.</h3>
             <p className="text-blue-100 font-medium max-w-md">Controle de datas, mapas digitais e relatórios em um só lugar, acessível de qualquer dispositivo.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;