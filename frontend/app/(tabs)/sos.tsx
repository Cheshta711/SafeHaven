import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
  Vibration,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useAuth } from '../../src/context/AuthContext';
import { useSocket } from '../../src/context/SocketContext';
import api from '../../src/services/api';

export default function SOSScreen() {
  const { user } = useAuth();
  const { socket, isConnected, triggerSOS, cancelSOS, resolveAlert, activeAlert, helpersAccepted, helpersNotified } = useSocket();
  
  const [isPressed, setIsPressed] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<any>(null);
  
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const countdownTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Pulse animation
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    return () => pulse.stop();
  }, []);

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        setCurrentLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      }
    } catch (error) {
      console.error('Location error:', error);
    }
  };

  const startCountdown = () => {
    setIsCountingDown(true);
    setCountdown(5);
    Vibration.vibrate([0, 200, 100, 200]);

    countdownTimer.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownTimer.current!);
          executeSOS();
          return 0;
        }
        Vibration.vibrate(100);
        return prev - 1;
      });
    }, 1000);
  };

  const cancelCountdown = () => {
    if (countdownTimer.current) {
      clearInterval(countdownTimer.current);
    }
    setIsCountingDown(false);
    setCountdown(5);
  };

  const executeSOS = async () => {
    setIsCountingDown(false);
    
    if (!user?.id) {
      Alert.alert('Error', 'Please set up your profile first');
      return;
    }

    if (!currentLocation) {
      await getCurrentLocation();
    }

    if (!currentLocation) {
      Alert.alert('Error', 'Unable to get your location. Please enable GPS.');
      return;
    }

    try {
      // Create SOS alert in database
      const response = await api.post('/sos', {
        user_id: user.id,
        location: currentLocation,
      });

      // Trigger via Socket.IO to notify nearby helpers
      triggerSOS(response.data.id, currentLocation);

      Vibration.vibrate([0, 500, 200, 500]);
      Alert.alert(
        'SOS Triggered!',
        'Your emergency alert has been sent. Help is on the way.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('SOS error:', error);
      Alert.alert('Error', 'Failed to send SOS. Please try again.');
    }
  };

  const handleCancelSOS = () => {
    Alert.alert(
      'Cancel SOS',
      'Are you sure you want to cancel the emergency alert?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: () => {
            if (activeAlert) {
              cancelSOS(activeAlert);
              api.put(`/sos/${activeAlert}/cancel`).catch(console.error);
            }
          },
        },
      ]
    );
  };

  const handleResolveSOS = () => {
    Alert.alert(
      'Resolve Emergency',
      'Are you safe now? This will mark the emergency as resolved.',
      [
        { text: 'Not Yet', style: 'cancel' },
        {
          text: "Yes, I'm Safe",
          onPress: () => {
            if (activeAlert) {
              resolveAlert(activeAlert);
              api.put(`/sos/${activeAlert}/resolve`).catch(console.error);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Emergency SOS</Text>
        <View style={styles.connectionBadge}>
          <View style={[styles.dot, isConnected ? styles.dotOnline : styles.dotOffline]} />
          <Text style={styles.connectionText}>
            {isConnected ? 'Connected' : 'Offline'}
          </Text>
        </View>
      </View>

      {activeAlert ? (
        // Active Alert View
        <View style={styles.activeAlertContainer}>
          <View style={styles.alertStatusCard}>
            <Ionicons name="alert-circle" size={64} color="#EF4444" />
            <Text style={styles.alertActiveText}>SOS Alert Active</Text>
            <Text style={styles.alertSubtext}>Help is being dispatched</Text>

            <View style={styles.helpersInfo}>
              <View style={styles.helperStat}>
                <Text style={styles.helperStatValue}>{helpersNotified}</Text>
                <Text style={styles.helperStatLabel}>Notified</Text>
              </View>
              <View style={styles.helperDivider} />
              <View style={styles.helperStat}>
                <Text style={[styles.helperStatValue, { color: '#10B981' }]}>
                  {helpersAccepted}
                </Text>
                <Text style={styles.helperStatLabel}>Responding</Text>
              </View>
            </View>
          </View>

          <View style={styles.alertActions}>
            <TouchableOpacity
              style={styles.resolveButton}
              onPress={handleResolveSOS}
            >
              <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
              <Text style={styles.resolveText}>I'm Safe Now</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancelSOS}
            >
              <Ionicons name="close-circle" size={24} color="#EF4444" />
              <Text style={styles.cancelText}>Cancel SOS</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        // SOS Button View
        <View style={styles.sosContainer}>
          <Text style={styles.instruction}>
            {isCountingDown
              ? 'Release to cancel'
              : 'Press and hold the button'}
          </Text>

          <Animated.View
            style={[
              styles.sosButtonOuter,
              { transform: [{ scale: pulseAnim }] },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.sosButton,
                isCountingDown && styles.sosButtonActive,
              ]}
              onPressIn={() => {
                setIsPressed(true);
                startCountdown();
              }}
              onPressOut={() => {
                setIsPressed(false);
                if (isCountingDown && countdown > 0) {
                  cancelCountdown();
                }
              }}
              activeOpacity={0.9}
            >
              {isCountingDown ? (
                <Text style={styles.countdownText}>{countdown}</Text>
              ) : (
                <>
                  <Ionicons name="alert-circle" size={80} color="#FFFFFF" />
                  <Text style={styles.sosText}>SOS</Text>
                </>
              )}
            </TouchableOpacity>
          </Animated.View>

          <Text style={styles.helperText}>
            {isCountingDown
              ? 'Sending alert in...'
              : 'Your location and profile will be shared with nearby helpers'}
          </Text>

          {/* Info Cards */}
          <View style={styles.infoCards}>
            <View style={styles.infoCard}>
              <Ionicons name="people" size={24} color="#3B82F6" />
              <Text style={styles.infoTitle}>Crowd Assistance</Text>
              <Text style={styles.infoText}>
                10 nearest helpers will be notified instantly
              </Text>
            </View>
            <View style={styles.infoCard}>
              <Ionicons name="call" size={24} color="#F59E0B" />
              <Text style={styles.infoTitle}>Auto Notify</Text>
              <Text style={styles.infoText}>
                Emergency contacts & police will be alerted
              </Text>
            </View>
          </View>
        </View>
      )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  connectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotOnline: {
    backgroundColor: '#10B981',
  },
  dotOffline: {
    backgroundColor: '#EF4444',
  },
  connectionText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  sosContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  instruction: {
    fontSize: 16,
    color: '#94A3B8',
    marginBottom: 32,
  },
  sosButtonOuter: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sosButton: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  sosButtonActive: {
    backgroundColor: '#DC2626',
  },
  sosText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 8,
  },
  countdownText: {
    fontSize: 72,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  helperText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 32,
    paddingHorizontal: 40,
  },
  infoCards: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 32,
    paddingHorizontal: 10,
  },
  infoCard: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
  },
  activeAlertContainer: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  alertStatusCard: {
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#EF444440',
  },
  alertActiveText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 16,
  },
  alertSubtext: {
    fontSize: 16,
    color: '#94A3B8',
    marginTop: 4,
  },
  helpersInfo: {
    flexDirection: 'row',
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    width: '100%',
    justifyContent: 'center',
  },
  helperStat: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  helperStatValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  helperStatLabel: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
  helperDivider: {
    width: 1,
    backgroundColor: '#334155',
  },
  alertActions: {
    marginTop: 24,
    gap: 12,
  },
  resolveButton: {
    flexDirection: 'row',
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  resolveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cancelButton: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    paddingVertical: 16,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
});
