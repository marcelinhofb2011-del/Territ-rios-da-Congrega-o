
import { supabase } from '../supabase/client';
import { User, Territory, TerritoryStatus, RequestStatus, TerritoryRequest, Notification, TerritoryHistory } from '../types';
import { GoogleGenAI } from "@google/genai";
import { AuthResponse } from '@supabase/supabase-js';

// --- AUTH FUNCTIONS ---

export const apiLogin = async (email: string, pass: string): Promise<void> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) throw new Error(error.message);
};

export const apiSignUp = async (name: string, email: string, pass: string): Promise<AuthResponse['data']> => {
    const { data: signUpData, error: authError } = await supabase.auth.signUp({ 
        email, 
        password: pass,
        options: {
            data: {
                name: name
            }
        }
    });

    if (authError) throw new Error(authError.message);
    if (!signUpData.user) throw new Error("Cadastro falhou, usuário não criado.");
    
    return signUpData;
};

export const apiLogout = async (): Promise<void> => {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
};

// --- USER MANAGEMENT ---

export const fetchAllUsers = async (): Promise<User[]> => {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('name', { ascending: true });

    if (error) throw new Error(error.message);
    return data.map(u => ({
        id: u.auth_id,
        name: u.name,
        email: u.email,
        role: u.role
    }));
};

export const updateUserRole = async (userId: string, newRole: 'admin' | 'publicador'): Promise<void> => {
    const { error } = await supabase
        .from('users')
        .update({ role: newRole })
        .eq('auth_id', userId);

    if (error) throw new Error(error.message);
};

// --- AI FUNCTIONS ---

export const generateAppIllustration = async (): Promise<string | null> => {
    try {
        // Proteção contra erro de referência se process.env não existir
        const apiKey = typeof process !== 'undefined' && process.env ? process.env.API_KEY : null;
        if (!apiKey) {
            console.warn("API_KEY não encontrada para gerar ilustração.");
            return null;
        }

        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    {
                        text: 'A clean, modern, high-quality isometric 3D illustration of a city map with stylized territory markers in blue and green. Professional aesthetic, soft lighting, minimalist background, suitable for a mobile app dashboard. High resolution, 4k, digital art style.',
                    },
                ],
            },
            config: {
                imageConfig: {
                    aspectRatio: "1:1"
                }
            },
        });

        if (response.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    return `data:image/png;base64,${part.inlineData.data}`;
                }
            }
        }
        return null;
    } catch (error) {
        console.error("Error generating AI image:", error);
        return null;
    }
};

// --- DATA TRANSFORMATION ---
const fromSupabaseToTerritory = (data: any): Territory => ({
    id: data.id,
    name: data.name,
    status: data.status,
    pdfUrl: data.pdf_url,
    createdAt: new Date(data.created_at),
    assignedTo: data.assigned_to,
    assignedToName: data.assigned_to_name,
    assignmentDate: data.assignment_date ? new Date(data.assignment_date) : null,
    dueDate: data.due_date ? new Date(data.due_date) : null,
    history: data.history?.map((h: any) => ({
        ...h,
        completedDate: new Date(h.completedDate),
    })) || [],
    permanentNotes: data.permanent_notes,
});

// --- TERRITORY FUNCTIONS ---

export const fetchAllTerritories = async (): Promise<Territory[]> => {
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();

    try {
        await supabase
            .from('territories')
            .update({ status: TerritoryStatus.AVAILABLE })
            .eq('status', TerritoryStatus.CLOSED)
            .lt('history[0]->>completedDate', sixtyDaysAgo);
    } catch (e) {
        console.warn("Could not update cooldowns automatically");
    }

    const { data, error } = await supabase
        .from('territories')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []).map(fromSupabaseToTerritory);
};

export const uploadTerritory = async (name: string, file: File): Promise<void> => {
    const cleanName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
    const filePath = `${Date.now()}_${cleanName}`;
    
    const { error: uploadError } = await supabase.storage
        .from('maps')
        .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
        });

    if (uploadError) {
        throw new Error(`Falha no Storage: ${uploadError.message}`);
    }

    const { data: urlData } = supabase.storage
        .from('maps')
        .getPublicUrl(filePath);

    const { error: insertError } = await supabase
        .from('territories')
        .insert({
            name,
            pdf_url: urlData.publicUrl,
            status: TerritoryStatus.AVAILABLE,
            history: [],
        });
    
    if (insertError) throw new Error(`Erro ao salvar registro: ${insertError.message}`);
};

export const fetchPublisherData = async (userId: string): Promise<{ myTerritory: Territory | null, hasPendingRequest: boolean }> => {
    const { data: territoryData, error: territoryError } = await supabase
        .from('territories')
        .select('*')
        .eq('assigned_to', userId)
        .eq('status', TerritoryStatus.IN_USE)
        .limit(1);

    if (territoryError) throw new Error(territoryError.message);

    const { data: requestData, error: requestError } = await supabase
        .from('requests')
        .select('id')
        .eq('user_id', userId)
        .eq('status', RequestStatus.PENDING)
        .limit(1);

    if (requestError) throw new Error(requestError.message);

    const myTerritory = territoryData && territoryData.length > 0 ? fromSupabaseToTerritory(territoryData[0]) : null;
    const hasPendingRequest = requestData && requestData.length > 0;
    
    return { myTerritory, hasPendingRequest };
};

export const submitReport = async (user: User, territory: Territory, notes: string): Promise<void> => {
    const newHistoryEntry: TerritoryHistory = {
        userId: user.id,
        userName: user.name,
        completedDate: new Date(),
        notes
    };

    const updatedHistory = [newHistoryEntry, ...(territory.history || [])];

    const { error } = await supabase
        .from('territories')
        .update({
            status: TerritoryStatus.CLOSED,
            assigned_to: null,
            assigned_to_name: null,
            assignment_date: null,
            due_date: null,
            history: updatedHistory
        })
        .eq('id', territory.id);

    if (error) throw new Error(error.message);
};

export const updateTerritory = async (territoryId: string, data: { name?: string; permanentNotes?: string; }): Promise<void> => {
    const updateData = {
        name: data.name,
        permanent_notes: data.permanentNotes
    }
    const { error } = await supabase
        .from('territories')
        .update(updateData)
        .eq('id', territoryId);

    if (error) throw new Error(error.message);
};

export const deleteTerritory = async (territoryId: string): Promise<void> => {
    const { error } = await supabase
        .from('territories')
        .delete()
        .eq('id', territoryId);

    if (error) throw new Error(error.message);
};

// --- REQUEST FUNCTIONS ---

export const requestTerritory = async (user: User): Promise<void> => {
    const { data: existing, error: checkError } = await supabase
        .from('requests')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', RequestStatus.PENDING);

    if (checkError) throw new Error(checkError.message);
    if (existing && existing.length > 0) throw new Error("Você já tem uma solicitação pendente.");

    const { error } = await supabase
        .from('requests')
        .insert({
            user_id: user.id,
            user_name: user.name,
            status: RequestStatus.PENDING
        });

    if (error) throw new Error(error.message);
};

export const fetchAllRequests = async (): Promise<TerritoryRequest[]> => {
    const { data, error } = await supabase
        .from('requests')
        .select('*')
        .eq('status', RequestStatus.PENDING)
        .order('request_date', { ascending: true });

    if (error) throw new Error(error.message);
    return (data || []).map(r => ({
        id: r.id,
        userId: r.user_id,
        userName: r.user_name,
        status: r.status,
        requestDate: new Date(r.request_date),
    }));
};

export const assignTerritoryToRequest = async (requestId: string, territoryId: string): Promise<void> => {
    const { data: request, error: requestError } = await supabase
        .from('requests')
        .select('user_id, user_name')
        .eq('id', requestId)
        .single();
    
    if (requestError || !request) throw new Error("Solicitação não encontrada");
    
    const assignmentDate = new Date();
    const dueDate = new Date(assignmentDate.getTime() + 30 * 24 * 60 * 60 * 1000);

    const { error: territoryError } = await supabase
        .from('territories')
        .update({
            status: TerritoryStatus.IN_USE,
            assigned_to: request.user_id,
            assigned_to_name: request.user_name,
            assignment_date: assignmentDate.toISOString(),
            due_date: dueDate.toISOString()
        })
        .eq('id', territoryId);

    if (territoryError) throw new Error(territoryError.message);

    await rejectRequest(requestId);
};

export const rejectRequest = async (requestId: string): Promise<void> => {
    const { error } = await supabase
        .from('requests')
        .delete()
        .eq('id', requestId);

    if (error) throw new Error(error.message);
};

// --- NOTIFICATION FUNCTIONS ---

export const fetchNotifications = async (user: User): Promise<Notification[]> => {
    let notifications: Notification[] = [];
    if (user.role === 'admin') {
        try {
            const requests = await fetchAllRequests();
            requests.forEach(req => {
                notifications.push({
                    id: `notif_req_${req.id}`,
                    message: `${req.userName} solicitou um novo território.`,
                    type: 'info',
                    read: false,
                    createdAt: req.requestDate
                });
            });
        } catch (e) {}
    }

    const { data } = await supabase
        .from('territories')
        .select('*')
        .eq('assigned_to', user.id)
        .eq('status', TerritoryStatus.IN_USE);

    if (data) {
        data.forEach(t => {
            const territory = fromSupabaseToTerritory(t);
            if (territory.dueDate) {
                const daysRemaining = Math.ceil((territory.dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                if (daysRemaining <= 7) {
                     notifications.push({
                        id: `notif_due_${territory.id}`,
                        message: `Seu território "${territory.name}" vence em ${daysRemaining} dia(s).`,
                        type: daysRemaining <= 0 ? 'warning' : 'info',
                        read: false,
                        createdAt: new Date()
                    });
                }
            }
        });
    }

    return notifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
};

export const markNotificationsAsRead = async (notificationIds: string[]): Promise<void> => {
    return Promise.resolve();
};
