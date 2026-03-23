
import React from 'react';

interface ConfirmModalProps {
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmText?: string;
    cancelText?: string;
    isDanger?: boolean;
    loading?: boolean;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
    title,
    message,
    onConfirm,
    onCancel,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    isDanger = false,
    loading = false
}) => {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
                <div className="p-6 text-center">
                    <div className={`w-12 h-12 ${isDanger ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'} rounded-full flex items-center justify-center mx-auto mb-4`}>
                        {loading ? (
                            <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                        ) : isDanger ? (
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        ) : (
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        )}
                    </div>
                    <h3 className="text-lg font-black text-slate-900 mb-2">{title}</h3>
                    <p className="text-slate-500 text-sm font-medium leading-relaxed">{message}</p>
                </div>
                <div className="flex border-t border-slate-100">
                    <button 
                        onClick={onCancel}
                        disabled={loading}
                        className="flex-1 px-4 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-colors disabled:opacity-50"
                    >
                        {cancelText}
                    </button>
                    <button 
                        onClick={onConfirm}
                        disabled={loading}
                        className={`flex-1 px-4 py-4 text-[10px] font-black uppercase tracking-widest text-white transition-colors disabled:opacity-50 ${isDanger ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                    >
                        {loading ? 'Processando...' : confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
