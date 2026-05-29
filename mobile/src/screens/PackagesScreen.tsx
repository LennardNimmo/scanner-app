import React, { useCallback, useState } from 'react';
import { Alert, FlatList, Modal, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../api/client';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { useAuth } from '../context/AuthContext';
import { colors, spacing } from '../theme';
import { Shipment } from '../types';

export function PackagesScreen() {
  const { user } = useAuth();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [carrier, setCarrier] = useState('PostNL');
  const [trackingCode, setTrackingCode] = useState('3SDEMO123456');
  const [description, setDescription] = useState('Handmatig toegevoegd pakket');

  async function loadShipments() {
    if (!user) return;
    const response: any = await api.getShipments(user.id);
    setShipments(response.shipments);
  }

  useFocusEffect(
    useCallback(() => {
      loadShipments().catch(() => undefined);
    }, [user?.id])
  );

  async function addManual() {
    if (!user) return;
    try {
      const response: any = await api.addManualShipment(user.id, carrier, trackingCode, description);
      setShipments(response.shipments);
      setModalVisible(false);
    } catch (error: any) {
      Alert.alert('Kon pakket niet toevoegen', error.message);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pakketten</Text>
      <FlatList
        data={shipments}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Card>
            <Text style={styles.emptyTitle}>Geen pakketten onderweg</Text>
            <Text style={styles.muted}>Bestellingen uit de app verschijnen hier automatisch.</Text>
          </Card>
        }
        renderItem={({ item }) => (
          <Card>
            <View style={styles.badge}><Text style={styles.badgeText}>{item.status}</Text></View>
            <Text style={styles.shipmentTitle}>{item.description}</Text>
            <Text style={styles.muted}>{item.carrier} · {item.tracking_code}</Text>
            {item.seller_name && <Text style={styles.muted}>Verkoper: {item.seller_name}</Text>}
            {item.eta && <Text style={styles.eta}>Verwacht: {item.eta}</Text>}
          </Card>
        )}
      />
      <Button title="Track & trace toevoegen" onPress={() => setModalVisible(true)} variant="secondary" />

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <Text style={styles.title}>Pakket toevoegen</Text>
          <TextInput style={styles.input} value={carrier} onChangeText={setCarrier} placeholder="Vervoerder" />
          <TextInput style={styles.input} value={trackingCode} onChangeText={setTrackingCode} placeholder="Track & trace" />
          <TextInput style={styles.input} value={description} onChangeText={setDescription} placeholder="Omschrijving" />
          <Button title="Toevoegen" onPress={addManual} />
          <View style={{ height: spacing.sm }} />
          <Button title="Sluiten" variant="secondary" onPress={() => setModalVisible(false)} />
        </View>
      </Modal>
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
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text
  },
  muted: {
    color: colors.muted,
    marginTop: 4
  },
  shipmentTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.text,
    marginTop: spacing.sm
  },
  eta: {
    color: colors.success,
    fontWeight: '800',
    marginTop: spacing.sm
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accentSoft,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  badgeText: {
    color: colors.accent,
    fontWeight: '800'
  },
  modal: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    justifyContent: 'center'
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: '#fff',
    fontSize: 16
  }
});
