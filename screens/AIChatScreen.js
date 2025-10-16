import React, { useState, useEffect, useRef } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, Alert, Modal, FlatList } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { DEEPSEEK_API_KEY } from '@env'
import { supabase } from '../supabaseClient'

const DEEPSEEK_BASE_URL = 'https://api.deepseek.com'

export default function AIChatScreen({ navigation }) {
  const [messages, setMessages] = useState([
    {
      id: '1',
      text: 'Hello! I\'m your journal companion. How are you feeling today?',
      sender: 'ai',
      timestamp: new Date()
    }
  ])
  const [inputText, setInputText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [userEntries, setUserEntries] = useState([])
  const [userId, setUserId] = useState(null)
  const [currentChatId, setCurrentChatId] = useState(null)
  const [chatHistoryList, setChatHistoryList] = useState([])
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const scrollViewRef = useRef(null)

  useEffect(() => {
    // Scroll to bottom when messages change
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true })
    }, 100)
  }, [messages])

  useEffect(() => {
    // Fetch user and their journal entries
    fetchUserAndEntries()
    loadChatHistory()
  }, [])

  // Auto-save chat every time messages change (debounced)
  useEffect(() => {
    if (userId && messages.length > 1) { // More than just the initial greeting
      const timer = setTimeout(() => {
        saveChatHistory()
      }, 2000) // Save 2 seconds after last message

      return () => clearTimeout(timer)
    }
  }, [messages, userId])

  const fetchUserAndEntries = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        console.warn('No user found:', userError)
        return
      }

      setUserId(user.id)

      const { data: entries, error: entriesError } = await supabase
        .from('entries')
        .select('id, title, content, sentiment, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)

      if (entriesError) {
        console.error('Error fetching entries:', entriesError)
        return
      }

      setUserEntries(entries || [])
    } catch (error) {
      console.error('Error in fetchUserAndEntries:', error)
    }
  }

  const loadChatHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('chat_history')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })

      if (error) {
        console.error('Error loading chat history:', error)
        return
      }

      setChatHistoryList(data || [])
    } catch (error) {
      console.error('Error in loadChatHistory:', error)
    }
  }

  const saveChatHistory = async () => {
    if (!userId) return

    try {
      // Find first user message for preview
      const firstUserMsg = messages.find(m => m.sender === 'user')
      const firstUserMessage = firstUserMsg ? firstUserMsg.text : 'New conversation'

      // Prepare messages for storage (remove timestamp objects)
      const messagesToSave = messages.map(msg => ({
        id: msg.id,
        text: msg.text,
        sender: msg.sender,
        timestamp: msg.timestamp.toISOString()
      }))

      if (currentChatId) {
        // Update existing chat
        const { error } = await supabase
          .from('chat_history')
          .update({
            messages: messagesToSave,
            first_user_message: firstUserMessage
          })
          .eq('id', currentChatId)

        if (error) throw error
      } else {
        // Create new chat
        const { data, error } = await supabase
          .from('chat_history')
          .insert({
            user_id: userId,
            messages: messagesToSave,
            first_user_message: firstUserMessage
          })
          .select()
          .single()

        if (error) throw error
        if (data) {
          setCurrentChatId(data.id)
        }
      }

      // Refresh chat history list
      loadChatHistory()
    } catch (error) {
      console.error('Error saving chat history:', error)
    }
  }

  const loadChat = (chat) => {
    try {
      // Convert stored messages back to proper format
      const loadedMessages = chat.messages.map(msg => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }))

      setMessages(loadedMessages)
      setCurrentChatId(chat.id)
      setShowHistoryModal(false)
    } catch (error) {
      console.error('Error loading chat:', error)
      Alert.alert('Error', 'Failed to load chat')
    }
  }

  const startNewChat = () => {
    setMessages([
      {
        id: '1',
        text: 'Hello! I\'m your journal companion. How are you feeling today?',
        sender: 'ai',
        timestamp: new Date()
      }
    ])
    setCurrentChatId(null)
    setShowHistoryModal(false)
  }

  const deleteChat = async (chatId) => {
    Alert.alert(
      'Delete Chat',
      'Are you sure you want to delete this conversation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('chat_history')
                .delete()
                .eq('id', chatId)

              if (error) throw error

              // If deleted chat was current, start new chat
              if (chatId === currentChatId) {
                startNewChat()
              }

              loadChatHistory()
            } catch (error) {
              console.error('Error deleting chat:', error)
              Alert.alert('Error', 'Failed to delete chat')
            }
          }
        }
      ]
    )
  }

  const formatEntriesForPrompt = () => {
    if (userEntries.length === 0) return ''

    const sentimentMap = {
      1: 'awful',
      2: 'bad',
      3: 'okay',
      4: 'good',
      5: 'great'
    }

    const entriesText = userEntries.map(entry => {
      const date = new Date(entry.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      })
      const sentiment = sentimentMap[entry.sentiment] || 'unknown'
      
      return `[${date}] Sentiment: ${sentiment}\nTitle: ${entry.title}\nContent: ${entry.content}`
    }).join('\n\n')

    return `\n\nUser's Recent Journal Entries:\n${entriesText}`
  }

  const callDeepSeekAPI = async (conversationHistory) => {
    try {
      const entriesContext = formatEntriesForPrompt()
      
      const response = await fetch(`${DEEPSEEK_BASE_URL}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: `
              ROLE: Compassionate and empathetic journal companion. 
              TASK: Help users reflect on their thoughts and feelings, provide emotional support, and encourage healthy journaling habits.
              RULES: 
                - Be warm, understanding, and ask thoughtful follow-up questions. 
                - Keep responses concise but meaningful.
              USER JOURNAL ENTRIES: 
                ${entriesContext}
              `
            },
            ...conversationHistory
          ],
          temperature: 0.7,
          max_tokens: 500
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error?.message || `API error: ${response.status}`)
      }

      const data = await response.json()
      return data.choices[0].message.content
    } catch (error) {
      console.error('DeepSeek API Error:', error)
      throw error
    }
  }

  const handleSend = async () => {
    if (!inputText.trim()) return

    const userMessage = {
      id: Date.now().toString(),
      text: inputText.trim(),
      sender: 'user',
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputText('')
    setIsTyping(true)

    try {
      const conversationHistory = messages
        .filter(msg => msg.sender !== 'system')
        .map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.text
        }))
      
      conversationHistory.push({
        role: 'user',
        content: userMessage.text
      })

      const aiResponseText = await callDeepSeekAPI(conversationHistory)

      const aiResponse = {
        id: (Date.now() + 1).toString(),
        text: aiResponseText,
        sender: 'ai',
        timestamp: new Date()
      }

      setMessages(prev => [...prev, aiResponse])
    } catch (error) {
      Alert.alert(
        'Connection Error',
        'Unable to get a response. Please check your connection and try again.',
        [{ text: 'OK' }]
      )
      
      const fallbackResponse = {
        id: (Date.now() + 1).toString(),
        text: 'I\'m having trouble connecting right now. Please try again in a moment.',
        sender: 'ai',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, fallbackResponse])
    } finally {
      setIsTyping(false)
    }
  }

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  const formatChatDate = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now - date)
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    } else if (diffDays === 1) {
      return 'Yesterday'
    } else if (diffDays < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' })
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
  }

  const renderChatHistoryItem = ({ item }) => (
    <TouchableOpacity
      style={styles.historyItem}
      onPress={() => loadChat(item)}
    >
      <View style={styles.historyItemContent}>
        <Text style={styles.historyItemText} numberOfLines={1}>
          {item.first_user_message || 'New conversation'}
        </Text>
        <Text style={styles.historyItemDate}>
          {formatChatDate(item.updated_at)}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => deleteChat(item.id)}
      >
        <Ionicons name="trash-outline" size={20} color="#FF4444" />
      </TouchableOpacity>
    </TouchableOpacity>
  )

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header with History Button */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.historyButton}
          onPress={() => setShowHistoryModal(true)}
        >
          <Ionicons name="time-outline" size={24} color="#5A67D8" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AI Chat</Text>
        <TouchableOpacity
          style={styles.newChatButton}
          onPress={startNewChat}
        >
          <Ionicons name="add-circle-outline" size={24} color="#5A67D8" />
        </TouchableOpacity>
      </View>

      {/* Messages List */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((message) => (
          <View
            key={message.id}
            style={[
              styles.messageBubble,
              message.sender === 'user' ? styles.userBubble : styles.aiBubble
            ]}
          >
            {message.sender === 'ai' && (
              <View style={styles.aiAvatar}>
                <Ionicons name="sparkles" size={16} color="#5A67D8" />
              </View>
            )}
            <View style={styles.messageContent}>
              <Text
                style={[
                  styles.messageText,
                  message.sender === 'user' ? styles.userText : styles.aiText
                ]}
              >
                {message.text}
              </Text>
              <Text
                style={[
                  styles.messageTime,
                  message.sender === 'user' ? styles.userTime : styles.aiTime
                ]}
              >
                {formatTime(message.timestamp)}
              </Text>
            </View>
          </View>
        ))}
        
        {isTyping && (
          <View style={[styles.messageBubble, styles.aiBubble]}>
            <View style={styles.aiAvatar}>
              <Ionicons name="sparkles" size={16} color="#5A67D8" />
            </View>
            <View style={styles.typingIndicator}>
              <View style={styles.typingDot} />
              <View style={[styles.typingDot, styles.typingDot2]} />
              <View style={[styles.typingDot, styles.typingDot3]} />
            </View>
          </View>
        )}
        
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Input Area */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={500}
          placeholderTextColor="#999"
          editable={!isTyping}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!inputText.trim() || isTyping) && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim() || isTyping}
        >
          <Ionicons 
            name="send" 
            size={20} 
            color={inputText.trim() && !isTyping ? '#FFF' : '#CCC'} 
          />
        </TouchableOpacity>
      </View>

      {/* Chat History Modal */}
      <Modal
        visible={showHistoryModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowHistoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chat History</Text>
              <TouchableOpacity onPress={() => setShowHistoryModal(false)}>
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>
            
            {chatHistoryList.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="chatbubbles-outline" size={64} color="#CCC" />
                <Text style={styles.emptyStateText}>No chat history yet</Text>
                <Text style={styles.emptyStateSubtext}>
                  Start a conversation to see it here
                </Text>
              </View>
            ) : (
              <FlatList
                data={chatHistoryList}
                renderItem={renderChatHistoryItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.historyList}
              />
            )}
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF9F6'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333'
  },
  historyButton: {
    padding: 8
  },
  newChatButton: {
    padding: 8
  },
  messagesContainer: {
    flex: 1
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingTop: 20
  },
  messageBubble: {
    flexDirection: 'row',
    marginBottom: 16,
    maxWidth: '80%'
  },
  userBubble: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse'
  },
  aiBubble: {
    alignSelf: 'flex-start'
  },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E8EAFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8
  },
  messageContent: {
    flex: 1
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    padding: 12,
    borderRadius: 16
  },
  userText: {
    backgroundColor: '#5A67D8',
    color: '#FFF',
    borderBottomRightRadius: 4
  },
  aiText: {
    backgroundColor: '#FFF',
    color: '#333',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
    marginHorizontal: 12
  },
  userTime: {
    color: '#999',
    textAlign: 'right'
  },
  aiTime: {
    color: '#999',
    textAlign: 'left'
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#5A67D8',
    marginHorizontal: 2,
    opacity: 0.4
  },
  typingDot2: {
    opacity: 0.6
  },
  typingDot3: {
    opacity: 0.8
  },
  bottomSpacer: {
    height: 20
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0'
  },
  input: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    maxHeight: 100,
    fontSize: 16,
    color: '#333'
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#5A67D8',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#5A67D8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3
  },
  sendButtonDisabled: {
    backgroundColor: '#E0E0E0',
    shadowOpacity: 0
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333'
  },
  historyList: {
    padding: 16
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12
  },
  historyItemContent: {
    flex: 1,
    marginRight: 12
  },
  historyItemText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4
  },
  historyItemDate: {
    fontSize: 12,
    color: '#999'
  },
  deleteButton: {
    padding: 8
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginTop: 16
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#BBB',
    marginTop: 8
  }
})