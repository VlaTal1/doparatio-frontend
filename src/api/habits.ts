import apiClient from './client';
import { HabitDTO, HabitLogDTO } from '../types';

export const habitsApi = {
  getAll: () =>
    apiClient.get<HabitDTO[]>('/api/habit').then((r) => r.data),

  getById: (id: number) =>
    apiClient.get<HabitDTO>(`/api/habit/${id}`).then((r) => r.data),

  create: (habit: Omit<HabitDTO, 'id' | 'userId' | 'logs' | 'active'>) =>
    apiClient.post<HabitDTO>('/api/habit/', habit).then((r) => r.data),

  update: (id: number, habit: Omit<HabitDTO, 'id' | 'userId' | 'logs'>) =>
    apiClient.put<HabitDTO>(`/api/habit/${id}`, habit).then((r) => r.data),

  delete: (id: number) =>
    apiClient.delete(`/api/habit/${id}`),

  log: (id: number, logDate: string) =>
    apiClient.post<HabitLogDTO>(`/api/habit/${id}/log`, { logDate }).then((r) => r.data),

  cancelLog: (id: number, logDate: string) =>
    apiClient.delete<HabitLogDTO | void>(`/api/habit/${id}/log`, { data: { logDate } }).then((r) => r.data),
};
