import apiClient from './client';
import { TaskDTO, TaskLogDTO } from '../types';

export const tasksApi = {
  getAll: () =>
    apiClient.get<TaskDTO[]>('/api/task').then((r) => r.data),

  getForDate: (date: string) =>
    apiClient.get<TaskDTO[]>('/api/task', { params: { date } }).then((r) => r.data),

  getById: (id: number) =>
    apiClient.get<TaskDTO>(`/api/task/${id}`).then((r) => r.data),

  create: (task: Omit<TaskDTO, 'id' | 'userId' | 'logs' | 'active'>) =>
    apiClient.post<TaskDTO>('/api/task', task).then((r) => r.data),

  update: (id: number, task: Omit<TaskDTO, 'id' | 'userId' | 'logs'>) =>
    apiClient.put<TaskDTO>(`/api/task/${id}`, task).then((r) => r.data),

  delete: (id: number) =>
    apiClient.delete(`/api/task/${id}`),

  log: (id: number, logDate: string) =>
    apiClient.post<TaskLogDTO>(`/api/task/${id}/log`, { logDate }).then((r) => r.data),

  cancelLog: (id: number, logDate: string) =>
    apiClient.delete(`/api/task/${id}/log`, { data: { logDate } }),
};
