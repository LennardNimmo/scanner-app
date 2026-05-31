import React, { useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '../api/client';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { colors, spacing } from '../theme';
import { MerchantLine, Optimization } from '../types';
import { formatMoney } from '../utils/money';

export function DealScreen({ route }: any) {
  const optimization: Optimization = route.params.optimization;
  const merchantLines = optimization.merchant_lines || optimization.seller_lines || [];
  const [openingMerchantId, setOpeningMerchantId] = useState<string | null>(null);

  async function openMerchant(line: MerchantLine) {
    setOpeningMerchantId(line.merchant.id);
    try {
      const url = api.affiliateRedirectUrl(optimization.id, line.merchant.id);
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) throw new Error('Kan webshop-link niet openen');
      await Linking.openURL(url);
    } catch (error: any) {
      Alert.alert('Link openen mislukt', error.message);
    } finally {
      setOpeningMerchantId(null);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Beste combinatie</Text>

      <Card style={styles.hero}>
        <Text style={styles.heroLabel}>Totaal inclusief verzending</Text>
        <Text style={styles.total}>{formatMoney(optimization.total_cents)}</Text>
        <Text style={styles.heroMuted}>
          {optimization.selected_merchants_count || merchantLines.length} webshop(s) · affiliate doorverwijzing
        </Text>
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

      {!!optimization.promotion_discount_cents && optimization.promotion_discount_cents > 0 && (
        <Card>
          <Text style={styles.label}>Acties meegenomen</Text>
          <Text style={styles.discount}>-{formatMoney(optimization.promotion_discount_cents)}</Text>
          <Text style={styles.muted}>Kortingen zoals percentagekorting en 2+1 gratis zijn verwerkt in deze combinatie.</Text>
        </Card>
      )}

      <Card>
        <Text style={styles.infoTitle}>Zo werkt bestellen nu</Text>
        <Text style={styles.muted}>
          De app plaatst geen bestelling meer namens jou. Je opent per webshop een affiliate-link en rondt de bestelling af bij de webshop zelf. Controleer daar altijd de definitieve prijs, voorraad en verzendkosten.
        </Text>
      </Card>

      {merchantLines.map((line) => (
        <Card key={line.merchant.id}>
          <Text style={styles.merchant}>{line.merchant.name || line.merchant.company_name}</Text>
          <Text style={styles.muted}>
            {line.carrier || 'Levering'} · levertijd max. {line.delivery_days_max} dagen
          </Text>
          {!!line.merchant.affiliate_network && (
            <Text style={styles.network}>Netwerk: {line.merchant.affiliate_network}</Text>
          )}

          {line.items.map((item) => (
            <View key={`${line.merchant.id}-${item.product.id}`} style={styles.lineItem}>
              <View style={styles.itemTextWrap}>
                <Text style={styles.itemName}>{item.quantity}× {item.product.name}</Text>
                {!!item.applied_promotions?.length && (
                  <Text style={styles.promo}>{item.applied_promotions.map((p) => p.title).join(', ')}</Text>
                )}
              </View>
              <View style={styles.priceWrap}>
                {item.discount_cents > 0 && <Text style={styles.oldPrice}>{formatMoney(item.line_subtotal_cents)}</Text>}
                <Text style={styles.itemPrice}>{formatMoney(item.line_total_cents)}</Text>
              </View>
            </View>
          ))}

          <View style={styles.divider} />
          <View style={styles.lineItem}>
            <Text style={styles.itemName}>Producten</Text>
            <Text style={styles.itemPrice}>{formatMoney(line.subtotal_cents)}</Text>
          </View>
          <View style={styles.lineItem}>
            <Text style={styles.itemName}>Verzending</Text>
            <Text style={styles.itemPrice}>{formatMoney(line.shipping_cents)}</Text>
          </View>
          <View style={styles.lineItem}>
            <Text style={styles.totalLine}>Totaal bij deze webshop</Text>
            <Text style={styles.totalLine}>{formatMoney(line.total_cents)}</Text>
          </View>

          <Button
            title={`Open ${line.merchant.name || line.merchant.company_name}`}
            onPress={() => openMerchant(line)}
            loading={openingMerchantId === line.merchant.id}
          />
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md },
  title: { fontSize: 32, fontWeight: '900', color: colors.text },
  hero: { backgroundColor: colors.accent },
  heroLabel: { color: '#fff', opacity: 0.8, fontWeight: '700', marginBottom: spacing.xs },
  heroMuted: { color: '#fff', opacity: 0.9, marginTop: spacing.xs },
  total: { color: '#fff', fontSize: 42, fontWeight: '900' },
  row: { flexDirection: 'row', gap: spacing.md },
  miniCard: { flex: 1 },
  label: { color: colors.muted, fontWeight: '700', marginBottom: spacing.xs },
  value: { fontSize: 22, fontWeight: '900', color: colors.text },
  discount: { fontSize: 22, fontWeight: '900', color: colors.success },
  infoTitle: { fontSize: 18, fontWeight: '900', color: colors.text, marginBottom: spacing.xs },
  merchant: { fontSize: 20, fontWeight: '900', color: colors.text },
  muted: { color: colors.muted, lineHeight: 20 },
  network: { color: colors.muted, marginTop: 4, fontSize: 12 },
  lineItem: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, marginTop: spacing.sm },
  itemTextWrap: { flex: 1 },
  itemName: { flex: 1, color: colors.text, fontWeight: '600' },
  promo: { color: colors.success, fontSize: 12, marginTop: 2, fontWeight: '700' },
  priceWrap: { alignItems: 'flex-end' },
  oldPrice: { color: colors.muted, textDecorationLine: 'line-through', fontSize: 12 },
  itemPrice: { fontWeight: '700', color: colors.text },
  totalLine: { fontWeight: '900', color: colors.text, fontSize: 16 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm }
});
