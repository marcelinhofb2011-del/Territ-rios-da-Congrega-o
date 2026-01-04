import React, { useState, useRef, useCallback, useEffect } from 'react';

// Subcomponente para o visualizador de imagens interativo
const InteractiveImageViewer: React.FC<{ src: string; alt: string }> = ({ src, alt }) => {
    const [scale, setScale] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
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
            className="w-full h-full bg-gray-200 overflow-hidden relative touch-none cursor-grab active:cursor-grabbing"
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpOrLeave}
            onMouseLeave={handleMouseUpOrLeave}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            <div
                className="w-full h-full flex items-center justify-center"
                style={{
                    transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                    transition: 'transform 0.1s ease-out',
                    willChange: 'transform'
                }}
            >
                <img src={src} alt={alt} className="max-w-[95vw] max-h-[95vh] object-contain shadow-lg" />
            </div>

            <div className="absolute bottom-5 right-5 z-10 bg-white/30 backdrop-blur-md p-2 rounded-2xl flex flex-col gap-2 border border-white/20 shadow-lg">
                 <button onClick={zoomIn} title="Ampliar" className="w-12 h-12 flex items-center justify-center bg-gray-800/80 text-white rounded-xl hover:bg-gray-900 transition-colors"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"></path></svg></button>
                 <button onClick={zoomOut} title="Reduzir" className="w-12 h-12 flex items-center justify-center bg-gray-800/80 text-white rounded-xl hover:bg-gray-900 transition-colors"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20 12H4"></path></svg></button>
                 <button onClick={resetView} title="Redefinir" className="w-12 h-12 flex items-center justify-center bg-gray-800/80 text-white rounded-xl hover:bg-gray-900 transition-colors"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h5M20 20v-5h-5M4 20h5v-5M20 4h-5v5"></path></svg></button>
            </div>
        </div>
    );
};


const MapViewerModal: React.FC<{ url: string; name: string; onClose: () => void }> = ({ url, name, onClose }) => {
    const cleanUrl = url.split('?')[0].toLowerCase();
    const isPdf = cleanUrl.endsWith('.pdf');
    const isImage = /\.(jpeg|jpg|gif|png|webp)$/i.test(cleanUrl);
    
    const viewerUrl = isPdf ? `https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true` : url;

    const modalRef = useRef<HTMLDivElement>(null);
    const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);

    const toggleFullscreen = () => {
        if (!modalRef.current) return;
        if (!document.fullscreenElement) {
            modalRef.current.requestFullscreen().catch(err => {
                alert(`Erro ao entrar em tela cheia: ${err.message}`);
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

    const modalWrapperClasses = "fixed inset-0 z-50 bg-gray-900 bg-opacity-50 backdrop-blur-sm animate-in fade-in";
    const modalContainerClasses = "bg-white w-full h-full flex flex-col overflow-hidden";

    return (
        <div className={modalWrapperClasses} ref={modalRef}>
            <div className={modalContainerClasses} style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)'}}>
                <header className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
                    <h2 className="text-lg font-black text-gray-800 truncate pr-4">{name}</h2>
                    <div className="flex items-center gap-2">
                         <button 
                            onClick={toggleFullscreen}
                            className="text-gray-500 hover:text-gray-800 p-2 rounded-full transition-colors" 
                            title={isFullscreen ? "Sair da Tela Cheia" : "Tela Cheia"}
                        >
                            {isFullscreen ? (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 4H4v4m12 0V4h-4M8 20H4v-4m12 0v4h-4"></path></svg>
                            ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4h4m12 0h-4v4M4 16v4h4m12 0h-4v-4"></path></svg>
                            )}
                        </button>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-800 text-3xl font-bold leading-none p-2 rounded-full transition-colors">&times;</button>
                    </div>
                </header>
                <div className="flex-grow w-full h-full bg-gray-200 flex items-center justify-center p-2">
                    {isImage ? (
                        <InteractiveImageViewer src={url} alt={`Mapa ${name}`} />
                    ) : isPdf ? (
                        <iframe
                            src={viewerUrl}
                            className="w-full h-full border-0 rounded-lg shadow-xl"
                            title={`Mapa ${name}`}
                            sandbox="allow-scripts allow-same-origin"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <div className="text-center p-8">
                                <p className="font-bold text-gray-700 mb-4">Não é possível pré-visualizar este formato.</p>
                                <a href={url} target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700">
                                    Abrir em Nova Aba
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