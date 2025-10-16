import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

export default function EntryCard({ entry, onPress, onDelete, showTime = true }) {
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

  return (
    <View style={styles.entryCardWrapper}>
      <TouchableOpacity
        style={styles.entryCard}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={styles.entryHeader}>
          <View style={styles.entryTitleContainer}>
            <Text style={styles.entryTitle}>{entry.title}</Text>
            {showTime && (
              <Text style={styles.entryTime}>
                {new Date(entry.created_at).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit'
                })}
              </Text>
            )}
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
            {onDelete && (
              <TouchableOpacity
                style={styles.deleteIconButton}
                onPress={(e) => {
                  e.stopPropagation()
                  onDelete(entry)
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
              </TouchableOpacity>
            )}
          </View>
        </View>
        <Text style={styles.entryPreview} numberOfLines={3}>
          {entry.content}
        </Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
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
  deleteIconButton: {
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
  }
})