(function() {
  const USERS_KEY = 'ricciUsers';
  const SESSION_KEY = 'ricciSession';
  const PROFILE_KEY = 'ricciProfiles';

  const readJSON = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; }
    catch { return fallback; }
  };

  const writeJSON = (key, value) => localStorage.setItem(key, JSON.stringify(value));

  const loadUsers = () => readJSON(USERS_KEY, []);
  const saveUsers = (users) => writeJSON(USERS_KEY, users);

  const persistSession = (user) => {
    if (!user?.email) return null;
    const session = { id: user.id, email: user.email, name: user.name, provider: user.provider };
    writeJSON(SESSION_KEY, session);
    return session;
  };

  const findUser = (email) => {
    const users = loadUsers();
    return users.find(u => u.email.toLowerCase() === String(email).toLowerCase());
  };

  const registerUser = ({ name, email, password, provider = 'password' }) => {
    if (!email) throw new Error('Ingresa un correo válido.');
    const users = loadUsers();
    if (findUser(email)) throw new Error('Ya existe una cuenta con este correo.');
    const user = {
      id: `U-${Date.now()}`,
      name: name || 'Usuario Ricci',
      email,
      password: provider === 'password' ? password : null,
      provider,
      createdAt: new Date().toISOString()
    };
    users.push(user);
    saveUsers(users);
    persistSession(user);
    return user;
  };

  const loginUser = (email, password) => {
    const user = findUser(email);
    if (!user) throw new Error('No encontramos esa cuenta. Regístrate primero.');
    if (user.provider === 'password' && user.password !== password) {
      throw new Error('Contraseña incorrecta.');
    }
    return persistSession(user);
  };

  const googleLogin = () => {
    const users = loadUsers();
    const email = `google_${Date.now()}@gmail.com`;
    const user = { id: `G-${Date.now()}`, name: 'Usuario Google', email, provider: 'google', password: null, createdAt: new Date().toISOString() };
    users.push(user);
    saveUsers(users);
    return persistSession(user);
  };

  const logout = () => localStorage.removeItem(SESSION_KEY);
  const getSession = () => readJSON(SESSION_KEY, null);

  const loadProfiles = () => readJSON(PROFILE_KEY, {});
  const saveProfiles = (profiles) => writeJSON(PROFILE_KEY, profiles);

  const saveProfileForUser = (email, data) => {
    if (!email) return null;
    const profiles = loadProfiles();
    profiles[email] = { ...(profiles[email] || {}), ...data };
    saveProfiles(profiles);
    return profiles[email];
  };

  const getProfileForUser = (email) => {
    if (!email) return {};
    const profiles = loadProfiles();
    return profiles[email] || {};
  };

  window.RicciAuth = {
    registerUser,
    loginUser,
    googleLogin,
    logout,
    getSession,
    saveProfileForUser,
    getProfileForUser,
    loadUsers,
    loadProfiles,
    persistSession
  };
})();
