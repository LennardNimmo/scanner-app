import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '../components/Button';
import { BrandLogo } from '../components/BrandLogo';
import { Card } from '../components/Card';
import { useAuth } from '../context/AuthContext';
import { colors, radius, spacing, typography } from '../theme';

export function LoginScreen() {
  const { signIn, signUp } = useAuth();
  const [isRegister, setIsRegister] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = fullName.trim();

    if (!cleanEmail || !password) {
      Alert.alert('Vul je gegevens in', 'Gebruik je e-mailadres en wachtwoord om verder te gaan.');
      return;
    }

    if (isRegister && !cleanName) {
      Alert.alert('Naam ontbreekt', 'Vul je naam in om een account aan te maken.');
      return;
    }

    setLoading(true);
    try {
      if (isRegister) {
        await signUp(cleanEmail, password, cleanName);
      } else {
        await signIn(cleanEmail, password);
      }
    } catch (error: any) {
      Alert.alert(isRegister ? 'Account aanmaken mislukt' : 'Inloggen mislukt', error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardView}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroPanel}>
          <BrandLogo light />
          <Text style={styles.heroTitle}>Scan wat op is. Vind de slimste totaaldeal.</Text>
          <Text style={styles.heroText}>SlimBesteld vergelijkt je hele mandje inclusief verzendkosten en acties.</Text>
          <View style={styles.heroPills}>
            <Text style={styles.heroPill}>EAN-scan</Text>
            <Text style={styles.heroPill}>Beste totaalprijs</Text>
            <Text style={styles.heroPill}>Snel door naar webshops</Text>
          </View>
        </View>

        <Card style={styles.card}>
          <Text style={styles.title}>{isRegister ? 'Account aanmaken' : 'Welkom terug'}</Text>
          <Text style={styles.description}>
            {isRegister
              ? 'Maak een account aan om je gescande producten en pakketoverzicht te bewaren.'
              : 'Log in en ga verder met je mandje.'}
          </Text>
          {isRegister && (
            <TextInput
              style={styles.input}
              placeholder="Naam"
              value={fullName}
              onChangeText={setFullName}
              placeholderTextColor={colors.subtle}
              returnKeyType="next"
            />
          )}
          <TextInput
            style={styles.input}
            placeholder="E-mail"
            placeholderTextColor={colors.subtle}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            returnKeyType="next"
            autoComplete="email"
          />
          <TextInput
            style={styles.input}
            placeholder="Wachtwoord"
            placeholderTextColor={colors.subtle}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            returnKeyType="done"
            autoComplete={isRegister ? 'new-password' : 'password'}
          />
          <Button title={isRegister ? 'Account aanmaken' : 'Inloggen'} onPress={submit} loading={loading} />
          <View style={{ height: spacing.sm }} />
          <Button title={isRegister ? 'Ik heb al een account' : 'Nieuw account maken'} variant="secondary" onPress={() => setIsRegister(!isRegister)} />
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
    backgroundColor: colors.background
  },
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  content: {
    flexGrow: 1,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
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
