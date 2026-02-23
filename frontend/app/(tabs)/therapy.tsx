import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import api from '../../src/services/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

interface Exercise {
  id: string;
  title: string;
  description: string;
  duration: string;
  steps: string[];
  category: string;
}

export default function TherapyScreen() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'chat' | 'exercises'>('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (user?.id) {
      loadChatHistory();
      loadExercises();
    }
  }, [user?.id]);

  const loadChatHistory = async () => {
    try {
      const response = await api.get(`/chat/${user?.id}`);
      setMessages(response.data);
    } catch (error) {
      console.error('Load chat history error:', error);
    }
  };

  const loadExercises = async () => {
    try {
      const response = await api.get('/exercises');
      setExercises(response.data);
    } catch (error) {
      console.error('Load exercises error:', error);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || !user?.id) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText.trim(),
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await api.post('/chat', {
        user_id: user.id,
        content: inputText.trim(),
      });
      setMessages((prev) => [...prev, response.data]);
    } catch (error) {
      console.error('Send message error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm here for you. Please try again in a moment.",
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'breathing': return '#3B82F6';
      case 'grounding': return '#10B981';
      case 'relaxation': return '#8B5CF6';
      case 'visualization': return '#EC4899';
      default: return '#64748B';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'breathing': return 'leaf';
      case 'grounding': return 'earth';
      case 'relaxation': return 'body';
      case 'visualization': return 'eye';
      default: return 'medical';
    }
  };

  const renderChat = () => (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.chatContainer}
      keyboardVerticalOffset={100}
    >
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.length === 0 && (
          <View style={styles.welcomeContainer}>
            <View style={styles.welcomeIcon}>
              <Ionicons name="heart" size={48} color="#EC4899" />
            </View>
            <Text style={styles.welcomeTitle}>Welcome to Support</Text>
            <Text style={styles.welcomeText}>
              I'm here to listen and help. Share how you're feeling, and I'll provide support and coping strategies.
            </Text>
          </View>
        )}

        {messages.map((message) => (
          <View
            key={message.id}
            style={[
              styles.messageBubble,
              message.role === 'user' ? styles.userBubble : styles.assistantBubble,
            ]}
          >
            {message.role === 'assistant' && (
              <View style={styles.assistantIcon}>
                <Ionicons name="heart" size={16} color="#EC4899" />
              </View>
            )}
            <Text
              style={[
                styles.messageText,
                message.role === 'user' ? styles.userText : styles.assistantText,
              ]}
            >
              {message.content}
            </Text>
          </View>
        ))}

        {isLoading && (
          <View style={[styles.messageBubble, styles.assistantBubble]}>
            <ActivityIndicator size="small" color="#EC4899" />
          </View>
        )}
      </ScrollView>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="How are you feeling?"
          placeholderTextColor="#64748B"
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
          onPress={sendMessage}
          disabled={!inputText.trim() || isLoading}
        >
          <Ionicons
            name="send"
            size={20}
            color={inputText.trim() ? '#FFFFFF' : '#64748B'}
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );

  const renderExercises = () => (
    <ScrollView style={styles.exercisesContainer} showsVerticalScrollIndicator={false}>
      {selectedExercise ? (
        <View style={styles.exerciseDetail}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setSelectedExercise(null)}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          <View style={[styles.exerciseHeader, { backgroundColor: `${getCategoryColor(selectedExercise.category)}20` }]}>
            <Ionicons
              name={getCategoryIcon(selectedExercise.category) as any}
              size={48}
              color={getCategoryColor(selectedExercise.category)}
            />
            <Text style={styles.exerciseDetailTitle}>{selectedExercise.title}</Text>
            <Text style={styles.exerciseDuration}>{selectedExercise.duration}</Text>
          </View>

          <Text style={styles.exerciseDescription}>{selectedExercise.description}</Text>

          <Text style={styles.stepsTitle}>Steps to Follow</Text>
          {selectedExercise.steps.map((step, index) => (
            <View key={index} style={styles.stepItem}>
              <View style={[styles.stepNumber, { backgroundColor: getCategoryColor(selectedExercise.category) }]}>
                <Text style={styles.stepNumberText}>{index + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>
      ) : (
        <>
          <Text style={styles.exercisesIntro}>
            Guided exercises to help you manage stress, anxiety, and difficult emotions.
          </Text>
          {exercises.map((exercise) => (
            <TouchableOpacity
              key={exercise.id}
              style={styles.exerciseCard}
              onPress={() => setSelectedExercise(exercise)}
            >
              <View style={[styles.exerciseIcon, { backgroundColor: `${getCategoryColor(exercise.category)}20` }]}>
                <Ionicons
                  name={getCategoryIcon(exercise.category) as any}
                  size={28}
                  color={getCategoryColor(exercise.category)}
                />
              </View>
              <View style={styles.exerciseInfo}>
                <Text style={styles.exerciseTitle}>{exercise.title}</Text>
                <Text style={styles.exerciseCategory}>{exercise.category}</Text>
              </View>
              <View style={styles.exerciseTime}>
                <Ionicons name="time-outline" size={16} color="#64748B" />
                <Text style={styles.exerciseTimeText}>{exercise.duration}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </>
      )}
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Support Center</Text>
        <Text style={styles.subtitle}>We're here to help</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'chat' && styles.tabActive]}
          onPress={() => setActiveTab('chat')}
        >
          <Ionicons
            name="chatbubbles"
            size={20}
            color={activeTab === 'chat' ? '#EC4899' : '#64748B'}
          />
          <Text style={[styles.tabText, activeTab === 'chat' && styles.tabTextActive]}>
            AI Support
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'exercises' && styles.tabActive]}
          onPress={() => setActiveTab('exercises')}
        >
          <Ionicons
            name="fitness"
            size={20}
            color={activeTab === 'exercises' ? '#EC4899' : '#64748B'}
          />
          <Text style={[styles.tabText, activeTab === 'exercises' && styles.tabTextActive]}>
            Exercises
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'chat' ? renderChat() : renderExercises()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
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
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#1E293B',
  },
  tabActive: {
    backgroundColor: '#EC489920',
    borderWidth: 1,
    borderColor: '#EC4899',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#EC4899',
  },
  // Chat styles
  chatContainer: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  messagesContent: {
    paddingVertical: 16,
  },
  welcomeContainer: {
    alignItems: 'center',
    padding: 32,
  },
  welcomeIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#EC489920',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 22,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#EC4899',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#1E293B',
    borderBottomLeftRadius: 4,
  },
  assistantIcon: {
    marginBottom: 8,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    color: '#FFFFFF',
  },
  assistantText: {
    color: '#E2E8F0',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  input: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    fontSize: 15,
    color: '#FFFFFF',
    maxHeight: 100,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EC4899',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#334155',
  },
  // Exercises styles
  exercisesContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  exercisesIntro: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 20,
    lineHeight: 22,
  },
  exerciseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  exerciseIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exerciseInfo: {
    flex: 1,
    marginLeft: 16,
  },
  exerciseTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  exerciseCategory: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    textTransform: 'capitalize',
  },
  exerciseTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  exerciseTimeText: {
    fontSize: 12,
    color: '#64748B',
  },
  // Exercise detail styles
  exerciseDetail: {
    paddingBottom: 32,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  backText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  exerciseHeader: {
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    marginBottom: 24,
  },
  exerciseDetailTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 16,
    textAlign: 'center',
  },
  exerciseDuration: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 8,
  },
  exerciseDescription: {
    fontSize: 16,
    color: '#94A3B8',
    lineHeight: 24,
    marginBottom: 24,
  },
  stepsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 16,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stepText: {
    flex: 1,
    fontSize: 15,
    color: '#E2E8F0',
    lineHeight: 22,
  },
});
