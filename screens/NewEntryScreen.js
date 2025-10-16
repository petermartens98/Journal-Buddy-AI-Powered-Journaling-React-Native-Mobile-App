import React, { useState, useEffect } from 'react'
import { View, TextInput, StyleSheet, Text, ScrollView, SafeAreaView, TouchableOpacity, Alert, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../supabaseClient'

export default function NewEntryScreen({ route, navigation }) {
  const [title, setTitle] = useState('')
  const [entry, setEntry] = useState('')
  const [selectedSentiment, setSelectedSentiment] = useState(null)
  const [entryDate, setEntryDate] = useState(new Date())
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  // Get the date passed from HomeScreen
  useEffect(() => {
    if (route.params?.date) {
      setEntryDate(new Date(route.params.date))
    }
  }, [route.params?.date])

  const sentiments = [
    { id: 1, icon: 'sad', label: 'Awful', color: '#991B1B' },
    { id: 2, icon: 'sad-outline', label: 'Bad', color: '#EF4444' },
    { id: 3, icon: 'remove', label: 'Okay', color: '#F59E0B' },
    { id: 4, icon: 'happy-outline', label: 'Good', color: '#3B82F6' },
    { id: 5, icon: 'happy', label: 'Great', color: '#10B981' }
  ]

  const handleUpload = async () => {
    if (!title.trim() || !entry.trim()) {
      Alert.alert('Missing Information', 'Please add a title and write your thoughts')
      return
    }
  
    if (!selectedSentiment) {
      Alert.alert('Missing Sentiment', 'Please select how you\'re feeling')
      return
    }
  
    setIsUploading(true)
  
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError || !userData?.user) throw userError || new Error('User not found')
  
      const userId = userData.user.id
  
      const { data, error } = await supabase
        .from('entries')
        .insert([
          {
            title: title.trim(),
            content: entry.trim(),
            sentiment: selectedSentiment,
            created_at: entryDate,
            user_id: userId
          }
        ])
        .select()
  
      if (error) throw error
  
      Alert.alert('Success!', 'Your journal entry has been saved', [
        { text: 'OK', onPress: () => navigation.navigate('Home') }
      ])
    } catch (error) {
      console.error('Error uploading entry:', error)
      Alert.alert('Error', 'Failed to save entry. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }
  

  const formatDateForInput = (date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  const handleDateChange = (event) => {
    const newDate = new Date(event.target.value)
    if (!isNaN(newDate.getTime())) {
      setEntryDate(newDate)
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FAF9F6' }}>
      <ScrollView contentContainerStyle={styles.container}>
        
        {/* Date Picker */}
        <View style={styles.datePickerButton}>
          <View style={styles.datePickerContent}>
            <Ionicons name="calendar" size={20} color="#5A67D8" />
            <Text style={styles.datePickerLabel}>Entry Date & Time:</Text>
          </View>
          {Platform.OS === 'web' ? (
            <input
              type="datetime-local"
              value={formatDateForInput(entryDate)}
              onChange={handleDateChange}
              max={formatDateForInput(new Date())}
              style={{
                marginTop: 8,
                padding: 12,
                fontSize: 16,
                borderRadius: 8,
                border: '1px solid #E5E7EB',
                backgroundColor: '#F9FAFB',
                width: '92%',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                color: '#1F2937',
                fontWeight: '500'
              }}
            />
          ) : (
            <Text style={styles.datePickerText}>
              {entryDate.toLocaleDateString('en-US', { 
                weekday: 'short', 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </Text>
          )}
        </View>

        {/* Sentiment Selection */}
        <View style={styles.sentimentContainer}>
          {sentiments.map((sentiment) => (
            <TouchableOpacity
              key={sentiment.id}
              style={[
                styles.sentimentButton,
                selectedSentiment === sentiment.id && {
                  backgroundColor: sentiment.color + '20',
                  borderColor: sentiment.color,
                  borderWidth: 2
                }
              ]}
              onPress={() => setSelectedSentiment(sentiment.id)}
            >
              <Ionicons 
                name={sentiment.icon} 
                size={32} 
                color={selectedSentiment === sentiment.id ? sentiment.color : '#9CA3AF'} 
              />
              <Text style={[
                styles.sentimentLabel,
                selectedSentiment === sentiment.id && { 
                  color: sentiment.color,
                  fontWeight: '600'
                }
              ]}>
                {sentiment.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Title Input */}
        <TextInput
          style={styles.titleInput}
          placeholder="Entry title..."
          placeholderTextColor="#9CA3AF"
          value={title}
          onChangeText={setTitle}
        />

        {/* Content Input */}
        <TextInput
          style={styles.input}
          multiline
          placeholder="What's on your mind today?"
          placeholderTextColor="#9CA3AF"
          value={entry}
          onChangeText={setEntry}
          textAlignVertical="top"
        />

        {/* Upload Button */}
        <TouchableOpacity 
          style={[styles.button, isUploading && styles.buttonDisabled]}
          onPress={handleUpload}
          disabled={isUploading}
        >
          <Ionicons name="cloud-upload" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.buttonText}>{isUploading ? 'Uploading...' : 'Upload Entry'}</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 40
  },
  sentimentContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 8
  },
  sentimentButton: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  sentimentLabel: {
    marginTop: 6,
    fontSize: 12,
    color: '#6B7280'
  },
  titleInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    backgroundColor: '#fff',
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937'
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    borderRadius: 12,
    minHeight: 200,
    marginBottom: 20,
    backgroundColor: '#fff',
    fontSize: 16,
    color: '#1F2937'
  },
  button: {
    backgroundColor: '#5A67D8',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#5A67D8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4
  },
  buttonDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.7
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  datePickerButton: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#fff',
    marginBottom: 16
  },
  datePickerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  datePickerLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500'
  },
  datePickerText: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
    marginTop: 8
  }
})