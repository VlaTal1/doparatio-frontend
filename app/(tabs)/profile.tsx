import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../src/contexts/AuthContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { balanceApi } from '../../src/api/balance';
import { BorderRadius, FontSize, FontWeight, Spacing, Shadows } from '../../src/constants/theme';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { colors, mode, toggleTheme } = useTheme();
  const { t } = useTranslation();
  const [balance, setBalance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const loadBalance = useCallback(async () => {
    try {
      const data = await balanceApi.get();
      setBalance(data.balance);
    } catch (error) {
      console.error('Load balance error:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadBalance();
    }, [loadBalance]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBalance();
    setRefreshing(false);
  };

  const userName = user?.user_metadata?.name || t('profile.defaultUser');
  const userEmail = user?.email || '';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: colors.text }]}>{t('profile.title')}</Text>

        {/* Avatar + Info */}
        <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }, Shadows.card]}>
          <View style={[styles.avatar, { backgroundColor: colors.accentDim }]}>
            <Text style={styles.avatarEmoji}>
              {userName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={[styles.name, { color: colors.text }]}>{userName}</Text>
          <Text style={[styles.email, { color: colors.textSecondary }]}>{userEmail}</Text>
        </View>

        {/* Balance */}
        <View style={[styles.balanceCard, { backgroundColor: colors.card, borderColor: colors.accent }, Shadows.card]}>
          <MaterialCommunityIcons name="timer-sand" size={24} color={colors.accent} />
          <View style={styles.balanceInfo}>
            <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>{t('profile.balanceLabel')}</Text>
            <Text style={[styles.balanceValue, { color: colors.accent }]}>
              {Math.floor(balance / 60) > 0 ? `${Math.floor(balance / 60)}h ` : ''}{balance % 60}m
            </Text>
          </View>
        </View>

        {/* Settings */}
        <View style={styles.settingsSection}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{t('profile.settingsSection')}</Text>

          <Pressable
            style={[styles.settingItem, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={toggleTheme}
          >
            <MaterialCommunityIcons
              name={mode === 'dark' ? 'weather-night' : 'weather-sunny'}
              size={22}
              color={colors.accent}
            />
            <Text style={[styles.settingText, { color: colors.text }]}>
              {mode === 'dark' ? t('profile.darkTheme') : t('profile.lightTheme')}
            </Text>
            <MaterialCommunityIcons name="swap-horizontal" size={20} color={colors.textSecondary} />
          </Pressable>

          <Pressable
            style={[styles.settingItem, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={signOut}
          >
            <MaterialCommunityIcons name="logout" size={22} color={colors.error} />
            <Text style={[styles.settingText, { color: colors.error }]}>{t('profile.signOut')}</Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textSecondary} />
          </Pressable>
        </View>

        {/* App Info */}
        <Text style={[styles.version, { color: colors.textSecondary }]}>{t('profile.version')}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.huge,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.heavy,
    paddingTop: Spacing.lg,
    marginBottom: Spacing.xxl,
  },
  profileCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.xxl,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  avatarEmoji: {
    fontSize: 28,
    fontWeight: FontWeight.bold as any,
    color: '#E5A93C',
  },
  name: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
  },
  email: {
    fontSize: FontSize.sm,
    marginTop: Spacing.xs,
  },
  balanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.xl,
    marginBottom: Spacing.xxl,
    gap: Spacing.lg,
  },
  balanceInfo: {
    flex: 1,
  },
  balanceLabel: {
    fontSize: FontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  balanceValue: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.heavy,
    marginTop: 2,
  },
  settingsSection: {
    marginBottom: Spacing.xxl,
  },
  sectionLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  settingText: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },
  version: {
    textAlign: 'center',
    fontSize: FontSize.xs,
  },
});
