import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TextInput, Pressable, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

const initializeDatabase = async (db) => {
  try {
    // Check if the table exists before creating it
    const result = await db.getFirstAsync("SELECT name FROM sqlite_master WHERE type='table' AND name='users'");
    if (!result) {
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE,
          password TEXT
        );
      `);
      console.log('Database initialized!');
    } else {
      console.log('Database already initialized.');
    }
  } catch (error) {
    console.log('Error while initializing the database:', error);
  }
};

// Create a stack navigator
const Stack = createStackNavigator();

// App component
export default function App() {
  const [initialRoute, setInitialRoute] = useState('Login'); // Default to Login

  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const user = await AsyncStorage.getItem('user');
        if (user) {
          setInitialRoute('Home'); // User data found, navigate to Home
        } else {
          setInitialRoute('Login'); // No user data found, navigate to Login
        }
      } catch (error) {
        console.error('Error checking login status:', error);
        setInitialRoute('Login'); // Default to Login in case of error
      }
    };

    checkLoginStatus();
  }, []);

  return (
    <SQLiteProvider databaseName='auth.db' onInit={initializeDatabase}>
      <NavigationContainer>
        <Stack.Navigator initialRouteName={initialRoute}>
          <Stack.Screen name='Login' component={LoginScreen} />
          <Stack.Screen name='Register' component={RegisterScreen} />
          <Stack.Screen name='Home' component={HomeScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SQLiteProvider>
  );
}

// LoginScreen component
const LoginScreen = ({ navigation }) => {
  const db = useSQLiteContext();
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');

  // Function to handle login logic
  const handleLogin = async () => {
    if (userName.length === 0 || password.length === 0) {
      Alert.alert('Attention', 'Please enter both username and password');
      return;
    }
    try {
      const user = await db.getFirstAsync('SELECT * FROM users WHERE username = ?', [userName]);
      if (!user) {
        Alert.alert('Error', 'Username does not exist!');
        return;
      }
      const validUser = await db.getFirstAsync('SELECT * FROM users WHERE username = ? AND password = ?', [userName, password]);
      if (validUser) {
        await AsyncStorage.setItem('user', JSON.stringify({ username: userName }));
        Alert.alert('Success', 'Login successful');
        navigation.navigate('Home', { user: userName });
        setUserName('');
        setPassword('');
      } else {
        Alert.alert('Error', 'Incorrect password');
      }
    } catch (error) {
      console.log('Error during login:', error);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <Text style={styles.title}>Login</Text>
      <TextInput
        style={styles.input}
        placeholder='Username'
        value={userName}
        onChangeText={setUserName}
      />
      <TextInput
        style={styles.input}
        placeholder='Password'
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <Pressable style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Login</Text>
      </Pressable>
      <Pressable style={styles.link} onPress={() => navigation.navigate('Register')}>
        <Text style={styles.linkText}>Don't have an account? Register</Text>
      </Pressable>
    </View>
  );
};

// RegisterScreen component
const RegisterScreen = ({ navigation }) => {
  const db = useSQLiteContext();
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Function to handle registration logic
  const handleRegister = async () => {
    if (userName.length === 0 || password.length === 0 || confirmPassword.length === 0) {
      Alert.alert('Attention!', 'Please enter all the fields.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    try {
      const existingUser = await db.getFirstAsync('SELECT * FROM users WHERE username = ?', [userName]);
      if (existingUser) {
        Alert.alert('Error', 'Username already exists.');
        return;
      }
      await db.runAsync('INSERT INTO users (username, password) VALUES (?, ?)', [userName, password]);
      await AsyncStorage.setItem('user', JSON.stringify({ username: userName }));
      Alert.alert('Success', 'Registration successful!');
      navigation.navigate('Home', { user: userName });
    } catch (error) {
      console.log('Error during registration:', error);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <Text style={styles.title}>Register</Text>
      <TextInput
        style={styles.input}
        placeholder='Username'
        value={userName}
        onChangeText={setUserName}
      />
      <TextInput
        style={styles.input}
        placeholder='Password'
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <TextInput
        style={styles.input}
        placeholder='Confirm password'
        secureTextEntry
        value={confirmPassword}
        onChangeText={setConfirmPassword}
      />
      <Pressable style={styles.button} onPress={handleRegister}>
        <Text style={styles.buttonText}>Register</Text>
      </Pressable>
      <Pressable style={styles.link} onPress={() => navigation.navigate('Login')}>
        <Text style={styles.linkText}>Already have an account? Login</Text>
      </Pressable>
    </View>
  );
};

// HomeScreen component
const HomeScreen = ({ navigation, route }) => {
  // Use optional chaining to safely access route.params
  const { user } = route.params || {};

  // Handle the case where user might be undefined
  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Welcome</Text>
        <Text style={styles.userText}>The main working screen</Text>
        <Pressable style={styles.button} onPress={() => navigation.navigate('Login')}>
          <Text style={styles.buttonText}>Login</Text>
        </Pressable>
      </View>
    );
  }

  // Function to handle logout
  const handleLogout = async () => {
    await AsyncStorage.removeItem('user');
    navigation.navigate('Login');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Home</Text>
      <Text style={styles.userText}>Welcome {user}!</Text>
      <Pressable style={styles.button} onPress={handleLogout}>
        <Text style={styles.buttonText}>Logout</Text>
      </Pressable>
    </View>
  );
};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
  },
  input: {
    width: '80%',
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    marginVertical: 5,
  },
  button: {
    backgroundColor: 'blue',
    padding: 10,
    marginVertical: 10,
    width: '80%',
    borderRadius: 5,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 18,
  },
  link: {
    marginTop: 10,
  },
  linkText: {
    color: 'blue',
  },
  userText: {
    fontSize: 18,
    marginBottom: 30,
  },
});
