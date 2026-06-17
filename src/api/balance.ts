import apiClient from './client';
import { UserBalanceDTO } from '../types';

export const balanceApi = {
  get: () =>
    apiClient.get<UserBalanceDTO>('/api/balance').then((r) => r.data),
};
