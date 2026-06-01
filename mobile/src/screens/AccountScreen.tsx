import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { BrandHeader } from '../components/BrandLogo';
import { Card } from '../components/Card';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, typography } from '../theme';

export function AccountScreen() {
  const { user, logout } = useAuth();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <BrandHeader eyebrow="Profiel" title="Account" subtitle="Bekijk je account en beheer je SlimBesteld-sessie." />

      <Card style={styles.profileCard} variant="dark">
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(user?.full_name || user?.email || 'S').slice(0, 1).toUpperCase()}</Text>
        </View>
        <View style={styles.profileText}>
          <Text style={styles.name}>{user?.full_name || 'SlimBesteld gebruiker'}</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>
      </Card>

      <Card style={styles.infoCard}>
        <View style={styles.infoHeader}>
          <Text style={styles.sectionTitle}>Zo werkt SlimBesteld</Text>
          <Badge label="Slim vergelijken" tone="mint" />
        </View>
        <Text style={styles.muted}>Scan producten die op zijn, vergelijk je hele mandje en open de webshops waar je het voordeligst uit bent.</Text>
      </Card>

      <Card style={styles.infoCard} variant="mint">
        <Text style={styles.sectionTitle}>Bestellen bij webshops</Text>
        <Text style={styles.muted}>Je rondt je bestelling af bij de webshop zelf. De definitieve prijs, voorraad en levertijd controleer je daar nog één keer.</Text>
      </Card>

      <Card style={styles.infoCard}>
        <Text style={styles.sectionTitle}>Pakketten volgen</Text>
        <Text style={styles.muted}>Ontvang je een track & trace code? Voeg die handmatig toe in het pakketoverzicht, zodat je alles op één plek bewaart.</Text>
      </Card>

      <Button title="Uitloggen" variant="danger" onPress={() => { logout(); }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: 120, gap: spacing.md },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  avatar: { width: 58, height: 58, borderRadius: 22, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.navy, fontSize: 24, fontWeight: '900' },
  profileText: { flex: 1 },
  name: { fontSize: 20, fontWeight: '900', color: colors.white, letterSpacing: -0.3 },
  email: { color: '#C6D0E3', marginTop: 3 },
  infoCard: { padding: spacing.lg },
  infoHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, marginBottom: spacing.xs },
  sectionTitle: { ...typography.sectionTitle },
  muted: { ...typography.body, fontSize: 15, lineHeight: 22 }
});
