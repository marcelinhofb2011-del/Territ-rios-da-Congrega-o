
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
        if (!name.trim()) throw new Error("Por favor, insira seu nome.");
        await signUp(name, email, password);
        setSuccess('Conta criada com sucesso! Você já pode entrar.');
        setIsLogin(true);
      }
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo Section */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-3xl shadow-xl border border-gray-100 mb-6 text-4xl">
            🗺️
          </div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">territorio</h1>
          <p className="text-gray-500 font-bold mt-2">Gestão Inteligente de Congregação</p>
        </div>

        {/* Card Form */}
        <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-blue-100/50 p-8 sm:p-10 border border-gray-100">
          <div className="flex p-1 bg-gray-100 rounded-2xl mb-8">
            <button 
              onClick={() => toggleMode(true)}
              className={`flex-1 py-3 text-sm font-black rounded-xl transition-all ${isLogin ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}
            >
              ENTRAR
            </button>
            <button 
              onClick={() => toggleMode(false)}
              className={`flex-1 py-3 text-sm font-black rounded-xl transition-all ${!isLogin ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}
            >
              CADASTRAR
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-black border border-red-100 animate-in fade-in slide-in-from-top-1">
                {error.toUpperCase()}
              </div>
            )}
            
            {success && (
              <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl text-xs font-black border border-emerald-100 animate-in fade-in slide-in-from-top-1">
                {success.toUpperCase()}
              </div>
            )}

            {!isLogin && (
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Nome Completo</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={e => setName(e.target.value)}
                  className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-100 outline-none font-bold transition-all placeholder-gray-300" 
                  placeholder="Seu nome"
                  required 
                />
              </div>
            )}

            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">E-mail Institucional</label>
              <input 
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)}
                className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-100 outline-none font-bold transition-all placeholder-gray-300" 
                placeholder="exemplo@email.com"
                required 
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Senha Segura</label>
              <input 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)}
                className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-100 outline-none font-bold transition-all placeholder-gray-300" 
                placeholder="••••••••"
                required 
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 transition-all transform active:scale-[0.98] shadow-xl shadow-blue-200 disabled:bg-blue-300 mt-4 uppercase tracking-widest text-sm"
            >
              {loading ? 'Processando...' : (isLogin ? 'Entrar no Sistema' : 'Criar minha Conta')}
            </button>
          </form>

          {isLogin && (
            <p className="text-center mt-8 text-xs font-bold text-gray-400">
              Esqueceu sua senha? <span className="text-blue-500 cursor-pointer hover:underline">Recuperar</span>
            </p>
          )}
        </div>
        
        <p className="text-center mt-10 text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">
          Territorio v1.7 &bull; 2024 Congregação Local
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
