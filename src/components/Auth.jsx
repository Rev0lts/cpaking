import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Lock, Mail, AlertCircle, ArrowRight, UserPlus, LogIn } from 'lucide-react';

const Auth = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const handleAuth = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');

        if (!isLogin && password !== confirmPassword) {
            setError('As senhas não coincidem.');
            setLoading(false);
            return;
        }

        try {
            if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
            } else {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (error) throw error;
                setMessage('Verifique seu e-mail para confirmar o cadastro!');
            }
        } catch (err) {
            setError(err.message || 'Ocorreu um erro durante a autenticação.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-page__orb auth-page__orb--1" />
            <div className="auth-page__orb auth-page__orb--2" />
            <div className="auth-page__orb auth-page__orb--3" />

            <div className="glass-card auth-page__card animate-fade-in">
                <div style={{
                    width: '72px',
                    height: '72px',
                    borderRadius: '18px',
                    background: 'var(--gradient-brand)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '24px',
                    color: 'var(--primary-fg)',
                    boxShadow: '0 8px 28px rgba(var(--primary-rgb), 0.4)',
                }}>
                    <Lock size={34} />
                </div>

                <h1 className="display-font gradient-text" style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '8px', textAlign: 'center' }}>
                    {isLogin ? 'Bem-vindo de volta' : 'Criar Conta'}
                </h1>
                <p style={{ color: 'var(--text-muted)', marginBottom: '32px', textAlign: 'center' }}>
                    {isLogin ? 'Faça login para gerenciar suas operações.' : 'Registre-se para começar a usar o CPAKing'}
                </p>

                {error && (
                    <div style={{
                        width: '100%',
                        padding: '16px',
                        borderRadius: '12px',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        color: '#ef4444',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '24px',
                        fontSize: '0.875rem'
                    }}>
                        <AlertCircle size={18} />
                        <span>{error}</span>
                    </div>
                )}

                {message && (
                    <div style={{
                        width: '100%',
                        padding: '16px',
                        borderRadius: '12px',
                        backgroundColor: 'rgba(var(--primary-rgb), 0.1)',
                        border: '1px solid rgba(var(--primary-rgb), 0.2)',
                        color: 'var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '24px',
                        fontSize: '0.875rem'
                    }}>
                        <AlertCircle size={18} />
                        <span>{message}</span>
                    </div>
                )}

                <form onSubmit={handleAuth} style={{ width: '100%' }}>
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>E-mail</label>
                        <div style={{ position: 'relative' }}>
                            <Mail size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="seu@email.com"
                                className="input-focus"
                                style={{
                                    width: '100%',
                                    padding: '14px 16px 14px 48px',
                                    borderRadius: '12px',
                                    border: '1px solid var(--card-border)',
                                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                                    color: 'var(--text-main)',
                                    fontSize: '1rem',
                                    outline: 'none',
                                    transition: 'var(--transition)'
                                }}
                            />
                        </div>
                    </div>

                    <div style={{ marginBottom: isLogin ? '32px' : '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Senha</label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="input-focus"
                                style={{
                                    width: '100%',
                                    padding: '14px 16px 14px 48px',
                                    borderRadius: '12px',
                                    border: '1px solid var(--card-border)',
                                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                                    color: 'var(--text-main)',
                                    fontSize: '1rem',
                                    outline: 'none',
                                    transition: 'var(--transition)'
                                }}
                            />
                        </div>
                    </div>

                    {!isLogin && (
                        <div style={{ marginBottom: '32px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Confirmar Senha</label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input
                                    type="password"
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="input-focus"
                                    style={{
                                        width: '100%',
                                        padding: '14px 16px 14px 48px',
                                        borderRadius: '12px',
                                        border: '1px solid var(--card-border)',
                                        backgroundColor: 'rgba(255, 255, 255, 0.02)',
                                        color: 'var(--text-main)',
                                        fontSize: '1rem',
                                        outline: 'none',
                                        transition: 'var(--transition)'
                                    }}
                                />
                            </div>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary"
                        style={{
                            width: '100%',
                            padding: '16px',
                            borderRadius: '12px',
                            fontSize: '1rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                        }}
                    >
                        {loading ? 'Processando...' : (
                            <>
                                {isLogin ? 'Entrar no Dashboard' : 'Criar Conta'}
                                <ArrowRight size={20} />
                            </>
                        )}
                    </button>
                </form>

                <div style={{ marginTop: '32px', textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                        {isLogin ? 'Ainda n\u00e3o tem uma conta?' : 'J\u00e1 tem uma conta?'}
                        <button
                            onClick={() => { setIsLogin(!isLogin); setError(''); setMessage(''); }}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--primary)',
                                fontWeight: 600,
                                marginLeft: '8px',
                                cursor: 'pointer',
                                padding: 0,
                                textDecoration: 'underline'
                            }}
                        >
                            {isLogin ? 'Registre-se' : 'Faça Login'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Auth;
