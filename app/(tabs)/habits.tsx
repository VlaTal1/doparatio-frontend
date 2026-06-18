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
import { HabitCard } from '../../src/components/HabitCard';
import { EmptyState } from '../../src/components/EmptyState';
import { habitsApi } from '../../src/api/habits';
import { HabitDTO } from '../../src/types';
import { BorderRadius, FontSize, FontWeight, Spacing, Shadows } from '../../src/constants/theme';

export default function HabitsScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const [habits, setHabits] = useState<HabitDTO[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const today = format(new Date(), 'yyyy-MM-dd');

  const loadHabits = useCallback(async () => {
    try {
      const data = await habitsApi.getAll();
      setHabits(data.filter((h) => h.active));
    } catch (error) {
      console.error('Load habits error:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadHabits();
    }, [loadHabits]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHabits();
    setRefreshing(false);
  };

  const handleLog = async (habitId: number) => {
    try {
      await habitsApi.log(habitId, today);
      await loadHabits();
    } catch (error: any) {
      Alert.alert(t('common.error'), error.response?.data?.message || t('habits.errorLog'));
    }
  };

  const handleCancelLog = async (habitId: number) => {
    try {
      await habitsApi.cancelLog(habitId, today);
      await loadHabits();
    } catch (error: any) {
      Alert.alert(t('common.error'), error.response?.data?.message || t('habits.errorCancelLog'));
    }
  };

  const handleLongPress = (habit: HabitDTO) => {
    Alert.alert(
      habit.name,
      t('habits.longPressOptionsTitle'),
      [
        {
          text: t('common.edit'),
          onPress: () => router.push(`/habit/create?id=${habit.id}`),
        },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => confirmDelete(habit),
        },
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
      ]
    );
  };

  const confirmDelete = (habit: HabitDTO) => {
    Alert.alert(
      t('createHabit.deleteConfirmTitle'),
      t('createHabit.deleteConfirmMsg'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await habitsApi.delete(habit.id!);
              await loadHabits();
            } catch (error: any) {
              Alert.alert(
                t('common.error'),
                error.response?.data?.message || t('createHabit.errorDelete')
              );
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{t('habits.title')}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {t('habits.activeCount', { count: habits.length })}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
        showsVerticalScrollIndicator={false}
      >
        {habits.length > 0 ? (
          habits.map((habit) => (
            <HabitCard
              key={habit.id}
              habit={habit}
              todayDate={today}
              onLog={handleLog}
              onCancelLog={handleCancelLog}
              showHeatmap={true}
              onPress={() => router.push(`/habit/create?id=${habit.id}`)}
              onLongPress={() => handleLongPress(habit)}
            />
          ))
        ) : (
          <EmptyState
            icon="fire"
            title={t('habits.noHabitsTitle')}
            subtitle={t('habits.noHabitsSubtitle')}
          />
        )}
      </ScrollView>

      {/* FAB */}
      <Pressable
        style={[styles.fab, { backgroundColor: colors.accent }, Shadows.elevated]}
        onPress={() => router.push('/habit/create')}
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
    paddingBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.heavy,
  },
  subtitle: {
    fontSize: FontSize.sm,
    marginTop: Spacing.xs,
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
