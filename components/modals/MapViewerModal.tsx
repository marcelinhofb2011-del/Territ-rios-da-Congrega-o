import React, { useState, useRef, useCallback, useEffect } from 'react';

// Subcomponente para o visualizador de imagens interativo
const InteractiveImageViewer: React.FC<{ src: string; alt: string; onError: () => void }> = ({ src, alt, onError }) => {
    const [scale, setScale] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const containerRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);
    const lastPanPoint = useRef({ x: 0, y: 0 });
    const lastPinchDist = useRef(0);

    const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

    // Zoom com a roda do mouse
    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        const delta = e.deltaY * -0.005;
        setScale(prevScale => clamp(prevScale + delta, 0.5, 7));
    }, []);

    // Arrastar com o mouse
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        isDragging.current = true;
        lastPanPoint.current = { x: e.clientX, y: e.clientY };
    }, []);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!isDragging.current) return;
        const dx = e.clientX - lastPanPoint.current.x;
        const dy = e.clientY - lastPanPoint.current.y;
        setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
        lastPanPoint.current = { x: e.clientX, y: e.clientY };
    }, []);

    const handleMouseUpOrLeave = useCallback(() => {
        isDragging.current = false;
    }, []);

    // Gestos de toque (Pinça e Arrastar)
    const getDistance = (touches: React.TouchList) => {
        return Math.sqrt(Math.pow(touches[0].clientX - touches[1].clientX, 2) + Math.pow(touches[0].clientY - touches[1].clientY, 2));
    };

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        if (e.touches.length === 2) {
            lastPinchDist.current = getDistance(e.touches);
        } else if (e.touches.length === 1) {
            isDragging.current = true;
            lastPanPoint.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
    }, []);
    
    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (e.touches.length === 2) {
            const newDist = getDistance(e.touches);
            const scaleFactor = newDist / lastPinchDist.current;
            setScale(prev => clamp(prev * scaleFactor, 0.5, 7));
            lastPinchDist.current = newDist;
        } else if (e.touches.length === 1 && isDragging.current) {
            const dx = e.touches[0].clientX - lastPanPoint.current.x;
            const dy = e.touches[0].clientY - lastPanPoint.current.y;
            setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
            lastPanPoint.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
    }, []);

    const handleTouchEnd = useCallback(() => {
        isDragging.current = false;
        lastPinchDist.current = 0;
    }, []);

    const zoomIn = () => setScale(s => clamp(s * 1.5, 0.5, 7));
    const zoomOut = () => setScale(s => clamp(s / 1.5, 0.5, 7));
    const resetView = () => { setScale(1); setOffset({ x: 0, y: 0 }); };

    return (
        <div
            ref={containerRef}
            className="w-full h-full bg-gray-50/50 overflow-hidden relative touch-none cursor-grab active:cursor-grabbing flex items-center justify-center"
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpOrLeave}
            onMouseLeave={handleMouseUpOrLeave}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center z-10 bg-white/80 backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-4">
                        <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full"></div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Carregando Mapa...</p>
                    </div>
                </div>
            )}
            
            <div
                className="flex items-center justify-center"
                style={{
                    transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                    transition: isDragging.current ? 'none' : 'transform 0.1s ease-out',
                    willChange: 'transform'
                }}
            >
                <img 
                    src={src} 
                    alt={alt} 
                    className={`max-w-[95vw] max-h-[95vh] object-contain shadow-2xl rounded-lg transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
                    onLoad={() => setIsLoading(false)}
                    onError={() => {
                        setIsLoading(false);
                        onError();
                    }}
                    referrerPolicy="no-referrer"
                />
            </div>

            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 bg-white/90 backdrop-blur-md px-6 py-3 rounded-2xl flex items-center gap-4 border border-white/20 shadow-2xl">
                 <button onClick={zoomOut} title="Reduzir" className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-600">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20 12H4"></path></svg>
                 </button>
                 <span className="text-xs font-black text-gray-900 min-w-[3rem] text-center">{Math.round(scale * 100)}%</span>
                 <button onClick={zoomIn} title="Ampliar" className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-600">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"></path></svg>
                 </button>
                 <div className="w-px h-6 bg-gray-200 mx-2"></div>
                 <button onClick={resetView} title="Redefinir" className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-700">Resetar</button>
            </div>
        </div>
    );
};


const MapViewerModal: React.FC<{ url: string; name: string; number?: string; onClose: () => void }> = ({ url, name, number, onClose }) => {
    const [loadError, setLoadError] = useState(false);
    
    // Improved detection logic
    const isDataUrl = url.startsWith('data:');
    const isPdf = /\.pdf($|\?)/i.test(url) || url.toLowerCase().includes('application/pdf');
    const isImage = /\.(jpeg|jpg|gif|png|webp)($|\?)/i.test(url) || url.toLowerCase().includes('image/');
    
    // Google Docs Viewer can be flaky and doesn't support Data URLs.
    // For Data URLs or if we want to try native viewing first, we use the URL directly.
    const viewerUrl = (isPdf && !isDataUrl) 
        ? `https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true` 
        : url;

    const modalRef = useRef<HTMLDivElement>(null);
    const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);

    const toggleFullscreen = () => {
        if (!modalRef.current) return;
        if (!document.fullscreenElement) {
            modalRef.current.requestFullscreen().catch(err => {
                console.error(`Erro ao entrar em tela cheia: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
    };
    
    useEffect(() => {
        const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', onFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
    }, []);

    const modalWrapperClasses = "fixed inset-0 z-50 bg-gray-900/90 backdrop-blur-md animate-in fade-in flex items-center justify-center p-4 sm:p-8";
    const modalContainerClasses = "bg-white w-full h-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden rounded-[2.5rem] shadow-2xl border border-white/20";

    return (
        <div className={modalWrapperClasses} ref={modalRef} onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className={modalContainerClasses} onClick={e => e.stopPropagation()}>
                <header className="flex items-center justify-between p-6 border-b border-gray-100 bg-white flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
                        </div>
                        <h2 className="text-xl font-black text-gray-900 truncate pr-4">
                            {number && <span className="mr-2 px-2 py-1 bg-slate-900 text-white rounded-lg text-xs">Nº {number}</span>}
                            {name}
                        </h2>
                    </div>
                    <div className="flex items-center gap-3">
                         <button 
                            onClick={toggleFullscreen}
                            className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all" 
                            title={isFullscreen ? "Sair da Tela Cheia" : "Tela Cheia"}
                        >
                            {isFullscreen ? (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 4H4v4m12 0V4h-4M8 20H4v-4m12 0v4h-4"></path></svg>
                            ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 8V4h4m12 0h-4v4M4 16v4h4m12 0h-4v-4"></path></svg>
                            )}
                        </button>
                        <button onClick={onClose} className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all text-2xl font-bold">&times;</button>
                    </div>
                </header>
                <div className="flex-grow w-full h-full bg-gray-50 flex items-center justify-center relative">
                    {loadError ? (
                        <div className="text-center p-12 max-w-sm">
                            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            </div>
                            <h3 className="text-xl font-black text-gray-900 mb-2">Ops! O mapa não carregou</h3>
                            <p className="text-gray-500 mb-8 font-medium">Não conseguimos exibir o mapa aqui. Você pode tentar abrir diretamente no seu navegador.</p>
                            <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                ABRIR MAPA DIRETO
                            </a>
                        </div>
                    ) : isImage ? (
                        <InteractiveImageViewer src={url} alt={`Mapa ${name}`} onError={() => setLoadError(true)} />
                    ) : isPdf ? (
                        isDataUrl ? (
                            <embed
                                src={url}
                                type="application/pdf"
                                className="w-full h-full"
                            />
                        ) : (
                            <iframe
                                src={viewerUrl}
                                className="w-full h-full border-0"
                                title={`Mapa ${name}`}
                                sandbox="allow-scripts allow-same-origin"
                                onError={() => setLoadError(true)}
                                referrerPolicy="no-referrer"
                            />
                        )
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <div className="text-center p-12">
                                <div className="w-20 h-20 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                </div>
                                <p className="font-black text-gray-900 text-xl mb-2">Formato não suportado para pré-visualização</p>
                                <p className="text-gray-500 mb-8 font-medium">Este arquivo precisa ser aberto externamente.</p>
                                <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-8 py-4 bg-gray-900 text-white font-black rounded-2xl hover:bg-black transition-all shadow-xl">
                                    ABRIR EM NOVA ABA
                                </a>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MapViewerModal;