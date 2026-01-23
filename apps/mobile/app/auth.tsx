import { useState, useRef } from 'react';
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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';

import { useAuthStore } from '../src/stores/authStore';
import { useLikedTracksStore } from '../src/stores/likedTracksStore';
import { usePreferencesStore } from '../src/stores/preferencesStore';
import { authApi } from '../src/services/api';

type AuthMode = 'signin' | 'signup' | 'forgot';

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
  const [forgotLoading, setForgotLoading] = useState(false);

  // Refs for input focus
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const isSignUp = mode === 'signup';
  const isForgot = mode === 'forgot';

  const handleSubmit = async () => {
    // Validation
    if (!email.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer votre email');
      return;
    }

    // Forgot password flow
    if (isForgot) {
      await handleForgotPassword();
      return;
    }

    if (!password.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer votre mot de passe');
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

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer votre email');
      return;
    }

    setForgotLoading(true);
    try {
      await authApi.forgotPassword(email.trim());
      Alert.alert(
        'Email envoyé',
        'Si un compte existe avec cet email, vous recevrez un lien de réinitialisation.',
        [{ text: 'OK', onPress: () => setMode('signin') }]
      );
    } catch (error) {
      Alert.alert('Erreur', error instanceof Error ? error.message : 'Une erreur est survenue');
    } finally {
      setForgotLoading(false);
    }
  };

  const getTitle = () => {
    if (isForgot) return 'Mot de passe oublié';
    if (isSignUp) return 'Créer un compte';
    return 'Bon retour !';
  };

  const getSubtitle = () => {
    if (isForgot) return 'Entrez votre email pour réinitialiser';
    if (isSignUp) return 'Rejoignez la communauté Aube Sonore';
    return 'Connectez-vous pour continuer';
  };

  const loading = isLoading || forgotLoading;

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
          <Animated.View entering={FadeIn.delay(300)} className="absolute top-4 right-4 z-10">
            <Pressable
              onPress={() => router.back()}
              className="w-10 h-10 rounded-full bg-white/5 items-center justify-center"
            >
              <Ionicons name="close" size={24} color="rgba(255,255,255,0.6)" />
            </Pressable>
          </Animated.View>

          <View className="flex-1 justify-center px-6 py-8">
            {/* Logo */}
            <Animated.View entering={FadeInDown.duration(600)} className="items-center mb-8">
              <Image
                source={require('../assets/images/logo.jpg')}
                className="w-24 h-24 rounded-full"
                resizeMode="cover"
              />
            </Animated.View>

            {/* Title */}
            <Animated.View
              entering={FadeInDown.duration(600).delay(100)}
              className="items-center mb-8"
            >
              <Text className="text-2xl font-bold text-white mb-2">{getTitle()}</Text>
              <Text className="text-sm text-white/50 text-center">{getSubtitle()}</Text>
            </Animated.View>

            {/* Form */}
            <Animated.View entering={FadeInUp.duration(600).delay(200)}>
              {/* Name (signup only) */}
              {isSignUp && (
                <View className="mb-4">
                  <Text className="text-xs text-white/40 uppercase tracking-wider mb-2 ml-1">
                    Nom
                  </Text>
                  <View className="flex-row items-center bg-white/5 border border-white/10 rounded-2xl px-4">
                    <Ionicons name="person-outline" size={20} color="rgba(255,255,255,0.4)" />
                    <TextInput
                      value={name}
                      onChangeText={setName}
                      placeholder="Votre nom"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      autoCapitalize="words"
                      returnKeyType="next"
                      onSubmitEditing={() => emailRef.current?.focus()}
                      className="flex-1 py-4 px-3 text-white text-base"
                    />
                  </View>
                </View>
              )}

              {/* Email */}
              <View className="mb-4">
                <Text className="text-xs text-white/40 uppercase tracking-wider mb-2 ml-1">
                  Email
                </Text>
                <View className="flex-row items-center bg-white/5 border border-white/10 rounded-2xl px-4">
                  <Ionicons name="mail-outline" size={20} color="rgba(255,255,255,0.4)" />
                  <TextInput
                    ref={emailRef}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="votre@email.com"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    returnKeyType={isForgot ? 'done' : 'next'}
                    onSubmitEditing={() =>
                      isForgot ? handleSubmit() : passwordRef.current?.focus()
                    }
                    className="flex-1 py-4 px-3 text-white text-base"
                  />
                </View>
              </View>

              {/* Password (not for forgot) */}
              {!isForgot && (
                <View className="mb-4">
                  <Text className="text-xs text-white/40 uppercase tracking-wider mb-2 ml-1">
                    Mot de passe
                  </Text>
                  <View className="flex-row items-center bg-white/5 border border-white/10 rounded-2xl px-4">
                    <Ionicons name="lock-closed-outline" size={20} color="rgba(255,255,255,0.4)" />
                    <TextInput
                      ref={passwordRef}
                      value={password}
                      onChangeText={setPassword}
                      placeholder="••••••••"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      returnKeyType="done"
                      onSubmitEditing={handleSubmit}
                      className="flex-1 py-4 px-3 text-white text-base"
                    />
                    <Pressable onPress={() => setShowPassword(!showPassword)}>
                      <Ionicons
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={22}
                        color="rgba(255,255,255,0.4)"
                      />
                    </Pressable>
                  </View>
                </View>
              )}

              {/* Forgot Password Link (signin only) */}
              {mode === 'signin' && (
                <Pressable onPress={() => setMode('forgot')} className="self-end mb-6">
                  <Text className="text-sm text-accent">Mot de passe oublié ?</Text>
                </Pressable>
              )}

              {/* Submit Button */}
              <Pressable
                onPress={handleSubmit}
                disabled={loading}
                className={`bg-accent rounded-2xl py-4 items-center mt-2 ${
                  loading ? 'opacity-50' : 'active:opacity-80'
                }`}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-semibold text-base">
                    {isForgot ? 'Envoyer le lien' : isSignUp ? "S'inscrire" : 'Se connecter'}
                  </Text>
                )}
              </Pressable>
            </Animated.View>

            {/* Toggle Mode */}
            <Animated.View
              entering={FadeInUp.duration(600).delay(300)}
              className="flex-row items-center justify-center mt-8"
            >
              {isForgot ? (
                <Pressable onPress={() => setMode('signin')}>
                  <Text className="text-accent text-sm font-medium">Retour à la connexion</Text>
                </Pressable>
              ) : (
                <>
                  <Text className="text-white/50 text-sm">
                    {isSignUp ? 'Déjà un compte ?' : 'Pas encore de compte ?'}
                  </Text>
                  <Pressable
                    onPress={() => setMode(isSignUp ? 'signin' : 'signup')}
                    className="ml-1"
                  >
                    <Text className="text-accent text-sm font-medium">
                      {isSignUp ? 'Se connecter' : "S'inscrire"}
                    </Text>
                  </Pressable>
                </>
              )}
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
