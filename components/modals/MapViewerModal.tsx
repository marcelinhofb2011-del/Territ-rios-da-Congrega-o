import React, { useState } from 'react';

const MapViewerModal: React.FC<{ url: string; name: string; onClose: () => void }> = ({ url, name, onClose }) => {
    const [isFullscreen, setIsFullscreen] = useState(false);

    const cleanUrl = url.split('?')[0].toLowerCase();
    const isPdf = cleanUrl.endsWith('.pdf');
    const isImage = /\.(jpeg|jpg|gif|png|webp)$/i.test(cleanUrl);
    
    const viewerUrl = isPdf ? `https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true` : url;

    const modalWrapperClasses = isFullscreen
        ? "fixed inset-0 z-50 bg-gray-900"
        : "fixed inset-0 bg-gray-900 bg-opacity-80 flex flex-col items-center justify-center z-50 p-2 sm:p-4 backdrop-blur-sm animate-in fade-in";
    
    const modalContainerClasses = isFullscreen
        ? "bg-white w-full h-full flex flex-col overflow-hidden"
        : "bg-white rounded-3xl w-full h-full max-w-6xl flex flex-col overflow-hidden shadow-2xl";

    return (
        <div className={modalWrapperClasses}>
            <div className={modalContainerClasses}>
                <header className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
                    <h2 className="text-lg font-black text-gray-800 truncate pr-4">{name}</h2>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => setIsFullscreen(!isFullscreen)} 
                            className="text-gray-500 hover:text-gray-800 p-2 rounded-full transition-colors" 
                            title={isFullscreen ? "Restaurar" : "Tela Cheia"}
                        >
                            {isFullscreen ? (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 4H4v4m12 0V4h-4M8 20H4v-4m12 0v4h-4"></path></svg>
                            ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4h4m12 0h-4v4M4 16v4h4m12 0h-4v-4"></path></svg>
                            )}
                        </button>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-800 text-3xl font-bold leading-none p-2 rounded-full transition-colors -mr-2">&times;</button>
                    </div>
                </header>
                <div className="flex-grow w-full h-full bg-gray-200 flex items-center justify-center">
                    {isPdf ? (
                        <iframe
                            src={viewerUrl}
                            className="w-full h-full border-0"
                            title={`Mapa ${name}`}
                            sandbox="allow-scripts allow-same-origin"
                        />
                    ) : isImage ? (
                        <img src={url} alt={`Mapa ${name}`} className="max-w-full max-h-full object-contain" />
                    ) : (
                        <div className="text-center p-8">
                            <p className="font-bold text-gray-700 mb-4">Não é possível pré-visualizar este formato.</p>
                            <a href={url} target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700">
                                Abrir em Nova Aba
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MapViewerModal;
