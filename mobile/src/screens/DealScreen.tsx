import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '../api/client';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { useAuth } from '../context/AuthContext';
import { colors, spacing } from '../theme';
import { Optimization } from '../types';
import { formatMoney } from '../utils/money';

export function DealScreen({ route, navigation }: any) {
  const { user } = useAuth();
  const optimization: Optimization = route.params.optimization;
  const [loading, setLoading] = useState(false);

  async function checkout() {
    if (!user) return;
    setLoading(true);
    try {
      await api.checkout(user.id, optimization.id);
      Alert.alert('Bestelling geplaatst', 'Je betaling is mock gecaptured en de deelorders zijn aangemaakt.');
      navigation.navigate('Pakketten');
    } catch (error: any) {
      Alert.alert('Checkout mislukt', error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Beste deal</Text>
      <Card style={styles.hero}>
        <Text style={styles.label}>Totaal inclusief verzending</Text>
        <Text style={styles.total}>{formatMoney(optimization.total_cents)}</Text>
        <Text style={styles.muted}>{optimization.selected_sellers_count} verkoper(s) · {optimization.seller_lines.length} pakket(ten)</Text>
      </Card>

      <View style={styles.row}>
        <Card style={styles.miniCard}>
          <Text style={styles.label}>Producten</Text>
          <Text style={styles.value}>{formatMoney(optimization.products_cents)}</Text>
        </Card>
        <Card style={styles.miniCard}>
          <Text style={styles.label}>Verzending</Text>
          <Text style={styles.value}>{formatMoney(optimization.shipping_cents)}</Text>
        </Card>
      </View>

      {optimization.seller_lines.map((line) => (
        <Card key={line.seller.id}>
          <Text style={styles.seller}>{line.seller.company_name}</Text>
          <Text style={styles.muted}>{line.carrier} · levertijd max. {line.delivery_days_max} dagen</Text>
          {line.items.map((item) => (
            <View key={item.product.id} style={styles.lineItem}>
              <Text style={styles.itemName}>{item.quantity}× {item.product.name}</Text>
              <Text style={styles.itemPrice}>{formatMoney(item.line_total_cents)}</Text>
            </View>
          ))}
          <View style={styles.divider} />
          <View style={styles.lineItem}>
            <Text style={styles.muted}>Subtotaal</Text>
            <Text>{formatMoney(line.subtotal_cents)}</Text>
          </View>
          <View style={styles.lineItem}>
            <Text style={styles.muted}>Verzending</Text>
            <Text>{formatMoney(line.shipping_cents)}</Text>
          </View>
        </Card>
      ))}

      <Button title="Betaal en bestel" onPress={checkout} loading={loading} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.text
  },
  hero: {
    backgroundColor: colors.accent
  },
  label: {
    color: colors.muted,
    fontWeight: '700',
    marginBottom: spacing.xs
  },
  total: {
    color: '#fff',
    fontSize: 42,
    fontWeight: '900'
  },
  value: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.text
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md
  },
  miniCard: {
    flex: 1
  },
  seller: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.text
  },
  muted: {
    color: colors.muted
  },
  lineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.sm
  },
  itemName: {
    flex: 1,
    color: colors.text,
    fontWeight: '600'
  },
  itemPrice: {
    fontWeight: '700'
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm
  }
});
