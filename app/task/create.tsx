import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Switch,
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../src/contexts/ThemeContext';
import { tasksApi } from '../../src/api/tasks';
import { Difficulty, DIFFICULTY_CONFIG } from '../../src/types';
import { BorderRadius, FontSize, FontWeight, Spacing } from '../../src/constants/theme';
import { format } from 'date-fns';

const MODAL_WIDTH = 320;
const CALENDAR_PADDING = 16;
const GAP = 6;
const CELL_SIZE = Math.floor((MODAL_WIDTH - CALENDAR_PADDING * 2 - (6 * GAP) - 4) / 7);

function getRgbaColor(hex: string, opacity: number): string {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

export default function CreateTaskScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!id;

  const [name, setName] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('ROUTINE');
  const [recurring, setRecurring] = useState(false);
  const [scheduleDays, setScheduleDays] = useState<number[]>([1, 2, 3, 4, 5, 6, 7]);
  const [dueDate, setDueDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEdit && id) {
      const taskId = parseInt(id, 10);
      if (!isNaN(taskId)) {
        setLoading(true);
        tasksApi.getById(taskId)
          .then((task) => {
            setName(task.name);
            setDifficulty(task.difficulty);
            setRecurring(task.recurring);
            if (task.scheduleDays) {
              setScheduleDays(task.scheduleDays);
            }
            if (task.dueDate) {
              setDueDate(new Date(task.dueDate));
            }
          })
          .catch((error) => {
            console.error('Fetch task details error:', error);
            Alert.alert(t('createTask.errorTitle'), t('createTask.errorLoad'));
          })
          .finally(() => {
            setLoading(false);
          });
      }
    }
  }, [id, isEdit]);

  const DAY_LABELS = [
    t('createTask.days.0'),
    t('createTask.days.1'),
    t('createTask.days.2'),
    t('createTask.days.3'),
    t('createTask.days.4'),
    t('createTask.days.5'),
    t('createTask.days.6'),
  ];

  const toggleDay = (day: number) => {
    setScheduleDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort(),
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert(t('createTask.errorTitle'), t('createTask.emptyName'));
      return;
    }

    setLoading(true);
    try {
      const scheduleDaysVal = recurring && scheduleDays.length < 7 ? scheduleDays : undefined;
      const dueDateVal = !recurring ? format(dueDate, 'yyyy-MM-dd') : undefined;

      if (isEdit && id) {
        await tasksApi.update(parseInt(id, 10), {
          name: name.trim(),
          difficulty,
          recurring,
          scheduleDays: scheduleDaysVal || null,
          dueDate: dueDateVal || null,
          active: true,
        });
      } else {
        await tasksApi.create({
          name: name.trim(),
          difficulty,
          recurring,
          scheduleDays: scheduleDaysVal,
          dueDate: dueDateVal,
        });
      }
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)/tasks');
      }
    } catch (error: any) {
      const defaultError = isEdit
        ? t('createTask.errorUpdate', { defaultValue: 'Could not save task' })
        : t('createTask.errorCreate');
      Alert.alert(t('createTask.errorTitle'), error.response?.data?.message || defaultError);
    } finally {
      setLoading(false);
    }
  };

  const difficultyColor = (d: Difficulty) =>
    d === 'ROUTINE' ? colors.routine : d === 'MEDIUM' ? colors.medium : colors.hard;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(tabs)/tasks');
              }
            }}
            style={styles.backBtn}
          >
            <MaterialCommunityIcons name="close" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
             {isEdit ? t('createTask.editTitle', { defaultValue: 'Edit Task' }) : t('createTask.title')}
           </Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Name */}
          <Text style={[styles.label, { color: colors.textSecondary }]}>{t('createTask.labelName')}</Text>
          <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder={t('createTask.namePlaceholder')}
              placeholderTextColor={colors.textSecondary}
              value={name}
              onChangeText={setName}
              maxLength={100}
            />
          </View>

          {/* Difficulty */}
          <Text style={[styles.label, { color: colors.textSecondary }]}>{t('createTask.labelDifficulty')}</Text>
          <View style={styles.difficultyRow}>
            {(['ROUTINE', 'MEDIUM', 'HARD'] as Difficulty[]).map((d) => {
              const config = DIFFICULTY_CONFIG[d];
              const isSelected = difficulty === d;
              const dColor = difficultyColor(d);
              return (
                <Pressable
                  key={d}
                  style={[
                    styles.difficultyOption,
                    {
                      backgroundColor: isSelected ? `${dColor}20` : colors.card,
                      borderColor: isSelected ? dColor : colors.border,
                    },
                  ]}
                  onPress={() => setDifficulty(d)}
                >
                  <Text style={styles.difficultyEmoji}>{config.emoji}</Text>
                  <Text style={[styles.difficultyLabel, { color: isSelected ? dColor : colors.text }]}>
                    {t(`difficulty.${d}`)}
                  </Text>
                  <Text style={[styles.difficultyMinutes, { color: dColor }]}>
                    +{config.minutes}m
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Recurring toggle */}
          <View style={[styles.toggleRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.toggleInfo}>
              <MaterialCommunityIcons name="repeat" size={22} color={colors.accent} />
              <View>
                <Text style={[styles.toggleLabel, { color: colors.text }]}>{t('createTask.recurringLabel')}</Text>
                <Text style={[styles.toggleHint, { color: colors.textSecondary }]}>
                  {t('createTask.recurringHint')}
                </Text>
              </View>
            </View>
            <Switch
              value={recurring}
              onValueChange={setRecurring}
              trackColor={{ false: colors.border, true: colors.accentDim }}
              thumbColor={recurring ? colors.accent : colors.textSecondary}
            />
          </View>

          {/* Schedule days (only for recurring) */}
          {recurring && (
            <>
              <Text style={[styles.label, { color: colors.textSecondary }]}>{t('createTask.labelScheduleDays')}</Text>
              <View style={styles.daysRow}>
                {DAY_LABELS.map((label, index) => {
                  const day = index + 1;
                  const selected = scheduleDays.includes(day);
                  return (
                    <Pressable
                      key={day}
                      style={[
                        styles.dayChip,
                        {
                          backgroundColor: selected ? colors.accent : colors.card,
                          borderColor: selected ? colors.accent : colors.border,
                        },
                      ]}
                      onPress={() => toggleDay(day)}
                    >
                      <Text style={[styles.dayText, { color: selected ? '#fff' : colors.textSecondary }]}>
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          {/* Due date selector (only for non-recurring) */}
          {!recurring && (
            <>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                {t('createTask.labelDueDate')}
              </Text>
              <Pressable
                style={[styles.dateSelectorField, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => {
                  setCalendarMonth(dueDate);
                  setShowDatePicker(true);
                }}
              >
                <MaterialCommunityIcons name="calendar" size={20} color={colors.accent} />
                <Text style={[styles.dateSelectorText, { color: colors.text }]}>
                  {format(dueDate, 'MMMM d, yyyy')}
                </Text>
                <MaterialCommunityIcons name="chevron-down" size={20} color={colors.textSecondary} />
              </Pressable>
            </>
          )}

          {/* Reward hint */}
          <View style={[styles.rewardHint, { backgroundColor: `${difficultyColor(difficulty)}15` }]}>
            <Text style={styles.rewardEmoji}>{DIFFICULTY_CONFIG[difficulty].emoji}</Text>
            <Text style={[styles.rewardText, { color: difficultyColor(difficulty) }]}>
              {t('createTask.rewardHint', { minutes: DIFFICULTY_CONFIG[difficulty].minutes })}
            </Text>
          </View>
        </ScrollView>

        {/* Create button */}
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <Pressable
            style={[styles.createButton, { backgroundColor: colors.accent, opacity: loading ? 0.7 : 1 }]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.createButtonText}>
                {isEdit ? t('createTask.saveButton', { defaultValue: 'Save Changes' }) : t('createTask.createButton')}
              </Text>
            )}
          </Pressable>
        </View>
        </KeyboardAvoidingView>

      {/* Due Date Calendar Picker Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showDatePicker}
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalHeaderTitle, { color: colors.text }]}>
              {t('createTask.calendarTitle')}
            </Text>

            {/* Month selector header */}
            <View style={styles.calendarHeader}>
              <Pressable
                onPress={() => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                style={styles.monthNavBtn}
              >
                <MaterialCommunityIcons name="chevron-left" size={24} color={colors.text} />
              </Pressable>
              <Text style={[styles.monthLabelText, { color: colors.text }]}>
                {format(calendarMonth, 'MMMM yyyy')}
              </Text>
              <Pressable
                onPress={() => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                style={styles.monthNavBtn}
              >
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
              {(() => {
                const year = calendarMonth.getFullYear();
                const month = calendarMonth.getMonth();
                const daysInMonth = new Date(year, month + 1, 0).getDate();
                const startDay = new Date(year, month, 1).getDay();
                const startOffset = startDay === 0 ? 6 : startDay - 1;

                const cells: React.ReactNode[] = [];
                const selectedStr = format(dueDate, 'yyyy-MM-dd');
                const todayStr = format(new Date(), 'yyyy-MM-dd');

                for (let i = 0; i < startOffset; i++) {
                  cells.push(<View key={`empty-${i}`} style={styles.dayCellPlaceholder} />);
                }

                for (let day = 1; day <= daysInMonth; day++) {
                  const cellDate = new Date(year, month, day);
                  const cellDateStr = format(cellDate, 'yyyy-MM-dd');
                  const isSelected = cellDateStr === selectedStr;
                  const isToday = cellDateStr === todayStr;

                  const cellColor = isSelected ? colors.accent : colors.card;

                  cells.push(
                    <Pressable
                      key={`day-${day}`}
                      onPress={() => {
                        setDueDate(cellDate);
                        setShowDatePicker(false);
                      }}
                      style={({ pressed }) => [
                        styles.dayCell,
                        {
                          backgroundColor: cellColor,
                          borderColor: isToday ? colors.accent : isSelected ? colors.accent : colors.border,
                          borderWidth: isToday || isSelected ? 1.5 : 1,
                          opacity: pressed ? 0.8 : 1,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayCellText,
                          {
                            color: isSelected ? '#fff' : colors.text,
                            fontWeight: isToday || isSelected ? FontWeight.bold : FontWeight.regular,
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
              })()}
            </View>

            {/* Close button */}
            <Pressable
              onPress={() => setShowDatePicker(false)}
              style={({ pressed }) => [
                styles.modalDoneBtn,
                {
                  backgroundColor: colors.border,
                  marginTop: Spacing.xl,
                  opacity: pressed ? 0.8 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                },
              ]}
            >
              <Text style={[styles.modalDoneBtnText, { color: colors.text }]}>
                {t('createTask.doneButton')}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxxl,
  },
  label: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  inputContainer: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    height: 52,
    justifyContent: 'center',
  },
  input: {
    fontSize: FontSize.md,
  },
  difficultyRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  difficultyOption: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  difficultyEmoji: {
    fontSize: 22,
  },
  difficultyLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  difficultyMinutes: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginTop: Spacing.xl,
  },
  toggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  toggleLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },
  toggleHint: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  daysRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  dayChip: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignItems: 'center',
  },
  dayText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  rewardHint: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginTop: Spacing.xl,
    gap: Spacing.md,
  },
  rewardEmoji: {
    fontSize: 20,
  },
  rewardText: {
    flex: 1,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  footer: {
    borderTopWidth: 1,
    padding: Spacing.lg,
  },
  createButton: {
    height: 56,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButtonText: {
    color: '#fff',
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  dateSelectorField: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    height: 52,
    gap: Spacing.md,
  },
  dateSelectorText: {
    flex: 1,
    fontSize: FontSize.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  modalContent: {
    width: MODAL_WIDTH,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: CALENDAR_PADDING,
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
    marginBottom: Spacing.md,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
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
    width: '100%',
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
    width: '100%',
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
  modalDoneBtn: {
    width: '100%',
    height: 50,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDoneBtnText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
});
