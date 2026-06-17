import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import {
    Copy,
    Trash2,
    Plus,
    Search,
    CheckCircle2,
    X,
    Smartphone,
    Mail,
    Fingerprint,
    User,
    Building2,
    ChevronDown,
    ArrowUpRight
} from 'lucide-react';

let cachedChavePixData = null;

const ChavePix = ({ impersonatedUser }) => {
    const [keys, setKeys] = useState(cachedChavePixData || []);

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [keyToDelete, setKeyToDelete] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newKey, setNewKey] = useState({ type: 'CPF', value: '', bank: '' });
    const [error, setError] = useState('');
    const [copiedId, setCopiedId] = useState(null);
    const [banks, setBanks] = useState([]);
    const [isBankDropdownOpen, setIsBankDropdownOpen] = useState(false);
    const [bankSearch, setBankSearch] = useState('');

    const bankDropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (bankDropdownRef.current && !bankDropdownRef.current.contains(event.target)) {
                setIsBankDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Fetch keys on component mount
    useEffect(() => {
        fetchKeys();
        fetchBanks();
    }, []);

    const fetchBanks = async () => {
        try {
            const { data, error } = await supabase
                .from('banks')
                .select('*')
                .order('name');
            if (error) throw error;
            setBanks(data);
        } catch (err) {
            console.error("Erro ao buscar bancos:", err);
        }
    };

    const fetchKeys = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const targetUserId = impersonatedUser ? impersonatedUser.id : user.id;

            const { data, error } = await supabase
                .from('pix_keys')
                .select('*, banks(*)')
                .eq('user_id', targetUserId);
            if (error) {
                if (error.code === 'PGRST200') {
                    console.warn("Relacionamento banks não resolvido. Buscando sem join.");
                    const res = await supabase.from('pix_keys').select('*').eq('user_id', targetUserId);

                    const sortedFallback = (res.data || []).sort((a, b) => {
                        if (a.active === b.active) {
                            return new Date(b.created_at) - new Date(a.created_at);
                        }
                        return a.active ? -1 : 1;
                    });

                    setKeys(sortedFallback);
                    return;
                }
                throw error;
            }

            const sortedData = data.sort((a, b) => {
                if (a.active === b.active) {
                    return new Date(b.created_at) - new Date(a.created_at);
                }
                return a.active ? -1 : 1;
            });

            cachedChavePixData = sortedData;
            setKeys(sortedData);
        } catch (err) {
            console.error("Erro ao buscar chaves:", err);
            setError("Erro ao carregar as chaves Pix.");
        }
    };

    const maskCPF = (value) => {
        return value
            .replace(/\D/g, '')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d{1,2})/, '$1-$2')
            .replace(/(-\d{2})\d+?$/, '$1');
    };

    const maskCNPJ = (value) => {
        return value
            .replace(/\D/g, '')
            .replace(/(\d{2})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1/$2')
            .replace(/(\d{4})(\d{1,2})/, '$1-$2')
            .replace(/(-\d{2})\d+?$/, '$1');
    };

    const maskTelefone = (value) => {
        return value
            .replace(/\D/g, '')
            .replace(/(\d{2})(\d)/, '($1) $2')
            .replace(/(\d{5})(\d)/, '$1-$2')
            .replace(/(-\d{4})\d+?$/, '$1');
    };

    const validateKey = (type, value) => {
        if (!value) return "A chave não pode estar vazia.";

        switch (type) {
            case 'CPF': {
                const cleanCPF = value.replace(/\D/g, '');
                if (cleanCPF.length !== 11) return "CPF deve conter 11 dígitos.";
                return "";
            }
            case 'CNPJ': {
                const cleanCNPJ = value.replace(/\D/g, '');
                if (cleanCNPJ.length !== 14) return "CNPJ deve conter 14 dígitos.";
                return "";
            }
            case 'Email': {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(value)) return "Formato de e-mail inválido.";
                return "";
            }
            case 'Telefone': {
                const cleanPhone = value.replace(/\D/g, '');
                if (cleanPhone.length < 10 || cleanPhone.length > 11) return "Telefone deve conter DDD + 8 ou 9 dígitos.";
                return "";
            }
            case 'EVP': {
                const evpRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                if (!evpRegex.test(value)) return "Chave Aleatória (EVP) inválida.";
                return "";
            }
            default:
                return "";
        }
    };

    const keyTypes = [
        { label: 'CPF', icon: <User size={16} /> },
        { label: 'CNPJ', icon: <Building2 size={16} /> },
        { label: 'EVP', icon: <Fingerprint size={16} /> },
        { label: 'Email', icon: <Mail size={16} /> },
        { label: 'Telefone', icon: <Smartphone size={16} /> },
    ];



    const handleCopy = (text, id, type) => {
        let textToCopy = text;
        if (['CPF', 'CNPJ', 'Telefone'].includes(type)) {
            textToCopy = text.replace(/\D/g, '');
        }
        navigator.clipboard.writeText(textToCopy);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const togglePixKeyStatus = async (key) => {
        try {
            const newStatus = !key.active;
            const { error: updateError } = await supabase
                .from('pix_keys')
                .update({ active: newStatus })
                .eq('id', key.id);

            if (updateError) throw updateError;

            const updatedKeys = keys.map(k =>
                k.id === key.id ? { ...k, active: newStatus } : k
            );

            // Re-sort array
            const sortedKeys = updatedKeys.sort((a, b) => {
                if (a.active === b.active) {
                    return new Date(b.created_at) - new Date(a.created_at);
                }
                return a.active ? -1 : 1;
            });

            setKeys(sortedKeys);
            cachedChavePixData = sortedKeys;
        } catch (err) {
            console.error("Erro ao alterar status da chave Pix:", err);
            setError("Erro ao alterar status da chave Pix.");
        }
    };

    const handleDelete = async () => {
        if (!keyToDelete) return;

        console.log("Iniciando exclusão da chave Pix:", keyToDelete.id);
        setIsDeleteModalOpen(false); // Close modal first

        try {
            // Check if key is linked to any accounts
            const { data: linkedAccounts, error: checkError } = await supabase
                .from('accounts')
                .select('id')
                .eq('pix_key_id', keyToDelete.id)
                .limit(1);

            if (checkError) throw checkError;

            if (linkedAccounts && linkedAccounts.length > 0) {
                setError("Esta chave não pode ser excluída pois está sendo usada por uma ou mais contas, você pode deixar ela inativa!");
                setKeyToDelete(null);
                return;
            }

            const { error: deleteError } = await supabase
                .from('pix_keys')
                .delete()
                .eq('id', keyToDelete.id);

            if (deleteError) {
                console.error("Erro do Supabase ao excluir chave Pix:", deleteError);
                throw deleteError;
            }

            console.log("Chave Pix excluída com sucesso.");
            const updatedKeys = keys.filter(k => k.id !== keyToDelete.id);
            setKeys(updatedKeys);
            cachedChavePixData = updatedKeys;
            setKeyToDelete(null);
            setError(""); // Limpa erros anteriores em caso de sucesso
        } catch (err) {
            console.error("Erro na função handleDelete (ChavePix):", err);
            setError("Erro ao excluir chave Pix: " + (err.message || "Erro desconhecido"));
            setKeyToDelete(null);
        }
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        const validationError = validateKey(newKey.type, newKey.value);
        if (validationError) {
            setError(validationError);
            return;
        }

        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = now.getFullYear();
        const formattedDate = `${day}/${month}/${year}`;

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setError("Usuário não autenticado.");
                return;
            }

            const targetUserId = impersonatedUser ? impersonatedUser.id : user.id;

            const { data, error: insertError } = await supabase
                .from('pix_keys')
                .insert([{
                    user_id: targetUserId,
                    type: newKey.type,
                    value: newKey.value,
                    bank_id: newKey.bank || null,
                    created: formattedDate
                }])
                .select('*, banks(*)');

            if (insertError) throw insertError;

            const updatedKeys = [data[0], ...keys];
            setKeys(updatedKeys);
            cachedChavePixData = updatedKeys;
            setNewKey({ type: 'CPF', value: '', bank: '' });
            setError('');
            setIsModalOpen(false);
        } catch (err) {
            console.error("Erro ao adicionar chave:", err);
            setError("Erro ao salvar chave Pix.");
        }
    };

    const handleTypeChange = (type) => {
        setNewKey({ ...newKey, type });
        if (newKey.value) {
            setError(validateKey(type, newKey.value));
        }
    };

    const handleValueChange = (value) => {
        let maskedValue = value;
        if (newKey.type === 'CPF') maskedValue = maskCPF(value);
        else if (newKey.type === 'CNPJ') maskedValue = maskCNPJ(value);
        else if (newKey.type === 'Telefone') maskedValue = maskTelefone(value);

        setNewKey({ ...newKey, value: maskedValue });
        if (error) setError(''); // Limpa erro ao digitar
    };

    return (
        <div className="page-content animate-fade-in">
            <header className="page-header page-header--row">
                <div>
                    <h1>Chaves Pix</h1>
                    <p>Gerencie suas chaves para recebimentos</p>
                </div>
                <button
                    onClick={() => {
                        setIsModalOpen(true);
                        setError('');
                        setNewKey({ type: 'CPF', value: '' });
                    }}
                    className="btn-primary"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '12px 24px',
                        borderRadius: '12px',
                        border: 'none',
                        backgroundColor: 'var(--primary)',
                                color: 'var(--primary-fg)',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'var(--transition)'
                    }}
                >
                    <Plus size={20} />
                    Adicionar Chave
                </button>
            </header>

            <div className="glass-card animate-fade-in table-scroll" style={{ padding: '0' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid var(--card-border)' }}>
                            <th style={{ textAlign: 'left', padding: '16px 24px', color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.875rem' }}>Tipo</th>
                            <th style={{ textAlign: 'left', padding: '16px 24px', color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.875rem' }}>Banco</th>
                            <th style={{ textAlign: 'left', padding: '16px 24px', color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.875rem' }}>Chave</th>
                            <th style={{ textAlign: 'left', padding: '16px 24px', color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.875rem' }}>Status</th>
                            <th style={{ textAlign: 'right', padding: '16px 24px', color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.875rem' }}>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {keys.map((key) => (
                            <tr key={key.id} style={{ borderBottom: '1px solid var(--card-border)', transition: 'var(--transition)' }} className="table-row">
                                <td style={{ padding: '16px 24px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '8px',
                                            backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: 'var(--primary)'
                                        }}>
                                            {keyTypes.find(t => t.label === key.type)?.icon}
                                        </div>
                                        <span style={{ fontWeight: 500 }}>{key.type}</span>
                                    </div>
                                </td>
                                <td style={{ padding: '16px 24px', color: 'var(--text-main)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {key.banks?.logo_url && <img src={key.banks.logo_url} alt="Logo" style={{ width: 24, height: 24, borderRadius: '6px' }} />}
                                        <span style={{ fontWeight: 500 }}>{key.banks?.name || '-'}</span>
                                    </div>
                                </td>
                                <td style={{ padding: '16px 24px', minWidth: '200px' }}>
                                    <div
                                        onClick={() => handleCopy(key.value, key.id, key.type)}
                                        style={{
                                            position: 'relative',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            fontWeight: 500,
                                            color: copiedId === key.id ? 'var(--primary)' : 'var(--text-main)',
                                            cursor: 'pointer',
                                            userSelect: 'none',
                                            padding: '4px 8px',
                                            marginLeft: '-8px',
                                            borderRadius: '6px',
                                            transition: 'all 0.2s'
                                        }}
                                        title="Clique para copiar"
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                        <span style={{ opacity: copiedId === key.id ? 0 : 1 }}>
                                            {key.value}
                                        </span>
                                        {copiedId === key.id && (
                                            <div style={{ position: 'absolute', display: 'flex', alignItems: 'center', gap: '8px', left: '8px' }}>
                                                <CheckCircle2 size={14} />
                                                <span>Copiado!</span>
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td style={{ padding: '16px 24px' }}>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            togglePixKeyStatus(key);
                                        }}
                                        style={{
                                            padding: '6px 12px',
                                            borderRadius: '20px',
                                            backgroundColor: key.active ? 'rgba(var(--primary-rgb), 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                            color: key.active ? 'var(--primary)' : '#ef4444',
                                            border: 'none',
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '4px',
                                            width: '84px',
                                            cursor: 'pointer',
                                            transition: 'all 0.3s ease',
                                            transform: 'scale(1)',
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.transform = 'scale(1.05)';
                                            e.currentTarget.style.boxShadow = key.active ? '0 0 8px rgba(var(--primary-rgb), 0.3)' : '0 0 8px rgba(239, 68, 68, 0.3)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.transform = 'scale(1)';
                                            e.currentTarget.style.boxShadow = 'none';
                                        }}
                                    >
                                        {key.active ? <ArrowUpRight size={14} /> : <X size={14} />}
                                        {key.active ? 'Ativo' : 'Inativo'}
                                    </button>
                                </td>
                                <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                        <button
                                            onClick={() => handleCopy(key.value, key.id, key.type)}
                                            style={{
                                                padding: '8px',
                                                borderRadius: '8px',
                                                border: 'none',
                                                backgroundColor: copiedId === key.id ? 'rgba(var(--primary-rgb), 0.1)' : 'rgba(255, 255, 255, 0.03)',
                                                color: copiedId === key.id ? 'var(--primary)' : 'var(--text-muted)',
                                                cursor: 'pointer',
                                                transition: 'var(--transition)'
                                            }}
                                            title="Copiar Chave"
                                        >
                                            {copiedId === key.id ? <CheckCircle2 size={18} /> : <Copy size={18} />}
                                        </button>
                                        <button
                                            onClick={() => {
                                                setKeyToDelete(key);
                                                setIsDeleteModalOpen(true);
                                            }}
                                            style={{
                                                padding: '8px',
                                                borderRadius: '8px',
                                                border: 'none',
                                                backgroundColor: 'rgba(239, 68, 68, 0.05)',
                                                color: '#ef4444',
                                                cursor: 'pointer',
                                                transition: 'var(--transition)'
                                            }}
                                            title="Excluir Chave"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {keys.length === 0 && (
                    <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <p>Nenhuma chave Pix cadastrada.</p>
                    </div>
                )}
            </div>

            {isModalOpen && (
                <div className="app-overlay">
                    <div className="glass-card app-overlay__panel" style={{
                        position: 'relative',
                        backgroundColor: '#111114',
                    }}>
                        <button
                            onClick={() => setIsModalOpen(false)}
                            style={{
                                position: 'absolute',
                                top: '24px',
                                right: '24px',
                                background: 'none',
                                border: 'none',
                                color: 'var(--text-muted)',
                                cursor: 'pointer'
                            }}
                        >
                            <X size={24} />
                        </button>

                        <h2 style={{ marginBottom: '8px' }}>Nova Chave Pix</h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>Preencha os dados para cadastrar uma nova chave</p>

                        <form onSubmit={handleAdd}>
                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Tipo de Chave</label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                                    {keyTypes.map((t) => (
                                        <button
                                            key={t.label}
                                            type="button"
                                            onClick={() => handleTypeChange(t.label)}
                                            style={{
                                                padding: '10px',
                                                borderRadius: '8px',
                                                border: '1px solid',
                                                borderColor: newKey.type === t.label ? 'var(--primary)' : 'var(--card-border)',
                                                backgroundColor: newKey.type === t.label ? 'rgba(var(--primary-rgb), 0.1)' : 'rgba(255, 255, 255, 0.02)',
                                                color: newKey.type === t.label ? 'var(--primary)' : 'var(--text-muted)',
                                                cursor: 'pointer',
                                                fontSize: '0.875rem',
                                                transition: 'var(--transition)'
                                            }}
                                        >
                                            {t.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div style={{ position: 'relative', marginBottom: '24px' }} ref={bankDropdownRef}>
                                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Banco (Opcional)</label>
                                <div
                                    onClick={() => setIsBankDropdownOpen(!isBankDropdownOpen)}
                                    className="input-focus"
                                    style={{
                                        width: '100%',
                                        padding: '12px 16px',
                                        borderRadius: '12px',
                                        border: '1px solid var(--card-border)',
                                        backgroundColor: 'rgba(255, 255, 255, 0.02)',
                                        color: newKey.bank ? 'var(--text-main)' : 'var(--text-muted)',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        transition: 'var(--transition)'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {newKey.bank ? (
                                            <>
                                                {banks.find(b => b.id === newKey.bank)?.logo_url && (
                                                    <img src={banks.find(b => b.id === newKey.bank).logo_url} alt="Logo" style={{ width: 20, height: 20, borderRadius: '6px' }} />
                                                )}
                                                <span>{banks.find(b => b.id === newKey.bank)?.name}</span>
                                            </>
                                        ) : (
                                            <span>Selecione um banco...</span>
                                        )}
                                    </div>
                                    <ChevronDown size={18} style={{ transform: isBankDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'var(--transition)' }} />
                                </div>

                                {isBankDropdownOpen && (
                                    <div style={{
                                        position: 'absolute',
                                        top: 'calc(100% + 8px)',
                                        left: 0,
                                        right: 0,
                                        backgroundColor: '#1a1a1e',
                                        border: '1px solid var(--card-border)',
                                        borderRadius: '12px',
                                        zIndex: 1100,
                                        boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                                        overflow: 'hidden',
                                        animation: 'fade-in 0.2s ease'
                                    }}>
                                        <div style={{ padding: '8px', borderBottom: '1px solid var(--card-border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Search size={14} style={{ color: 'var(--text-muted)' }} />
                                            <input
                                                type="text"
                                                placeholder="Buscar banco..."
                                                value={bankSearch}
                                                onChange={(e) => setBankSearch(e.target.value)}
                                                onClick={(e) => e.stopPropagation()}
                                                style={{ background: 'none', border: 'none', color: '#fff', outline: 'none', fontSize: '0.875rem', width: '100%' }}
                                            />
                                        </div>
                                        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                            <div
                                                onClick={() => {
                                                    setNewKey({ ...newKey, bank: '' });
                                                    setIsBankDropdownOpen(false);
                                                    setBankSearch('');
                                                }}
                                                style={{ padding: '10px 16px', cursor: 'pointer', fontSize: '0.875rem', borderBottom: '1px solid rgba(255,255,255,0.02)', transition: 'var(--transition)' }}
                                                className="dropdown-item"
                                            >
                                                Nenhum
                                            </div>
                                            {banks
                                                .filter(b => b.name.toLowerCase().includes(bankSearch.toLowerCase()))
                                                .map((bank) => (
                                                    <div
                                                        key={bank.id}
                                                        onClick={() => {
                                                            setNewKey({ ...newKey, bank: bank.id });
                                                            setIsBankDropdownOpen(false);
                                                            setBankSearch('');
                                                        }}
                                                        style={{
                                                            padding: '10px 16px',
                                                            cursor: 'pointer',
                                                            fontSize: '0.875rem',
                                                            borderBottom: '1px solid rgba(255,255,255,0.02)',
                                                            backgroundColor: newKey.bank === bank.id ? 'rgba(var(--primary-rgb), 0.1)' : 'transparent',
                                                            color: newKey.bank === bank.id ? 'var(--primary)' : 'var(--text-main)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '8px',
                                                            transition: 'var(--transition)'
                                                        }}
                                                        className="dropdown-item"
                                                    >
                                                        {bank.logo_url && <img src={bank.logo_url} alt="Logo" style={{ width: 20, height: 20, borderRadius: '6px' }} />}
                                                        {bank.name}
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div style={{ marginBottom: '32px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Valor da Chave</label>
                                <input
                                    type="text"
                                    value={newKey.value}
                                    onChange={(e) => handleValueChange(e.target.value)}
                                    placeholder={
                                        newKey.type === 'CPF' ? '000.000.000-00' :
                                            newKey.type === 'CNPJ' ? '00.000.000/0000-00' :
                                                newKey.type === 'Telefone' ? '(00) 00000-0000' :
                                                    newKey.type === 'Email' ? 'exemplo@dominio.com' :
                                                        'Chave aleatória...'
                                    }
                                    autoFocus
                                    style={{
                                        width: '100%',
                                        padding: '14px 16px',
                                        borderRadius: '12px',
                                        border: '1px solid',
                                        borderColor: error ? '#ef4444' : 'var(--card-border)',
                                        backgroundColor: 'rgba(255, 255, 255, 0.02)',
                                        color: 'var(--text-main)',
                                        fontSize: '1rem',
                                        outline: 'none',
                                        transition: 'var(--transition)'
                                    }}
                                    className="input-focus"
                                />
                                {error && (
                                    <p style={{ color: '#ef4444', fontSize: '0.875rem', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <X size={14} /> {error}
                                    </p>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    style={{
                                        flex: 1,
                                        padding: '14px',
                                        borderRadius: '12px',
                                        border: '1px solid var(--card-border)',
                                        color: 'var(--text-main)',
                                        background: 'none',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    style={{
                                        flex: 1,
                                        padding: '14px',
                                        borderRadius: '12px',
                                        border: 'none',
                                        backgroundColor: 'var(--primary)',
                                color: 'var(--primary-fg)',
                                        fontWeight: 600,
                                        cursor: 'pointer'
                                    }}
                                >
                                    Cadastrar Chave
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isDeleteModalOpen && (
                <div className="app-overlay">
                    <div className="glass-card app-overlay__panel" style={{
                        maxWidth: '400px',
                        textAlign: 'center',
                        backgroundColor: '#111114'
                    }}>
                        <div style={{
                            width: '64px',
                            height: '64px',
                            borderRadius: '50%',
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 24px',
                            color: '#ef4444'
                        }}>
                            <Trash2 size={32} />
                        </div>

                        <h3 style={{ marginBottom: '12px', fontSize: '1.25rem' }}>Excluir Chave Pix</h3>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '32px', lineHeight: 1.5 }}>
                            Tem certeza que deseja excluir a chave <strong>{keyToDelete?.type}: {keyToDelete?.value}</strong>? Esta ação não pode ser desfeita.
                        </p>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                onClick={() => {
                                    setIsDeleteModalOpen(false);
                                    setKeyToDelete(null);
                                }}
                                style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid var(--card-border)', color: 'var(--text-main)', background: 'none', cursor: 'pointer', fontWeight: 600 }}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleDelete}
                                style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', backgroundColor: '#ef4444', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
                            >
                                Excluir
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
        .table-row:hover {
          background-color: rgba(255, 255, 255, 0.01);
        }
        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(var(--primary-rgb), 0.2);
        }
        .input-focus:focus {
          border-color: var(--primary) !important;
          background-color: rgba(255, 255, 255, 0.05) !important;
        }
      `}</style>
        </div>
    );
};

export default ChavePix;
