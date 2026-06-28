import { NativeModules, Platform } from 'react-native';
import { API_URL } from '../constants/config';

const { SharedGroup } = NativeModules;
const SUITE_NAME = 'group.com.doparatio.app';

const isSupported = (Platform.OS === 'ios' || Platform.OS === 'android') && !!SharedGroup;

export const sharedGroup = {
  setAuthToken: async (token: string) => {
    if (!isSupported) return;
    try {
      await SharedGroup.setString('auth_token', token, SUITE_NAME);
      await SharedGroup.reloadAllTimelines();
    } catch (e) {
      console.error('Failed to set auth token in shared group:', e);
    }
  },

  setApiUrl: async (url: string) => {
    if (!isSupported) return;
    try {
      await SharedGroup.setString('api_url', url, SUITE_NAME);
    } catch (e) {
      console.error('Failed to set API URL in shared group:', e);
    }
  },

  setWidgetHabitId: async (habitId: string) => {
    if (!isSupported) return;
    try {
      await SharedGroup.setString('widget_habit_id', habitId, SUITE_NAME);
    } catch (e) {
      console.error('Failed to set widget habit id in shared group:', e);
    }
  },

  getWidgetHabitId: async (): Promise<string> => {
    if (!isSupported) return '';
    try {
      return await SharedGroup.getString('widget_habit_id', SUITE_NAME);
    } catch (e) {
      console.error('Failed to get widget habit id from shared group:', e);
      return '';
    }
  },

  reloadWidget: async () => {
    if (!isSupported) return;
    try {
      await SharedGroup.reloadAllTimelines();
    } catch (e) {
      console.error('Failed to reload widget timelines:', e);
    }
  },

  setHabitsCache: async (habits: any[]) => {
    if (!isSupported) return;
    try {
      const cached = habits.map(h => ({
        id: h.id,
        name: h.name,
        icon: h.icon
      }));
      await SharedGroup.setString('widget_habits_cache', JSON.stringify(cached), SUITE_NAME);
      await SharedGroup.reloadAllTimelines();
    } catch (e) {
      console.error('Failed to set habits cache in shared group:', e);
    }
  },

  getDebugKey: async (key: string): Promise<string> => {
    if (!isSupported) return '';
    try {
      return await SharedGroup.getString(key, SUITE_NAME);
    } catch (e) {
      return '';
    }
  }
};




