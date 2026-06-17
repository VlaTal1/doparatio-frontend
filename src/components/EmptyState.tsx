import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { FontSize, FontWeight, Spacing } from '../constants/theme';

interface EmptyStateProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  subtitle: string;
}

export function EmptyState({ icon, title, subtitle }: EmptyStateProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <MaterialCommunityIcons name={icon} size={64} color={colors.textSecondary} style={{ opacity: 0.4 }} />
      <Text style={[styles.title, { color: colors.textSecondary }]}>{title}</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary, opacity: 0.7 }]}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.huge,
    paddingHorizontal: Spacing.xxl,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    marginTop: Spacing.lg,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FontSize.sm,
    marginTop: Spacing.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
});
