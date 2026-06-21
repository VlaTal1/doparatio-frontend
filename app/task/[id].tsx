import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../src/contexts/ThemeContext';
import { tasksApi } from '../../src/api/tasks';
import { TaskDTO, DIFFICULTY_CONFIG } from '../../src/types';
import { BorderRadius, FontSize, FontWeight, Spacing } from '../../src/constants/theme';

export default function TaskDetailsScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [task, setTask] = useState<TaskDTO | null>(null);
  const [loading, setLoading] = useState(true);

  const loadTaskDetails = useCallback(async () => {
    if (!id) return;
    const taskId = parseInt(id, 10);
    if (isNaN(taskId)) return;

    try {
      const data = await tasksApi.getById(taskId);
      setTask(data);
    } catch (error) {
      console.error('Fetch task details error:', error);
      Alert.alert(t('common.error'), t('createTask.errorLoad', { defaultValue: 'Could not load task details' }));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useFocusEffect(
    useCallback(() => {
      loadTaskDetails();
    }, [loadTaskDetails])
  );

  const handleDelete = () => {
    if (!id || !task) return;
    Alert.alert(
      t('createTask.deleteConfirmTitle', { defaultValue: 'Delete Task' }),
      t('createTask.deleteConfirmMsg', { defaultValue: 'Are you sure you want to delete this task?' }),
      [
        { text: t('common.cancel', { defaultValue: 'Cancel' }), style: 'cancel' },
        {
          text: t('common.delete', { defaultValue: 'Delete' }),
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await tasksApi.delete(parseInt(id, 10));
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(tabs)/tasks');
              }
            } catch (error: any) {
              Alert.alert(
                t('createTask.errorTitle'),
                error.response?.data?.message || t('createTask.errorDelete', { defaultValue: 'Could not delete task' })
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleEdit = () => {
    if (!id) return;
    router.push(`/task/create?id=${id}`);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </SafeAreaView>
    );
  }

  if (!task) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('common.error')}</Text>
        </View>
        <View style={styles.errorContent}>
          <Text style={{ color: colors.text }}>{t('createTask.errorLoad')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const config = DIFFICULTY_CONFIG[task.difficulty];
  const difficultyColor =
    task.difficulty === 'ROUTINE'
      ? colors.routine
      : task.difficulty === 'MEDIUM'
        ? colors.medium
        : colors.hard;

  // Formatting scheduled days
  const scheduleDaysLabel = task.scheduleDays && task.scheduleDays.length < 7
    ? task.scheduleDays.map((d) => t(`createTask.days.${d - 1}`)).join(', ')
    : t('createTask.days.all', { defaultValue: 'Every day' });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {task.name}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Task Summary Card */}
        <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.iconContainer, { backgroundColor: getRgbaColor(difficultyColor, 0.15) }]}>
            <Text style={styles.emojiText}>{config.emoji}</Text>
          </View>
          <Text style={[styles.taskName, { color: colors.text }]}>{task.name}</Text>
          
          <View style={styles.badgeRow}>
            {/* Difficulty Badge */}
            <View style={[styles.badge, { backgroundColor: `${difficultyColor}15`, borderColor: difficultyColor, borderWidth: 1 }]}>
              <Text style={[styles.badgeText, { color: difficultyColor }]}>
                {t(`difficulty.${task.difficulty}`)} (+{config.minutes}m)
              </Text>
            </View>

            {/* Recurrence Badge */}
            <View style={[styles.badge, { backgroundColor: colors.border }]}>
              <Text style={[styles.badgeText, { color: colors.textSecondary }]}>
                {task.recurring ? t('createTask.recurringLabel') : t('createTask.recurringHint', { defaultValue: 'One-time' })}
              </Text>
            </View>
          </View>
        </View>

        {/* Due Date or Schedule details */}
        <View style={[styles.detailCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.detailItem}>
            <MaterialCommunityIcons
              name={task.recurring ? 'repeat' : 'calendar-clock'}
              size={24}
              color={colors.accent}
            />
            <View style={styles.detailInfo}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                {task.recurring ? t('createTask.labelScheduleDays') : t('createTask.labelDueDate')}
              </Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {task.recurring ? scheduleDaysLabel : task.dueDate || t('createTask.dueDatePlaceholder')}
              </Text>
            </View>
          </View>
        </View>

        {/* Edit / Delete Actions */}
        <View style={styles.actionsRow}>
          <Pressable
            onPress={handleEdit}
            style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
          >
            <MaterialCommunityIcons name="pencil" size={20} color={colors.text} />
            <Text style={[styles.actionBtnText, { color: colors.text }]}>{t('common.edit')}</Text>
          </Pressable>

          <Pressable
            onPress={handleDelete}
            style={[styles.actionBtn, { backgroundColor: `${colors.error}15`, borderColor: colors.error, borderWidth: 1 }]}
          >
            <MaterialCommunityIcons name="trash-can-outline" size={20} color={colors.error} />
            <Text style={[styles.actionBtnText, { color: colors.error }]}>{t('common.delete')}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function getRgbaColor(hex: string, opacity: number): string {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  backBtn: {
    padding: Spacing.sm,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    flex: 1,
    textAlign: 'center',
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.lg,
  },
  summaryCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiText: {
    fontSize: 36,
  },
  taskName: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    textAlign: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  badge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  badgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
  detailCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  detailInfo: {
    flex: 1,
  },
  detailLabel: {
    fontSize: FontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  actionBtnText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  errorContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
});
