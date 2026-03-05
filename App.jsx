import { useState, useEffect } from 'react';

export default function App() {
  const [page, setPage] = useState('home');
  const [dbStatus, setDbStatus] = useState('checking...');
  const [products, setProducts] = useState([]);
  const [searchName, setSearchName] = useState('');

  // Auth State
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const isLoggedIn = !!currentUser || isAdmin;

  // Forms
  const [login, setLogin] = useState({ email: '', password: '' });
  const [loginMsg, setLoginMsg] = useState('');
  const [loginSuccess, setLoginSuccess] = useState(true);

  const [reg, setReg] = useState({ name: '', email: '', password: '' });
  const [regMsg, setRegMsg] = useState('');
  const [regSuccess, setRegSuccess] = useState(true);

  const [newProduct, setNewProduct] = useState({ name: '', category: '', price: '', stock: '' });
  const [prodMsg, setProdMsg] = useState('');

  // Analytics
  const [eventDiag, setEventDiag] = useState(null);

  const API_URL = 'http://localhost:3000';

  const checkDB = async () => {
    try {
      const res = await fetch(`${API_URL}/api/status`);
      if (res.ok) setDbStatus('online');
      else setDbStatus('offline');
    } catch {
      setDbStatus('offline');
    }
  };

  const loadProducts = async () => {
    try {
      const res = await fetch(`${API_URL}/products`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (err) {
      console.error("Error fetching products", err);
    }
  };

  const loadEventDiagnostics = async () => {
    try {
      const res = await fetch(`${API_URL}/api/system/events`);
      if (res.ok) {
        const data = await res.json();
        setEventDiag(data);
      }
    } catch (err) {
      console.error("Error loading diagnostics", err);
    }
  };

  useEffect(() => {
    checkDB();
    loadProducts();
    loadEventDiagnostics();
    const interval = setInterval(checkDB, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleRegister = async () => {
    if (!reg.name || !reg.email || !reg.password) {
      setRegSuccess(false);
      setRegMsg('Please fill in all details.');
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reg)
      });
      const data = await res.json();
      if (res.ok) {
        setRegSuccess(true);
        setRegMsg(data.message);
        setTimeout(() => {
          setPage('login');
          setRegMsg('');
          setReg({ name: '', email: '', password: '' });
        }, 2000);
      } else {
        setRegSuccess(false);
        setRegMsg(data.message || 'Registration failed');
      }
    } catch (err) {
      setRegSuccess(false);
      setRegMsg('Connection error.');
    }
  };

  const handleLogin = async () => {
    if (login.email === 'admin' && login.password === 'admin') {
      setLoginSuccess(true);
      setLoginMsg('Admin login successful ✅');
      setIsAdmin(true);
      setCurrentUser(null);
      setTimeout(() => {
        setPage('admin');
        setLoginMsg('');
        setLogin({ email: '', password: '' });
      }, 1500);
      return;
    }

    if (!login.email || !login.password) {
      setLoginSuccess(false);
      setLoginMsg('Email and Password are required.');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(login)
      });
      const data = await res.json();
      if (res.ok) {
        setLoginSuccess(true);
        setLoginMsg(data.message);
        setCurrentUser(data.user);
        setIsAdmin(false);
        setTimeout(() => {
          setPage('products');
          setLoginMsg('');
          setLogin({ email: '', password: '' });
        }, 1500);
      } else {
        setLoginSuccess(false);
        setLoginMsg(data.message || 'Invalid credentials ❌');
      }
    } catch (err) {
      setLoginSuccess(false);
      setLoginMsg('Login failed entirely.');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setIsAdmin(false);
    setPage('home');
    setLoginMsg('');
    setRegMsg('');
  };

  const handleAddProduct = async () => {
    if (newProduct.name && newProduct.category && newProduct.price && newProduct.stock) {
      try {
        const payload = { ...newProduct, rating: 4.0 };
        const res = await fetch(`${API_URL}/add-product`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          loadProducts();
          loadEventDiagnostics();
          setNewProduct({ name: '', category: '', price: '', stock: '' });
          setProdMsg('Product successfully synced with MySQL! ✅');
          setTimeout(() => setProdMsg(''), 3000);
        }
      } catch (err) {
        alert("Error adding product to DB");
      }
    } else {
      alert("Please fill all fields.");
    }
  };

  const handleDeleteProduct = async (id) => {
    if (confirm("Are you sure you want to permanently delete this product?")) {
      try {
        const res = await fetch(`${API_URL}/delete-product?id=${id}`, { method: 'DELETE' });
        if (res.ok) {
          loadProducts();
          loadEventDiagnostics();
        }
      } catch (err) {
        alert("Error deleting.");
      }
    }
  };

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchName.toLowerCase()));

  return (
    <>
      <nav style={{ background: 'rgba(0, 0, 0, 0.85)', boxShadow: '0 4px 6px rgba(0,0,0,0.5)', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <b style={{ fontSize: '26px' }}>SmartCart</b>
        </div>
        <div>
          <a onClick={() => setPage('home')} className={page === 'home' ? 'active' : ''}>Home</a>
          <a onClick={() => setPage('products')} className={page === 'products' ? 'active' : ''}>Products</a>
          {!isLoggedIn && <a onClick={() => setPage('login')} className={page === 'login' ? 'active' : ''}>Login</a>}
          {!isLoggedIn && <a onClick={() => setPage('register')} className={page === 'register' ? 'active' : ''}>Register</a>}
          {isAdmin && <a onClick={() => setPage('admin')} className={page === 'admin' ? 'active' : ''}>Admin Dashboard</a>}
          {isLoggedIn && <a onClick={handleLogout}>Logout ({currentUser ? currentUser.name : 'Admin'})</a>}
        </div>
      </nav>

      {page === 'home' && (
        <div className="glass">
          <h1 style={{ fontSize: '3.5em', marginBottom: '10px' }}>Welcome to SmartCart</h1>
          <p style={{ fontSize: '1.4em', opacity: 0.9 }}>Your smart grocery partner 🛒</p><br />
          <button onClick={() => setPage('products')} style={{ fontSize: '1.2em', padding: '15px 40px', borderRadius: '30px' }}>
            Browse Products
          </button>
        </div>
      )}

      {page === 'register' && (
        <div className="glass" style={{ maxWidth: '500px' }}>
          <h2>Create an Account</h2>
          <input type="text" placeholder="Full Name" value={reg.name} onChange={e => setReg({ ...reg, name: e.target.value })} style={{ width: '80%' }} /><br />
          <input type="text" placeholder="Email Address" value={reg.email} onChange={e => setReg({ ...reg, email: e.target.value })} style={{ width: '80%' }} /><br />
          <input type="password" placeholder="Password" value={reg.password} onChange={e => setReg({ ...reg, password: e.target.value })} style={{ width: '80%' }} /><br />
          <button onClick={handleRegister} style={{ width: '85%' }}>Register Account</button>

          {regMsg && (
            <div style={{
              padding: '10px', borderRadius: '5px', margin: '10px auto', fontWeight: 'bold', width: '80%',
              background: regSuccess ? 'rgba(40, 167, 69, 0.2)' : 'rgba(220, 53, 69, 0.2)',
              color: regSuccess ? '#4af174' : '#ff6b6b'
            }}>
              {regMsg}
            </div>
          )}
        </div>
      )}

      {page === 'login' && (
        <div className="glass" style={{ maxWidth: '500px' }}>
          <h2>Login to your Account</h2>
          <input type="text" placeholder="Email Address or Username" value={login.email} onChange={e => setLogin({ ...login, email: e.target.value })} style={{ width: '80%' }} /><br />
          <input type="password" placeholder="Password" value={login.password} onChange={e => setLogin({ ...login, password: e.target.value })} style={{ width: '80%' }} /><br />
          <button onClick={handleLogin} style={{ width: '85%' }}>Secure Login</button>

          {loginMsg && (
            <div style={{
              padding: '10px', borderRadius: '5px', margin: '10px auto', fontWeight: 'bold', width: '80%',
              background: loginSuccess ? 'rgba(40, 167, 69, 0.2)' : 'rgba(220, 53, 69, 0.2)',
              color: loginSuccess ? '#4af174' : '#ff6b6b'
            }}>
              {loginMsg}
            </div>
          )}
        </div>
      )}

      {page === 'products' && (
        <div className="glass" style={{ width: '90%' }}>
          <h1 style={{ marginTop: 0 }}>Products Inventory</h1>

          <div style={{ background: 'rgba(255,255,255,0.08)', padding: '20px', borderRadius: '12px', marginBottom: '30px', border: '1px solid rgba(255,255,255,0.15)' }}>
            <h3 style={{ marginTop: 0 }}>Add New Product to Database</h3>
            <input type="text" placeholder="Name" value={newProduct.name} onChange={e => setNewProduct({ ...newProduct, name: e.target.value })} />
            <input type="text" placeholder="Category" value={newProduct.category} onChange={e => setNewProduct({ ...newProduct, category: e.target.value })} />
            <input type="number" placeholder="Price (₹)" value={newProduct.price} onChange={e => setNewProduct({ ...newProduct, price: e.target.value })} style={{ width: '120px' }} />
            <input type="number" placeholder="Stock Qty" value={newProduct.stock} onChange={e => setNewProduct({ ...newProduct, stock: e.target.value })} style={{ width: '120px' }} />
            <button onClick={handleAddProduct}>➕ Add to DB</button>
            {prodMsg && <div style={{ background: 'rgba(40, 167, 69, 0.2)', color: '#4af174', padding: '8px 15px', borderRadius: '5px', margin: '15px auto 0', maxWidth: '300px' }}>{prodMsg}</div>}
          </div>

          <input type="text" placeholder="🔍 Search products by name..." value={searchName} onChange={e => setSearchName(e.target.value)}
            style={{ width: '50%', maxWidth: '400px', borderRadius: '30px', padding: '12px 20px', marginBottom: '20px' }} />

          <table>
            <thead>
              <tr>
                <th>ID</th><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(p => (
                <tr key={p.id}>
                  <td>#{p.id}</td>
                  <td><b>{p.name.toUpperCase()}</b></td>
                  <td>{p.category}</td>
                  <td><span style={{ color: '#1f7a3a', fontWeight: 'bold', fontSize: '1.1em' }}>₹{p.price}</span></td>
                  <td>
                    {p.stock > 10 && <span style={{ color: '#1f7a3a', fontWeight: 'bold' }}>{p.stock} in stock</span>}
                    {p.stock <= 10 && p.stock > 0 && <span style={{ color: '#cf8119', fontWeight: 'bold' }}>Only {p.stock} left!</span>}
                    {p.stock <= 0 && <span style={{ color: '#dc3545', fontWeight: 'bold' }}>Out of stock</span>}
                  </td>
                  <td>
                    <button style={{ background: '#dc3545', margin: 0, padding: '8px 15px', fontSize: '14px' }} onClick={() => handleDeleteProduct(p.id)}>🗑️ Delete</button>
                  </td>
                </tr>
              ))}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#ccc' }}>No products found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {page === 'admin' && eventDiag && (
        <div className="glass" style={{ width: '90%' }}>
          <h1>Admin Dashboard</h1>
          <h2>⚡ Live System Analytics (EventEmitter)</h2>
          <p style={{ opacity: 0.8 }}>Background tasks like logging and alerts are decoupled via Node.js <code>EventEmitter</code>.</p>

          <div style={{ textAlign: 'left', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            {['productAdded', 'productDeleted'].map(evt => {
              const info = eventDiag.events[evt];
              const isAdd = evt === 'productAdded';
              return (
                <div key={evt} className="event-box" style={{ background: isAdd ? 'rgba(0,200,100,0.15)' : 'rgba(220,50,50,0.15)', border: `1px solid ${isAdd ? 'rgba(0,200,100,0.4)' : 'rgba(220,50,50,0.4)'}` }}>
                  <h3>{isAdd ? '📣' : '🗑️'} Event: <code>{evt}</code></h3>
                  <p><b>Inspect Listeners:</b> <span style={{ background: isAdd ? '#1f7a3a' : '#7a1f1f', padding: '3px 10px', borderRadius: '20px', marginLeft: '8px' }}>{info.listenerCount} active</span></p>
                  {info.listeners.map(l => (
                    <div key={l.index} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '10px', marginBottom: '8px' }}>
                      <span style={{ color: isAdd ? '#7ef9a0' : '#f97e7e' }}>[{l.index}] {l.name}</span><br />
                      <span style={{ color: '#ccc', fontSize: '12px' }}>{l.source}</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
