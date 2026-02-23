import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const ONBOARDING_STEPS = [
  {
    icon: 'person-circle',
    title: 'Create Your Profile',
    description: 'Add your name, photo, age, and gender. Set your work and home locations for smart assistance.',
    color: '#10B981',
  },
  {
    icon: 'alert-circle',
    title: 'Instant SOS Alerts',
    description: 'Press SOS in any emergency. Automatically signals the 10 nearest devices with your profile and location.',
    color: '#EF4444',
  },
  {
    icon: 'people-circle',
    title: 'Crowd Assistance',
    description: 'If initial helpers don\'t respond, signal the next 10 nearby. Continue until 10 people accept to help.',
    color: '#3B82F6',
  },
  {
    icon: 'call',
    title: 'Emergency Contacts',
    description: 'Sends automated messages to your emergency contacts and updates nearest police station with your location.',
    color: '#F59E0B',
  },
  {
    icon: 'heart-circle',
    title: 'Emotional Support',
    description: 'Access on-demand PTSD therapy sessions with AI-powered support and guided exercises.',
    color: '#EC4899',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start(() => {
        setCurrentStep(currentStep + 1);
        scrollViewRef.current?.scrollTo({ x: (currentStep + 1) * width, animated: true });
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }).start();
      });
    } else {
      router.push('/profile-setup');
    }
  };

  const handleSkip = () => {
    router.push('/profile-setup');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        style={styles.scrollView}
      >
        {ONBOARDING_STEPS.map((step, index) => (
          <View key={index} style={styles.slide}>
            <Animated.View style={[styles.iconContainer, { opacity: fadeAnim }]}>
              <View style={[styles.iconWrapper, { backgroundColor: `${step.color}20` }]}>
                <Ionicons name={step.icon as any} size={100} color={step.color} />
              </View>
            </Animated.View>
            <Animated.View style={[styles.textContainer, { opacity: fadeAnim }]}>
              <Text style={styles.title}>{step.title}</Text>
              <Text style={styles.description}>{step.description}</Text>
            </Animated.View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.pagination}>
          {ONBOARDING_STEPS.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                currentStep === index && styles.activeDot,
                currentStep === index && { backgroundColor: ONBOARDING_STEPS[index].color },
              ]}
            />
          ))}
        </View>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: ONBOARDING_STEPS[currentStep].color }]}
          onPress={handleNext}
        >
          <Text style={styles.buttonText}>
            {currentStep === ONBOARDING_STEPS.length - 1 ? 'Get Started' : 'Next'}
          </Text>
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  skipText: {
    color: '#94A3B8',
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  slide: {
    width: width,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  iconContainer: {
    marginBottom: 48,
  },
  iconWrapper: {
    width: 180,
    height: 180,
    borderRadius: 90,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 24,
  },
  footer: {
    paddingHorizontal: 32,
    paddingBottom: 32,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 32,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#334155',
  },
  activeDot: {
    width: 24,
  },
  button: {
    flexDirection: 'row',
    paddingVertical: 16,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
