import React, { useCallback, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../api/client';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { BrandHeader } from '../components/BrandLogo';
import { Card } from '../components/Card';
import { useAuth } from '../context/AuthContext';
import { colors, radius, spacing, typography } from '../theme';
import { CartItem, Optimization } from '../types';
import { formatMoney } from '../utils/money';

export function CartScreen({ navigation }: any) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  async function loadCart() {
    if (!user) return;
    const response: any = await api.getCart(user.id);
    setItems(response.items);
  }

  useFocusEffect(
    useCallback(() => {
      loadCart().catch(() => undefined);
    }, [user?.id])
  );

  async function changeQuantity(productId: string, quantity: number) {
    if (!user) return;
    const response: any = await api.updateCartItem(user.id, productId, quantity);
    setItems(response.items);
  }

  async function optimize() {
    if (!user) return;
    setLoading(true);
    try {
      const response: any = await api.optimize(user.id);
      const optimization: Optimization = response.optimization;
      navigation.navigate('Beste deal', { optimization });
    } catch (error: any) {
      Alert.alert('Kan niet optimaliseren', error.message);
    } finally {
      setLoading(false);
    }
  }

  const estimatedTotal = items.reduce((sum, item) => sum + (item.min_price_cents || 0) * item.quantity, 0);

  return (
    <View style={styles.container}>
      <BrandHeader eyebrow="Mandje" title="Je slimme bestellijst" subtitle="Wij zoeken straks de beste combinatie van webshops, verzending en acties." />

      <Card style={styles.summary} variant="dark">
        <View>
          <Text style={styles.summaryLabel}>Vanaf-prijs producten</Text>
          <Text style={styles.summaryValue}>{formatMoney(estimatedTotal)}</Text>
        </View>
        <Badge label={`${items.length} product${items.length === 1 ? '' : 'en'}`} tone="dark" />
      </Card>

      <FlatList
        data={items}
        keyExtractor={(item) => item.product.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await loadCart(); setRefreshing(false); }} />}
        ListEmptyComponent={
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Je mandje is nog leeg</Text>
            <Text style={styles.muted}>Scan een lege verpakking of voer een EAN handmatig in.</Text>
          </Card>
        }
        renderItem={({ item }) => (
          <Card style={styles.itemCard}>
            <View style={styles.productIcon}>
              <Text style={styles.productIconText}>{item.product.name.slice(0, 1).toUpperCase()}</Text>
            </View>
            <View style={styles.itemBody}>
              <Text style={styles.itemTitle}>{item.product.name}</Text>
              <Text style={styles.muted}>{item.product.brand || 'Product'} · vanaf {formatMoney(item.min_price_cents)}</Text>
              <View style={styles.qtyRow}>
                <Button title="−" variant="secondary" onPress={() => changeQuantity(item.product.id, item.quantity - 1)} style={styles.qtyButton} />
                <Text style={styles.qty}>{item.quantity}</Text>
                <Button title="+" variant="secondary" onPress={() => changeQuantity(item.product.id, item.quantity + 1)} style={styles.qtyButton} />
              </View>
            </View>
          </Card>
        )}
        contentContainerStyle={styles.list}
      />
      <Button title="Zoek beste combinatie" onPress={optimize} loading={loading} disabled={items.length === 0} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg, paddingBottom: 105 },
  summary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md, padding: spacing.lg },
  summaryLabel: { color: '#C6D0E3', fontWeight: '800' },
  summaryValue: { color: colors.white, fontSize: 30, fontWeight: '900', letterSpacing: -1, marginTop: 2 },
  list: { gap: spacing.md, paddingBottom: spacing.xl },
  emptyCard: { padding: spacing.lg },
  emptyTitle: { fontSize: 19, fontWeight: '900', color: colors.text, marginBottom: spacing.xs },
  itemCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  productIcon: { width: 52, height: 52, borderRadius: radius.lg, backgroundColor: colors.mintSoft, alignItems: 'center', justifyContent: 'center' },
  productIconText: { color: colors.mintDark, fontSize: 22, fontWeight: '900' },
  itemBody: { flex: 1 },
  itemTitle: { fontSize: 17, fontWeight: '900', color: colors.text },
  muted: { ...typography.body, fontSize: 14, lineHeight: 20, marginTop: 3 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  qtyButton: { minHeight: 38, paddingVertical: 0, paddingHorizontal: spacing.md, borderRadius: radius.md },
  qty: { fontSize: 18, fontWeight: '900', minWidth: 26, textAlign: 'center', color: colors.text }
});
