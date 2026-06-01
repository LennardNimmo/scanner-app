import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { colors, radius, shadow, spacing } from '../theme';

type CardVariant = 'default' | 'dark' | 'mint' | 'coral' | 'flat';

export function Card({ style, variant = 'default', ...props }: ViewProps & { variant?: CardVariant }) {
  return (
    <View
      style={[
        styles.card,
        variant === 'dark' && styles.dark,
        variant === 'mint' && styles.mint,
        variant === 'coral' && styles.coral,
        variant === 'flat' && styles.flat,
        style
      ]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card
  },
  dark: {
    backgroundColor: colors.navy,
    borderColor: colors.navy
  },
  mint: {
    backgroundColor: colors.mintSoft,
    borderColor: '#BDF5E8'
  },
  coral: {
    backgroundColor: colors.coralSoft,
    borderColor: '#FFD3CB'
  },
  flat: {
    shadowOpacity: 0,
    elevation: 0
  }
});
