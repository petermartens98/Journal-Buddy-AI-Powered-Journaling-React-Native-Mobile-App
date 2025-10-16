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

function TopBar({ navigation }) {
  return (
    <LinearGradient
      colors={[mainPurple, '#9F7AEA']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.topBar}
    >
      <TouchableOpacity onPress={() => navigation.navigate('Home')}>
        <Text style={styles.title}>Journal Buddy</Text>
      </TouchableOpacity>
    </LinearGradient>
  )
}


function BottomBar({ navigation, state }) {
  const currentRoute = state?.routes[state?.index]?.name || 'Home'

  return (
    <View style={styles.bottomBar}>
      <TouchableOpacity style={styles.bottomButton} onPress={() => navigation.navigate('Home')}>
        <Ionicons
          name={currentRoute === 'Home' ? "home" : "home-outline"}
          size={22}
          color={currentRoute === 'Home' ? mainPurple : '#9CA3AF'}
        />
        <Text style={[styles.bottomText, currentRoute === 'Home' && styles.activeBottomText]}>
          Home
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.bottomButton} onPress={() => navigation.navigate('Entries')}>
        <Ionicons
          name={currentRoute === 'Entries' ? "book" : "book-outline"}
          size={22}
          color={currentRoute === 'Entries' ? mainPurple : '#9CA3AF'}
        />
        <Text style={[styles.bottomText, currentRoute === 'Entries' && styles.activeBottomText]}>
          Entries
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('NewEntry')}>
        <View style={styles.addButtonCircle}>
          <Ionicons name="add" size={32} color="#fff" />
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.bottomButton} onPress={() => navigation.navigate('AIChat')}>
        <Ionicons
          name={currentRoute === 'AIChat' ? "chatbubbles" : "chatbubbles-outline"}
          size={22}
          color={currentRoute === 'AIChat' ? mainPurple : '#9CA3AF'}
        />
        <Text style={[styles.bottomText, currentRoute === 'AIChat' && styles.activeBottomText]}>
          AI Chat
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.bottomButton} onPress={() => navigation.navigate('Profile')}>
        <Ionicons
          name={currentRoute === 'Profile' ? "person-circle" : "person-circle-outline"}
          size={24}
          color={currentRoute === 'Profile' ? mainPurple : '#9CA3AF'}
        />
        <Text style={[styles.bottomText, currentRoute === 'Profile' && styles.activeBottomText]}>
          Profile
        </Text>
      </TouchableOpacity>
    </View>
  )
}

function ScreenWrapper({ children, navigation, route }) {
  return (
    <View style={styles.container}>
      <TopBar navigation={navigation} />
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

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
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
              {(props) => (
                <ScreenWrapper navigation={props.navigation} route={props.route}>
                  <HomeScreen {...props} />
                </ScreenWrapper>
              )}
            </Stack.Screen>
            <Stack.Screen name="Entries">
              {(props) => (
                <ScreenWrapper navigation={props.navigation} route={props.route}>
                  <EntriesScreen {...props} />
                </ScreenWrapper>
              )}
            </Stack.Screen>
            <Stack.Screen name="NewEntry">
              {(props) => (
                <ScreenWrapper navigation={props.navigation} route={props.route}>
                  <NewEntryScreen {...props} />
                </ScreenWrapper>
              )}
            </Stack.Screen>
            <Stack.Screen name="AIChat">
              {(props) => (
                <ScreenWrapper navigation={props.navigation} route={props.route}>
                  <AIChatScreen {...props} />
                </ScreenWrapper>
              )}
            </Stack.Screen>
            <Stack.Screen name="Profile">
              {(props) => (
                <ScreenWrapper navigation={props.navigation} route={props.route}>
                  <ProfileScreen {...props} />
                </ScreenWrapper>
              )}
            </Stack.Screen>
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF9F6' },
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