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
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../src/contexts/ThemeContext';
import { habitsApi } from '../../src/api/habits';
import { LogType } from '../../src/types';
import { BorderRadius, FontSize, FontWeight, Spacing } from '../../src/constants/theme';

const EMOJI_OPTIONS = ['📚', '💪', '🧘', '🏃', '💧', '🍎', '✍️', '🎵', '🧹', '💊', '🛌', '📵'];
const COLOR_OPTIONS = ['E5A93C', '4ADE80', '60A5FA', 'F87171', 'A78BFA', 'FB923C', '34D399', 'F472B6'];

export default function CreateHabitScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!id;

  const [name, setName] = useState('');
  const [icon, setIcon] = useState('📚');
  const [color, setColor] = useState('E5A93C');
  const [logType, setLogType] = useState<LogType>('BINARY');
  const [targetValue, setTargetValue] = useState('1');
  const [scheduleDays, setScheduleDays] = useState<number[]>([1, 2, 3, 4, 5, 6, 7]);
  const [loading, setLoading] = useState(false);
  const [hasLogs, setHasLogs] = useState(false);

  useEffect(() => {
    if (isEdit && id) {
      const habitId = parseInt(id, 10);
      if (!isNaN(habitId)) {
        setLoading(true);
        habitsApi.getById(habitId)
          .then((habit) => {
            setName(habit.name);
            setIcon(habit.icon);
            setColor(habit.color);
            setLogType(habit.logType);
            setTargetValue(String(habit.targetValue));
            setScheduleDays(habit.scheduleDays || [1, 2, 3, 4, 5, 6, 7]);
            setHasLogs(!!habit.logs && habit.logs.length > 0);
          })
          .catch((error) => {
            console.error('Fetch habit error:', error);
            Alert.alert(t('common.error'), t('createHabit.errorLoad', { defaultValue: 'Could not load habit details' }));
          })
          .finally(() => {
            setLoading(false);
          });
      }
    }
  }, [id, isEdit]);

  const DAY_LABELS = [
    t('createHabit.days.0'),
    t('createHabit.days.1'),
    t('createHabit.days.2'),
    t('createHabit.days.3'),
    t('createHabit.days.4'),
    t('createHabit.days.5'),
    t('createHabit.days.6'),
  ];

  const toggleDay = (day: number) => {
    setScheduleDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort(),
    );
  };

  const handleDelete = () => {
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
              await habitsApi.delete(parseInt(id!, 10));
              router.back();
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

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert(t('createHabit.errorTitle'), t('createHabit.emptyName'));
      return;
    }
    const target = parseInt(targetValue, 10);
    if (isNaN(target) || target < 1 || target > 99) {
      Alert.alert(t('createHabit.errorTitle'), t('createHabit.invalidTarget'));
      return;
    }

    setLoading(true);
    try {
      const scheduleVal = scheduleDays.length === 7 ? null : scheduleDays;
      const targetValNum = logType === 'BINARY' ? 1 : target;

      if (isEdit && id) {
        await habitsApi.update(parseInt(id, 10), {
          name: name.trim(),
          icon,
          color,
          logType,
          targetValue: targetValNum,
          scheduleDays: scheduleVal,
          active: true,
        });
      } else {
        await habitsApi.create({
          name: name.trim(),
          icon,
          color,
          logType,
          targetValue: targetValNum,
          scheduleDays: scheduleVal,
        });
      }
      router.back();
    } catch (error: any) {
      const defaultError = isEdit
        ? t('createHabit.errorUpdate', { defaultValue: 'Could not save habit' })
        : t('createHabit.errorCreate');
      Alert.alert(
        t('createHabit.errorTitle'),
        error.response?.data?.message || defaultError
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="close" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {isEdit ? t('createHabit.editTitle', { defaultValue: 'Edit Habit' }) : t('createHabit.title')}
          </Text>
          {isEdit ? (
            <Pressable onPress={handleDelete} style={styles.backBtn}>
              <MaterialCommunityIcons name="trash-can-outline" size={24} color={colors.error} />
            </Pressable>
          ) : (
            <View style={{ width: 40 }} />
          )}
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Name */}
          <Text style={[styles.label, { color: colors.textSecondary }]}>{t('createHabit.labelName')}</Text>
          <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder={t('createHabit.namePlaceholder')}
              placeholderTextColor={colors.textSecondary}
              value={name}
              onChangeText={setName}
              maxLength={50}
            />
          </View>

          {/* Icon */}
          <Text style={[styles.label, { color: colors.textSecondary }]}>{t('createHabit.labelIcon')}</Text>
          <View style={styles.optionsRow}>
            {EMOJI_OPTIONS.map((emoji) => (
              <Pressable
                key={emoji}
                style={[
                  styles.emojiOption,
                  {
                    backgroundColor: icon === emoji ? colors.accentDim : colors.card,
                    borderColor: icon === emoji ? colors.accent : colors.border,
                  },
                ]}
                onPress={() => setIcon(emoji)}
              >
                <Text style={styles.emojiText}>{emoji}</Text>
              </Pressable>
            ))}
          </View>

          {/* Color */}
          <Text style={[styles.label, { color: colors.textSecondary }]}>{t('createHabit.labelColor')}</Text>
          <View style={styles.optionsRow}>
            {COLOR_OPTIONS.map((c) => (
              <Pressable
                key={c}
                style={[
                  styles.colorOption,
                  {
                    backgroundColor: `#${c}`,
                    borderWidth: color === c ? 3 : 0,
                    borderColor: colors.text,
                  },
                ]}
                onPress={() => setColor(c)}
              />
            ))}
          </View>

          {/* Log Type */}
          <Text style={[styles.label, { color: colors.textSecondary }]}>{t('createHabit.labelLogType')}</Text>
          {hasLogs && (
            <Text style={[styles.typeWarningText, { color: colors.error }]}>
              {t('createHabit.cannotChangeTypeHint', { defaultValue: 'Cannot change type once a habit has logged entries' })}
            </Text>
          )}
          <View style={styles.typeRow}>
            <Pressable
              disabled={hasLogs}
              style={[
                styles.typeOption,
                {
                  backgroundColor: logType === 'BINARY' ? colors.accentDim : colors.card,
                  borderColor: logType === 'BINARY' ? colors.accent : colors.border,
                  opacity: hasLogs && logType !== 'BINARY' ? 0.4 : 1,
                },
              ]}
              onPress={() => setLogType('BINARY')}
            >
              <MaterialCommunityIcons
                name="check-circle-outline"
                size={22}
                color={logType === 'BINARY' ? colors.accent : colors.textSecondary}
              />
              <Text style={[styles.typeText, { color: logType === 'BINARY' ? colors.accent : colors.text }]}>
                {t('createHabit.typeBinary')}
              </Text>
              <Text style={[styles.typeHint, { color: colors.textSecondary }]}>
                {t('createHabit.typeBinaryHint')}
              </Text>
            </Pressable>

            <Pressable
              disabled={hasLogs}
              style={[
                styles.typeOption,
                {
                  backgroundColor: logType === 'NUMERIC' ? colors.accentDim : colors.card,
                  borderColor: logType === 'NUMERIC' ? colors.accent : colors.border,
                  opacity: hasLogs && logType !== 'NUMERIC' ? 0.4 : 1,
                },
              ]}
              onPress={() => setLogType('NUMERIC')}
            >
              <MaterialCommunityIcons
                name="counter"
                size={22}
                color={logType === 'NUMERIC' ? colors.accent : colors.textSecondary}
              />
              <Text style={[styles.typeText, { color: logType === 'NUMERIC' ? colors.accent : colors.text }]}>
                {t('createHabit.typeNumeric')}
              </Text>
              <Text style={[styles.typeHint, { color: colors.textSecondary }]}>
                {t('createHabit.typeNumericHint')}
              </Text>
            </Pressable>
          </View>

          {/* Target Value (for NUMERIC) */}
          {logType === 'NUMERIC' && (
            <>
              <Text style={[styles.label, { color: colors.textSecondary }]}>{t('createHabit.labelTargetValue')}</Text>
              <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder={t('createHabit.targetValuePlaceholder')}
                  placeholderTextColor={colors.textSecondary}
                  value={targetValue}
                  onChangeText={setTargetValue}
                  keyboardType="number-pad"
                  maxLength={2}
                />
              </View>
            </>
          )}

          {/* Schedule Days */}
          <Text style={[styles.label, { color: colors.textSecondary }]}>{t('createHabit.labelScheduleDays')}</Text>
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

          {/* Reward hint */}
          <View style={[styles.rewardHint, { backgroundColor: colors.accentDim }]}>
            <Text style={styles.rewardEmoji}>⏳</Text>
            <Text style={[styles.rewardText, { color: colors.accent }]}>
              {t('createHabit.rewardHint')}
            </Text>
          </View>
        </ScrollView>

        {/* Save/Create button */}
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
                {isEdit ? t('createHabit.saveButton', { defaultValue: 'Save Changes' }) : t('createHabit.createButton')}
              </Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
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
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  emojiOption: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiText: {
    fontSize: 22,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  typeWarningText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    marginBottom: Spacing.sm,
  },
  typeRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  typeOption: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  typeText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  typeHint: {
    fontSize: FontSize.xs,
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
});
