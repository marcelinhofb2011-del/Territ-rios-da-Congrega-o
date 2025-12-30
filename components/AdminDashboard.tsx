import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Territory, TerritoryRequest, TerritoryStatus, User, RequestStatus } from '../types';
import { 
    fetchAllTerritories, fetchAllRequests, assignTerritoryToRequest, rejectRequest, uploadTerritory, 
    updateTerritory, deleteTerritory, fetchAllUsers, updateUserRole, createTerritory 
} from '../services/api';
import { formatDate, isRecentWork } from '../utils/helpers';

// --- MODAIS ---

const TerritoryHistoryModal: React.FC<{ territory: Territory; onClose: () => void; }> = ({ territory, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl p-8 w-full max-w-2xl shadow-2xl animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-black text-gray-800">Histórico: {territory.name}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-800 text-3xl transition-colors">&times;</button>
                </div>
                <div className="max-h-[60vh] overflow-y-auto pr-2 no-scrollbar">
                    {territory.history && territory.history.length > 0 ? (
                        <ul className="space-y-4">
                            {territory.history.slice().map((entry, index) => (
                                <li key={index} className="border-b border-gray-50 pb-4 last:border-0">
                                    <div className="flex justify-between items-start mb-1">
                                        <p className="font-bold text-gray-800">{entry.userName || 'Publicador'}</p>
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-tighter">{