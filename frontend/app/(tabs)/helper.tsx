import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useAuth } from '../../src/context/AuthContext';
import { useSocket } from '../../src/context/SocketContext';
import api from '../../src/services/api';

export default function HelperScreen() {
  const { user, refreshUser } = useAuth();
  const { socket, isConnected, incomingAlert, respondToSOS, setIncomingAlert } = useSocket();
  const [isHelperMode, setIsHelperMode] = useState(user?.is_helper_mode || false);
  const [watchingLocation, setWatchingLocation] = useState(false);

  useEffect(() => {
    if (isHelperMode && user?.id) {
      startLocationWatch();
    } else {
      stopLocationWatch();
    }
    return () => stopLocationWatch();
  }, [isHelperMode, user?.id]);

  const startLocationWatch = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Location access is needed for helper mode');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      if (socket) {
        socket.emit('update_location', {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      }
      setWatchingLocation(true);
    } catch (error) {
      console.error('Location watch error:', error);
    }
  };

  const stopLocationWatch = () => {
    setWatchingLocation(false);
  };

  const toggleHelperMode = async (value: boolean) => {
    setIsHelperMode(value);
    try {
      if (user?.id) {
        await api.put(`/users/${user.id}`, { is_helper_mode: value });
        if (socket) {
          socket.emit('enable_helper_mode', { enabled: value });
        }
        await refreshUser();
      }
    } catch (error) {
      console.error('Toggle helper mode error:', error);
      setIsHelperMode(!value);
    }
  };

  const handleAcceptHelp = () => {
    if (incomingAlert) {
      respondToSOS(incomingAlert.alert_id, 'accepted');
      Alert.alert(
        'Thank You!',
        `You accepted to help ${incomingAlert.user.name}. They will be notified.`,
        [{ text: 'OK', onPress: () => setIncomingAlert(null) }]
      );
    }
  };

  const handleDeclineHelp = () => {
    if (incomingAlert) {
      respondToSOS(incomingAlert.alert_id, 'declined');
      setIncomingAlert(null);
    }
  };

  if (incomingAlert) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.alertContainer}>
          <View style={styles.alertHeader}>
            <Ionicons name="warning" size={48} color="#EF4444" />
            <Text style={styles.alertTitle}>EMERGENCY ALERT</Text>
          </View>

          <View style={styles.alertCard}>
            <View style={styles.userSection}>
              {incomingAlert.user.photo ? (
                <Image source={{ uri: incomingAlert.user.photo }} style={styles.userPhoto} />
              ) : (
                <View style={styles.userPhotoPlaceholder}>
                  <Ionicons name="person" size={40} color="#64748B" />
                </View>
              )}
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{incomingAlert.user.name}</Text>
                <Text style={styles.userDetails}>
                  {incomingAlert.user.age} years, {incomingAlert.user.gender}
                </Text>
              </View>
            </View>

            <View style={styles.distanceSection}>
              <Ionicons name="location" size={24} color="#F59E0B" />
              <Text style={styles.distanceText}>
                {incomingAlert.distance_km} km away
              </Text>
            </View>

            <Text style={styles.alertMessage}>
              This person needs immediate help. Can you assist?
            </Text>
          </View>

          <View style={styles.alertActions}>
            <TouchableOpacity
              style={styles.acceptButton}
              onPress={handleAcceptHelp}
            >
              <Ionicons name="checkmark-circle" size={28} color="#FFFFFF" />
              <Text style={styles.acceptText}>Accept & Help</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.declineButton}
              onPress={handleDeclineHelp}
            >
              <Ionicons name="close-circle" size={24} color="#EF4444" />
              <Text style={styles.declineText}>Can't Help</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Helper Mode</Text>
          <Text style={styles.subtitle}>Be a guardian angel for others</Text>
        </View>

        {/* Helper Mode Toggle */}
        <View style={styles.toggleCard}>
          <View style={styles.toggleInfo}>
            <View style={[styles.toggleIcon, isHelperMode && styles.toggleIconActive]}>
              <Ionicons
                name="shield"
                size={32}
                color={isHelperMode ? '#10B981' : '#64748B'}
              />
            </View>
            <View>
              <Text style={styles.toggleTitle}>Helper Mode</Text>
              <Text style={styles.toggleSubtitle}>
                {isHelperMode ? 'You can receive SOS alerts' : 'Enable to help others'}
              </Text>
            </View>
          </View>
          <Switch
            value={isHelperMode}
            onValueChange={toggleHelperMode}
            trackColor={{ false: '#334155', true: '#10B98140' }}
            thumbColor={isHelperMode ? '#10B981' : '#64748B'}
          />
        </View>

        {/* Status Cards */}
        <View style={styles.statusCards}>
          <View style={styles.statusCard}>
            <View style={[styles.statusIcon, { backgroundColor: '#3B82F620' }]}>
              <Ionicons name="wifi" size={24} color="#3B82F6" />
            </View>
            <Text style={styles.statusLabel}>Connection</Text>
            <Text style={[styles.statusValue, { color: isConnected ? '#10B981' : '#EF4444' }]}>
              {isConnected ? 'Online' : 'Offline'}
            </Text>
          </View>

          <View style={styles.statusCard}>
            <View style={[styles.statusIcon, { backgroundColor: '#F59E0B20' }]}>
              <Ionicons name="location" size={24} color="#F59E0B" />
            </View>
            <Text style={styles.statusLabel}>Location</Text>
            <Text style={[styles.statusValue, { color: watchingLocation ? '#10B981' : '#64748B' }]}>
              {watchingLocation ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>

        {/* How It Works */}
        <Text style={styles.sectionTitle}>How It Works</Text>
        <View style={styles.stepsContainer}>
          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Enable Helper Mode</Text>
              <Text style={styles.stepDescription}>
                Turn on helper mode to receive emergency alerts from nearby users
              </Text>
            </View>
          </View>

          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Receive Alerts</Text>
              <Text style={styles.stepDescription}>
                When someone nearby triggers SOS, you'll be notified with their details
              </Text>
            </View>
          </View>

          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Respond & Help</Text>
              <Text style={styles.stepDescription}>
                Accept the request and help the person in need. You could save a life!
              </Text>
            </View>
          </View>
        </View>

        {/* Community Stats */}
        <View style={styles.communityCard}>
          <Ionicons name="people" size={48} color="#10B981" />
          <Text style={styles.communityTitle}>Join the SafeHaven Community</Text>
          <Text style={styles.communityText}>
            Be part of a network of helpers making the world safer, one alert at a time.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    marginTop: 16,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 16,
    color: '#94A3B8',
    marginTop: 4,
  },
  toggleCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  toggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  toggleIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleIconActive: {
    backgroundColor: '#10B98120',
  },
  toggleTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  toggleSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  statusCards: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statusCard: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  statusIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  statusValue: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  stepsContainer: {
    gap: 16,
    marginBottom: 24,
  },
  step: {
    flexDirection: 'row',
    gap: 16,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  stepDescription: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
    lineHeight: 20,
  },
  communityCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 32,
  },
  communityTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 16,
    textAlign: 'center',
  },
  communityText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
  // Alert styles
  alertContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  alertHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  alertTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#EF4444',
    marginTop: 12,
  },
  alertCard: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 24,
    borderWidth: 2,
    borderColor: '#EF444440',
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
  },
  userPhoto: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  userPhotoPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  userDetails: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 4,
  },
  distanceSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F59E0B20',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  distanceText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F59E0B',
  },
  alertMessage: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 24,
  },
  alertActions: {
    marginTop: 24,
    gap: 12,
  },
  acceptButton: {
    flexDirection: 'row',
    backgroundColor: '#10B981',
    paddingVertical: 18,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  acceptText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  declineButton: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    paddingVertical: 16,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  declineText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
});
