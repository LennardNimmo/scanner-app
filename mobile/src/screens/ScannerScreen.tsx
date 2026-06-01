import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { api } from '../api/client';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { BrandHeader } from '../components/BrandLogo';
import { Card } from '../components/Card';
import { useAuth } from '../context/AuthContext';
import { colors, radius, spacing, typography } from '../theme';

export function ScannerScreen({ navigation }: any) {
  const { user } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [loading, setLoading] = useState(false);

  const hasPermission = permission?.granted ?? false;
  const permissionLoading = !permission;

  async function addBarcode(gtin: string) {
    const cleanGtin = gtin.trim();
    if (!user || loading) return;
    if (!cleanGtin) {
      Alert.alert('EAN ontbreekt', 'Scan een barcode of vul een EAN-code in.');
      return;
    }
    setLoading(true);
    try {
      const response: any = await api.scan(user.id, cleanGtin, 1);
      Alert.alert('Toegevoegd', `${response.product.name} staat in je SlimBesteld-mandje.`);
      setManualCode('');
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <BrandHeader eyebrow="Scanner" title="Scan je lege product" subtitle="Richt je camera op een EAN-code. SlimBesteld zet het product direct in je mandje." />

      <Card style={styles.scannerCard} variant="dark">
        <View style={styles.scanOverlayTop}>
          <Badge label="Barcode scannen" tone="dark" />
        </View>
        {permissionLoading && <Text style={styles.cameraText}>Camera-toestemming laden...</Text>}
        {!permissionLoading && !hasPermission && (
          <View style={styles.permissionBox}>
            <Text style={styles.cameraTitle}>Camera nodig</Text>
            <Text style={styles.cameraText}>Geef toegang om barcodes te scannen of gebruik handmatige invoer.</Text>
            <Button title="Camera-toegang geven" onPress={requestPermission} variant="secondary" />
          </View>
        )}
        {hasPermission && (
          <View style={styles.cameraWrap}>
            <CameraView
              facing="back"
              onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
              barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'code128'] }}
              style={styles.scanner}
            />
            <View style={styles.scanFrame} />
            <View style={styles.scanLine} />
          </View>
        )}
      </Card>

      <Card style={styles.manualCard}>
        <View style={styles.manualHeader}>
          <Text style={styles.sectionTitle}>EAN handmatig invoeren</Text>
          <Badge label="Optioneel" tone="mint" />
        </View>
        <TextInput
          style={styles.input}
          value={manualCode}
          onChangeText={setManualCode}
          keyboardType="number-pad"
          placeholder="Bijvoorbeeld 8710000000011"
          placeholderTextColor={colors.subtle}
        />
        <Button title="Toevoegen aan mandje" onPress={() => addBarcode(manualCode)} loading={loading} />
        {scanned && <Button title="Opnieuw scannen" variant="secondary" onPress={() => setScanned(false)} style={{ marginTop: spacing.sm }} />}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: 120, gap: spacing.md },
  scannerCard: { height: 300, overflow: 'hidden', padding: 0 },
  scanOverlayTop: { position: 'absolute', top: spacing.md, left: spacing.md, zIndex: 2 },
  cameraWrap: { flex: 1 },
  scanner: { flex: 1 },
  scanFrame: {
    position: 'absolute',
    left: 34,
    right: 34,
    top: 82,
    bottom: 82,
    borderWidth: 2,
    borderColor: colors.mint,
    borderRadius: radius.lg
  },
  scanLine: {
    position: 'absolute',
    left: 52,
    right: 52,
    top: 148,
    height: 4,
    borderRadius: 999,
    backgroundColor: colors.mint
  },
  permissionBox: { flex: 1, padding: spacing.lg, justifyContent: 'center', gap: spacing.md },
  cameraTitle: { color: colors.white, fontSize: 22, fontWeight: '900' },
  cameraText: { color: '#C6D0E3', lineHeight: 22 },
  manualCard: { padding: spacing.lg },
  manualHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md, gap: spacing.sm },
  sectionTitle: { ...typography.sectionTitle },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    fontSize: 16,
    backgroundColor: colors.white,
    color: colors.text
  }
});
