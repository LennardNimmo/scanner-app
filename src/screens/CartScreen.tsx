import React, { useCallback, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../api/client';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { useAuth } from '../context/AuthContext';
import { colors, spacing } from '../theme';
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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Winkelwagen</Text>
      <FlatList
        data={items}
        keyExtractor={(item) => item.product.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await loadCart(); setRefreshing(false); }} />}
        ListEmptyComponent={
          <Card>
            <Text style={styles.emptyTitle}>Nog geen producten</Text>
            <Text style={styles.muted}>Scan je eerste lege product om te beginnen.</Text>
          </Card>
        }
        renderItem={({ item }) => (
          <Card style={styles.itemCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle}>{item.product.name}</Text>
              <Text style={styles.muted}>{item.product.brand} · vanaf {formatMoney(item.min_price_cents)}</Text>
            </View>
            <View style={styles.qtyRow}>
              <Button title="−" variant="secondary" onPress={() => changeQuantity(item.product.id, item.quantity - 1)} />
              <Text style={styles.qty}>{item.quantity}</Text>
              <Button title="+" variant="secondary" onPress={() => changeQuantity(item.product.id, item.quantity + 1)} />
            </View>
          </Card>
        )}
        contentContainerStyle={styles.list}
      />
      <Button title="Zoek goedkoopste combinatie" onPress={optimize} loading={loading} disabled={items.length === 0} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.text,
    marginBottom: spacing.md
  },
  list: {
    gap: spacing.md,
    paddingBottom: spacing.lg
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md
  },
  itemTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text
  },
  muted: {
    color: colors.muted,
    marginTop: 4
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm
  },
  qty: {
    fontSize: 18,
    fontWeight: '800',
    minWidth: 24,
    textAlign: 'center'
  }
});
