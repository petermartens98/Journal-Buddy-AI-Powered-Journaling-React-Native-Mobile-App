import React, { useState, useEffect } from 'react'
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { supabase } from './supabaseClient'

import HomeScreen from './screens/HomeScreen'
import EntriesScreen from './screens/EntriesScreen'
import NewEntryScreen from './screens/NewEntryScreen'
import AIChatScreen from './screens/AIChatScreen'
import ProfileScreen from './screens/ProfileScreen'
import LoginScreen from './screens/LoginScreen'
import SignUpScreen from './screens/SignUpScreen'

const Stack = createNativeStackNavigator()
const mainPurple = '#5A67D8'

function TopBar({ navigation, title }) {
  return (
    <LinearGradient
      colors={[mainPurple, '#9F7AEA']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.topBar}
    >
      <TouchableOpacity onPress={() => navigation.navigate('Home')}>
        <Text style={styles.title}>{title}</Text>
      </TouchableOpacity>
    </LinearGradient>
  )
}

function BottomBar({ navigation, state }) {
  const currentRoute = state?.routes[state?.index]?.name || 'Home'

  const buttons = [
    { name: 'Home', icon: 'home', iconOutline: 'home-outline' },
    { name: 'Entries', icon: 'book', iconOutline: 'book-outline' },
    { name: 'AIChat', icon: 'chatbubbles', iconOutline: 'chatbubbles-outline' },
    { name: 'Profile', icon: 'person-circle', iconOutline: 'person-circle-outline' },
  ]

  return (
    <View style={styles.bottomBar}>
      {buttons.map((btn, i) => (
        <TouchableOpacity
          key={i}
          style={styles.bottomButton}
          onPress={() => navigation.navigate(btn.name)}
        >
          <Ionicons
            name={currentRoute === btn.name ? btn.icon : btn.iconOutline}
            size={btn.name === 'Profile' ? 24 : 22}
            color={currentRoute === btn.name ? mainPurple : '#9CA3AF'}
          />
          <Text style={[styles.bottomText, currentRoute === btn.name && styles.activeBottomText]}>
            {btn.name === 'AIChat' ? 'AI Chat' : btn.name}
          </Text>
        </TouchableOpacity>
      ))}

      <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('NewEntry')}>
        <View style={styles.addButtonCircle}>
          <Ionicons name="add" size={32} color="#fff" />
        </View>
      </TouchableOpacity>
    </View>
  )
}

function ScreenWrapper({ children, navigation, route }) {
  return (
    <View style={styles.container}>
      <TopBar navigation={navigation} title="Journal Buddy" />
      <View style={styles.content}>{children}</View>
      <BottomBar navigation={navigation} state={route?.state || navigation.getState()} />
    </View>
  )
}

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabase.auth.getSession()
      setSession(data.session)
      setLoading(false)
    }
    getSession()

    const { subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={mainPurple} />
      </View>
    )
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!session ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="SignUp" component={SignUpScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Home">
              {(props) => <ScreenWrapper {...props}><HomeScreen {...props} /></ScreenWrapper>}
            </Stack.Screen>
            <Stack.Screen name="Entries">
              {(props) => <ScreenWrapper {...props}><EntriesScreen {...props} /></ScreenWrapper>}
            </Stack.Screen>
            <Stack.Screen name="NewEntry">
              {(props) => <ScreenWrapper {...props}><NewEntryScreen {...props} /></ScreenWrapper>}
            </Stack.Screen>
            <Stack.Screen name="AIChat">
              {(props) => <ScreenWrapper {...props}><AIChatScreen {...props} /></ScreenWrapper>}
            </Stack.Screen>
            <Stack.Screen name="Profile">
              {(props) => <ScreenWrapper {...props}><ProfileScreen {...props} /></ScreenWrapper>}
            </Stack.Screen>
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF9F6' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  topBar: { paddingTop: 20, paddingBottom: 20, paddingHorizontal: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff', textAlign: 'center' },
  content: { flex: 1 },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 30,
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderRadius: 35,
    marginHorizontal: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
  },
  bottomButton: { alignItems: 'center' },
  bottomText: { fontSize: 12, marginTop: 4, color: '#9CA3AF' },
  activeBottomText: { color: mainPurple, fontWeight: '600' },
  addButton: { position: 'relative', top: -30 },
  addButtonCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: mainPurple,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 12,
  },
})
