import React, { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Alert, TextInput, Modal } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../supabaseClient'

export default function EntriesScreen({ navigation }) {
  const [entries, setEntries] = useState([])
  const [filteredEntries, setFilteredEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterSentiment, setFilterSentiment] = useState(null)
  const [deleteModalVisible, setDeleteModalVisible] = useState(false)
  const [entryToDelete, setEntryToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

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
      setFilteredEntries(data || [])
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
      setEntries(prev => prev.filter(entry => entry.id !== entryToDelete.id))
      setFilteredEntries(prev => prev.filter(entry => entry.id !== entryToDelete.id))

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

  useEffect(() => {
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

  // Filter entries based on search and sentiment
  useEffect(() => {
    let result = entries

    // Filter by search query
    if (searchQuery.trim()) {
      result = result.filter(entry => 
        entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Filter by sentiment
    if (filterSentiment !== null) {
      result = result.filter(entry => entry.sentiment === filterSentiment)
    }

    setFilteredEntries(result)
  }, [searchQuery, filterSentiment, entries])

  // Group entries by date
  const groupEntriesByDate = () => {
    const grouped = {}
    
    filteredEntries.forEach(entry => {
      const date = new Date(entry.created_at)
      const dateKey = date.toDateString()
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = {
          date: date,
          label: formatDateLabel(date),
          entries: []
        }
      }
      
      grouped[dateKey].entries.push(entry)
    })

    return Object.values(grouped)
  }

  const formatDateLabel = (date) => {
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return 'Today'
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday'
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      })
    }
  }

  const groupedEntries = groupEntriesByDate()

  return (
    <View style={styles.container}>
      {/* Header Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Ionicons name="document-text" size={24} color="#5A67D8" />
          <Text style={styles.statNumber}>{entries.length}</Text>
          <Text style={styles.statLabel}>Total Entries</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search entries..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* Sentiment Filter */}
      <View style={styles.sentimentContainer}>
        <TouchableOpacity
          style={[
            styles.sentimentButton,
            filterSentiment === null && styles.sentimentButtonActive
          ]}
          onPress={() => setFilterSentiment(null)}
        >
          <Ionicons 
            name="apps" 
            size={24} 
            color={filterSentiment === null ? '#5A67D8' : '#9CA3AF'} 
          />
          <Text style={[
            styles.sentimentLabel,
            filterSentiment === null && styles.sentimentLabelActive
          ]}>
            All
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.sentimentButton,
            filterSentiment === 1 && {
              backgroundColor: '#991B1B20',
              borderColor: '#991B1B',
              borderWidth: 2
            }
          ]}
          onPress={() => setFilterSentiment(1)}
        >
          <Ionicons 
            name="sad" 
            size={24} 
            color={filterSentiment === 1 ? '#991B1B' : '#9CA3AF'} 
          />
          <Text style={[
            styles.sentimentLabel,
            filterSentiment === 1 && { color: '#991B1B', fontWeight: '600' }
          ]}>
            Awful
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.sentimentButton,
            filterSentiment === 2 && {
              backgroundColor: '#EF444420',
              borderColor: '#EF4444',
              borderWidth: 2
            }
          ]}
          onPress={() => setFilterSentiment(2)}
        >
          <Ionicons 
            name="sad-outline" 
            size={24} 
            color={filterSentiment === 2 ? '#EF4444' : '#9CA3AF'} 
          />
          <Text style={[
            styles.sentimentLabel,
            filterSentiment === 2 && { color: '#EF4444', fontWeight: '600' }
          ]}>
            Bad
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.sentimentButton,
            filterSentiment === 3 && {
              backgroundColor: '#F59E0B20',
              borderColor: '#F59E0B',
              borderWidth: 2
            }
          ]}
          onPress={() => setFilterSentiment(3)}
        >
          <Ionicons 
            name="remove" 
            size={24} 
            color={filterSentiment === 3 ? '#F59E0B' : '#9CA3AF'} 
          />
          <Text style={[
            styles.sentimentLabel,
            filterSentiment === 3 && { color: '#F59E0B', fontWeight: '600' }
          ]}>
            Okay
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.sentimentButton,
            filterSentiment === 4 && {
              backgroundColor: '#3B82F620',
              borderColor: '#3B82F6',
              borderWidth: 2
            }
          ]}
          onPress={() => setFilterSentiment(4)}
        >
          <Ionicons 
            name="happy-outline" 
            size={24} 
            color={filterSentiment === 4 ? '#3B82F6' : '#9CA3AF'} 
          />
          <Text style={[
            styles.sentimentLabel,
            filterSentiment === 4 && { color: '#3B82F6', fontWeight: '600' }
          ]}>
            Good
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.sentimentButton,
            filterSentiment === 5 && {
              backgroundColor: '#10B98120',
              borderColor: '#10B981',
              borderWidth: 2
            }
          ]}
          onPress={() => setFilterSentiment(5)}
        >
          <Ionicons 
            name="happy" 
            size={24} 
            color={filterSentiment === 5 ? '#10B981' : '#9CA3AF'} 
          />
          <Text style={[
            styles.sentimentLabel,
            filterSentiment === 5 && { color: '#10B981', fontWeight: '600' }
          ]}>
            Great
          </Text>
        </TouchableOpacity>
      </View>

      {/* Entries List */}
      <ScrollView style={styles.entriesList} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#5A67D8" />
          </View>
        ) : filteredEntries.length > 0 ? (
          <>
            {groupedEntries.map((group, groupIndex) => (
              <View key={groupIndex} style={styles.dateGroup}>
                <View style={styles.dateHeader}>
                  <View style={styles.dateLine} />
                  <Text style={styles.dateLabel}>{group.label}</Text>
                  <View style={styles.dateLine} />
                </View>
                
                {group.entries.map((entry) => (
                  <View key={entry.id} style={styles.entryCardWrapper}>
                    <TouchableOpacity
                      style={styles.entryCard}
                      onPress={() => navigation.navigate('EntryDetail', { entry })}
                      activeOpacity={0.7}
                    >
                      <View style={styles.entryHeader}>
                        <View style={styles.entryTitleContainer}>
                          <Text style={styles.entryTitle}>{entry.title}</Text>
                          <Text style={styles.entryTime}>
                            {new Date(entry.created_at).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit'
                            })}
                          </Text>
                        </View>
                        <View style={styles.entryActions}>
                          {entry.sentiment !== null && (
                            <View style={[
                              styles.sentimentBadge,
                              { backgroundColor: getSentimentColor(entry.sentiment) }
                            ]}>
                              <Text style={styles.sentimentText}>
                                {getSentimentEmoji(entry.sentiment)}
                              </Text>
                            </View>
                          )}
                          <TouchableOpacity
                            style={styles.deleteButton}
                            onPress={() => showDeleteConfirmation(entry)}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          >
                            <Ionicons name="trash-outline" size={20} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      </View>
                      <Text style={styles.entryPreview} numberOfLines={3}>
                        {entry.content}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ))}
            <View style={styles.bottomPadding} />
          </>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={64} color="#CCC" />
            <Text style={styles.emptyText}>
              {searchQuery || filterSentiment !== null
                ? 'No entries match your filters.'
                : 'No entries yet. Start journaling!'}
            </Text>
            {!searchQuery && filterSentiment === null && (
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => navigation.navigate('NewEntry')}
              >
                <Ionicons name="add" size={24} color="#FFF" />
                <Text style={styles.addButtonText}>Create Entry</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={cancelDelete}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="warning" size={48} color="#EF4444" />
              <Text style={styles.modalTitle}>Delete Entry?</Text>
            </View>
            
            <Text style={styles.modalMessage}>
              Are you sure you want to delete "{entryToDelete?.title}"?
            </Text>
            <Text style={styles.modalSubMessage}>
              This action cannot be undone.
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={cancelDelete}
                disabled={deleting}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.deleteButtonModal]}
                onPress={confirmDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.deleteButtonText}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

// Helper functions
const getSentimentColor = (sentiment) => {
  if (sentiment === 5) return '#10B981' // Green - great
  if (sentiment === 4) return '#3B82F6' // Blue - good
  if (sentiment === 3) return '#F59E0B' // Orange - okay
  if (sentiment === 2) return '#EF4444' // Red - bad
  return '#991B1B' // Dark red - awful
}

const getSentimentEmoji = (sentiment) => {
  if (sentiment === 5) return '😄'
  if (sentiment === 4) return '🙂'
  if (sentiment === 3) return '😐'
  if (sentiment === 2) return '😟'
  return '😢'
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF9F6'
  },
  statsContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16
  },
  statBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginLeft: 12,
    marginRight: 8
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500'
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2
  },
  searchIcon: {
    marginRight: 8
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333'
  },
  sentimentContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginBottom: 16,
    gap: 6
  },
  sentimentButton: {
    flex: 1,
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2
  },
  sentimentButtonActive: {
    backgroundColor: '#5A67D820',
    borderColor: '#5A67D8',
    borderWidth: 2
  },
  sentimentLabel: {
    marginTop: 6,
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center'
  },
  sentimentLabelActive: {
    color: '#5A67D8',
    fontWeight: '600'
  },
  entriesList: {
    flex: 1,
    paddingHorizontal: 20
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60
  },
  dateGroup: {
    marginBottom: 24
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16
  },
  dateLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0'
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5A67D8',
    marginHorizontal: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  entryCardWrapper: {
    marginBottom: 12
  },
  entryCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8
  },
  entryTitleContainer: {
    flex: 1,
    marginRight: 12
  },
  entryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4
  },
  entryTime: {
    fontSize: 12,
    color: '#999'
  },
  entryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  sentimentBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center'
  },
  sentimentText: {
    fontSize: 18
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center'
  },
  entryPreview: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 80
  },
  emptyText: {
    fontSize: 16,
    color: '#777',
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center'
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
  bottomPadding: {
    height: 40
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 30,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 12,
    textAlign: 'center'
  },
  modalMessage: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 24
  },
  modalSubMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 30
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12
  },
  modalButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    elevation: 3
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  cancelButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280'
  },
  deleteButtonModal: {
    backgroundColor: '#EF4444'
  },
  deleteButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF'
  }
})