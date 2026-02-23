import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { useSocket } from '../../src/context/SocketContext';
import api from '../../src/services/api';

export default function HomeScreen() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const { isConnected, helpersAccepted } = useSocket();
  const [refreshing, setRefreshing] = useState(false);
  const [emergencyContacts, setEmergencyContacts] = useState<any[]>([]);
  const [recentAlerts, setRecentAlerts] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user?.id) return;
    try {
      const [contactsRes, alertsRes] = await Promise.all([
        api.get(`/contacts/${user.id}`),
        api.get(`/sos/user/${user.id}`),
      ]);
      setEmergencyContacts(contactsRes.data);
      setRecentAlerts(alertsRes.data.slice(-3).reverse());
    } catch (error) {
      console.error('Load data error:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadData(), refreshUser()]);
    setRefreshing(false);
  };

  const quickActions = [
    {
      icon: 'people',
      title: 'Emergency Contacts',
      color: '#3B82F6',
      onPress: () => router.push('/(tabs)/profile'),
    },
    {
      icon: 'location',
      title: 'Share Location',
      color: '#F59E0B',
      onPress: () => Alert.alert('Location', 'Your location will be shared when you trigger SOS'),
    },
    {
      icon: 'heart',
      title: 'Get Support',
      color: '#EC4899',
      onPress: () => router.push('/(tabs)/therapy'),
    },
    {
      icon: 'shield-checkmark',
      title: 'Safety Tips',
      color: '#10B981',
      onPress: () => Alert.alert('Safety Tips', 'Stay aware of your surroundings\nShare your live location with trusted contacts\nKeep emergency numbers saved'),
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.userInfo}>
            {user?.photo ? (
              <Image source={{ uri: user.photo }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={24} color="#64748B" />
              </View>
            )}
            <View>
              <Text style={styles.greeting}>Hello,</Text>
              <Text style={styles.userName}>{user?.name || 'User'}</Text>
            </View>
          </View>
          <View style={styles.connectionStatus}>
            <View style={[styles.statusDot, isConnected ? styles.statusOnline : styles.statusOffline]} />
            <Text style={styles.statusText}>{isConnected ? 'Protected' : 'Offline'}</Text>
          </View>
        </View>

        {/* SOS Card */}
        <TouchableOpacity
          style={styles.sosCard}
          onPress={() => router.push('/(tabs)/sos')}
          activeOpacity={0.9}
        >
          <View style={styles.sosContent}>
            <View style={styles.sosIcon}>
              <Ionicons name="alert-circle" size={48} color="#FFFFFF" />
            </View>
            <View>
              <Text style={styles.sosTitle}>Emergency SOS</Text>
              <Text style={styles.sosSubtitle}>Tap to trigger instant alert</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{emergencyContacts.length}</Text>
            <Text style={styles.statLabel}>Contacts</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{helpersAccepted}</Text>
            <Text style={styles.statLabel}>Helpers Nearby</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{recentAlerts.length}</Text>
            <Text style={styles.statLabel}>Alerts</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          {quickActions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={styles.actionCard}
              onPress={action.onPress}
            >
              <View style={[styles.actionIcon, { backgroundColor: `${action.color}20` }]}>
                <Ionicons name={action.icon as any} size={24} color={action.color} />
              </View>
              <Text style={styles.actionTitle}>{action.title}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent Activity */}
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        {recentAlerts.length > 0 ? (
          recentAlerts.map((alert, index) => (
            <View key={index} style={styles.activityCard}>
              <View style={[styles.activityIcon, { backgroundColor: alert.status === 'active' ? '#EF444420' : '#10B98120' }]}>
                <Ionicons
                  name={alert.status === 'active' ? 'alert-circle' : 'checkmark-circle'}
                  size={20}
                  color={alert.status === 'active' ? '#EF4444' : '#10B981'}
                />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityTitle}>
                  SOS Alert {alert.status === 'resolved' ? 'Resolved' : alert.status === 'cancelled' ? 'Cancelled' : 'Active'}
                </Text>
                <Text style={styles.activityTime}>
                  {new Date(alert.created_at).toLocaleDateString()}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyActivity}>
            <Ionicons name="shield-checkmark" size={48} color="#334155" />
            <Text style={styles.emptyText}>No recent alerts</Text>
            <Text style={styles.emptySubtext}>Stay safe!</Text>
          </View>
        )}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 14,
    color: '#94A3B8',
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusOnline: {
    backgroundColor: '#10B981',
  },
  statusOffline: {
    backgroundColor: '#EF4444',
  },
  statusText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  sosCard: {
    backgroundColor: '#EF4444',
    borderRadius: 20,
    padding: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  sosContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  sosIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sosTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sosSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  actionCard: {
    width: '47%',
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 12,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  activityTime: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  emptyActivity: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#1E293B',
    borderRadius: 16,
    marginBottom: 24,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#475569',
    marginTop: 4,
  },
});
