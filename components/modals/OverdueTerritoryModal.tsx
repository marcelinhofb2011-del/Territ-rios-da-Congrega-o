import React from 'react';

const OverdueTerritoryModal: React.FC<{ territoryName: string; onCompleteTerritory: () => void; }> = ({ territoryName, onCompleteTerritory }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl text-center animate-in fade-in zoom-in duration-300">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
                    <svg className="h-10 w-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <h2 className="text-2xl font-black mb-2 text-gray-900">Prazo Expirado!</h2>
                <p className="text-gray-600 mb-8 font-medium">
                    O prazo para trabalhar o território <strong className="text-gray-800">{territoryName}</strong> venceu. 
                    Por favor, conclua o trabalho e devolva-o agora para que outros possam recebê-lo.
                </p>
                
                <button 
                    onClick={onCompleteTerritory}
                    className="w-full py-4 bg-red-600 text-white font-black rounded-2xl hover:bg-red-700 transition-all transform active:scale-[0.98] shadow-lg shadow-red-200"
                >
                    CONCLUIR TRABALHO AGORA
                </button>
            </div>
        </div>
    );
};

export default OverdueTerritoryModal;
