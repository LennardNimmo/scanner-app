import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { colors, radius, shadow, spacing } from '../theme';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'dark';

export function Button({
  title,
  onPress,
  disabled,
  loading,
  variant = 'primary',
  style
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: ButtonVariant;
  style?: ViewStyle;
}) {
  const isPrimary = variant === 'primary';
  const spinnerColor = variant === 'secondary' || variant === 'ghost' ? colors.navy : colors.white;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'danger' && styles.danger,
        variant === 'ghost' && styles.ghost,
        variant === 'dark' && styles.dark,
        isPrimary && shadow.soft,
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
        style
      ]}
    >
      {loading ? (
        <ActivityIndicator color={spinnerColor} />
      ) : (
        <Text
          style={[
            styles.text,
            variant === 'secondary' && styles.secondaryText,
            variant === 'ghost' && styles.ghostText,
            variant === 'dark' && styles.darkText
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54
  },
  primary: {
    backgroundColor: colors.coral
  },
  secondary: {
    backgroundColor: colors.mintSoft,
    borderWidth: 1,
    borderColor: '#BDF5E8'
  },
  danger: {
    backgroundColor: colors.danger
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border
  },
  dark: {
    backgroundColor: colors.navy
  },
  disabled: {
    opacity: 0.5
  },
  pressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.9
  },
  text: {
    color: colors.white,
    fontWeight: '900',
    fontSize: 16,
    letterSpacing: -0.1
  },
  secondaryText: {
    color: colors.navy
  },
  ghostText: {
    color: colors.navy
  },
  darkText: {
    color: colors.white
  }
});
