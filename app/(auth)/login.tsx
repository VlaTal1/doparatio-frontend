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
import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../src/contexts/AuthContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { BorderRadius, FontSize, FontWeight, Spacing } from '../../src/constants/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert(t('common.error'), t('auth.login.emptyFields'));
      return;
    }
    setLoading(true);
    const { error } = await signIn(email.trim(), password);
    setLoading(false);
    if (error) {
      Alert.alert(t('auth.login.errorTitle'), error.message);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoSection}>
          <View style={[styles.logoCircle, { backgroundColor: colors.accentDim }]}>
            <Text style={styles.logoEmoji}>⏳</Text>
          </View>
          <Text style={[styles.title, { color: colors.text }]}>DopaRatio</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {t('auth.login.subtitle')}
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <MaterialCommunityIcons name="email-outline" size={20} color={colors.textSecondary} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder={t('auth.login.emailPlaceholder')}
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
              placeholder={t('auth.login.passwordPlaceholder')}
              placeholderTextColor={colors.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoComplete="password"
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
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>{t('auth.login.signIn')}</Text>
            )}
          </Pressable>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            {t('auth.login.noAccount')}
          </Text>
          <Link href="/(auth)/register" asChild>
            <Pressable>
              <Text style={[styles.footerLink, { color: colors.accent }]}>{t('auth.login.register')}</Text>
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
  logoSection: {
    alignItems: 'center',
    marginBottom: Spacing.huge,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  logoEmoji: {
    fontSize: 36,
  },
  title: {
    fontSize: FontSize.xxxl,
    fontWeight: FontWeight.heavy,
    letterSpacing: -1,
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
