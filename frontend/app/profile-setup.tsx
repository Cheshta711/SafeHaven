import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../src/context/AuthContext';
import api from '../src/services/api';

export default function ProfileSetupScreen() {
  const router = useRouter();
  const { setUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [homeLocation, setHomeLocation] = useState<any>(null);
  const [workLocation, setWorkLocation] = useState<any>(null);
  const [currentLocation, setCurrentLocation] = useState<any>(null);
  const [locationPermission, setLocationPermission] = useState(false);

  useEffect(() => {
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        setLocationPermission(true);
        const location = await Location.getCurrentPositionAsync({});
        setCurrentLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      }
    } catch (error) {
      console.error('Location permission error:', error);
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow access to your photos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        setPhoto(`data:image/jpeg;base64,${result.assets[0].base64}`);
      }
    } catch (error) {
      console.error('Image picker error:', error);
    }
  };

  const setLocationAsHome = () => {
    if (currentLocation) {
      setHomeLocation({
        ...currentLocation,
        type: 'home',
      });
      Alert.alert('Success', 'Current location set as Home');
    } else {
      Alert.alert('Error', 'Unable to get current location');
    }
  };

  const setLocationAsWork = () => {
    if (currentLocation) {
      setWorkLocation({
        ...currentLocation,
        type: 'work',
      });
      Alert.alert('Success', 'Current location set as Work');
    } else {
      Alert.alert('Error', 'Unable to get current location');
    }
  };

  const handleCreateProfile = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }
    if (!age || parseInt(age) < 1 || parseInt(age) > 120) {
      Alert.alert('Error', 'Please enter a valid age');
      return;
    }
    if (!gender) {
      Alert.alert('Error', 'Please select your gender');
      return;
    }

    setIsLoading(true);
    try {
      const userData = {
        name: name.trim(),
        age: parseInt(age),
        gender,
        photo,
        home_location: homeLocation,
        work_location: workLocation,
      };

      const response = await api.post('/users', userData);
      const user = response.data;

      await AsyncStorage.setItem('userId', user.id);
      setUser(user);
      router.replace('/(tabs)/home');
    } catch (error) {
      console.error('Create profile error:', error);
      Alert.alert('Error', 'Failed to create profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const genderOptions = ['Male', 'Female', 'Other', 'Prefer not to say'];

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.title}>Create Your Profile</Text>
            <Text style={styles.subtitle}>Help us personalize your safety experience</Text>
          </View>

          {/* Photo Section */}
          <View style={styles.section}>
            <TouchableOpacity style={styles.photoContainer} onPress={pickImage}>
              {photo ? (
                <Image source={{ uri: photo }} style={styles.photo} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Ionicons name="camera" size={40} color="#64748B" />
                  <Text style={styles.photoText}>Add Photo</Text>
                </View>
              )}
              <View style={styles.editBadge}>
                <Ionicons name="pencil" size={16} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          </View>

          {/* Name Input */}
          <View style={styles.section}>
            <Text style={styles.label}>Full Name</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color="#64748B" />
              <TextInput
                style={styles.input}
                placeholder="Enter your name"
                placeholderTextColor="#64748B"
                value={name}
                onChangeText={setName}
              />
            </View>
          </View>

          {/* Age Input */}
          <View style={styles.section}>
            <Text style={styles.label}>Age</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="calendar-outline" size={20} color="#64748B" />
              <TextInput
                style={styles.input}
                placeholder="Enter your age"
                placeholderTextColor="#64748B"
                value={age}
                onChangeText={setAge}
                keyboardType="numeric"
                maxLength={3}
              />
            </View>
          </View>

          {/* Gender Selection */}
          <View style={styles.section}>
            <Text style={styles.label}>Gender</Text>
            <View style={styles.genderContainer}>
              {genderOptions.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.genderOption,
                    gender === option && styles.genderOptionSelected,
                  ]}
                  onPress={() => setGender(option)}
                >
                  <Text
                    style={[
                      styles.genderText,
                      gender === option && styles.genderTextSelected,
                    ]}
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Location Section */}
          <View style={styles.section}>
            <Text style={styles.label}>Locations</Text>
            <Text style={styles.helperText}>
              Set your home and work locations for better assistance
            </Text>

            {!locationPermission && (
              <TouchableOpacity
                style={styles.permissionButton}
                onPress={requestLocationPermission}
              >
                <Ionicons name="location" size={20} color="#10B981" />
                <Text style={styles.permissionText}>Enable Location</Text>
              </TouchableOpacity>
            )}

            {locationPermission && (
              <View style={styles.locationButtons}>
                <TouchableOpacity
                  style={[
                    styles.locationButton,
                    homeLocation && styles.locationButtonSet,
                  ]}
                  onPress={setLocationAsHome}
                >
                  <Ionicons
                    name="home"
                    size={24}
                    color={homeLocation ? '#10B981' : '#64748B'}
                  />
                  <Text
                    style={[
                      styles.locationButtonText,
                      homeLocation && styles.locationButtonTextSet,
                    ]}
                  >
                    {homeLocation ? 'Home Set' : 'Set Home'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.locationButton,
                    workLocation && styles.locationButtonSet,
                  ]}
                  onPress={setLocationAsWork}
                >
                  <Ionicons
                    name="briefcase"
                    size={24}
                    color={workLocation ? '#3B82F6' : '#64748B'}
                  />
                  <Text
                    style={[
                      styles.locationButtonText,
                      workLocation && styles.locationButtonTextSet,
                    ]}
                  >
                    {workLocation ? 'Work Set' : 'Set Work'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
            onPress={handleCreateProfile}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.submitText}>Continue</Text>
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingHorizontal: 24,
  },
  header: {
    marginTop: 24,
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#94A3B8',
  },
  section: {
    marginBottom: 24,
  },
  photoContainer: {
    alignSelf: 'center',
    position: 'relative',
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#334155',
    borderStyle: 'dashed',
  },
  photoText: {
    color: '#64748B',
    marginTop: 4,
    fontSize: 12,
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  helperText: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
  },
  genderContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  genderOption: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  genderOptionSelected: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderColor: '#10B981',
  },
  genderText: {
    color: '#94A3B8',
    fontSize: 14,
  },
  genderTextSelected: {
    color: '#10B981',
    fontWeight: '600',
  },
  permissionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  permissionText: {
    color: '#10B981',
    fontSize: 16,
    fontWeight: '600',
  },
  locationButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  locationButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1E293B',
    paddingVertical: 16,
    borderRadius: 12,
  },
  locationButtonSet: {
    borderWidth: 1,
    borderColor: '#10B981',
  },
  locationButtonText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '600',
  },
  locationButtonTextSet: {
    color: '#FFFFFF',
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: '#10B981',
    paddingVertical: 18,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    marginBottom: 32,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
