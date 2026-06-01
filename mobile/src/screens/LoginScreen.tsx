import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '../components/Button';
import { BrandLogo } from '../components/BrandLogo';
import { Card } from '../components/Card';
import { useAuth } from '../context/AuthContext';
import { colors, radius, spacing, typography } from '../theme';

export function LoginScreen() {
  const { signIn, signUp } = useAuth();
  const [isRegister, setIsRegister] = useState(true);
  const [email, setEmail] = useState('demo@example.com');
  const [password, setPassword] = useState('demo1234');
  const [fullName, setFullName] = useState('Demo gebruiker');
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    try {
      if (isRegister) {
        await signUp(email, password, fullName);
      } else {
        await signIn(email, password);
      }
    } catch (error: any) {
      Alert.alert('Login mislukt', error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      <View style={styles.heroPanel}>
        <BrandLogo light />
        <Text style={styles.heroTitle}>Scan wat op is. Vind de slimste totaaldeal.</Text>
        <Text style={styles.heroText}>SlimBesteld vergelijkt je hele mandje inclusief verzendkosten en acties.</Text>
        <View style={styles.heroPills}>
          <Text style={styles.heroPill}>EAN-scan</Text>
          <Text style={styles.heroPill}>Deals</Text>
          <Text style={styles.heroPill}>Affiliate links</Text>
        </View>
      </View>

      <Card style={styles.card}>
        <Text style={styles.title}>{isRegister ? 'Account aanmaken' : 'Welkom terug'}</Text>
        <Text style={styles.description}>{isRegister ? 'Maak je SlimBesteld-account aan om je gescande producten te bewaren.' : 'Log in en ga verder met je winkelmandje.'}</Text>
        {isRegister && <TextInput style={styles.input} placeholder="Naam" value={fullName} onChangeText={setFullName} placeholderTextColor={colors.subtle} />}
        <TextInput
          style={styles.input}
          placeholder="E-mail"
          placeholderTextColor={colors.subtle}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Wachtwoord"
          placeholderTextColor={colors.subtle}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <Button title={isRegister ? 'Start met besparen' : 'Inloggen'} onPress={submit} loading={loading} />
        <View style={{ height: spacing.sm }} />
        <Button title={isRegister ? 'Ik heb al een account' : 'Nieuw account maken'} variant="secondary" onPress={() => setIsRegister(!isRegister)} />
      </Card>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    justifyContent: 'center'
  },
  heroPanel: {
    backgroundColor: colors.navy,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    overflow: 'hidden'
  },
  heroTitle: {
    color: colors.white,
    fontSize: 31,
    lineHeight: 35,
    fontWeight: '900',
    letterSpacing: -1,
    marginTop: spacing.xl
  },
  heroText: {
    color: '#C6D0E3',
    fontSize: 16,
    lineHeight: 23,
    marginTop: spacing.sm
  },
  heroPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.lg
  },
  heroPill: {
    backgroundColor: 'rgba(46,230,184,0.12)',
    color: colors.mint,
    borderColor: 'rgba(46,230,184,0.35)',
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    fontWeight: '900',
    fontSize: 12
  },
  card: {
    padding: spacing.lg
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    marginBottom: spacing.xs,
    color: colors.text,
    letterSpacing: -0.4
  },
  description: {
    ...typography.body,
    marginBottom: spacing.md
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.white,
    fontSize: 16,
    color: colors.text
  }
});
