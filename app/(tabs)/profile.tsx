import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  RefreshControl,
  Platform,
  Alert,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../src/contexts/AuthContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { balanceApi } from '../../src/api/balance';
import { sharedGroup } from '../../src/utils/sharedGroup';
import { BorderRadius, FontSize, FontWeight, Spacing, Shadows } from '../../src/constants/theme';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { colors, mode, toggleTheme } = useTheme();
  const { t } = useTranslation();
  const [balance, setBalance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  
  const [isAndroid] = useState(Platform.OS === 'android');
  const [blockerEnabled, setBlockerEnabled] = useState(false);
  const [hasUsageStats, setHasUsageStats] = useState(false);
  const [hasOverlay, setHasOverlay] = useState(false);

  const loadBalance = useCallback(async () => {
    try {
      const data = await balanceApi.get();
      setBalance(data.balance);
      await sharedGroup.setTimeBalance(data.balance);
    } catch (error) {
      console.error('Load balance error:', error);
    }
  }, []);

  const checkBlockerStatus = useCallback(async () => {
    if (Platform.OS !== 'android') return;
    try {
      const enabled = await sharedGroup.isBlockerEnabled();
      const usage = await sharedGroup.hasUsageStatsPermission();
      const overlay = await sharedGroup.hasOverlayPermission();
      setBlockerEnabled(enabled);
      setHasUsageStats(usage);
      setHasOverlay(overlay);
    } catch (e) {
      console.error('Check blocker status error:', e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadBalance();
      checkBlockerStatus();
    }, [loadBalance, checkBlockerStatus]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBalance();
    await checkBlockerStatus();
    setRefreshing(false);
  };

  const handleToggleBlocker = async () => {
    if (Platform.OS !== 'android') return;

    const usage = await sharedGroup.hasUsageStatsPermission();
    const overlay = await sharedGroup.hasOverlayPermission();

    if (!usage || !overlay) {
      Alert.alert(
        t('profile.appBlockerSetupRequired'),
        'To enable App Blocker, you must grant both "Usage Access" and "Display Over Other Apps" permissions in Android settings.',
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: 'Setup',
            onPress: async () => {
              if (!usage) {
                await sharedGroup.requestUsageStatsPermission();
              } else if (!overlay) {
                await sharedGroup.requestOverlayPermission();
              }
            }
          }
        ]
      );
      return;
    }

    const nextState = !blockerEnabled;
    const success = await sharedGroup.setBlockerEnabled(nextState);
    if (success) {
      setBlockerEnabled(nextState);
    }
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

        {/* App Blocker Settings (Android Only) */}
        {isAndroid && (
          <View style={styles.settingsSection}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              {t('profile.appBlockerSection')}
            </Text>

            {/* Enable/Disable Toggle */}
            <Pressable
              style={[styles.settingItem, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={handleToggleBlocker}
            >
              <MaterialCommunityIcons
                name={blockerEnabled ? 'shield-check' : 'shield-outline'}
                size={22}
                color={blockerEnabled ? colors.success : colors.textSecondary}
              />
              <Text style={[styles.settingText, { color: colors.text }]}>
                {t('profile.appBlockerToggle')}
              </Text>
              <MaterialCommunityIcons
                name={blockerEnabled ? 'toggle-switch' : 'toggle-switch-off-outline'}
                size={28}
                color={blockerEnabled ? colors.success : colors.textSecondary}
              />
            </Pressable>

            {/* Usage Stats Permission Status */}
            <Pressable
              style={[styles.settingItem, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={async () => {
                if (!hasUsageStats) {
                  await sharedGroup.requestUsageStatsPermission();
                }
              }}
            >
              <MaterialCommunityIcons
                name="monitor-dashboard"
                size={22}
                color={hasUsageStats ? colors.success : colors.warning}
              />
              <Text style={[styles.settingText, { color: colors.text }]}>
                {t('profile.appBlockerUsageStatsPermission')}
              </Text>
              <Text style={{ color: hasUsageStats ? colors.success : colors.warning, fontSize: 13, fontWeight: 'bold' }}>
                {hasUsageStats ? t('profile.appBlockerGranted') : t('profile.appBlockerGrant')}
              </Text>
            </Pressable>

            {/* Overlay Permission Status */}
            <Pressable
              style={[styles.settingItem, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={async () => {
                if (!hasOverlay) {
                  await sharedGroup.requestOverlayPermission();
                }
              }}
            >
              <MaterialCommunityIcons
                name="card-text-outline"
                size={22}
                color={hasOverlay ? colors.success : colors.warning}
              />
              <Text style={[styles.settingText, { color: colors.text }]}>
                {t('profile.appBlockerOverlayPermission')}
              </Text>
              <Text style={{ color: hasOverlay ? colors.success : colors.warning, fontSize: 13, fontWeight: 'bold' }}>
                {hasOverlay ? t('profile.appBlockerGranted') : t('profile.appBlockerGrant')}
              </Text>
            </Pressable>
          </View>
        )}

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
