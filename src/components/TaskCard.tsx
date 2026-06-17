import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { TaskDTO, DIFFICULTY_CONFIG } from '../types';
import { BorderRadius, FontSize, FontWeight, Spacing, Shadows } from '../constants/theme';

interface TaskCardProps {
  task: TaskDTO;
  todayDate: string;
  onLog: (taskId: number) => void;
  onCancelLog: (taskId: number) => void;
}

export function TaskCard({ task, todayDate, onLog, onCancelLog }: TaskCardProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const scale = useSharedValue(1);
  const config = DIFFICULTY_CONFIG[task.difficulty];

  const isCompletedToday = task.logs?.some((l) => l.logDate === todayDate) ?? false;
  // For non-recurring tasks, check if any log exists
  const isCompletedEver = !task.recurring && (task.logs?.length ?? 0) > 0;
  const isCompleted = isCompletedToday || isCompletedEver;

  const difficultyColor =
    task.difficulty === 'ROUTINE'
      ? colors.routine
      : task.difficulty === 'MEDIUM'
        ? colors.medium
        : colors.hard;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSpring(0.95, {}, () => {
      scale.value = withSpring(1);
    });
    if (isCompleted) {
      onCancelLog(task.id!);
    } else {
      onLog(task.id!);
    }
  };

  return (
    <Animated.View style={animatedStyle}>
      <Pressable onPress={handlePress}>
        <View
          style={[
            styles.container,
            {
              backgroundColor: colors.card,
              borderColor: isCompleted ? colors.success : colors.border,
              opacity: isCompleted ? 0.7 : 1,
            },
            Shadows.card,
          ]}
        >
          <View style={styles.row}>
            {/* Checkbox */}
            <View
              style={[
                styles.checkbox,
                {
                  borderColor: isCompleted ? colors.success : colors.textSecondary,
                  backgroundColor: isCompleted ? colors.success : 'transparent',
                },
              ]}
            >
              {isCompleted && (
                <MaterialCommunityIcons name="check" size={14} color="#fff" />
              )}
            </View>

            {/* Info */}
            <View style={styles.info}>
              <Text
                style={[
                  styles.name,
                  {
                    color: isCompleted ? colors.textSecondary : colors.text,
                    textDecorationLine: isCompleted ? 'line-through' : 'none',
                  },
                ]}
                numberOfLines={1}
              >
                {task.name}
              </Text>
              <View style={styles.metaRow}>
                {task.recurring && (
                  <View style={styles.metaItem}>
                    <MaterialCommunityIcons name="repeat" size={12} color={colors.textSecondary} />
                    <Text style={[styles.metaText, { color: colors.textSecondary }]}>{t('taskCard.recurring')}</Text>
                  </View>
                )}
                {task.dueDate && (
                  <View style={styles.metaItem}>
                    <MaterialCommunityIcons name="calendar-clock" size={12} color={colors.textSecondary} />
                    <Text style={[styles.metaText, { color: colors.textSecondary }]}>{task.dueDate}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Difficulty badge */}
            <View style={[styles.badge, { backgroundColor: `${difficultyColor}20` }]}>
              <Text style={styles.badgeEmoji}>{config.emoji}</Text>
              <Text style={[styles.badgeText, { color: difficultyColor }]}>
                +{config.minutes}m
              </Text>
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  name: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  metaRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    fontSize: FontSize.xs,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.round,
    gap: 3,
  },
  badgeEmoji: {
    fontSize: 12,
  },
  badgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
});
