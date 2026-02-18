import { useState, useEffect } from 'react';
import { LogOut, Menu, X, ArrowRight, Plus, Eye, EyeOff, Mail, Lock, User, CreditCard, Send, BarChart3, Home, Settings } from 'lucide-react';
import api, { authAPI, cardsAPI, paymentsAPI } from './services/api';

export default function App() {
  const [currentPage, setCurrentPage] = useState('login');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      setUser(JSON.parse(userData));
      setCurrentPage('dashboard');
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setCurrentPage('login');
  };

  if (currentPage === 'login' && !user) {
    return <PremiumLoginPage 
      onLogin={(email, password) => {
        setLoading(true);
        setError('');
        authAPI.login(email, password)
          .then(res => {
            localStorage.setItem('token', res.data.access_token);
            localStorage.setItem('user', JSON.stringify(res.data.user));
            setUser(res.data.user);
            setCurrentPage('dashboard');
          })
          .catch(err => setError(err.response?.data?.detail || 'Login failed'))
          .finally(() => setLoading(false));
      }}
      onSignup={(name, email, password) => {
        setLoading(true);
        setError('');
        authAPI.signup(name, email, password)
          .then(res => {
            localStorage.setItem('token', res.data.access_token);
            localStorage.setItem('user', JSON.stringify(res.data.user));
            setUser(res.data.user);
            setCurrentPage('dashboard');
          })
          .catch(err => setError(err.response?.data?.detail || 'Signup failed'))
          .finally(() => setLoading(false));
      }}
      loading={loading}
      error={error}
    />;
  }

  if (user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
        {/* Premium Header */}
        <header className="sticky top-0 z-40 bg-white/5 backdrop-blur-xl border-b border-white/10">
          <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold text-lg">
                PS
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">PaySplit</h1>
                <p className="text-xs text-purple-300">Smart Payments</p>
              </div>
            </div>

            {/* Desktop Nav */}
            <nav className="hidden md:flex gap-1">
              {[
                { id: 'dashboard', label: 'Dashboard', icon: Home },
                { id: 'cards', label: 'Cards', icon: CreditCard },
                { id: 'transactions', label: 'Transactions', icon: Send },
                { id: 'settlements', label: 'Settlements', icon: BarChart3 },
              ].map(item => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentPage(item.id)}
                    className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
                      currentPage === item.id
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-3 px-4 py-2 rounded-lg bg-white/5 border border-white/10">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-xs font-bold">
                  {user.name.charAt(0)}
                </div>
                <span className="text-sm text-gray-300">{user.name}</span>
              </div>

              <button
                onClick={handleLogout}
                className="p-2 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-6 py-12">
          {currentPage === 'dashboard' && <PremiumDashboard user={user} />}
          {currentPage === 'cards' && <PremiumCardsPage user={user} />}
          {currentPage === 'transactions' && <PremiumTransactionsPage user={user} />}
          {currentPage === 'settlements' && <PremiumSettlementsPage user={user} />}
        </main>
      </div>
    );
  }
}

// ===== PREMIUM LOGIN PAGE =====
function PremiumLoginPage({ onLogin, onSignup, loading, error }) {
  const [isSignup, setIsSignup] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isSignup) {
      onSignup(name, email, password);
    } else {
      onLogin(email, password);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center p-4">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl opacity-20 animate-pulse" style={{animationDelay: '1s'}}></div>
      </div>

      <div className="relative max-w-md w-full">
        {/* Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-2xl font-bold mb-4">
              PS
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">PaySplit</h1>
            <p className="text-gray-400">Smart payment splitting</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignup && (
              <div className="relative">
                <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-purple-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all"
                    placeholder="John Doe"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-purple-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-purple-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 py-3 px-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 group"
            >
              {loading ? 'Loading...' : (isSignup ? 'Create Account' : 'Sign In')}
              {!loading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
            </button>
          </form>

          {/* Toggle */}
          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsSignup(!isSignup);
                setError('');
              }}
              className="text-purple-400 hover:text-purple-300 font-medium transition-colors"
            >
              {isSignup ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </button>
          </div>
        </div>

        {/* Bottom text */}
        <p className="text-center text-gray-500 text-sm mt-6">
          Secure • Fast • Simple
        </p>
      </div>
    </div>
  );
}

// ===== PREMIUM DASHBOARD =====
function PremiumDashboard({ user }) {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cardsAPI.getCards()
      .then(res => setCards(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const totalBalance = cards.reduce((sum, card) => sum + (card.balance || 0), 0);

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-2xl p-8">
        <h2 className="text-3xl font-bold text-white mb-2">Welcome back, {user.name}! 👋</h2>
        <p className="text-purple-200">Here's your payment overview</p>
      </div>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Balance', value: `$${(totalBalance / 100).toFixed(2)}`, icon: '💰', gradient: 'from-purple-500 to-purple-600' },
          { label: 'Cards', value: cards.length, icon: '💳', gradient: 'from-pink-500 to-pink-600' },
          { label: 'Transactions', value: '12', icon: '📊', gradient: 'from-blue-500 to-blue-600' },
          { label: 'Savings', value: '$24.50', icon: '✨', gradient: 'from-green-500 to-green-600' },
        ].map((stat, i) => (
          <div key={i} className={`bg-gradient-to-br ${stat.gradient} rounded-xl p-6 border border-white/10`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-white/80 text-sm font-medium mb-2">{stat.label}</p>
                <p className="text-3xl font-bold text-white">{stat.value}</p>
              </div>
              <span className="text-3xl">{stat.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Cards Section */}
      <div>
        <h3 className="text-2xl font-bold text-white mb-6">Your Cards</h3>
        {loading ? (
          <div className="text-gray-400">Loading cards...</div>
        ) : cards.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cards.map((card, i) => (
              <div key={card.id} className="group cursor-pointer">
                <div className={`relative h-56 rounded-2xl bg-gradient-to-br ${
                  ['from-purple-500 to-pink-500', 'from-blue-500 to-cyan-500', 'from-green-500 to-emerald-500'][i % 3]
                } p-6 shadow-2xl border border-white/20 overflow-hidden`}>
                  {/* Card design */}
                  <div className="relative h-full flex flex-col justify-between text-white">
                    <div>
                      <p className="text-white/80 text-xs font-semibold uppercase tracking-wider">Debit Card</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold mb-4 tracking-widest">•••• {card.last4}</p>
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-white/70 text-xs mb-1">Card Holder</p>
                          <p className="font-semibold">{card.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-white/70 text-xs mb-1">Balance</p>
                          <p className="text-xl font-bold">${(card.balance / 100).toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Hover glow */}
                  <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-all rounded-2xl"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <CreditCard className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No cards added yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ===== PREMIUM CARDS PAGE =====
function PremiumCardsPage({ user }) {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newCard, setNewCard] = useState({ name: '', last4: '', balance: '' });
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchCards();
  }, []);

  const fetchCards = () => {
    cardsAPI.getCards()
      .then(res => setCards(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  const handleAddCard = (e) => {
    e.preventDefault();
    setAdding(true);
    cardsAPI.addCard({
      name: newCard.name,
      last4: newCard.last4,
      balance: parseInt(newCard.balance) * 100,
    })
      .then(() => {
        setNewCard({ name: '', last4: '', balance: '' });
        fetchCards();
      })
      .catch(err => console.error(err))
      .finally(() => setAdding(false));
  };

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold text-white">Manage Cards</h2>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Card List */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-xl font-bold text-white mb-6">Connected Cards</h3>
          {loading ? (
            <p className="text-gray-400">Loading...</p>
          ) : cards.length > 0 ? (
            cards.map((card, i) => (
              <div key={card.id} className="group bg-white/5 border border-white/10 rounded-xl p-6 hover:border-purple-500/30 hover:bg-white/10 transition-all cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${
                      ['from-purple-500 to-pink-500', 'from-blue-500 to-cyan-500', 'from-green-500 to-emerald-500'][i % 3]
                    } flex items-center justify-center text-white text-lg font-bold`}>
                      {card.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-white font-semibold">{card.name}</p>
                      <p className="text-gray-400 text-sm">•••• {card.last4}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-purple-300">${(card.balance / 100).toFixed(2)}</p>
                    <p className="text-gray-400 text-xs">Available balance</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-400">No cards yet. Add one below!</p>
          )}
        </div>

        {/* Add Card Form */}
        <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-xl p-8">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Plus className="w-5 h-5" /> Add Card
          </h3>

          <form onSubmit={handleAddCard} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Card Name</label>
              <input
                type="text"
                value={newCard.name}
                onChange={(e) => setNewCard({ ...newCard, name: e.target.value })}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-all"
                placeholder="My Visa"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Last 4 Digits</label>
              <input
                type="text"
                value={newCard.last4}
                onChange={(e) => setNewCard({ ...newCard, last4: e.target.value })}
                maxLength="4"
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-all"
                placeholder="2345"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Balance ($)</label>
              <input
                type="number"
                value={newCard.balance}
                onChange={(e) => setNewCard({ ...newCard, balance: e.target.value })}
                step="0.01"
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-all"
                placeholder="500.00"
              />
            </div>

            <button
              type="submit"
              disabled={adding}
              className="w-full mt-6 py-3 px-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold rounded-lg transition-all disabled:opacity-50"
            >
              {adding ? 'Adding...' : 'Add Card'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ===== PREMIUM TRANSACTIONS PAGE =====
function PremiumTransactionsPage({ user }) {
  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold text-white">Recent Transactions</h2>

      <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center">
        <Send className="w-12 h-12 text-gray-600 mx-auto mb-4" />
        <p className="text-gray-400">No transactions yet</p>
        <p className="text-gray-500 text-sm mt-2">Start splitting payments to see them here</p>
      </div>
    </div>
  );
}

// ===== PREMIUM SETTLEMENTS PAGE =====
function PremiumSettlementsPage({ user }) {
  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold text-white">Settlements</h2>

      <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center">
        <BarChart3 className="w-12 h-12 text-gray-600 mx-auto mb-4" />
        <p className="text-gray-400">No settlements yet</p>
        <p className="text-gray-500 text-sm mt-2">Add expenses to see settlement calculations</p>
      </div>
    </div>
  );
}