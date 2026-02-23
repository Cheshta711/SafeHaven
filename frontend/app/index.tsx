import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SplashScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const fadeAnim = new Animated.Value(0);
  const scaleAnim = new Animated.Value(0.8);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    checkUserStatus();
  }, []);

  const checkUserStatus = async () => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      setTimeout(() => {
        setIsLoading(false);
        if (userId) {
          router.replace('/(tabs)/home');
        }
      }, 2000);
    } catch (error) {
      setIsLoading(false);
    }
  };

  const handleGetStarted = () => {
    router.push('/onboarding');
  };

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View
        style={[
          styles.content,
          { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
        ]}
      >
        <View style={styles.logoContainer}>
          <View style={styles.iconWrapper}>
            <Ionicons name="shield-checkmark" size={80} color="#10B981" />
          </View>
          <Text style={styles.appName}>SafeHaven</Text>
          <Text style={styles.tagline}>Safety in your pocket.{"\n"}Help is always nearby, support is always ready.</Text>
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color="#10B981" style={styles.loader} />
        ) : (
          <TouchableOpacity style={styles.button} onPress={handleGetStarted}>
            <Text style={styles.buttonText}>Get Started</Text>
            <Ionicons name="arrow-forward" size={20} color="#0F172A" />
          </TouchableOpacity>
        )}

        <View style={styles.features}>
          <View style={styles.featureItem}>
            <Ionicons name="flash" size={24} color="#F59E0B" />
            <Text style={styles.featureText}>Instant SOS</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="people" size={24} color="#3B82F6" />
            <Text style={styles.featureText}>Crowd Help</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="heart" size={24} color="#EC4899" />
            <Text style={styles.featureText}>Support</Text>
          </View>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  iconWrapper: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  appName: {
    fontSize: 42,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  tagline: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 24,
  },
  loader: {
    marginVertical: 32,
  },
  button: {
    flexDirection: 'row',
    backgroundColor: '#10B981',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 30,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
  },
  features: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 64,
  },
  featureItem: {
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    color: '#94A3B8',
    fontSize: 12,
  },
});
