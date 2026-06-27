import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useAuth } from '../../src/contexts/AuthContext';
import { BalanceCard } from '../../src/components/BalanceCard';
import { HabitCard } from '../../src/components/HabitCard';
import { TaskCard } from '../../src/components/TaskCard';
import { EmptyState } from '../../src/components/EmptyState';
import { habitsApi } from '../../src/api/habits';
import { tasksApi } from '../../src/api/tasks';
import { balanceApi } from '../../src/api/balance';
import { sharedGroup } from '../../src/utils/sharedGroup';
import { HabitDTO, TaskDTO } from '../../src/types';
import { FontSize, FontWeight, Spacing } from '../../src/constants/theme';

export default function TodayScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [balance, setBalance] = useState(0);
  const [habits, setHabits] = useState<HabitDTO[]>([]);
  const [tasks, setTasks] = useState<TaskDTO[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const today = format(new Date(), 'yyyy-MM-dd');
  const displayDate = format(new Date(), 'MMMM d, EEEE');

  const loadData = useCallback(async () => {
    try {
      const [balanceData, habitsData, tasksData] = await Promise.all([
        balanceApi.get(),
        habitsApi.getAll(),
        tasksApi.getForDate(today),
      ]);
      setBalance(balanceData.balance);
      setHabits(habitsData.filter((h) => h.active));
      setTasks(tasksData.filter((t) => t.active));
      await sharedGroup.setHabitsCache(habitsData.filter((h) => h.active));
      
      setTimeout(async () => {
        const cache = await sharedGroup.getDebugKey('widget_habits_cache');
        const called = await sharedGroup.getDebugKey('debug_entities_called');
        const fetched = await sharedGroup.getDebugKey('debug_entities_fetched');
        const result = await sharedGroup.getDebugKey('debug_entities_result');
        const timelineHabit = await sharedGroup.getDebugKey('debug_timeline_habit');
        const suggestedCalled = await sharedGroup.getDebugKey('debug_suggested_called');
        const suggestedFetched = await sharedGroup.getDebugKey('debug_suggested_fetched');
        const defaultResult = await sharedGroup.getDebugKey('debug_default_result');
        const fallback = await sharedGroup.getDebugKey('debug_timeline_fallback');
      }, 500);
    } catch (error: any) {
      console.error('Load error:', error);
    }
  }, [today]);


  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleLogHabit = async (habitId: number) => {
    try {
      await habitsApi.log(habitId, today);
      await loadData();
      await sharedGroup.reloadWidget();
    } catch (error: any) {
      Alert.alert(t('common.error'), error.response?.data?.message || t('today.errorLogHabit'));
    }
  };

  const handleCancelHabitLog = async (habitId: number) => {
    try {
      await habitsApi.cancelLog(habitId, today);
      await loadData();
      await sharedGroup.reloadWidget();
    } catch (error: any) {
      Alert.alert(t('common.error'), error.response?.data?.message || t('today.errorCancelHabitLog'));
    }
  };


  const handleLogTask = async (taskId: number) => {
    try {
      await tasksApi.log(taskId, today);
      await loadData();
    } catch (error: any) {
      Alert.alert(t('common.error'), error.response?.data?.message || t('today.errorLogTask'));
    }
  };

  const handleCancelTaskLog = async (taskId: number) => {
    try {
      await tasksApi.cancelLog(taskId, today);
      await loadData();
    } catch (error: any) {
      Alert.alert(t('common.error'), error.response?.data?.message || t('today.errorCancelTaskLog'));
    }
  };

  const userName = user?.user_metadata?.name || user?.email?.split('@')[0] || t('today.defaultUser');

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.greeting, { color: colors.textSecondary }]}>
            {t('today.greeting', { name: userName })}
          </Text>
          <Text style={[styles.date, { color: colors.text }]}>{displayDate}</Text>
        </View>

        {/* Balance */}
        <BalanceCard balance={balance} />

        {/* Habits Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t('today.habitsSection')}
          </Text>
          {habits.length > 0 ? (
            <View style={styles.sectionContent}>
              {habits.map((habit) => (
                <HabitCard
                  key={habit.id}
                  habit={habit}
                  todayDate={today}
                  onLog={handleLogHabit}
                  onCancelLog={handleCancelHabitLog}
                  onPress={() => router.push(`/habit/${habit.id}`)}
                />
              ))}
            </View>
          ) : (
            <EmptyState
              icon="fire"
              title={t('today.noHabitsTitle')}
              subtitle={t('today.noHabitsSubtitle')}
            />
          )}
        </View>

        {/* Tasks Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t('today.tasksSection')}
          </Text>
          {tasks.length > 0 ? (
            <View style={styles.sectionContent}>
              {tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  todayDate={today}
                  onLog={handleLogTask}
                  onCancelLog={handleCancelTaskLog}
                  onPress={() => router.push(`/task/${task.id}`)}
                />
              ))}
            </View>
          ) : (
            <EmptyState
              icon="checkbox-marked-outline"
              title={t('today.noTasksTitle')}
              subtitle={t('today.noTasksSubtitle')}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.huge,
  },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  greeting: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },
  date: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    marginTop: Spacing.xs,
    textTransform: 'capitalize',
  },
  section: {
    marginTop: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.lg,
  },
  sectionContent: {
    gap: 0,
  },
});
