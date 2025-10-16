import React, { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Alert } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../supabaseClient'
import EntryCard from '../components/EntryCard'
import DeleteModal from '../components/DeleteModal'

export default function HomeScreen({ navigation }) {
  const [selectedDate, setSelectedDate] = useState(null)
  const [dates, setDates] = useState([])
  const [currentDateText, setCurrentDateText] = useState('')
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [streakData, setStreakData] = useState({ current: 0, total: 0 })
  const [deleteModalVisible, setDeleteModalVisible] = useState(false)
  const [entryToDelete, setEntryToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const scrollViewRef = React.useRef(null)

  // Fetch entries from Supabase
  const fetchEntries = async () => {
    try {
      setLoading(true)
  
      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser()
  
      if (userError || !user) throw userError || new Error('No user logged in')
  
      const { data, error } = await supabase
        .from('entries')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
  
      if (error) throw error
  
      setEntries(data || [])
      calculateStreaks(data || [])
    } catch (error) {
      console.error('Error fetching entries:', error)
      Alert.alert('Error', 'Failed to load your entries. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Show delete confirmation
  const showDeleteConfirmation = (entry) => {
    setEntryToDelete(entry)
    setDeleteModalVisible(true)
  }

  // Delete entry function
  const confirmDelete = async () => {
    if (!entryToDelete) return

    try {
      setDeleting(true)
      
      const { error } = await supabase
        .from('entries')
        .delete()
        .eq('id', entryToDelete.id)

      if (error) throw error

      // Update local state immediately
      const updatedEntries = entries.filter(entry => entry.id !== entryToDelete.id)
      setEntries(updatedEntries)
      calculateStreaks(updatedEntries)

      setDeleteModalVisible(false)
      setEntryToDelete(null)
      
      // Show success message
      setTimeout(() => {
        Alert.alert('Success', 'Entry deleted successfully')
      }, 300)
    } catch (error) {
      console.error('Error deleting entry:', error)
      Alert.alert('Error', 'Failed to delete entry. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  const cancelDelete = () => {
    setDeleteModalVisible(false)
    setEntryToDelete(null)
  }

  // Calculate streak data
  const calculateStreaks = (entriesData) => {
    if (!entriesData || entriesData.length === 0) {
      setStreakData({ current: 0, total: 0 })
      return
    }

    // Get unique dates (only the date part, not time)
    const uniqueDates = new Set(
      entriesData.map(entry => 
        new Date(entry.created_at).toDateString()
      )
    )

    const totalDays = uniqueDates.size

    // Calculate current streak
    let currentStreak = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let checkDate = new Date(today)
    
    while (true) {
      const dateStr = checkDate.toDateString()
      if (uniqueDates.has(dateStr)) {
        currentStreak++
        checkDate.setDate(checkDate.getDate() - 1)
      } else {
        // Allow for today if no entry yet
        if (currentStreak === 0 && checkDate.toDateString() === today.toDateString()) {
          checkDate.setDate(checkDate.getDate() - 1)
          continue
        }
        break
      }
    }

    setStreakData({ current: currentStreak, total: totalDays })
  }

  // Get entries for selected date
  const getEntriesForDate = () => {
    if (!selectedDate) return []

    const selectedDateStr = selectedDate.toDateString()
    return entries.filter(entry => {
      const entryDate = new Date(entry.created_at)
      return entryDate.toDateString() === selectedDateStr
    })
  }

  useEffect(() => {
    const today = new Date()
    const startDate = new Date(2025, 8, 1) // September 1st, 2025
    const tempDates = []
    
    const daysDiff = Math.floor((today - startDate) / (1000 * 60 * 60 * 24))
    
    let lastMonth = null
    for (let i = daysDiff; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      
      const currentMonth = d.getMonth()
      const showMonth = lastMonth !== currentMonth
      lastMonth = currentMonth
      
      tempDates.push({
        day: d.toLocaleDateString('en-US', { weekday: 'short' }),
        date: d.getDate(),
        month: d.toLocaleDateString('en-US', { month: 'short' }),
        showMonth: showMonth,
        fullDate: d,
        label: d.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        })
      })
    }
    setDates(tempDates)
    setSelectedDate(today)
    setCurrentDateText(
      today.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      })
    )
    
    setTimeout(() => {
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollToEnd({ animated: false })
      }
    }, 100)

    // Fetch entries on mount
    fetchEntries()

    // Set up real-time subscription
    const subscription = supabase
      .channel('entries_channel')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'entries' },
        (payload) => {
          console.log('Change received!', payload)
          fetchEntries()
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const dateEntries = getEntriesForDate()

  return (
    <View style={styles.container}>
      {/* Streaks Box */}
      <View style={styles.streaksBox}>
        <View style={styles.streakColumn}>
          <Ionicons name="flame" size={28} color="#FF6B35" />
          <Text style={styles.streaksNumber}>{streakData.current}</Text>
          <Text style={styles.streaksLabel}>Current Streak</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.streakColumn}>
          <Ionicons name="calendar" size={28} color="#5A67D8" />
          <Text style={styles.streaksNumber}>{streakData.total}</Text>
          <Text style={styles.streaksLabel}>Total Days</Text>
        </View>
      </View>

      {/* Date Slider */}
      <View>
        <ScrollView
          ref={scrollViewRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dayScroll}
        >
          {dates.map((item, index) => {
            const isSelected =
              selectedDate && item.date === selectedDate.getDate() &&
              item.fullDate.getMonth() === selectedDate.getMonth() &&
              item.fullDate.getFullYear() === selectedDate.getFullYear()

            // Check if this date has entries
            const dateStr = item.fullDate.toDateString()
            const hasEntries = entries.some(entry => 
              new Date(entry.created_at).toDateString() === dateStr
            )

            return (
              <View key={index} style={styles.dateItemWrapper}>
                {item.showMonth && (
                  <Text style={styles.monthLabel}>{item.month}</Text>
                )}
                <TouchableOpacity
                  style={[styles.dateItem, isSelected && styles.selectedDateItem]}
                  onPress={() => {
                    setSelectedDate(item.fullDate)
                    setCurrentDateText(item.label)
                  }}
                >
                  <Text style={[styles.dayLabel, isSelected && styles.selectedDayLabel]}>
                    {item.day}
                  </Text>
                  <View style={[styles.dateCircle, isSelected && styles.selectedDateCircle]}>
                    <Text style={[styles.dateNumber, isSelected && styles.selectedDateNumber]}>
                      {item.date}
                    </Text>
                    {hasEntries && !isSelected && (
                      <View style={styles.entryIndicator} />
                    )}
                  </View>
                </TouchableOpacity>
              </View>
            )
          })}
        </ScrollView>

        {/* Current Date Display */}
        <Text style={styles.dateText}>{currentDateText}</Text>
      </View>

      {/* Entry Section */}
      <ScrollView style={styles.entryContent}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#5A67D8" />
          </View>
        ) : dateEntries.length > 0 ? (
          <>
            {dateEntries.map((entry) => (
              <EntryCard
                key={entry.id}
                entry={entry}
                onPress={() => navigation.navigate('EntryDetail', { entry })}
                onDelete={showDeleteConfirmation}
                showTime={true}
              />
            ))}
            <View style={styles.addMoreContainer}>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => navigation.navigate('NewEntry', { date: selectedDate })}
              >
                <Ionicons name="add" size={24} color="#FFF" />
                <Text style={styles.addButtonText}>Create Entry</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={64} color="#CCC" />
            <Text style={styles.emptyText}>No entries yet for this day.</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => navigation.navigate('NewEntry', { date: selectedDate })}
            >
              <Ionicons name="add" size={24} color="#FFF" />
              <Text style={styles.addButtonText}>Create Entry</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Delete Confirmation Modal */}
      <DeleteModal
        visible={deleteModalVisible}
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
        title="Delete Entry?"
        message={`Are you sure you want to delete "${entryToDelete?.title}"? This action cannot be undone.`}
        deleting={deleting}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 20,
    paddingHorizontal: 16,
    backgroundColor: '#FAF9F6'
  },
  streaksBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#FFF',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  streakColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  divider: {
    width: 1,
    height: 60,
    backgroundColor: '#E0E0E0'
  },
  streaksNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: '#333',
    marginTop: 8,
    marginBottom: 4
  },
  streaksLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500'
  },
  dateText: {
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    color: '#555',
    marginBottom: 20,
    marginTop: 12
  },
  dayScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 10,
    marginBottom: 8
  },
  dateItemWrapper: {
    alignItems: 'center',
    marginHorizontal: 8
  },
  monthLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#5A67D8',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  dateItem: {
    alignItems: 'center'
  },
  dayLabel: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4
  },
  dateCircle: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative'
  },
  dateNumber: {
    fontSize: 18,
    color: '#333',
    fontWeight: '500'
  },
  selectedDateCircle: {
    backgroundColor: '#5A67D8'
  },
  selectedDateNumber: {
    color: '#fff'
  },
  selectedDayLabel: {
    color: '#5A67D8',
    fontWeight: '600'
  },
  entryIndicator: {
    position: 'absolute',
    bottom: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#5A67D8'
  },
  entryContent: {
    flex: 1
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60
  },
  emptyText: {
    fontSize: 16,
    color: '#777',
    marginTop: 16,
    marginBottom: 24
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#5A67D8',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    shadowColor: '#5A67D8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4
  },
  addButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8
  },
  addMoreContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingBottom: 40
  }
})