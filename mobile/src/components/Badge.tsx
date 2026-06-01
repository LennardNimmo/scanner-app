import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';

type BadgeTone = 'mint' | 'coral' | 'success' | 'warning' | 'dark' | 'neutral';

export function Badge({ label, tone = 'mint' }: { label: string; tone?: BadgeTone }) {
  return (
    <View
      style={[
        styles.badge,
        tone === 'mint' && styles.mint,
        tone === 'coral' && styles.coral,
        tone === 'success' && styles.success,
        tone === 'warning' && styles.warning,
        tone === 'dark' && styles.dark,
        tone === 'neutral' && styles.neutral
      ]}
    >
      <Text
        style={[
          styles.text,
          tone === 'mint' && styles.mintText,
          tone === 'coral' && styles.coralText,
          tone === 'success' && styles.successText,
          tone === 'warning' && styles.warningText,
          tone === 'dark' && styles.darkText,
          tone === 'neutral' && styles.neutralText
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6
  },
  text: {
    fontSize: 12,
    fontWeight: '900'
  },
  mint: { backgroundColor: colors.mintSoft },
  coral: { backgroundColor: colors.coralSoft },
  success: { backgroundColor: colors.successSoft },
  warning: { backgroundColor: colors.warningSoft },
  dark: { backgroundColor: colors.navy },
  neutral: { backgroundColor: colors.cloud },
  mintText: { color: colors.mintDark },
  coralText: { color: colors.coral },
  successText: { color: colors.success },
  warningText: { color: '#B86B00' },
  darkText: { color: colors.white },
  neutralText: { color: colors.muted }
});
