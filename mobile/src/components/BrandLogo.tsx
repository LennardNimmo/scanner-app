import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';

export function BrandMark({ size = 56, dark = false }: { size?: number; dark?: boolean }) {
  const scale = size / 56;
  return (
    <View
      style={[
        styles.mark,
        {
          width: size,
          height: size,
          borderRadius: radius.lg * scale,
          backgroundColor: dark ? colors.navy : colors.white,
          borderColor: dark ? colors.navy : colors.border
        }
      ]}
    >
      <View style={[styles.handle, { width: 19 * scale, height: 12 * scale, borderRadius: 10 * scale, borderColor: dark ? colors.white : colors.navy, top: 10 * scale }]} />
      <View style={[styles.bag, { width: 32 * scale, height: 32 * scale, borderRadius: 9 * scale, borderColor: dark ? colors.white : colors.navy, top: 18 * scale }]} />
      <View style={[styles.scanLine, { width: 36 * scale, top: 31 * scale, backgroundColor: colors.mint }]} />
      <Text style={[styles.check, { fontSize: 25 * scale, color: colors.mint, top: 18 * scale }]}>✓</Text>
      <Text style={[styles.arrow, { fontSize: 19 * scale, color: colors.mint, right: 8 * scale, bottom: 7 * scale }]}>↗</Text>
    </View>
  );
}

export function BrandLogo({ compact = false, light = false }: { compact?: boolean; light?: boolean }) {
  return (
    <View style={styles.logoRow}>
      <BrandMark size={compact ? 42 : 56} dark={light} />
      {!compact && (
        <Text style={[styles.wordmark, light && styles.wordmarkLight]}>
          Slim<Text style={styles.wordmarkAccent}>Besteld</Text>
        </Text>
      )}
    </View>
  );
}

export function BrandHeader({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }) {
  return (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <BrandLogo compact />
        {eyebrow && <Text style={styles.eyebrow}>{eyebrow}</Text>}
      </View>
      <Text style={styles.title}>{title}</Text>
      {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm
  },
  mark: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    overflow: 'hidden'
  },
  handle: {
    position: 'absolute',
    borderWidth: 3,
    borderBottomWidth: 0
  },
  bag: {
    position: 'absolute',
    borderWidth: 3
  },
  scanLine: {
    position: 'absolute',
    height: 4,
    borderRadius: 999
  },
  check: {
    position: 'absolute',
    fontWeight: '900'
  },
  arrow: {
    position: 'absolute',
    fontWeight: '900'
  },
  wordmark: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.navy,
    letterSpacing: -1.2
  },
  wordmarkLight: {
    color: colors.white
  },
  wordmarkAccent: {
    color: colors.mint
  },
  header: {
    gap: spacing.sm,
    marginBottom: spacing.md
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  eyebrow: {
    color: colors.mintDark,
    fontWeight: '900',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    fontSize: 12
  },
  title: {
    color: colors.text,
    fontSize: 33,
    lineHeight: 38,
    fontWeight: '900',
    letterSpacing: -1
  },
  subtitle: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 23
  }
});
