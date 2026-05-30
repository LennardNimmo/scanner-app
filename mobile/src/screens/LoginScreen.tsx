import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { useAuth } from '../context/AuthContext';
import { colors, spacing } from '../theme';

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
      <View style={styles.header}>
        <Text style={styles.logo}>ScanDeal</Text>
        <Text style={styles.subtitle}>Scan lege producten en koop je hele mandje via één slimme checkout.</Text>
      </View>

      <Card>
        <Text style={styles.title}>{isRegister ? 'Account aanmaken' : 'Inloggen'}</Text>
        {isRegister && (
          <TextInput style={styles.input} placeholder="Naam" value={fullName} onChangeText={setFullName} />
        )}
        <TextInput
          style={styles.input}
          placeholder="E-mail"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Wachtwoord"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <Button title={isRegister ? 'Starten' : 'Inloggen'} onPress={submit} loading={loading} />
        <View style={{ height: spacing.sm }} />
        <Button
          title={isRegister ? 'Ik heb al een account' : 'Nieuw account maken'}
          variant="secondary"
          onPress={() => setIsRegister(!isRegister)}
        />
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
  header: {
    marginBottom: spacing.xl
  },
  logo: {
    fontSize: 40,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: -1
  },
  subtitle: {
    color: colors.muted,
    fontSize: 17,
    marginTop: spacing.sm,
    lineHeight: 24
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: spacing.md,
    color: colors.text
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
