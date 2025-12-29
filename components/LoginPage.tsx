
import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { generateAppIllustration } from '../services/api';

const LoginPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [illustrationUrl, setIllustrationUrl] = useState<string | null>(null);
  const { login, signUp } = useAuth();

  useEffect(() => {
    const fetchIllustration = async () => {
      const url = await generateAppIllustration();
      if (url) setIllustrationUrl(url);
    };
    fetchIllustration();
  }, []);

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
        // O usuário será logado e redirecionado automaticamente pelo AuthContext.
        // Não precisamos mais de mensagens de sucesso ou redirecionamento manual aqui.
      }
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-white">
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
            Gerenciador de Territórios v1.4
          </div>
        </div>
      </div>

      {/* Right Side: Illustration */}
      <div className="hidden lg:block relative flex-1 w-0">
        <div className="absolute inset-0 bg-blue-600 flex items-center justify-center p-12 overflow-hidden">
          {illustrationUrl ? (
            <div className="relative w-full max-w-2xl transform hover:scale-105 transition-transform duration-700">
               <div className="absolute -inset-4 bg-white/10 blur-3xl rounded-full animate-pulse"></div>
               <img 
                 src={illustrationUrl} 
                 alt="Ilustração de Mapas" 
                 className="relative z-10 w-full h-auto rounded-3xl shadow-2xl border-4 border-white/20"
               />
            </div>
          ) : (
            <div className="flex flex-col items-center text-white/50 animate-pulse">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-32 w-32 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                <p className="text-xl font-medium">Gerando sua visualização...</p>
            </div>
          )}
          
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
