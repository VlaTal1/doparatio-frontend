import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../src/contexts/ThemeContext';
import { habitsApi } from '../../src/api/habits';
import { HabitDTO, HabitLogDTO } from '../../src/types';
import { BorderRadius, FontSize, FontWeight, Spacing } from '../../src/constants/theme';
import { format } from 'date-fns';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GAP = 8;
const CELL_SIZE = Math.floor((SCREEN_WIDTH - Spacing.xl * 2 - (6 * GAP)) / 7);

export default function HabitDetailsScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [habit, setHabit] = useState<HabitDTO | null>(null);
  const [logs, setLogs] = useState<HabitLogDTO[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const loadHabitDetails = useCallback(async () => {
    if (!id) return;
    const habitId = parseInt(id, 10);
    if (isNaN(habitId)) return;

    try {
      const data = await habitsApi.getById(habitId);
      setHabit(data);
      setLogs(data.logs || []);
    } catch (error) {
      console.error('Fetch habit details error:', error);
      Alert.alert(t('common.error'), t('createHabit.errorLoad', { defaultValue: 'Could not load habit details' }));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useFocusEffect(
    useCallback(() => {
      loadHabitDetails();
    }, [loadHabitDetails])
  );

  const handlePrevMonth = () => {
    setCurrentCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleLogDate = async (dateStr: string) => {
    if (!id) return;
    try {
      const savedLog = await habitsApi.log(parseInt(id, 10), dateStr);
      setLogs((prev) => {
        const existingIdx = prev.findIndex((l) => l.logDate === dateStr);
        if (existingIdx > -1) {
          const updated = [...prev];
          updated[existingIdx] = savedLog;
          return updated;
        } else {
          return [...prev, savedLog];
        }
      });
    } catch (error: any) {
      Alert.alert(t('common.error'), error.response?.data?.message || t('habits.errorLog'));
    }
  };

  const handleCancelLogDate = async (dateStr: string) => {
    if (!id) return;
    try {
      const result = await habitsApi.cancelLog(parseInt(id, 10), dateStr);
      setLogs((prev) => {
        if (!result) {
          return prev.filter((l) => l.logDate !== dateStr);
        } else {
          return prev.map((l) => (l.logDate === dateStr ? result : l));
        }
      });
    } catch (error: any) {
      Alert.alert(t('common.error'), error.response?.data?.message || t('habits.errorCancelLog'));
    }
  };

  const handleDayPress = (dateStr: string) => {
    if (!habit) return;
    if (habit.logType === 'BINARY') {
      const alreadyLogged = logs.some((l) => l.logDate === dateStr);
      if (alreadyLogged) {
        handleCancelLogDate(dateStr);
      } else {
        handleLogDate(dateStr);
      }
    } else {
      setSelectedDate(dateStr);
      setModalVisible(true);
    }
  };

  const handleDelete = () => {
    if (!id || !habit) return;
    Alert.alert(
      t('createHabit.deleteConfirmTitle', { defaultValue: 'Delete Habit' }),
      t('createHabit.deleteConfirmMsg', { defaultValue: 'Are you sure you want to delete this habit?' }),
      [
        { text: t('common.cancel', { defaultValue: 'Cancel' }), style: 'cancel' },
        {
          text: t('common.delete', { defaultValue: 'Delete' }),
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await habitsApi.delete(parseInt(id, 10));
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(tabs)/habits');
              }
            } catch (error: any) {
              Alert.alert(
                t('createHabit.errorTitle'),
                error.response?.data?.message || t('createHabit.errorDelete', { defaultValue: 'Could not delete habit' })
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
    router.push(`/habit/create?id=${id}`);
  };

  const renderCalendarCells = () => {
    if (!habit) return [];
    const year = currentCalendarMonth.getFullYear();
    const month = currentCalendarMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startDay = new Date(year, month, 1).getDay();
    const startOffset = startDay === 0 ? 6 : startDay - 1;

    const cells: React.ReactNode[] = [];
    const todayStr = format(new Date(), 'yyyy-MM-dd');

    for (let i = 0; i < startOffset; i++) {
      cells.push(<View key={`empty-${i}`} style={styles.dayCellPlaceholder} />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const cellDate = new Date(year, month, day);
      const cellDateStr = format(cellDate, 'yyyy-MM-dd');
      const isFuture = cellDateStr > todayStr;
      const isToday = cellDateStr === todayStr;

      const log = logs.find((l) => l.logDate === cellDateStr);
      const hasLog = !!log;

      let progress = 0;
      if (hasLog) {
        if (habit.logType === 'BINARY') {
          progress = 1;
        } else {
          const target = habit.targetValue || 1;
          progress = target > 0 ? Math.min((log.currentValue ?? 0) / target, 1) : 0;
        }
      }

      const cellColor = isFuture
        ? 'transparent'
        : progress > 0
          ? getRgbaColor(`#${habit.color}`, 0.15 + 0.85 * progress)
          : colors.card;

      cells.push(
        <Pressable
          key={`day-${day}`}
          disabled={isFuture}
          onPress={() => handleDayPress(cellDateStr)}
          style={({ pressed }) => [
            styles.dayCell,
            {
              backgroundColor: cellColor,
              borderColor: isToday ? colors.accent : isFuture ? 'transparent' : colors.border,
              borderWidth: isToday ? 1.5 : 1,
              opacity: isFuture ? 0.3 : pressed ? 0.8 : 1,
            },
          ]}
        >
          <Text
            style={[
              styles.dayCellText,
              {
                color: isFuture ? colors.textSecondary : colors.text,
                fontWeight: isToday || progress > 0 ? FontWeight.bold : FontWeight.regular,
              },
            ]}
          >
            {day}
          </Text>
        </Pressable>
      );
    }

    const totalCells = startOffset + daysInMonth;
    const endOffset = (7 - (totalCells % 7)) % 7;
    for (let i = 0; i < endOffset; i++) {
      cells.push(<View key={`empty-end-${i}`} style={styles.dayCellPlaceholder} />);
    }

    return cells;
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </SafeAreaView>
    );
  }

  if (!habit) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('common.error')}</Text>
        </View>
        <View style={styles.errorContent}>
          <Text style={{ color: colors.text }}>{t('createHabit.errorLoad')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {habit.name}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Habit Summary Card */}
        <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.iconContainer, { backgroundColor: getRgbaColor(`#${habit.color}`, 0.15) }]}>
            <Text style={styles.emojiText}>{habit.icon}</Text>
          </View>
          <Text style={[styles.habitName, { color: colors.text }]}>{habit.name}</Text>
          
          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: colors.border }]}>
              <Text style={[styles.badgeText, { color: colors.textSecondary }]}>
                {habit.logType === 'BINARY' ? t('createHabit.typeBinary') : `${t('createHabit.typeNumeric')} (${habit.targetValue})`}
              </Text>
            </View>
            {habit.scheduleDays && habit.scheduleDays.length < 7 ? (
              <View style={[styles.badge, { backgroundColor: colors.border }]}>
                <Text style={[styles.badgeText, { color: colors.textSecondary }]}>
                  {habit.scheduleDays.length}/7 days
                </Text>
              </View>
            ) : (
              <View style={[styles.badge, { backgroundColor: colors.border }]}>
                <Text style={[styles.badgeText, { color: colors.textSecondary }]}>
                  Every day
                </Text>
              </View>
            )}
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

        {/* History Calendar */}
        <View style={[styles.calendarCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.calendarTitle, { color: colors.text }]}>
            {t('createHabit.calendarTitle')}
          </Text>

          {/* Month selector header */}
          <View style={styles.calendarHeader}>
            <Pressable onPress={handlePrevMonth} style={styles.monthNavBtn}>
              <MaterialCommunityIcons name="chevron-left" size={24} color={colors.text} />
            </Pressable>
            <Text style={[styles.monthLabelText, { color: colors.text }]}>
              {format(currentCalendarMonth, 'MMMM yyyy')}
            </Text>
            <Pressable onPress={handleNextMonth} style={styles.monthNavBtn}>
              <MaterialCommunityIcons name="chevron-right" size={24} color={colors.text} />
            </Pressable>
          </View>

          {/* Days of week headers */}
          <View style={styles.weekDaysRow}>
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => (
              <Text key={idx} style={[styles.weekDayHeaderCell, { color: colors.textSecondary }]}>
                {day}
              </Text>
            ))}
          </View>

          {/* Days grid */}
          <View style={styles.daysGrid}>
            {renderCalendarCells()}
          </View>
        </View>
      </ScrollView>

      {/* Custom Log Counter Modal */}
      {selectedDate && (
        <Modal
          animationType="fade"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.modalHeaderTitle, { color: colors.text }]}>
                {t('createHabit.modalAdjustTitle')}
              </Text>

              <Text style={[styles.modalDateText, { color: colors.textSecondary }]}>
                {format(new Date(selectedDate), 'MMMM d, yyyy')}
              </Text>

              {/* Value display */}
              <View style={styles.modalValueContainer}>
                {(() => {
                  const currentLog = logs.find((l) => l.logDate === selectedDate);
                  const val = currentLog?.currentValue ?? 0;
                  const target = habit.targetValue || 1;
                  return (
                    <>
                      <Text style={[styles.modalValueLabel, { color: colors.text }]}>
                        {t('createHabit.modalValueText', { value: val })}
                      </Text>
                      <Text style={[styles.modalTargetLabel, { color: colors.textSecondary }]}>
                        {t('createHabit.modalTargetText', { target: target })}
                      </Text>
                    </>
                  );
                })()}
              </View>

              {/* Adjust buttons */}
              <View style={styles.modalButtonsRow}>
                {(() => {
                  const currentLog = logs.find((l) => l.logDate === selectedDate);
                  const val = currentLog?.currentValue ?? 0;
                  return (
                    <>
                      <Pressable
                        onPress={() => handleCancelLogDate(selectedDate)}
                        disabled={val <= 0}
                        style={({ pressed }) => [
                          styles.modalAdjustBtn,
                          {
                            backgroundColor: colors.border,
                            opacity: val <= 0 ? 0.4 : pressed ? 0.8 : 1,
                            transform: [{ scale: pressed && val > 0 ? 0.92 : 1 }],
                          },
                        ]}
                      >
                        <MaterialCommunityIcons name="minus" size={24} color={colors.text} />
                      </Pressable>

                      <Pressable
                        onPress={() => handleLogDate(selectedDate)}
                        style={({ pressed }) => [
                          styles.modalAdjustBtn,
                          {
                            backgroundColor: colors.accentDim,
                            opacity: pressed ? 0.8 : 1,
                            transform: [{ scale: pressed ? 0.92 : 1 }],
                          },
                        ]}
                      >
                        <MaterialCommunityIcons name="plus" size={24} color={colors.accent} />
                      </Pressable>
                    </>
                  );
                })()}
              </View>

              {/* Close button */}
              <Pressable
                onPress={() => setModalVisible(false)}
                style={({ pressed }) => [
                  styles.modalDoneBtn,
                  {
                    backgroundColor: colors.accent,
                    opacity: pressed ? 0.8 : 1,
                    transform: [{ scale: pressed ? 0.96 : 1 }],
                  },
                ]}
              >
                <Text style={styles.modalDoneBtnText}>
                  {t('createHabit.modalDoneBtn')}
                </Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}
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
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiText: {
    fontSize: 36,
  },
  habitName: {
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
  calendarCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.xl,
  },
  calendarTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.md,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  monthNavBtn: {
    padding: Spacing.sm,
  },
  monthLabelText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    textTransform: 'capitalize',
  },
  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    columnGap: GAP,
    marginBottom: Spacing.sm,
  },
  weekDayHeaderCell: {
    width: CELL_SIZE,
    textAlign: 'center',
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    columnGap: GAP,
    rowGap: Spacing.sm,
  },
  dayCell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: CELL_SIZE / 2,
    borderWidth: 1,
  },
  dayCellPlaceholder: {
    width: CELL_SIZE,
    height: CELL_SIZE,
  },
  dayCellText: {
    fontSize: FontSize.sm,
  },
  errorContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  modalContent: {
    width: '100%',
    maxWidth: 320,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.xl,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  modalHeaderTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.xs,
  },
  modalDateText: {
    fontSize: FontSize.sm,
    marginBottom: Spacing.xl,
  },
  modalValueContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  modalValueLabel: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
  },
  modalTargetLabel: {
    fontSize: FontSize.xs,
    marginTop: Spacing.xs,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  modalAdjustBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDoneBtn: {
    width: '100%',
    height: 50,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDoneBtnText: {
    color: '#fff',
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
});
