import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import {
    Check,
    ArrowRight,
    CircleDot,
    X
} from 'lucide-react';
import { notify } from '../lib/notify';

const Subscription = ({ onPlanActivated }) => {
    const [loading, setLoading] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState(null);

    const plans = [
        {
            id: 'annual',
            name: 'Anual',
            price: '129,90',
            period: '/ano',
            monthlyEquiv: '10,82',
            featured: true,
            badge: 'MAIS ECONÔMICO',
            features: [
                { text: 'Tudo do Trimestral' },
                { text: 'Economia de 46%' },
                { text: 'Plataformas Ilimitadas' },
                { text: 'Tags Personalizadas' },
                { text: 'Suporte Prioritário' }
            ]
        },
        {
            id: 'quarterly',
            name: 'Trimestral',
            price: '49,90',
            period: '/trimestre',
            monthlyEquiv: '16,63',
            features: [
                { text: 'Tudo do Mensal' },
                { text: 'Plataformas Ilimitadas' },
                { text: 'Tags Personalizadas' },
                { text: 'Suporte Prioritário' }
            ],
            badge: 'MAIS POPULAR'
        },
        {
            id: 'monthly',
            name: 'Mensal',
            price: '19,90',
            period: '/mês',
            features: [
                { text: 'Dashboard Completo' },
                { text: 'Gestão de Plataformas' },
                { text: 'Chaves PIX Ilimitadas' },
                { text: 'Limite de 15 Plataformas' },
                { text: 'Sem Suporte Prioritário', negative: true },
                { text: 'Sem Tags Personalizadas', negative: true }
            ]
        }
    ];

    const handleSubscribe = async (planId) => {
        try {
            setLoading(true);
            setSelectedPlan(planId);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                notify("Sessão expirada. Faça login novamente.", "error");
                return;
            }

            const { data, error } = await supabase.functions.invoke('mercadopago-checkout', {
                body: {
                    planId: planId,
                    userId: user.id,
                    userEmail: user.email
                }
            });

            if (error) throw error;
            if (data?.error) throw new Error(data.error);

            if (data?.url) {
                window.location.href = data.url;
            } else {
                throw new Error("URL de checkout não recebida do servidor.");
            }
        } catch (err) {
            console.error("Erro detalhado ao iniciar checkout:", err);
            const errorMsg = err.message || "Erro interno no servidor de pagamento.";
            notify(`Erro: ${errorMsg}`, "error");
            setSelectedPlan(null);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '40px 20px', maxWidth: '1100px', margin: '0 auto', color: 'var(--text-main)', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '8px', letterSpacing: '-0.02em', marginTop: 0 }}>
                    Escolha o seu <span style={{ color: 'var(--primary)' }}>Plano</span>
                </h1>
                <p style={{ fontSize: '1rem', color: 'var(--text-muted)', maxWidth: '500px', margin: '0 auto' }}>
                    Libere todo o potencial do CPAKing e automatize sua gestão.
                </p>
            </div>

            {/* Plans Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '40px' }}>
                {plans.map((plan) => (
                    <div
                        key={plan.id}
                        onClick={() => setSelectedPlan(plan.id)}
                        style={{
                            padding: '32px 28px',
                            minHeight: '420px',
                            borderRadius: '20px',
                            backgroundColor: (selectedPlan === plan.id || (plan.featured && !selectedPlan)) ? 'rgba(var(--primary-rgb), 0.05)' : 'rgba(255, 255, 255, 0.02)',
                            border: `2px solid ${(selectedPlan === plan.id) ? 'var(--primary)' : (plan.featured ? 'rgba(var(--primary-rgb), 0.3)' : 'var(--card-border)')}`,
                            position: 'relative',
                            cursor: 'pointer',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            transform: selectedPlan === plan.id ? 'translateY(-4px)' : 'none',
                            boxShadow: plan.featured && !selectedPlan ? '0 0 20px rgba(var(--primary-rgb), 0.05)' : (selectedPlan === plan.id ? '0 10px 30px rgba(var(--primary-rgb), 0.05)' : 'none'),
                            opacity: loading && selectedPlan !== plan.id ? 0.5 : 1,
                            display: 'flex',
                            flexDirection: 'column'
                        }}
                    >
                        {plan.badge && (
                            <div style={{
                                position: 'absolute',
                                top: '-10px',
                                right: '20px',
                                backgroundColor: 'var(--primary)',
                                color: 'var(--primary-fg)',
                                padding: '4px 12px',
                                borderRadius: '100px',
                                fontSize: '0.65rem',
                                fontWeight: 800,
                                letterSpacing: '0.05em',
                                zIndex: 1
                            }}>
                                {plan.badge}
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>{plan.name}</h3>
                            {loading && selectedPlan === plan.id ? (
                                <div style={{ width: '20px', height: '20px', border: '2px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                            ) : (
                                <CircleDot size={20} color={(selectedPlan === plan.id || (plan.featured && !selectedPlan)) ? "var(--primary)" : "var(--text-muted)"} />
                            )}
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'baseline' }}>
                                <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-muted)', marginRight: '4px' }}>R$</span>
                                <span style={{ fontSize: '2.5rem', fontWeight: 800 }}>{plan.price}</span>
                                <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{plan.period}</span>
                            </div>
                            {plan.monthlyEquiv && (
                                <div style={{ fontSize: '0.8rem', color: 'var(--primary)', marginTop: '4px', fontWeight: 600 }}>
                                    ≈ R$ {plan.monthlyEquiv}/mês
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '8px' }}>
                            {plan.features.map((feature, i) => {
                                const isNegative = typeof feature === 'object' && feature.negative;
                                const featureText = typeof feature === 'object' ? feature.text : feature;
                                return (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ backgroundColor: isNegative ? 'rgba(239, 68, 68, 0.1)' : 'rgba(var(--primary-rgb), 0.1)', borderRadius: '50%', padding: '3px', display: 'flex' }}>
                                            {isNegative ? (
                                                <X size={12} color="#ef4444" strokeWidth={3} />
                                            ) : (
                                                <Check size={12} color="var(--primary)" strokeWidth={3} />
                                            )}
                                        </div>
                                        <span style={{ fontSize: '0.8125rem', color: isNegative ? 'rgba(239, 68, 68, 0.7)' : 'var(--text-muted)' }}>{featureText}</span>
                                    </div>
                                );
                            })}
                        </div>

                        <div
                            onClick={(e) => {
                                e.stopPropagation();
                                if (!loading) handleSubscribe(plan.id);
                            }}
                            style={{
                                marginTop: 'auto',
                                padding: '12px',
                                borderRadius: '100px',
                                backgroundColor: plan.id === 'annual' ? 'var(--primary)' : 'transparent',
                                color: plan.id === 'annual' ? 'var(--primary-fg)' : '#fff',
                                border: plan.id === 'annual' ? 'none' : '1px solid rgba(255,255,255,0.2)',
                                textAlign: 'center',
                                fontWeight: 800,
                                fontSize: '0.875rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s',
                                opacity: loading && selectedPlan === plan.id ? 0.8 : 1,
                                animation: 'fade-in 0.3s ease'
                            }}
                        >
                            {loading && selectedPlan === plan.id ? 'Processando...' : 'Assinar Agora'}
                            {!loading && <ArrowRight size={16} />}
                        </div>
                    </div>
                ))}
            </div>

            <style>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default Subscription;
