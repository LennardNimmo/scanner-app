import React, { useCallback, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../api/client';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { BrandHeader } from '../components/BrandLogo';
import { Card } from '../components/Card';
import { useAuth } from '../context/AuthContext';
import { colors, radius, spacing, typography } from '../theme';
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
      <BrandHeader eyebrow="Tracking" title="Je pakketten" subtitle="Voeg track & trace handmatig toe zodra je die van de webshop ontvangt." />
      <FlatList
        data={shipments}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Card style={styles.emptyCard} variant="mint">
            <Text style={styles.emptyTitle}>Nog geen pakketten</Text>
            <Text style={styles.muted}>Bestel bij de gekozen webshop en voeg daarna je trackingcode hier toe.</Text>
          </Card>
        }
        renderItem={({ item }) => (
          <Card style={styles.shipmentCard}>
            <View style={styles.cardHeader}>
              <Badge label={item.status} tone="mint" />
              {item.eta && <Badge label={`ETA ${item.eta}`} tone="neutral" />}
            </View>
            <Text style={styles.shipmentTitle}>{item.description}</Text>
            <Text style={styles.muted}>{item.carrier} · {item.tracking_code}</Text>
            {item.seller_name && <Text style={styles.muted}>Webshop: {item.seller_name}</Text>}
          </Card>
        )}
      />
      <Button title="Track & trace toevoegen" onPress={() => setModalVisible(true)} variant="secondary" />

      <Modal visible={modalVisible} animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalKeyboard}>
          <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            <BrandHeader eyebrow="Nieuw pakket" title="Tracking toevoegen" subtitle="Bewaar je track & trace code in SlimBesteld." />
            <Card style={styles.modalCard}>
              <TextInput style={styles.input} value={carrier} onChangeText={setCarrier} placeholder="Vervoerder" placeholderTextColor={colors.subtle} />
              <TextInput style={styles.input} value={trackingCode} onChangeText={setTrackingCode} placeholder="Track & trace" placeholderTextColor={colors.subtle} />
              <TextInput style={styles.input} value={description} onChangeText={setDescription} placeholder="Omschrijving" placeholderTextColor={colors.subtle} />
              <Button title="Opslaan" onPress={addManual} />
              <View style={{ height: spacing.sm }} />
              <Button title="Annuleren" variant="ghost" onPress={() => setModalVisible(false)} />
            </Card>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg, paddingBottom: 105 },
  list: { gap: spacing.md, paddingBottom: spacing.lg },
  emptyCard: { padding: spacing.lg },
  emptyTitle: { fontSize: 19, fontWeight: '900', color: colors.text, marginBottom: spacing.xs },
  muted: { ...typography.body, fontSize: 14, lineHeight: 21, marginTop: 4 },
  shipmentCard: { gap: spacing.xs },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  shipmentTitle: { fontSize: 19, fontWeight: '900', color: colors.text, marginTop: spacing.sm, letterSpacing: -0.2 },
  modalKeyboard: { flex: 1, backgroundColor: colors.background },
  modalContent: { flexGrow: 1, padding: spacing.lg, justifyContent: 'center' },
  modalCard: { padding: spacing.lg },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md, backgroundColor: colors.white, fontSize: 16, color: colors.text }
});
