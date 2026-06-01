import React, { useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '../api/client';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { BrandHeader } from '../components/BrandLogo';
import { Card } from '../components/Card';
import { colors, spacing, typography } from '../theme';
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
      <BrandHeader eyebrow="Beste deal" title="Slimste combinatie gevonden" subtitle="Open de geselecteerde webshops en rond je bestelling daar af." />

      <Card style={styles.hero} variant="dark">
        <Badge label="Goedkoopste totaal" tone="dark" />
        <Text style={styles.heroLabel}>Inclusief verzending</Text>
        <Text style={styles.total}>{formatMoney(optimization.total_cents)}</Text>
        <Text style={styles.heroMuted}>{optimization.selected_merchants_count || merchantLines.length} webshop(s) · affiliate doorverwijzing</Text>
      </Card>

      <View style={styles.row}>
        <Card style={styles.miniCard} variant="mint">
          <Text style={styles.label}>Producten</Text>
          <Text style={styles.value}>{formatMoney(optimization.products_cents)}</Text>
        </Card>
        <Card style={styles.miniCard} variant="coral">
          <Text style={styles.label}>Verzending</Text>
          <Text style={styles.value}>{formatMoney(optimization.shipping_cents)}</Text>
        </Card>
      </View>

      {!!optimization.promotion_discount_cents && optimization.promotion_discount_cents > 0 && (
        <Card>
          <View style={styles.cardHeader}>
            <Text style={styles.infoTitle}>Acties meegenomen</Text>
            <Badge label={`-${formatMoney(optimization.promotion_discount_cents)}`} tone="success" />
          </View>
          <Text style={styles.muted}>Kortingen zoals percentagekorting en 2+1 gratis zijn verwerkt in deze combinatie.</Text>
        </Card>
      )}

      <Card variant="mint">
        <Text style={styles.infoTitle}>Controleer bij de webshop</Text>
        <Text style={styles.muted}>SlimBesteld stuurt je door via affiliate-links. De definitieve prijs, voorraad en verzendkosten zie je altijd bij de webshop zelf.</Text>
      </Card>

      {merchantLines.map((line, index) => (
        <Card key={line.merchant.id} style={styles.merchantCard}>
          <View style={styles.cardHeader}>
            <View style={styles.merchantTitleWrap}>
              <Badge label={`Stap ${index + 1}`} tone="mint" />
              <Text style={styles.merchant}>{line.merchant.name || line.merchant.company_name}</Text>
            </View>
            {!!line.merchant.affiliate_network && <Badge label={line.merchant.affiliate_network} tone="neutral" />}
          </View>
          <Text style={styles.muted}>{line.carrier || 'Levering'} · levertijd max. {line.delivery_days_max} dagen</Text>

          {line.items.map((item) => (
            <View key={`${line.merchant.id}-${item.product.id}`} style={styles.lineItem}>
              <View style={styles.itemTextWrap}>
                <Text style={styles.itemName}>{item.quantity}× {item.product.name}</Text>
                {!!item.applied_promotions?.length && <Text style={styles.promo}>{item.applied_promotions.map((p) => p.title).join(', ')}</Text>}
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
          <View style={styles.totalRow}>
            <Text style={styles.totalLine}>Totaal bij deze webshop</Text>
            <Text style={styles.totalLine}>{formatMoney(line.total_cents)}</Text>
          </View>

          <Button title={`Open ${line.merchant.name || line.merchant.company_name}`} onPress={() => openMerchant(line)} loading={openingMerchantId === line.merchant.id} />
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: 110, gap: spacing.md },
  hero: { padding: spacing.lg },
  heroLabel: { color: '#C6D0E3', fontWeight: '800', marginTop: spacing.lg },
  heroMuted: { color: '#C6D0E3', marginTop: spacing.xs },
  total: { color: colors.white, fontSize: 48, fontWeight: '900', letterSpacing: -1.5, marginTop: 2 },
  row: { flexDirection: 'row', gap: spacing.md },
  miniCard: { flex: 1 },
  label: { ...typography.label },
  value: { fontSize: 23, fontWeight: '900', color: colors.text, marginTop: spacing.xs },
  infoTitle: { ...typography.sectionTitle },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.sm },
  merchantCard: { gap: spacing.sm },
  merchantTitleWrap: { gap: spacing.sm, flex: 1 },
  merchant: { fontSize: 22, fontWeight: '900', color: colors.text, letterSpacing: -0.4 },
  muted: { ...typography.body, fontSize: 14, lineHeight: 21 },
  lineItem: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, marginTop: spacing.sm },
  itemTextWrap: { flex: 1 },
  itemName: { flex: 1, color: colors.text, fontWeight: '700' },
  promo: { color: colors.success, fontSize: 12, marginTop: 3, fontWeight: '900' },
  priceWrap: { alignItems: 'flex-end' },
  oldPrice: { color: colors.muted, textDecorationLine: 'line-through', fontSize: 12 },
  itemPrice: { fontWeight: '900', color: colors.text },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, backgroundColor: colors.cloud, borderRadius: 16, padding: spacing.md, marginTop: spacing.sm, marginBottom: spacing.sm },
  totalLine: { fontWeight: '900', color: colors.text, fontSize: 16 }
});
