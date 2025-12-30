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
      <div className="flex flex-col justify-center flex-1 px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
        <div className="w-full max-w-sm mx-auto lg:w-96">
          <div className="text-center lg:text-left">
            <div className="mb-8 lg:hidden flex justify-center">
              <div className="w-24 h-24 p-4 bg-blue-50 rounded-3xl border border-blue-100 shadow-xl">
                 <img src="map-icon.svg" alt="Logo" className="w-full h-full" />
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
                className={`w-1/2 py-2 text-sm font-bold rounded-lg transition-all ${isLogin ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
              >
                Entrar
              </button>
              <button 
                type="button"
                onClick={() => toggleMode(false)} 
                className={`w-1/2 py-2 text-sm font-bold rounded-lg transition-all ${!isLogin ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
              >
                Cadastrar
              </button>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              {error && (
                <div className="bg-red-50 p-3 rounded-xl border border-red-100">
                  <p className="text-xs text-red-600 font-bold">{error}</p>
                </div>
              )}
              
              {!isLogin && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase ml-1 mb-1">Nome Completo</label>
                  <input
                    type="text" required
                    className="block w-full px-4 py-3 border border-gray-200 bg-gray-50 text-gray-900 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium transition-all"
                    placeholder="Ex: João Silva" value={name} onChange={(e) => setName(e.target.value)}
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase ml-1 mb-1">E-mail</label>
                <input
                  type="email" required
                  className="block w-full px-4 py-3 border border-gray-200 bg-gray-50 text-gray-900 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium transition-all"
                  placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase ml-1 mb-1">Senha</label>
                <input
                  type="password" required
                  className="block w-full px-4 py-3 border border-gray-200 bg-gray-50 text-gray-900 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium transition-all"
                  placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-4 px-4 text-sm font-black rounded-xl text-white bg-blue-600 hover:bg-blue-700 transition-all transform active:scale-95 disabled:bg-blue-300 shadow-lg shadow-blue-100 mt-6"
              >
                {loading ? 'Carregando...' : (isLogin ? 'Entrar' : 'Cadastrar')}
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="hidden lg:block relative flex-1 w-0">
        <div className="absolute inset-0 bg-blue-600 flex items-center justify-center overflow-hidden">
          <div className="relative w-2/3 max-w-md p-12 bg-white/10 backdrop-blur-xl rounded-[3rem] border border-white/20 shadow-2xl">
             <img src="map-icon.svg" alt="Mapa" className="w-full h-auto drop-shadow-2xl" />
             <div className="mt-8 text-white text-center">
                <h3 className="text-3xl font-black mb-2">Simples e Moderno.</h3>
                <p className="text-blue-100 font-medium">Gestão de territórios sem complicações.</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;