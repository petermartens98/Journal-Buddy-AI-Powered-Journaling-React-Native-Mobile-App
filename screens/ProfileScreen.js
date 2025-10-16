import React, { useState, useEffect } from 'react'
import { 
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal, Pressable 
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../supabaseClient'

export default function ProfileScreen({ navigation }) {
  const [stats, setStats] = useState({
    totalEntries: 0,
    currentStreak: 0,
    longestStreak: 0,
    averageMood: 0,
    totalWords: 0,
    favoriteTime: 'Morning'
  })
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  useEffect(() => {
    fetchUser()
    fetchUserStats()
  }, [])

  const fetchUser = async () => {
    const { data, error } = await supabase.auth.getUser()
    if (error) console.error('Error fetching user:', error)
    else setUser(data.user)
  }

  const fetchUserStats = async () => {
    try {
      setLoading(true)
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) throw userError || new Error('No user logged in')

      const { data: entries, error } = await supabase
        .from('entries')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (error) throw error

      if (entries && entries.length > 0) {
        const totalEntries = entries.length
        const uniqueDates = new Set(entries.map(e => new Date(e.created_at).toDateString()))
        const { currentStreak, longestStreak } = calculateStreaks(Array.from(uniqueDates))
        const moodsWithSentiment = entries.filter(e => e.sentiment !== null)
        const averageMood = moodsWithSentiment.length > 0
          ? moodsWithSentiment.reduce((sum, e) => sum + e.sentiment, 0) / moodsWithSentiment.length
          : 0
        const totalWords = entries.reduce((sum, e) => sum + (e.content ? e.content.split(/\s+/).length : 0), 0)
        const favoriteTime = getFavoriteTime(entries)

        setStats({
          totalEntries,
          currentStreak,
          longestStreak,
          averageMood: averageMood.toFixed(1),
          totalWords,
          favoriteTime
        })
      } else {
        setStats({
          totalEntries: 0,
          currentStreak: 0,
          longestStreak: 0,
          averageMood: 0,
          totalWords: 0,
          favoriteTime: 'Morning'
        })
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateStreaks = (dates) => {
    if (dates.length === 0) return { currentStreak: 0, longestStreak: 0 }
    const sortedDates = dates.map(d => new Date(d)).sort((a, b) => b - a)
    let currentStreak = 0, longestStreak = 0, tempStreak = 1
    const today = new Date(); today.setHours(0, 0, 0, 0)
    let checkDate = new Date(today)

    for (let i = 0; i < sortedDates.length; i++) {
      const entryDate = new Date(sortedDates[i]); entryDate.setHours(0, 0, 0, 0)
      if (entryDate.getTime() === checkDate.getTime()) {
        currentStreak++; checkDate.setDate(checkDate.getDate() - 1)
      } else if (currentStreak === 0 && i === 0) {
        checkDate.setDate(checkDate.getDate() - 1)
        if (entryDate.getTime() === checkDate.getTime()) { currentStreak++; checkDate.setDate(checkDate.getDate() - 1) }
        else break
      } else break
    }

    for (let i = 0; i < sortedDates.length - 1; i++) {
      const diffDays = Math.floor((new Date(sortedDates[i]) - new Date(sortedDates[i+1])) / (1000*60*60*24))
      if (diffDays === 1) { tempStreak++; longestStreak = Math.max(longestStreak, tempStreak) }
      else tempStreak = 1
    }

    longestStreak = Math.max(longestStreak, tempStreak, currentStreak)
    return { currentStreak, longestStreak }
  }

  const getFavoriteTime = (entries) => {
    const times = { Morning: 0, Afternoon: 0, Evening: 0, Night: 0 }
    entries.forEach(entry => {
      const hour = new Date(entry.created_at).getHours()
      if (hour >= 5 && hour < 12) times.Morning++
      else if (hour >= 12 && hour < 17) times.Afternoon++
      else if (hour >= 17 && hour < 21) times.Evening++
      else times.Night++
    })
    return Object.keys(times).reduce((a, b) => times[a] > times[b] ? a : b)
  }

  const handleDeleteAllData = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) throw userError || new Error('No user logged in')

      const { error } = await supabase.from('entries').delete().eq('user_id', user.id)
      if (error) throw error

      setShowDeleteModal(false)
      fetchUserStats()
    } catch (err) {
      console.error('Error deleting entries:', err)
      setShowDeleteModal(false)
    }
  }

  const handleExportAllData = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) throw userError || new Error('No user logged in')

      const { data: entries, error } = await supabase
        .from('entries')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (error) throw error

      if (!entries || entries.length === 0) return

      const csvHeader = Object.keys(entries[0]).join(',') + '\n'
      const csvRows = entries.map(e => Object.values(e).map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
      const csvContent = csvHeader + csvRows.join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url; link.download = 'journal_entries.csv'
      document.body.appendChild(link); link.click(); document.body.removeChild(link)
    } catch (err) { console.error('Error exporting data:', err) }
  }

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut()
    if (!error) navigation.replace('Login')
  }

  const getMoodEmoji = (mood) => {
    if (mood >= 4.5) return '😄'
    if (mood >= 3.5) return '🙂'
    if (mood >= 2.5) return '😐'
    if (mood >= 1.5) return '😟'
    return '😢'
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}><Ionicons name="person" size={48} color="#5A67D8" /></View>
        <Text style={styles.username}>{user?.user_metadata?.username || user?.email?.split('@')[0] || 'Hey there!'}</Text>
        <Text style={styles.memberSince}>Member since Sept 2025</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Journey</Text>
        <View style={styles.statsGrid}>
          {[
            { icon: 'document-text', color: '#5A67D8', value: stats.totalEntries, label: 'Total Entries' },
            { icon: 'flame', color: '#FF6B35', value: stats.currentStreak, label: 'Current Streak' },
            { icon: 'trophy', color: '#F59E0B', value: stats.longestStreak, label: 'Longest Streak' },
            { emoji: getMoodEmoji(stats.averageMood), value: stats.averageMood, label: 'Avg Mood' },
            { icon: 'chatbubbles', color: '#10B981', value: stats.totalWords.toLocaleString(), label: 'Total Words' },
            { icon: 'time', color: '#8B5CF6', value: stats.favoriteTime, label: 'Favorite Time' }
          ].map((s, i) => (
            <View key={i} style={styles.statCard}>
              {s.icon ? <Ionicons name={s.icon} size={28} color={s.color} /> : <Text style={styles.moodEmoji}>{s.emoji}</Text>}
              <Text style={styles.statNumber}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>

        <TouchableOpacity style={styles.actionButton} onPress={handleExportAllData}>
          <Ionicons name="download" size={20} color="#5A67D8" />
          <Text style={styles.actionText}>Export All Entries</Text>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionButton, styles.dangerButton]} onPress={() => setShowDeleteModal(true)}>
          <Ionicons name="trash" size={20} color="#EF4444" />
          <Text style={[styles.actionText, styles.dangerText]}>Delete All Data</Text>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionButton, styles.logoutButton]} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#5A67D8" />
          <Text style={[styles.actionText, { color: '#5A67D8' }]}>Log Out</Text>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      <View style={styles.footer}><Text style={styles.footerText}>Journal Buddy v1.0.0</Text></View>

      {/* Delete Confirmation Modal */}
      <Modal transparent animationType="fade" visible={showDeleteModal} onRequestClose={() => setShowDeleteModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Delete All Data</Text>
            <Text style={styles.modalText}>Are you sure you want to delete all your journal entries? This action cannot be undone.</Text>
            <View style={styles.modalButtons}>
              <Pressable style={[styles.modalButton, styles.cancelButton]} onPress={() => setShowDeleteModal(false)}>
                <Text style={styles.modalButtonText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.modalButton, styles.deleteButton]} onPress={handleDeleteAllData}>
                <Text style={styles.modalButtonText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF9F6' },
  header: { alignItems: 'center', paddingVertical: 32, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  avatarContainer: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  username: { fontSize: 24, fontWeight: '700', color: '#1F2937', marginBottom: 4 },
  memberSince: { fontSize: 14, color: '#6B7280' },
  section: { marginTop: 24, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937', marginBottom: 16 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: { width: '31%', backgroundColor: '#fff', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  moodEmoji: { fontSize: 28, marginBottom: 4 },
  statNumber: { fontSize: 20, fontWeight: '700', color: '#1F2937', marginTop: 8, marginBottom: 4 },
  statLabel: { fontSize: 11, color: '#6B7280', textAlign: 'center' },
  actionButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  actionText: { fontSize: 16, color: '#1F2937', flex: 1, marginLeft: 12, fontWeight: '500' },
  dangerButton: { borderColor: '#FEE2E2' },
  dangerText: { color: '#EF4444' },
  logoutButton: { borderColor: '#E0E7FF' },
  footer: { alignItems: 'center', paddingVertical: 32 },
  footerText: { fontSize: 12, color: '#9CA3AF' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '80%', backgroundColor: '#fff', borderRadius: 16, padding: 24, alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  modalText: { fontSize: 14, color: '#4B5563', textAlign: 'center', marginBottom: 24 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  modalButton: { flex: 1, paddingVertical: 12, borderRadius: 12, marginHorizontal: 6, alignItems: 'center' },
  cancelButton: { backgroundColor: '#9CA3AF' },
  deleteButton: { backgroundColor: '#EF4444' },
  modalButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' }
})
