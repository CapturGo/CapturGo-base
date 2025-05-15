import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, Alert, SafeAreaView, StatusBar, Platform, Image, Keyboard, KeyboardAvoidingView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../utils/supabase';
import { styles as globalStyles } from '../utils/styles';
import { NavigationProps } from '../App';
import NavigationBar from './NavigationBar';
import MapBackground from './MapBackground';
import { mintTokensToUser, resetUserBalance } from '../utils/mintAndClaim';

// Storage keys from Rewards component
const STORAGE_KEYS = {
  LOCATION_SHARING: 'location_sharing_enabled',
  CAPT_BALANCE: 'capt_balance'
};

export default function EditProfile({ navigation }: NavigationProps) {
  // Location sharing state
  const [isLocationSharingEnabled, setIsLocationSharingEnabled] = useState(true);
  // Function to handle sign out
  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error.message);
        Alert.alert('Error', 'Failed to sign out. Please try again.');
      } else {
        navigation.navigate('Main'); // Navigate back to main screen after sign out
      }
    } catch (error: any) {
      console.error('Error signing out:', error.message);
      Alert.alert('Error', 'An unexpected error occurred');
    }
  };
  const scrollViewRef = useRef<ScrollView>(null);
  const walletAddressInputRef = useRef<TextInput>(null);
  
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [ageRange, setAgeRange] = useState('');
  const [gender, setGender] = useState('');
  const [commuteMode, setCommuteMode] = useState('');
  const [cryptoChain, setCryptoChain] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isAddressValid, setIsAddressValid] = useState(false);
  const [claiming, setClaiming] = useState(false);

  // Define options for form
  const ageRanges = ["Under 18", "18-25", "26-40", "40+"];
  const genders = ["Male", "Female", "Other"];
  const cryptoChains = [
    { name: "Ethereum", image: require('../assets/eth-ethereum.png') },
    { name: "Solana", image: require('../assets/sol-solana.png') },
    { name: "Base", image: require('../assets/eth-base.png') },
    { name: "Binance Smart Chain", image: require('../assets/bnb-binance-coin.png') },
    { name: "Cardano", image: require('../assets/ada-cardano.png') }
  ];
  const commuteModes = [
    { name: "Car", icon: "car" },
    { name: "Bike", icon: "bicycle" },
    { name: "Train", icon: "train" },
    { name: "Bus", icon: "bus" },
    { name: "Walk", icon: "walk" }
  ];

  
  // Load location sharing state from AsyncStorage
  useEffect(() => {
    const loadLocationSharingState = async () => {
      try {
        const storedValue = await AsyncStorage.getItem(STORAGE_KEYS.LOCATION_SHARING);
        if (storedValue !== null) {
          setIsLocationSharingEnabled(storedValue === 'true');
        } else {
          // If no value is stored, default to true
          setIsLocationSharingEnabled(true);
        }
      } catch (error) {
        console.error('Error loading location sharing state:', error);
      }
    };
    
    loadLocationSharingState();
  }, []);
  
  // Load user profile
  useEffect(() => {
    getProfile();
  }, []);

  async function getProfile() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error("No user found");

      // Get user profile data
      const { data, error } = await supabase
        .from('profiles')
        .select('username, email, age_range, gender, commute_mode, crypto_chain, wallet_address')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setUsername(data.username || '');
        setEmail(data.email || user.email || '');
        setAgeRange(data.age_range || '');
        setGender(data.gender || '');
        setCommuteMode(data.commute_mode || '');
        setCryptoChain(data.crypto_chain || '');
        setWalletAddress(data.wallet_address || '');
      }
    } catch (error: any) {
      setError(error.message);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  }

  async function updateProfile() {
    try {
      setUpdating(true);
      setError(null);
      setSuccess(null);

      if (!username.trim()) {
        setError('Username is required');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error("No user found");

      const updates = {
        id: user.id,
        username,
        email,
        age_range: ageRange,
        gender,
        commute_mode: commuteMode,
        crypto_chain: cryptoChain,
        wallet_address: walletAddress,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('profiles')
        .upsert(updates);

      if (error) throw error;
      
      setSuccess('Profile updated successfully!');
      
      // Update email in auth if it has changed
      if (email !== user.email) {
        const { error: emailUpdateError } = await supabase.auth.updateUser({
          email: email,
        });
        
        if (emailUpdateError) {
          setError('Profile updated but email change requires verification');
        } else {
          setSuccess('Profile updated! Please check your email to confirm your new email address.');
        }
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setUpdating(false);
    }
  }

  const scrollToWalletAddress = () => {
    // Wait a bit for the keyboard to appear before scrolling
    setTimeout(() => {
      if (walletAddressInputRef.current && scrollViewRef.current) {
        scrollViewRef.current?.scrollTo({ y: 500, animated: true });
      }
    }, 100);
  };

  // Simple wallet address validation (Ethereum, Solana, BSC, Cardano, Base)
  function validateWalletAddress(address: string, chain: string): boolean {
    if (!address) return false;
    if (chain === 'Ethereum' || chain === 'Base' || chain === 'Binance Smart Chain') {
      // Ethereum/BSC/Base: 0x + 40 hex chars
      return /^0x[a-fA-F0-9]{40}$/.test(address);
    }
    if (chain === 'Solana') {
      // Solana: 32-44 base58 chars
      return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
    }
    if (chain === 'Cardano') {
      // Cardano: starts with addr1, 58+ chars
      return /^addr1[0-9a-z]{50,}$/.test(address);
    }
    return false;
  }

  useEffect(() => {
    setIsAddressValid(validateWalletAddress(walletAddress, cryptoChain));
  }, [walletAddress, cryptoChain]);

  return (
    <SafeAreaView style={[globalStyles.container, { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }]}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      
      {/* Map Background with overlay - respects location sharing setting */}
      <MapBackground opacity={0.8} showUserLocation={isLocationSharingEnabled} />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, zIndex: 2 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <View style={[globalStyles.header, { marginTop: 10 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={globalStyles.title}>Edit Profile</Text>
        </View>
        <Text style={globalStyles.subtitle}>Update your profile information</Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#935EFF" />
        </View>
      ) : (
        <ScrollView 
          ref={scrollViewRef}
          style={globalStyles.scrollView}
          keyboardShouldPersistTaps="handled"
        >
          <View style={globalStyles.formSection}>
            <Text style={globalStyles.sectionTitle}>Username</Text>
            <TextInput
              style={globalStyles.input}
              placeholder="Username"
              placeholderTextColor="#fff"
              value={username}
              onChangeText={setUsername}
            />
            
            <Text style={globalStyles.sectionTitle}>Email</Text>
            <TextInput
              style={globalStyles.input}
              placeholder="Email Address"
              placeholderTextColor="#fff"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            
            <Text style={globalStyles.sectionTitle}>Age Range</Text>
            <View style={globalStyles.buttonGroup}>
              {ageRanges.map((age) => (
                <TouchableOpacity
                  key={age}
                  style={[
                    globalStyles.selectionButton,
                    ageRange === age && globalStyles.selectedButton
                  ]}
                  onPress={() => setAgeRange(age)}
                >
                  <Text style={globalStyles.whiteButtonText}>{age}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={globalStyles.sectionTitle}>Gender</Text>
            <View style={globalStyles.buttonGroup}>
              {genders.map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[
                    globalStyles.selectionButton,
                    gender === g && globalStyles.selectedButton
                  ]}
                  onPress={() => setGender(g)}
                >
                  <Text style={globalStyles.whiteButtonText}>{g}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={globalStyles.sectionTitle}>Primary Commute Mode</Text>
            <View style={globalStyles.buttonGroup}>
              {commuteModes.map((mode) => (
                <TouchableOpacity
                  key={mode.name}
                  style={[
                    globalStyles.selectionButton,
                    commuteMode === mode.name && globalStyles.selectedButton
                  ]}
                  onPress={() => setCommuteMode(mode.name)}
                >
                  <Ionicons name={mode.icon as any} size={20} color="#fff" style={globalStyles.buttonIcon} />
                  <Text style={globalStyles.whiteButtonText}>{mode.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={globalStyles.sectionTitle}>Crypto Chain</Text>
            <View style={globalStyles.buttonGroup}>
              {cryptoChains.map((chain) => (
                <TouchableOpacity
                  key={chain.name}
                  style={[
                    globalStyles.selectionButton,
                    { width: 50, height: 50, justifyContent: 'center' },
                    cryptoChain === chain.name && globalStyles.selectedButton
                  ]}
                  onPress={() => setCryptoChain(chain.name)}
                >
                  <Image 
                    source={chain.image} 
                    style={{ width: 30, height: 30, resizeMode: 'contain' }} 
                  />
                </TouchableOpacity>
              ))}
            </View>
            
            <Text style={globalStyles.sectionTitle}>Wallet Address</Text>
            <TextInput
              ref={walletAddressInputRef}
              style={globalStyles.input}
              placeholder="Enter your wallet address"
              placeholderTextColor="#fff"
              value={walletAddress}
              onChangeText={setWalletAddress}
              autoCapitalize="none"
              onFocus={scrollToWalletAddress}
            />
            {walletAddress.length > 0 && !isAddressValid && (
              <Text style={globalStyles.errorText}>Invalid address for selected chain.</Text>
            )}
            {isAddressValid && (
              <TouchableOpacity
                style={[globalStyles.button, { backgroundColor: '#4CAF50', marginBottom: 10 }]}
                onPress={async () => {
                  setClaiming(true);
                  try {
                    setError(null);
                    setSuccess(null);
                    // Get current user
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) throw new Error('No user found');
                    // 1. Read balance from AsyncStorage
                    const localBalanceStr = await AsyncStorage.getItem('captur_token_balance');
                    const localBalance = localBalanceStr ? parseFloat(localBalanceStr) : 0;
                    // 2. Sync to Supabase
                    if (localBalance > 0) {
                      const { error: syncError } = await supabase
                        .from('profiles')
                        .update({ token_balance: localBalance })
                        .eq('id', user.id);
                      if (syncError) throw syncError;
                    }
                    // 3. Fetch balance from Supabase
                    const { data, error } = await supabase
                      .from('profiles')
                      .select('token_balance')
                      .eq('id', user.id)
                      .single();
                    if (error) throw error;
                    const balance = data?.token_balance;
                    if (!balance || balance <= 0) {
                      setError('No balance to claim.');
                      return;
                    }
                    // 4. Mint tokens to user
                    await mintTokensToUser(walletAddress, balance.toString());
                    // 5. Reset balance in DB and AsyncStorage only if mint succeeded
                    const { error: updateError } = await supabase
                      .from('profiles')
                      .update({ token_balance: 0 })
                      .eq('id', user.id);
                    if (updateError) throw updateError;
                    await AsyncStorage.setItem('captur_token_balance', '0');
                    setSuccess('Tokens claimed and balance reset!');
                  } catch (err: any) {
                    setError(err.message || 'Claim failed.');
                  } finally {
                    setClaiming(false);
                  }
                }}
                disabled={claiming}
              >
                {claiming ? (
                  <ActivityIndicator color="#272a32" />
                ) : (
                  <Text style={globalStyles.darkButtonText}>Claim</Text>
                )}
              </TouchableOpacity>
            )}
          </View>

          {error && <Text style={globalStyles.errorText}>{error}</Text>}
          {success && <Text style={globalStyles.successText}>{success}</Text>}

          <TouchableOpacity 
            style={globalStyles.button} 
            onPress={updateProfile}
            disabled={updating}
          >
            {updating ? (
              <ActivityIndicator color="#272a32" />
            ) : (
              <Text style={globalStyles.darkButtonText}>Update Profile</Text>
            )}
          </TouchableOpacity>

          {/* Sign Out Button */}
          <TouchableOpacity 
            style={[globalStyles.button, { 
              backgroundColor: 'rgba(255, 82, 82, 0.8)', 
              marginTop: 20,
              marginBottom: 30
            }]} 
            onPress={handleSignOut}
          >
            <Text style={globalStyles.whiteButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
      </KeyboardAvoidingView>

      {/* Navigation Bar */}
      <View style={globalStyles.navBarWrapper}>
        <NavigationBar 
          activeTab="profile"
          onRewardsPress={() => navigation.navigate('Rewards')}
          onMapPress={() => navigation.navigate('Main')}
          onProfilePress={() => {}}
        />
      </View>
    </SafeAreaView>
  );
}
