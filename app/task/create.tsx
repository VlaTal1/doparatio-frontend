import React, { useState } from 'react';
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../src/contexts/ThemeContext';
import { tasksApi } from '../../src/api/tasks';
import { Difficulty, DIFFICULTY_CONFIG } from '../../src/types';
import { BorderRadius, FontSize, FontWeight, Spacing } from '../../src/constants/theme';

export default function CreateTaskScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const [name, setName] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('ROUTINE');
  const [recurring, setRecurring] = useState(false);
  const [scheduleDays, setScheduleDays] = useState<number[]>([1, 2, 3, 4, 5, 6, 7]);
  const [loading, setLoading] = useState(false);

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

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert(t('createTask.errorTitle'), t('createTask.emptyName'));
      return;
    }

    setLoading(true);
    try {
      await tasksApi.create({
        name: name.trim(),
        difficulty,
        recurring,
        scheduleDays: recurring && scheduleDays.length < 7 ? scheduleDays : undefined,
      });
      router.back();
    } catch (error: any) {
      Alert.alert(t('createTask.errorTitle'), error.response?.data?.message || t('createTask.errorCreate'));
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
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="close" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('createTask.title')}</Text>
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
            onPress={handleCreate}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.createButtonText}>{t('createTask.createButton')}</Text>
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
});
