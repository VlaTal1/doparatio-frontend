import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
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
  showHeatmap?: boolean;
  onPress?: () => void;
}

export function HabitCard({
  habit,
  todayDate,
  onLog,
  onCancelLog,
  showHeatmap = false,
  onPress,
}: HabitCardProps) {
  const { colors } = useTheme();

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

  // Heatmap constants
  const CELL_SIZE = 9;
  const CELL_GAP = 2;
  const DAYS_LABELS = ['M', '', 'W', '', 'F', '', ''];

  const [containerWidth, setContainerWidth] = React.useState<number>(0);

  const handleLayout = React.useCallback((event: any) => {
    const { width } = event.nativeEvent.layout;
    if (width > 0) {
      setContainerWidth(width);
    }
  }, []);

  const heatmapColumns = React.useMemo(() => {
    if (!showHeatmap || containerWidth === 0) return [];

    const labelWidth = 16; // width 12 + marginRight 4
    const colWidth = CELL_SIZE + CELL_GAP;
    const colsLimit = Math.floor((containerWidth - labelWidth) / colWidth);
    if (colsLimit <= 0) return [];

    const mondayOfCurrentWeek = getMondayOfCurrentWeek(todayDate);
    const cols: { dateStr: string; progress: number; isToday: boolean; isFuture: boolean }[][] = [];

    for (let c = 0; c < colsLimit; c++) {
      const weekCol: { dateStr: string; progress: number; isToday: boolean; isFuture: boolean }[] = [];
      for (let r = 0; r < 7; r++) {
        const cellDate = addDays(mondayOfCurrentWeek, (c - (colsLimit - 1)) * 7 + r);
        const cellDateStr = format(cellDate, 'yyyy-MM-dd');
        const isFuture = cellDateStr > todayDate;
        const isToday = cellDateStr === todayDate;

        let progress = 0;
        if (!isFuture) {
          const log = habit.logs?.find((l) => l.logDate === cellDateStr);
          if (log) {
            if (habit.logType === 'BINARY') {
              progress = 1;
            } else if (habit.targetValue > 0) {
              progress = Math.min((log.currentValue ?? 0) / habit.targetValue, 1);
            }
          }
        }

        weekCol.push({
          dateStr: cellDateStr,
          progress,
          isToday,
          isFuture,
        });
      }
      cols.push(weekCol);
    }
    return cols;
  }, [habit.logs, habit.logType, habit.targetValue, todayDate, showHeatmap, containerWidth]);

  const handleBinaryToggle = () => {
    if (isCompleted) {
      onCancelLog(habit.id!);
    } else {
      onLog(habit.id!);
    }
  };

  const handleIncrement = () => {
    onLog(habit.id!);
  };

  const handleDecrement = () => {
    onCancelLog(habit.id!);
  };

  const habitColor = `#${habit.color}`;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: colors.card,
          borderColor: isCompleted ? habitColor : colors.border,
          borderWidth: isCompleted ? 1.5 : 1,
          opacity: pressed && onPress ? 0.95 : 1,
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

        <View style={styles.rightActions}>
          {streak > 0 && (
            <View style={[styles.streakBadge, { backgroundColor: colors.accentDim, marginRight: Spacing.sm }]}>
              <Text style={styles.streakEmoji}>🔥</Text>
              <Text style={[styles.streakText, { color: colors.accent }]}>{streak}</Text>
            </View>
          )}

          <View style={styles.controls}>
            {habit.logType === 'BINARY' ? (
              <Pressable
                onPress={handleBinaryToggle}
                style={({ pressed }) => [
                  styles.actionButton,
                  {
                    backgroundColor: isCompleted ? `${habitColor}20` : colors.border,
                    borderColor: isCompleted ? habitColor : colors.border,
                    borderWidth: 1,
                    transform: [{ scale: pressed ? 0.92 : 1 }],
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name={isCompleted ? 'check-bold' : 'plus'}
                  size={20}
                  color={isCompleted ? habitColor : colors.textSecondary}
                />
              </Pressable>
            ) : (
              <View style={styles.counterControls}>
                <Pressable
                  onPress={handleDecrement}
                  disabled={(todayLog?.currentValue ?? 0) <= 0}
                  style={({ pressed }) => [
                    styles.counterButton,
                    {
                      backgroundColor: colors.border,
                      opacity: (todayLog?.currentValue ?? 0) <= 0 ? 0.5 : 1,
                      transform: [{ scale: pressed && (todayLog?.currentValue ?? 0) > 0 ? 0.92 : 1 }],
                    },
                  ]}
                >
                  <MaterialCommunityIcons name="minus" size={18} color={colors.text} />
                </Pressable>
                <Pressable
                  onPress={handleIncrement}
                  style={({ pressed }) => [
                    styles.counterButton,
                    {
                      backgroundColor: isCompleted ? `${habitColor}20` : colors.border,
                      transform: [{ scale: pressed ? 0.92 : 1 }],
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="plus"
                    size={18}
                    color={isCompleted ? habitColor : colors.text}
                  />
                </Pressable>
              </View>
            )}
          </View>
        </View>
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

          {showHeatmap && (
            <View style={styles.heatmapContainer} onLayout={handleLayout}>
              {heatmapColumns.length > 0 && (
                <>
                  <Text style={[styles.heatmapTitle, { color: colors.textSecondary }]}>
                    {i18n.t('habitCard.activityLast6Months')}
                  </Text>
                  <View style={styles.gridContainer}>
                    {/* Day labels */}
                    <View style={styles.dayLabelsColumn}>
                      {DAYS_LABELS.map((label, idx) => (
                        <View
                          key={idx}
                          style={{
                            height: CELL_SIZE,
                            marginBottom: idx < 6 ? CELL_GAP : 0,
                            justifyContent: 'center',
                          }}
                        >
                          {label !== '' && (
                            <Text style={[styles.dayLabelText, { color: colors.textSecondary, fontSize: CELL_SIZE - 1 }]}>
                              {label}
                            </Text>
                          )}
                        </View>
                      ))}
                    </View>
                    {/* Heatmap cells */}
                    <View style={styles.columnsWrapper}>
                      {heatmapColumns.map((col, colIdx) => (
                        <View
                          key={colIdx}
                          style={{
                            flexDirection: 'column',
                            marginRight: colIdx < heatmapColumns.length - 1 ? CELL_GAP : 0,
                          }}
                        >
                          {col.map((cell, rowIdx) => {
                            const cellColor = cell.isFuture
                              ? 'transparent'
                              : cell.progress > 0
                                ? getRgbaColor(habitColor, 0.15 + 0.85 * cell.progress)
                                : colors.border;
                            return (
                              <View
                                key={rowIdx}
                                style={[
                                  styles.cell,
                                  {
                                    width: CELL_SIZE,
                                    height: CELL_SIZE,
                                    backgroundColor: cellColor,
                                    marginBottom: rowIdx < 6 ? CELL_GAP : 0,
                                    borderColor: cell.isToday ? colors.accent : 'transparent',
                                    borderWidth: cell.isToday ? 1 : 0,
                                  },
                                ]}
                              />
                            );
                          })}
                        </View>
                      ))}
                    </View>
                  </View>
                </>
              )}
            </View>
          )}
    </Pressable>
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

function getMondayOfCurrentWeek(todayStr: string): Date {
  const date = new Date(todayStr);
  const day = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
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
  heatmapContainer: {
    marginTop: Spacing.md,
  },
  heatmapTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    marginBottom: Spacing.sm,
  },
  gridContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dayLabelsColumn: {
    marginRight: Spacing.xs,
    justifyContent: 'center',
  },
  dayLabelText: {
    fontWeight: FontWeight.medium,
    textAlign: 'center',
    width: 12,
  },
  columnsWrapper: {
    flexDirection: 'row',
  },
  cell: {
    borderRadius: 2,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  controls: {
    marginLeft: Spacing.xs,
  },
  counterControls: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
