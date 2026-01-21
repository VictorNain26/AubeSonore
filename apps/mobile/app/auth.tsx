import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useAuthStore } from '../src/stores/authStore';
import { useLikedTracksStore } from '../src/stores/likedTracksStore';
import { usePreferencesStore } from '../src/stores/preferencesStore';

type AuthMode = 'signin' | 'signup';

export default function AuthScreen() {
  const router = useRouter();

  const { signIn, signUp, isLoading } = useAuthStore();
  const fetchTracks = useLikedTracksStore((state) => state.fetchTracks);
  const fetchPreferences = usePreferencesStore((state) => state.fetchPreferences);

  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const isSignUp = mode === 'signup';

  const handleSubmit = async () => {
    // Validation
    if (!email.trim() || !password.trim()) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    if (isSignUp && !name.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer votre nom');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    try {
      if (isSignUp) {
        await signUp(email.trim(), password, name.trim());
      } else {
        await signIn(email.trim(), password);
      }

      // Fetch user data after successful auth
      await Promise.all([fetchTracks(), fetchPreferences()]);

      // Navigate back
      router.back();
    } catch (error) {
      Alert.alert('Erreur', error instanceof Error ? error.message : 'Une erreur est survenue');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-surface-base">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Close Button */}
          <View className="absolute top-4 right-4 z-10">
            <Pressable onPress={() => router.back()} className="p-2 rounded-full bg-white/5">
              <Ionicons name="close" size={24} color="rgba(255,255,255,0.6)" />
            </Pressable>
          </View>

          <View className="flex-1 justify-center px-6 py-8">
            {/* Logo / Header */}
            <View className="items-center mb-10">
              <View className="w-16 h-16 rounded-2xl bg-accent/20 items-center justify-center mb-4">
                <Ionicons name="radio" size={32} color="#9370DB" />
              </View>
              <Text className="text-2xl font-bold text-white">Aube Sonore</Text>
              <Text className="text-sm text-white/50 mt-1">
                {isSignUp ? 'Créer un compte' : 'Connexion'}
              </Text>
            </View>

            {/* Form */}
            <View className="space-y-4">
              {/* Name (signup only) */}
              {isSignUp && (
                <View className="mb-4">
                  <Text className="text-sm text-white/60 mb-2">Nom</Text>
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="Votre nom"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    autoCapitalize="words"
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white"
                  />
                </View>
              )}

              {/* Email */}
              <View className="mb-4">
                <Text className="text-sm text-white/60 mb-2">Email</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="votre@email.com"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white"
                />
              </View>

              {/* Password */}
              <View className="mb-6">
                <Text className="text-sm text-white/60 mb-2">Mot de passe</Text>
                <View className="relative">
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="••••••••"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white pr-12"
                  />
                  <Pressable
                    onPress={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3"
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off' : 'eye'}
                      size={22}
                      color="rgba(255,255,255,0.4)"
                    />
                  </Pressable>
                </View>
              </View>

              {/* Submit Button */}
              <Pressable
                onPress={handleSubmit}
                disabled={isLoading}
                className={`bg-accent rounded-xl py-4 items-center ${
                  isLoading ? 'opacity-50' : 'active:opacity-80'
                }`}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-semibold text-base">
                    {isSignUp ? "S'inscrire" : 'Se connecter'}
                  </Text>
                )}
              </Pressable>
            </View>

            {/* Toggle Mode */}
            <View className="flex-row items-center justify-center mt-8">
              <Text className="text-white/50 text-sm">
                {isSignUp ? 'Déjà un compte ?' : 'Pas encore de compte ?'}
              </Text>
              <Pressable onPress={() => setMode(isSignUp ? 'signin' : 'signup')} className="ml-1">
                <Text className="text-accent text-sm font-medium">
                  {isSignUp ? 'Se connecter' : "S'inscrire"}
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
