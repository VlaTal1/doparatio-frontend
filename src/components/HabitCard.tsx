import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import i18n from '../i18n';
import { useTheme } from '../contexts/ThemeContext';
import { HabitDTO } from '../types';
import { BorderRadius, FontSize, FontWeight, Spacing, Shadows } from '../constants/theme';
import { format } from 'date-fns';

interface HabitCardProps {
  habit: HabitDTO;
  todayDate: string; // YYYY-MM-DD
  onLog: (habitId: number) => void;
  onCancelLog: (habitId: number) => void;
}

export function HabitCard({ habit, todayDate, onLog, onCancelLog }: HabitCardProps) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);

  const todayLog = habit.logs?.find((l) => l.logDate === todayDate);
  const isCompleted =
    habit.logType === 'BINARY'
      ? !!todayLog
      : (todayLog?.currentValue ?? 0) >= habit.targetValue;
  const progress =
    habit.logType === 'NUMERIC' && habit.targetValue > 0
      ? Math.min((todayLog?.currentValue ?? 0) / habit.targetValue, 1)
      : isCompleted
        ? 1
        : 0;

  // Calculate streak from consecutive logs
  const streak = calculateStreak(habit.logs || [], todayDate);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSpring(0.95, {}, () => {
      scale.value = withSpring(1);
    });
    if (isCompleted) {
      onCancelLog(habit.id!);
    } else {
      onLog(habit.id!);
    }
  };

  const habitColor = `#${habit.color}`;

  return (
    <Animated.View style={animatedStyle}>
      <Pressable onPress={handlePress}>
        <View
          style={[
            styles.container,
            {
              backgroundColor: colors.card,
              borderColor: isCompleted ? habitColor : colors.border,
              borderWidth: isCompleted ? 1.5 : 1,
            },
            Shadows.card,
          ]}
        >
          <View style={styles.topRow}>
            <View style={[styles.iconContainer, { backgroundColor: `${habitColor}20` }]}>
              <Text style={styles.icon}>{habit.icon}</Text>
            </View>
            <View style={styles.info}>
              <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                {habit.name}
              </Text>
              {habit.logType === 'NUMERIC' && (
                <Text style={[styles.progress, { color: colors.textSecondary }]}>
                  {todayLog?.currentValue ?? 0} / {habit.targetValue}
                </Text>
              )}
            </View>
            {streak > 0 && (
              <View style={[styles.streakBadge, { backgroundColor: colors.accentDim }]}>
                <Text style={styles.streakEmoji}>🔥</Text>
                <Text style={[styles.streakText, { color: colors.accent }]}>{streak}</Text>
              </View>
            )}
          </View>

          {/* Progress bar */}
          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: habitColor,
                  width: `${progress * 100}%`,
                },
              ]}
            />
          </View>

          {isCompleted && (
            <View style={[styles.completedBadge, { backgroundColor: `${habitColor}15` }]}>
              <Text style={[styles.completedText, { color: habitColor }]}>{i18n.t('habitCard.completed')}</Text>
            </View>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

function calculateStreak(logs: { logDate: string }[], today: string): number {
  if (!logs.length) return 0;
  const sortedDates = logs
    .map((l) => l.logDate)
    .sort()
    .reverse();
  
  let streak = 0;
  const todayDate = new Date(today);
  
  for (let i = 0; i < 365; i++) {
    const checkDate = new Date(todayDate);
    checkDate.setDate(checkDate.getDate() - i);
    const dateStr = format(checkDate, 'yyyy-MM-dd');
    if (sortedDates.includes(dateStr)) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }
  return streak;
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 22,
  },
  info: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  name: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  progress: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.round,
    gap: 2,
  },
  streakEmoji: {
    fontSize: 12,
  },
  streakText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  completedBadge: {
    marginTop: Spacing.sm,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
    alignSelf: 'flex-start',
  },
  completedText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
});
