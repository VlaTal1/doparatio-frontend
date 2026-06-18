import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Pressable,
  Alert,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../src/contexts/ThemeContext';
import { TaskCard } from '../../src/components/TaskCard';
import { EmptyState } from '../../src/components/EmptyState';
import { tasksApi } from '../../src/api/tasks';
import { TaskDTO } from '../../src/types';
import { BorderRadius, FontSize, FontWeight, Spacing, Shadows } from '../../src/constants/theme';

type Filter = 'all' | 'today' | 'upcoming';

export default function TasksScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const [tasks, setTasks] = useState<TaskDTO[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [refreshing, setRefreshing] = useState(false);

  const today = format(new Date(), 'yyyy-MM-dd');

  const loadTasks = useCallback(async () => {
    try {
      let data: TaskDTO[];
      if (filter === 'today') {
        data = await tasksApi.getForDate(today);
      } else {
        data = await tasksApi.getAll();
      }
      let filtered = data.filter((t) => t.active);
      if (filter === 'upcoming') {
        filtered = filtered.filter((t) => t.dueDate && t.dueDate > today);
      }
      setTasks(filtered);
    } catch (error) {
      console.error('Load tasks error:', error);
    }
  }, [filter, today]);

  useFocusEffect(
    useCallback(() => {
      loadTasks();
    }, [loadTasks]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTasks();
    setRefreshing(false);
  };

  const handleLog = async (taskId: number) => {
    try {
      await tasksApi.log(taskId, today);
      await loadTasks();
    } catch (error: any) {
      Alert.alert(t('common.error'), error.response?.data?.message || t('tasks.errorLog'));
    }
  };

  const handleCancelLog = async (taskId: number) => {
    try {
      await tasksApi.cancelLog(taskId, today);
      await loadTasks();
    } catch (error: any) {
      Alert.alert(t('common.error'), error.response?.data?.message || t('tasks.errorCancelLog'));
    }
  };

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: t('tasks.filterAll') },
    { key: 'today', label: t('tasks.filterToday') },
    { key: 'upcoming', label: t('tasks.filterUpcoming') },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{t('tasks.title')}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {t('tasks.activeCount', { count: tasks.length })}
        </Text>
      </View>

      {/* Filter chips */}
      <View style={styles.filterRow}>
        {filters.map((f) => (
          <Pressable
            key={f.key}
            style={[
              styles.chip,
              {
                backgroundColor: filter === f.key ? colors.accent : colors.card,
                borderColor: filter === f.key ? colors.accent : colors.border,
              },
            ]}
            onPress={() => setFilter(f.key)}
          >
            <Text
              style={[
                styles.chipText,
                { color: filter === f.key ? '#fff' : colors.textSecondary },
              ]}
            >
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
        showsVerticalScrollIndicator={false}
      >
        {tasks.length > 0 ? (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              todayDate={today}
              onLog={handleLog}
              onCancelLog={handleCancelLog}
              onPress={() => router.push(`/task/${task.id}`)}
            />
          ))
        ) : (
          <EmptyState
            icon="checkbox-marked-outline"
            title={t('tasks.noTasksTitle')}
            subtitle={t('tasks.noTasksSubtitle')}
          />
        )}
      </ScrollView>

      {/* FAB */}
      <Pressable
        style={[styles.fab, { backgroundColor: colors.accent }, Shadows.elevated]}
        onPress={() => router.push('/task/create')}
      >
        <MaterialCommunityIcons name="plus" size={28} color="#fff" />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.heavy,
  },
  subtitle: {
    fontSize: FontSize.sm,
    marginTop: Spacing.xs,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  chip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.round,
    borderWidth: 1,
  },
  chipText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
