/**
 * FinMitra Auth API (Java Spring Boot REST Connector)
 * Replaces Supabase Auth with Enterprise JWT Authentication.
 */

export const signupUser = async (name, email, password) => {
  const res = await fetch('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password
    })
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || data.error || 'Signup failed');
  }
  return data;
};

export const loginUser = async (email, password) => {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      password
    })
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || data.error || 'Invalid email or password');
  }
  return data;
};

export const getStoredToken = () => {
  return localStorage.getItem('finmitra_token') || null;
};

export const getStoredUser = () => {
  try {
    const raw = localStorage.getItem('finmitra_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};
