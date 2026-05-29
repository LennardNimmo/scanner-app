import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { api } from '../api/client';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { useAuth } from '../context/AuthContext';
import { colors, spacing } from '../theme';

export function ScannerScreen({ navigation }: any) {
  const { user } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [manualCode, setManualCode] = useState('8710000000011');
  const [loading, setLoading] = useState(false);

  const hasPermission = permission?.granted ?? false;
  const permissionLoading = !permission;

  async function addBarcode(gtin: string) {
    if (!user || loading) return;
    setLoading(true);
    try {
      const response: any = await api.scan(user.id, gtin, 1);
      Alert.alert('Toegevoegd', `${response.product.name} staat in je winkelwagen.`);
      navigation.navigate('Winkelwagen');
    } catch (error: any) {
      Alert.alert('Niet gevonden', error.message);
      setScanned(false);
    } finally {
      setLoading(false);
    }
  }

  function handleBarcodeScanned(result: BarcodeScanningResult) {
    if (scanned || loading) return;
    setScanned(true);
    addBarcode(result.data);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Scan product</Text>
      <Text style={styles.subtitle}>Richt je camera op de barcode of voer een testbarcode handmatig in.</Text>

      <Card style={styles.scannerCard}>
        {permissionLoading && <Text>Camera-toestemming laden...</Text>}
        {!permissionLoading && !hasPermission && (
          <View style={styles.permissionBox}>
            <Text style={styles.muted}>Geen cameratoegang. Geef toestemming of gebruik handmatige invoer.</Text>
            <Button title="Camera-toegang geven" onPress={requestPermission} variant="secondary" />
          </View>
        )}
        {hasPermission && (
          <CameraView
            facing="back"
            onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ['ean13', 'ean8', 'code128']
            }}
            style={styles.scanner}
          />
        )}
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Handmatig testen</Text>
        <TextInput
          style={styles.input}
          value={manualCode}
          onChangeText={setManualCode}
          keyboardType="number-pad"
          placeholder="EAN / GTIN"
        />
        <Button title="Toevoegen aan winkelwagen" onPress={() => addBarcode(manualCode)} loading={loading} />
        {scanned && <Button title="Opnieuw scannen" variant="secondary" onPress={() => setScanned(false)} />}
      </Card>
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
  subtitle: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 22
  },
  scannerCard: {
    height: 280,
    overflow: 'hidden',
    padding: 0
  },
  scanner: {
    flex: 1
  },
  permissionBox: {
    flex: 1,
    padding: spacing.md,
    justifyContent: 'center',
    gap: spacing.md
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: spacing.sm
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: spacing.md,
    marginBottom: spacing.md,
    fontSize: 16
  },
  muted: {
    color: colors.muted
  }
});