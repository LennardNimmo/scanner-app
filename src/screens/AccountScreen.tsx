import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { useAuth } from '../context/AuthContext';
import { colors, spacing } from '../theme';

export function AccountScreen() {
  const { user, logout } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Account</Text>
      <Card>
        <Text style={styles.name}>{user?.full_name}</Text>
        <Text style={styles.muted}>{user?.email}</Text>
      </Card>
      <Card>
        <Text style={styles.sectionTitle}>Marketplace MVP</Text>
        <Text style={styles.muted}>Betalingen, verkoper-payouts en tracking zijn in deze starter mock/sandbox.</Text>
      </Card>
      <Button title="Uitloggen" variant="danger" onPress={logout} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    gap: spacing.md
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.text
  },
  name: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.text
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.text,
    marginBottom: spacing.xs
  },
  muted: {
    color: colors.muted,
    lineHeight: 22
  }
});
