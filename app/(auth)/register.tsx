import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../src/contexts/AuthContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { BorderRadius, FontSize, FontWeight, Spacing } from '../../src/constants/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert(t('common.error'), t('auth.register.emptyFields'));
      return;
    }
    if (password.length < 6) {
      Alert.alert(t('common.error'), t('auth.register.passwordTooShort'));
      return;
    }
    setLoading(true);
    const { error } = await signUp(email.trim(), password, name.trim());
    setLoading(false);
    if (error) {
      Alert.alert(t('auth.register.errorTitle'), error.message);
    } else {
      Alert.alert(t('auth.register.successTitle'), t('auth.register.successMessage'), [
        { text: t('common.ok'), onPress: () => router.replace('/(auth)/login') },
      ]);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
          </Pressable>
        </View>

        <View style={styles.logoSection}>
          <Text style={[styles.title, { color: colors.text }]}>{t('auth.register.title')}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {t('auth.register.subtitle')}
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <MaterialCommunityIcons name="account-outline" size={20} color={colors.textSecondary} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder={t('auth.register.namePlaceholder')}
              placeholderTextColor={colors.textSecondary}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoComplete="name"
            />
          </View>

          <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <MaterialCommunityIcons name="email-outline" size={20} color={colors.textSecondary} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder={t('auth.register.emailPlaceholder')}
              placeholderTextColor={colors.textSecondary}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
          </View>

          <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <MaterialCommunityIcons name="lock-outline" size={20} color={colors.textSecondary} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder={t('auth.register.passwordPlaceholder')}
              placeholderTextColor={colors.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoComplete="new-password"
            />
            <Pressable onPress={() => setShowPassword(!showPassword)}>
              <MaterialCommunityIcons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={colors.textSecondary}
              />
            </Pressable>
          </View>

          <Pressable
            style={[styles.button, { backgroundColor: colors.accent, opacity: loading ? 0.7 : 1 }]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>{t('auth.register.createAccount')}</Text>
            )}
          </Pressable>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            {t('auth.register.hasAccount')}
          </Text>
          <Link href="/(auth)/login" asChild>
            <Pressable>
              <Text style={[styles.footerLink, { color: colors.accent }]}>{t('auth.register.signIn')}</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  header: {
    position: 'absolute',
    top: 60,
    left: Spacing.xxl,
    zIndex: 1,
  },
  backButton: {
    padding: Spacing.sm,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: Spacing.huge,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.heavy,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: FontSize.md,
    marginTop: Spacing.sm,
  },
  form: {
    gap: Spacing.md,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    height: 56,
    gap: Spacing.md,
  },
  input: {
    flex: 1,
    fontSize: FontSize.md,
    height: '100%',
  },
  button: {
    height: 56,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  buttonText: {
    color: '#fff',
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.xxl,
  },
  footerText: {
    fontSize: FontSize.md,
  },
  footerLink: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
});
