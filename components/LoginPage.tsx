
import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { MapIcon } from './Icon';

const LoginPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isResetting, setIsResetting] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, signUp, resetPassword, loginWithGoogle } = useAuth();

  const handleGoogleLogin = async () => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setError(err.message || 'Erro ao entrar com Google.');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = (loginMode: boolean) => {
    setIsLogin(loginMode);
    setIsResetting(false);
    setName('');
    setEmail('');
    setPassword('');
    setError('');
    setSuccess('');
  };

  const handleResetPassword = async () => {
    if (!email.trim()) {
      setError("Por favor, insira seu e-mail para recuperar a senha.");
      return;
    }
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await resetPassword(email);
      setSuccess("E-mail de recuperação enviado! Verifique sua caixa de entrada.");
      setIsResetting(false);
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar e-mail de recuperação.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isResetting) {
      await handleResetPassword();
      return;
    }

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
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full shadow-xl border border-slate-200 mb-4 overflow-hidden">
            <MapIcon className="w-full h-full"/>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">territorio</h1>
          <p className="text-slate-600 font-bold mt-2">Gestão Inteligente de Congregação</p>
        </div>

        {/* Card Form */}
        <div className="bg-white rounded-[2rem] shadow-2xl shadow-slate-300/50 p-8 sm:p-10 border border-slate-200">
          <div className="flex p-1.5 bg-slate-100 rounded-2xl mb-8">
            <button 
              type="button"
              onClick={() => toggleMode(true)}
              className={`flex-1 py-3 text-sm font-black rounded-xl transition-all ${isLogin && !isResetting ? 'bg-white text-blue-600 shadow-md ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}`}
            >
              ENTRAR
            </button>
            <button 
              type="button"
              onClick={() => toggleMode(false)}
              className={`flex-1 py-3 text-sm font-black rounded-xl transition-all ${!isLogin && !isResetting ? 'bg-white text-blue-600 shadow-md ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}`}
            >
              CADASTRAR
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 text-red-700 rounded-2xl text-xs font-black border border-red-200 animate-in fade-in slide-in-from-top-1">
                {error.toUpperCase()}
              </div>
            )}
            
            {success && (
              <div className="p-4 bg-emerald-50 text-emerald-700 rounded-2xl text-xs font-black border border-emerald-200 animate-in fade-in slide-in-from-top-1">
                {success.toUpperCase()}
              </div>
            )}

            {!isLogin && !isResetting && (
              <div>
                <label className="block text-[11px] font-black text-slate-600 uppercase tracking-widest mb-2 ml-1">Nome Completo</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={e => setName(e.target.value)}
                  className="w-full px-5 py-4 bg-white border border-slate-300 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none font-bold transition-all placeholder-slate-400 text-slate-900 shadow-sm" 
                  placeholder="Seu nome"
                  required 
                />
              </div>
            )}

            <div>
              <label className="block text-[11px] font-black text-slate-600 uppercase tracking-widest mb-2 ml-1">E-mail Institucional</label>
              <input 
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)}
                className="w-full px-5 py-4 bg-white border border-slate-300 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none font-bold transition-all placeholder-slate-400 text-slate-900 shadow-sm" 
                placeholder="exemplo@email.com"
                required 
              />
            </div>

            {!isResetting && (
              <div>
                <label className="block text-[11px] font-black text-slate-600 uppercase tracking-widest mb-2 ml-1">Senha Segura</label>
                <input 
                  type="password" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-5 py-4 bg-white border border-slate-300 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none font-bold transition-all placeholder-slate-400 text-slate-900 shadow-sm" 
                  placeholder="••••••••"
                  required 
                />
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 transition-all transform active:scale-[0.98] shadow-xl shadow-blue-200 disabled:bg-blue-300 mt-2 uppercase tracking-widest text-sm"
            >
              {loading ? 'Processando...' : (isResetting ? 'Enviar E-mail de Recuperação' : (isLogin ? 'Entrar no Sistema' : 'Criar minha Conta'))}
            </button>
          </form>

          {isLogin && !isResetting && (
            <>
              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-4 text-slate-400 font-black tracking-widest">OU</span>
                </div>
              </div>

              <button 
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full py-4 bg-white border-2 border-slate-200 text-slate-700 font-black rounded-2xl hover:bg-slate-50 transition-all transform active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                ENTRAR COM GOOGLE
              </button>
            </>
          )}

          {isLogin && !isResetting && (
            <p className="text-center mt-8 text-xs font-bold text-slate-500">
              Esqueceu sua senha? <span onClick={() => { setIsResetting(true); setError(''); setSuccess(''); }} className="text-blue-600 cursor-pointer hover:underline font-black">Recuperar</span>
            </p>
          )}
          {isResetting && (
            <p className="text-center mt-8 text-xs font-bold text-slate-500">
              Lembrou a senha? <span onClick={() => { setIsResetting(false); setError(''); setSuccess(''); }} className="text-blue-600 cursor-pointer hover:underline font-black">Voltar ao Login</span>
            </p>
          )}
        </div>
        
        <p className="text-center mt-10 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
          Territorio v1.8 &bull; 2024 Congregação Local
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
