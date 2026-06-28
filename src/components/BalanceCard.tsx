import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import i18n from '../i18n';
import { useTheme } from '../contexts/ThemeContext';
import { BorderRadius, FontSize, FontWeight, Spacing, Shadows } from '../constants/theme';

interface BalanceCardProps {
  balance: number;
}

export function BalanceCard({ balance }: BalanceCardProps) {
  const { colors } = useTheme();
  const pulse = useSharedValue(1);
  const glow = useSharedValue(0.2);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.03, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
    glow.value = withRepeat(
      withSequence(
        withTiming(0.4, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.15, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    shadowOpacity: glow.value,
  }));

  const totalMinutes = Math.floor(balance / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderColor: colors.accent,
          ...Shadows.glow(colors.accent),
        },
        glowStyle,
      ]}
    >
      <View style={styles.labelRow}>
        <MaterialCommunityIcons name="timer-sand" size={18} color={colors.accent} />
        <Text style={[styles.label, { color: colors.textSecondary }]}>{i18n.t('balance.earnedTime')}</Text>
      </View>
      <Animated.View style={[styles.valueRow, animatedStyle]}>
        <Text style={[styles.value, { color: colors.accent }]}>
          {hours > 0 ? `${hours}h ` : ''}{minutes}m
        </Text>
      </Animated.View>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        {i18n.t('balance.minutesAvailable', { count: totalMinutes })}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.xxl,
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  valueRow: {
    marginBottom: Spacing.xs,
  },
  value: {
    fontSize: FontSize.hero,
    fontWeight: FontWeight.heavy,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.regular,
  },
});
