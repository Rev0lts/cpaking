import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import {
    ArrowLeft,
    UserPlus,
    DollarSign,
    TrendingUp,
    Percent,
    Archive,
    X,
    Trash2,
    Check,
    CheckCircle2,
    CreditCard,
    Pencil,
    Calendar,
    ChevronDown,
    Search,
    Eye,
    EyeOff,
    Plus,
    Smartphone,
    UserCircle2,
    FileText,
    ArrowUpRight,
    Crown,
    Settings,
    Download,
    Key
} from 'lucide-react';
import DatePicker from './DatePicker';
import { notify } from '../lib/notify';
import {
    broadcastAccountSync,
    subscribeAccountSync,
    openAccountPopoutWindow,
    buildPopoutUrl,
} from '../lib/accountPopoutSync';
import DailyGoalProgress from './DailyGoalProgress';
import { calculateDashboardProfits } from '../lib/profitCalculations';

const getGMT3Date = () => {
    const date = new Date();
    const offset = -3; // GMT-3
    const gmt3Date = new Date(date.getTime() + (offset * 60 * 60 * 1000));
    const day = String(gmt3Date.getDate()).padStart(2, '0');
    const month = String(gmt3Date.getMonth() + 1).padStart(2, '0');
    const year = gmt3Date.getFullYear();
    return `${day}/${month}/${year}`;
};

const getGMT3Now = () => {
    const date = new Date();
    const offset = -3;
    return new Date(date.getTime() + (offset * 60 * 60 * 1000));
};

const getGMT3StartOfDay = () => {
    const gmt3 = getGMT3Now();
    return new Date(gmt3.getFullYear(), gmt3.getMonth(), gmt3.getDate());
};

const parseAccountDate = (dateStr, fallback) => {
    if (dateStr) {
        const parts = String(dateStr).split('/');
        if (parts.length === 3) {
            const d = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
            if (!isNaN(d.getTime())) return d;
        }
    }
    if (fallback) {
        const d = new Date(fallback);
        if (!isNaN(d.getTime())) return d;
    }
    return new Date(0);
};

const getAccountCycleNum = (acc) => {
    const tags = Array.isArray(acc?.tag) ? acc.tag : [];
    const cycleTag = tags.find((t) => t.startsWith('Ciclo '));
    if (!cycleTag) return 1;
    const num = parseInt(cycleTag.replace('Ciclo ', ''), 10);
    return isNaN(num) ? 1 : num;
};

const getAccountName = (acc) => {
    const tags = Array.isArray(acc?.tag) ? acc.tag : [];
    const nameTag = tags.find(t => t.startsWith('Nome: '));
    return nameTag ? nameTag.replace('Nome: ', '') : '';
};

const getAccountCpf = (acc) => {
    const tags = Array.isArray(acc?.tag) ? acc.tag : [];
    const cpfTag = tags.find(t => t.startsWith('CPF: '));
    return cpfTag ? cpfTag.replace('CPF: ', '') : '';
};

const PlatformDetail = ({ platform, onBack, invalidateCache, popoutOnly = null, initialCycle = 1, dailyGoal, impersonatedUser }) => {
    const popoutWindowsRef = useRef({ mother: null, daughter: null });
    const syncWindowId = useRef(`w-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);
    const skipSyncBroadcastRef = useRef(false);

    const [accounts, setAccounts] = useState([]);
    const [userPixKeys, setUserPixKeys] = useState([]);
    const [sessionCycles, setSessionCycles] = useState([1]);
    const [selectedCycle, setSelectedCycle] = useState(1);
    const [cycleConfigs, setCycleConfigs] = useState(() => {
        try {
            const saved = localStorage.getItem(`platform_${platform?.id}_cycle_configs`);
            return saved ? JSON.parse(saved) : {};
        } catch {
            return {};
        }
    });
    const [isCycleSettingsOpen, setIsCycleSettingsOpen] = useState(false);
    const [accountType, setAccountType] = useState('daughter');
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [pixPoolModalType, setPixPoolModalType] = useState(null); // 'mother' | 'daughter' | null
    const [pixPoolInput, setPixPoolInput] = useState("");
    const [popoutCards, setPopoutCards] = useState({ mother: false, daughter: false });
    const [globalDailyProfit, setGlobalDailyProfit] = useState(0);

    const fetchGlobalDailyProfit = useCallback(async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const targetUserId = impersonatedUser?.id || user.id;

            let { data: accountsData, error: accError } = await supabase
                .from('accounts')
                .select('deposit, withdraw, chest, platform_id, created_at, updated_at, date, tag')
                .eq('user_id', targetUserId);

            if (accError && (accError.code === '42703' || accError.code === 'PGRST204')) {
                const { data: fallbackData, error: fallbackError } = await supabase
                    .from('accounts')
                    .select('deposit, withdraw, chest, platform_id, created_at, date, tag')
                    .eq('user_id', targetUserId);
                if (fallbackError) throw fallbackError;
                accountsData = fallbackData;
            } else if (accError) {
                throw accError;
            }

            let quickReportsData = [];
            const { data: quickData, error: quickError } = await supabase
                .from('quick_reports')
                .select('type, amount, date, created_at')
                .eq('user_id', targetUserId);

            if (!quickError) {
                quickReportsData = quickData || [];
            }

            const profitStats = calculateDashboardProfits(accountsData || [], quickReportsData);
            setGlobalDailyProfit(profitStats.dailyProfit);
        } catch (err) {
            console.error('Erro ao carregar meta do dia (global):', err);
        }
    }, [impersonatedUser]);

    const getPixKeysPool = (type) => {
        try {
            const saved = localStorage.getItem(`platform_${platform?.id}_cycle_${selectedCycle}_${type}_pix_pool`);
            if (!saved) return [];
            return JSON.parse(saved);
        } catch {
            return [];
        }
    };

    const savePixKeysPool = (type, pool) => {
        localStorage.setItem(`platform_${platform?.id}_cycle_${selectedCycle}_${type}_pix_pool`, JSON.stringify(pool));
    };

    const consumePixKeyFromPool = async (type) => {
        const pool = getPixKeysPool(type);
        if (pool.length === 0) return null;

        const keyVal = pool[0];
        const newPool = pool.slice(1);
        savePixKeysPool(type, newPool);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;

            // Check if key already exists in userPixKeys
            let matchedKey = userPixKeys.find(pk => pk.value === keyVal);
            if (matchedKey) {
                return matchedKey.id;
            }

            // Insert new one
            const { data, error } = await supabase
                .from('pix_keys')
                .insert([{
                    user_id: user.id,
                    type: 'Telefone',
                    value: keyVal,
                    active: true
                }])
                .select('id')
                .single();

            if (error) throw error;
            
            // Refresh keys
            fetchPixKeys();
            return data.id;
        } catch (err) {
            console.error("Erro ao consumir e cadastrar chave Pix do pool:", err);
            return null;
        }
    };

    const handleExportAccounts = async () => {
        setIsExportModalOpen(false);
        try {
            const { data, error } = await supabase
                .from('accounts')
                .select('login, password, withdraw_password')
                .eq('platform_id', platform.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (!data || data.length === 0) {
                notify("Não há contas cadastradas nesta plataforma para exportar.", "warning");
                return;
            }

            const lines = data.map(acc => {
                const login = acc.login || '';
                const password = acc.password || '';
                const withdraw_password = acc.withdraw_password || '';
                return `${login}:${password}:${withdraw_password}`;
            });

            const fileContent = lines.join('\n');
            const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            
            const cleanName = (platform.name || 'contas').toLowerCase().replace(/[^a-z0-9]/gi, '_');
            link.download = `contas_${cleanName}.txt`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            notify("Contas exportadas com sucesso!", "success");
        } catch (err) {
            console.error("Erro ao exportar contas:", err);
            notify("Erro ao exportar contas.", "error");
        }
    };

    useEffect(() => {
        if (popoutOnly && initialCycle) {
            setSelectedCycle(Number(initialCycle));
        }
    }, [popoutOnly, initialCycle]);

    useEffect(() => {
        if (popoutOnly) return;
        fetchGlobalDailyProfit();
    }, [fetchGlobalDailyProfit, popoutOnly]);

    useEffect(() => {
        if (popoutOnly) return undefined;

        let cancelled = false;
        let channel = null;

        (async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user || cancelled) return;

            const targetUserId = impersonatedUser?.id || user.id;

            const ch = supabase
                .channel(`platform-global-goal:${targetUserId}`)
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'quick_reports',
                        filter: `user_id=eq.${targetUserId}`,
                    },
                    () => fetchGlobalDailyProfit()
                )
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'accounts',
                        filter: `user_id=eq.${targetUserId}`,
                    },
                    () => fetchGlobalDailyProfit()
                )
                .subscribe();

            if (cancelled) {
                supabase.removeChannel(ch);
                return;
            }
            channel = ch;
        })();

        return () => {
            cancelled = true;
            if (channel) supabase.removeChannel(channel);
        };
    }, [impersonatedUser, fetchGlobalDailyProfit, popoutOnly]);

    useEffect(() => {
        if (platform?.id) {
            fetchAccounts();
            fetchPixKeys();
            fetchTags();
            try {
                const saved = localStorage.getItem(`platform_${platform.id}_cycle_configs`);
                setCycleConfigs(saved ? JSON.parse(saved) : {});
            } catch {
                setCycleConfigs({});
            }
        }
    }, [platform]);

    useEffect(() => {
        if (!platform?.id) return undefined;
        return subscribeAccountSync(platform.id, syncWindowId.current, () => {
            skipSyncBroadcastRef.current = true;
            fetchAccounts().finally(() => {
                skipSyncBroadcastRef.current = false;
            });
        });
    }, [platform?.id]);

    useEffect(() => {
        if (popoutOnly) return undefined;
        const interval = setInterval(() => {
            ['mother', 'daughter'].forEach((key) => {
                if (!popoutCards[key]) return;
                const win = popoutWindowsRef.current[key];
                if (!win || win.closed) {
                    popoutWindowsRef.current[key] = null;
                    setPopoutCards((prev) => (prev[key] ? { ...prev, [key]: false } : prev));
                }
            });
        }, 400);
        return () => clearInterval(interval);
    }, [popoutOnly, popoutCards]);

    const fetchAccounts = async () => {
        try {
            let { data, error } = await supabase
                .from('accounts')
                .select(`
                    *,
                    pix_keys (
                        value,
                        banks (
                            logo_url
                        )
                    )
                `)
                .eq('platform_id', platform.id)
                .order('created_at', { ascending: false });

            if (error && (error.code === '42703' || error.code === 'PGRST204')) {
                console.warn("Coluna 'date' não encontrada em 'accounts', tentando sem ela...");
                const { data: fallbackData, error: fallbackError } = await supabase
                    .from('accounts')
                    .select(`
                        id, user_id, platform_id, login, password, withdraw_password, deposit, withdraw, chest, created_at,
                        pix_keys (
                            value,
                            banks (
                                logo_url
                            )
                        )
                    `)
                    .eq('platform_id', platform.id)
                    .order('created_at', { ascending: false });

                if (fallbackError) throw fallbackError;
                data = fallbackData;
            } else if (error) {
                throw error;
            }

            const formattedAccounts = data.map(acc => ({
                id: acc.id,
                login: acc.login,
                password: acc.password,
                withdrawPassword: acc.withdraw_password,
                deposit: acc.deposit,
                withdraw: acc.withdraw,
                chest: acc.chest,
                date: acc.date || getGMT3Date(),
                pixKey: acc.pix_keys ? acc.pix_keys.value : '',
                pixBankLogo: acc.pix_keys?.banks?.logo_url || null,
                tag: acc.tag ? acc.tag.split(',').filter(Boolean) : [],
                status: acc.status || 'active',
                created_at: acc.created_at
            }));

            const sortedAccounts = formattedAccounts.sort((a, b) => {
                const aActive = a.status === 'active';
                const bActive = b.status === 'active';
                if (aActive === bActive) {
                    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
                }
                return aActive ? -1 : 1;
            });

            setAccounts(sortedAccounts);
            if (!skipSyncBroadcastRef.current && platform?.id) {
                broadcastAccountSync(platform.id, syncWindowId.current);
            }
        } catch (err) {
            console.error("Erro ao buscar contas:", err);
        }
    };

    const fetchPixKeys = async () => {
        try {
            const { data, error } = await supabase
                .from('pix_keys')
                .select('id, type, value, active, banks(name, logo_url)');
            if (error) throw error;
            setUserPixKeys(data);
        } catch (err) {
            console.error("Erro ao buscar chaves pix:", err);
        }
    };

    const fetchTags = async () => {
        try {
            const { data, error } = await supabase
                .from('user_tags')
                .select('name')
                .order('name');
            if (error) throw error;
            const defaultTags = ['Conta Mãe', 'Conta Filha'];
            if (data && data.length > 0) {
                const fetchedTags = data.map(t => t.name);
                const combinedTags = Array.from(new Set([...defaultTags, ...fetchedTags]));
                setTags(combinedTags);
            } else {
                setTags(defaultTags);
            }
        } catch (err) {
            console.error("Erro ao buscar tags:", err);
        }
    };

    // Modal States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeletePlatformModalOpen, setIsDeletePlatformModalOpen] = useState(false);
    const [isDeleteCycleModalOpen, setIsDeleteCycleModalOpen] = useState(false);
    const [accountToDelete, setAccountToDelete] = useState(null);
    const [editingAccountId, setEditingAccountId] = useState(null);
    const [isPixDropdownOpen, setIsPixDropdownOpen] = useState(false);
    const [pixSearch, setPixSearch] = useState('');
    const [inlinePixSearch, setInlinePixSearch] = useState('');
    const [inlineTagSearch, setInlineTagSearch] = useState('');
    const [inlineTagDropdown, setInlineTagDropdown] = useState(null); // For inline tag editing dropdown

    // Form State
    const [newAccount, setNewAccount] = useState({
        login: '',
        password: '',
        withdrawPassword: '',
        deposit: '',
        withdraw: '',
        chest: '',
        pixKey: '',
        date: getGMT3Date()
    });
    const [isQuickAdding, setIsQuickAdding] = useState(false);
    const [editingCell, setEditingCell] = useState(null);
    const [editingValue, setEditingValue] = useState('');
    const [copiedId, setCopiedId] = useState(null);
    const [tags, setTags] = useState(['Conta Mãe', 'Conta Filha']);
    const [visiblePasswords, setVisiblePasswords] = useState(new Set());
    const [error, setError] = useState(null);

    const pixDropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (pixDropdownRef.current && !pixDropdownRef.current.contains(event.target)) {
                setIsPixDropdownOpen(false);
            }

            // Close inline PIX dropdown if clicked outside
            if (!event.target.closest('.inline-pix-dropdown')) {
                setEditingCell(prev => {
                    if (prev && prev.field === 'pixKey') return null;
                    return prev;
                });
                setInlinePixSearch('');
            }

            // Close inline tag dropdown if clicked outside
            if (!event.target.closest('.inline-tag-dropdown')) {
                setInlineTagDropdown(null);
                setInlineTagSearch('');
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleCopy = (text, id) => {
        let textToCopy = text;

        if (id && id.endsWith('-pixKey')) {
            const pixKeyObj = userPixKeys.find(pk => pk.value === text);
            if (pixKeyObj && ['CPF', 'CNPJ', 'Telefone'].includes(pixKeyObj.type)) {
                textToCopy = String(text).replace(/\D/g, '');
            }
        }

        navigator.clipboard.writeText(textToCopy);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const togglePasswordVisibility = (e, id) => {
        e.stopPropagation();
        setVisiblePasswords(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleInlineEditSave = async (accId, field, value) => {
        try {
            const sanitizedValue = String(value).replace(/[^0-9.,]/g, '').replace(',', '.');
            const numericValue = parseFloat(sanitizedValue);

            if (isNaN(numericValue) && sanitizedValue !== '') {
                setEditingCell(prev => (prev?.id === accId && prev?.field === field) ? null : prev);
                return;
            }

            const finalValue = sanitizedValue === '' ? '0' : String(Math.abs(numericValue));

            const { error } = await supabase
                .from('accounts')
                .update({ [field]: finalValue })
                .eq('id', accId);

            if (error) throw error;

            setAccounts(prevAccounts => prevAccounts.map(acc =>
                acc.id === accId ? { ...acc, [field]: finalValue } : acc
            ));

            if (invalidateCache) invalidateCache();
            if (platform?.id) broadcastAccountSync(platform.id, syncWindowId.current);
            fetchGlobalDailyProfit();
        } catch (err) {
            console.error(`Erro ao salvar ${field}:`, err);
            notify(`Erro ao atualizar o valor rápido.`, "error");
        } finally {
            setEditingCell(prev => (prev?.id === accId && prev?.field === field) ? null : prev);
        }
    };

    const handleInlinePixSave = async (accId, newPixKeyId) => {
        try {
            const { error } = await supabase
                .from('accounts')
                .update({ pix_key_id: newPixKeyId || null })
                .eq('id', accId);

            if (error) throw error;

            // Encontrar o novo valor da chave pix para atualização otimista
            const newPixKeyObj = userPixKeys.find(pk => pk.id === newPixKeyId);
            const newValue = newPixKeyObj ? newPixKeyObj.value : '';

            setAccounts(prevAccounts => prevAccounts.map(acc =>
                acc.id === accId ? {
                    ...acc,
                    pixKey: newValue,
                    pixBankLogo: newPixKeyObj?.banks?.logo_url || null
                } : acc
            ));

            if (invalidateCache) invalidateCache();
            notify("Chave PIX atualizada.", "success");
        } catch (err) {
            console.error("Erro ao salvar chave pix:", err);
            notify("Erro ao atualizar a chave PIX.", "error");
        } finally {
            setEditingCell(null);
        }
    };

    const handleToggleStatus = async (accId, currentStatus) => {
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
        try {
            const { error } = await supabase
                .from('accounts')
                .update({ status: newStatus })
                .eq('id', accId);

            if (error) {
                // Se a coluna não existir ainda silenciosamente ignoramos no erro visual, 
                // mas logamos e revertemos o estado
                if (error.code === '42703' || error.code === 'PGRST204') {
                    console.warn("Coluna 'status' não existe. Execute o SQL de alter table.");
                } else {
                    throw error;
                }
            } else {
                const updatedAccounts = accounts.map(acc =>
                    acc.id === accId ? { ...acc, status: newStatus } : acc
                );

                const sortedAccounts = updatedAccounts.sort((a, b) => {
                    const aActive = a.status === 'active';
                    const bActive = b.status === 'active';
                    if (aActive === bActive) {
                        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
                    }
                    return aActive ? -1 : 1;
                });

                setAccounts(sortedAccounts);
                if (invalidateCache) invalidateCache();
            }
        } catch (err) {
            console.error("Erro ao alterar status:", err);
            notify("Erro ao alterar o status da conta: " + (err.message || "Erro desconhecido"), "error");
        }
    };

    const handleDeletePlatform = async () => {
        try {
            // First, delete all accounts associated with this platform to avoid foreign key violations
            const { error: accountsError } = await supabase
                .from('accounts')
                .delete()
                .eq('platform_id', platform.id);

            if (accountsError) throw accountsError;

            // Then delete the platform itself
            const { error: platformError } = await supabase
                .from('platforms')
                .delete()
                .eq('id', platform.id);

            if (platformError) throw platformError;

            console.log("Plataforma excluída com sucesso.");
            if (invalidateCache) invalidateCache();
            setIsDeletePlatformModalOpen(false);
            onBack(); // Go back to the list of platforms
        } catch (err) {
            console.error("Erro ao excluir plataforma:", err);
            notify("Erro ao excluir plataforma: " + (err.message || "Erro desconhecido"), "error");
        }
    };

    const handleDeleteCycle = async () => {
        setIsDeleteCycleModalOpen(false);

        try {
            const cycleAccounts = accounts.filter(acc => {
                const tags = Array.isArray(acc.tag) ? acc.tag : [];
                return tags.includes(`Ciclo ${selectedCycle}`);
            });

            if (cycleAccounts.length > 0) {
                const accountIds = cycleAccounts.map(acc => acc.id);
                const { error } = await supabase
                    .from('accounts')
                    .delete()
                    .in('id', accountIds);

                if (error) throw error;
            }

            setSessionCycles(prev => {
                const updated = prev.filter(c => c !== selectedCycle);
                return updated.length > 0 ? updated : [1];
            });

            setAccounts(prev => prev.filter(acc => {
                const tags = Array.isArray(acc.tag) ? acc.tag : [];
                return !tags.includes(`Ciclo ${selectedCycle}`);
            }));

            notify(`Ciclo ${selectedCycle} excluído com sucesso!`, "success");
            
            const remainingCycles = uniqueCycles.filter(c => c !== selectedCycle);
            setSelectedCycle(remainingCycles.length > 0 ? Math.min(...remainingCycles) : 1);
            
            if (invalidateCache) invalidateCache();
        } catch (err) {
            console.error("Erro ao excluir ciclo:", err);
            notify("Erro ao excluir ciclo: " + (err.message || "Erro desconhecido"), "error");
        }
    };

    const handleDelete = async () => {
        if (!accountToDelete) return;

        console.log("Iniciando exclusão da conta:", accountToDelete.id);
        try {
            const { error } = await supabase
                .from('accounts')
                .delete()
                .eq('id', accountToDelete.id);

            if (error) {
                console.error("Erro do Supabase ao excluir conta:", error);
                throw error;
            }

            console.log("Conta excluída com sucesso do banco.");
            if (invalidateCache) invalidateCache();
            setAccounts(accounts.filter(a => a.id !== accountToDelete.id));
            setIsDeleteModalOpen(false);
            setAccountToDelete(null);
        } catch (err) {
            console.error("Erro na função handleDelete:", err);
            notify("Erro ao excluir conta: " + (err.message || "Erro desconhecido"), "error");
        }
    };

    const handleAddAccount = async (e) => {
        e.preventDefault();
        setError(null);

        if (newAccount.withdrawPassword && newAccount.withdrawPassword.length !== 6) {
            setError("A senha de saque deve conter exatamente 6 números.");
            return;
        }

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setError("Usuário não autenticado.");
                return;
            }

            let finalLogin = newAccount.login;
            if (!finalLogin && !editingAccountId) {
                const autoNumberedAccounts = accounts.filter(acc => acc.login.startsWith('Conta '));
                let nextNumber = 1;

                if (autoNumberedAccounts.length > 0) {
                    const numbers = autoNumberedAccounts.map(acc => {
                        const match = acc.login.match(/Conta (\d+)/);
                        return match ? parseInt(match[1]) : 0;
                    });
                    nextNumber = Math.max(...numbers) + 1;
                }

                finalLogin = `Conta ${String(nextNumber).padStart(2, '0')}`;
            }

            const finalTags = [`Ciclo ${selectedCycle}`];
            if (getCycleConfig(selectedCycle) === 'mother_daughter' && accountType === 'mother') {
                finalTags.push('Mãe');
            }

            let consumedPixKeyId = null;
            if (!editingAccountId) {
                let targetType = 'daughter';
                if (getCycleConfig(selectedCycle) === 'mother_daughter') {
                    targetType = accountType;
                }
                consumedPixKeyId = await consumePixKeyFromPool(targetType);
            }

            const accountData = {
                user_id: user.id,
                platform_id: platform.id,
                login: finalLogin,
                password: newAccount.password || '',
                withdraw_password: newAccount.withdrawPassword || '',
                deposit: newAccount.deposit || '0',
                withdraw: newAccount.withdraw || '0',
                chest: newAccount.chest || '0',
                date: newAccount.date || getGMT3Date(),
                pix_key_id: consumedPixKeyId || newAccount.pixKey || null,
                tag: finalTags.length > 0 ? finalTags.join(',') : null,
                status: 'active'
            };

            if (editingAccountId) {
                // Impede que o status volte para 'active' ao editar uma conta
                delete accountData.status;

                let { error } = await supabase
                    .from('accounts')
                    .update(accountData)
                    .eq('id', editingAccountId);

                if (error && (error.code === '42703' || error.code === 'PGRST204')) {
                    console.warn("Coluna 'date' ou 'tag' não encontrada, tentando update sem elas...");
                    // eslint-disable-next-line no-unused-vars
                    const { date, tag, ...fallbackData } = accountData;
                    const { error: retryError } = await supabase
                        .from('accounts')
                        .update(fallbackData)
                        .eq('id', editingAccountId);
                    error = retryError;
                }

                if (error) throw error;

                // Update local state by re-fetching or mutating
                let { data: updatedAccount, error: fetchError } = await supabase
                    .from('accounts')
                    .select(`*, pix_keys(value, banks(logo_url))`)
                    .eq('id', editingAccountId)
                    .single();

                if (fetchError && (fetchError.code === '42703' || fetchError.code === 'PGRST204')) {
                    const { data: fallbackFetch, error: fallbackFetchError } = await supabase
                        .from('accounts')
                        .select(`id, login, password, withdraw_password, deposit, withdraw, chest, created_at, pix_keys(value, banks(logo_url))`)
                        .eq('id', editingAccountId)
                        .single();
                    if (fallbackFetchError) throw fallbackFetchError;
                    updatedAccount = fallbackFetch;
                } else if (fetchError) {
                    throw fetchError;
                }

                const formattedAccount = {
                    id: updatedAccount.id,
                    login: updatedAccount.login,
                    password: updatedAccount.password,
                    withdrawPassword: updatedAccount.withdraw_password,
                    deposit: String(updatedAccount.deposit),
                    withdraw: String(updatedAccount.withdraw),
                    chest: String(updatedAccount.chest),
                    date: updatedAccount.date || getGMT3Date(),
                    pixKey: updatedAccount.pix_keys ? updatedAccount.pix_keys.value : '',
                    pixBankLogo: updatedAccount.pix_keys?.banks?.logo_url || null,
                    tag: updatedAccount.tag ? updatedAccount.tag.split(',').filter(Boolean) : [],
                    status: updatedAccount.status || 'active',
                    created_at: updatedAccount.created_at
                };

                const updatedAccounts = accounts.map(acc => acc.id === editingAccountId ? formattedAccount : acc);
                const sortedAccounts = updatedAccounts.sort((a, b) => {
                    const aActive = a.status === 'active';
                    const bActive = b.status === 'active';
                    if (aActive === bActive) {
                        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
                    }
                    return aActive ? -1 : 1;
                });

                setAccounts(sortedAccounts);
                if (invalidateCache) invalidateCache();
                notify("Conta atualizada com sucesso!", "success");
            } else {
                let { data, error: insertError } = await supabase
                    .from('accounts')
                    .insert([accountData])
                    .select(`
                        *,
                        pix_keys (
                            value,
                            banks (
                                logo_url
                            )
                        )
                    `);

                if (insertError && (insertError.code === '42703' || insertError.code === 'PGRST204')) {
                    console.warn("Coluna 'date' ou 'tag' não encontrada, tentando insert sem elas...");
                    // eslint-disable-next-line no-unused-vars
                    const { date, tag, ...fallbackData } = accountData;
                    const { data: retryData, error: retryError } = await supabase
                        .from('accounts')
                        .insert([fallbackData])
                        .select(`
                            id, login, password, withdraw_password, deposit, withdraw, chest, created_at, 
                            pix_keys (
                                value,
                                banks (
                                    logo_url
                                )
                            )
                        `);
                    data = retryData;
                    insertError = retryError;
                }

                if (insertError) throw insertError;

                const acc = data[0];
                const newFormattedAccount = {
                    id: acc.id,
                    login: acc.login,
                    password: acc.password,
                    withdrawPassword: acc.withdraw_password,
                    deposit: String(acc.deposit),
                    withdraw: String(acc.withdraw),
                    chest: String(acc.chest),
                    date: acc.date || getGMT3Date(),
                    pixKey: acc.pix_keys ? acc.pix_keys.value : '',
                    pixBankLogo: acc.pix_keys?.banks?.logo_url || null,
                    tag: acc.tag ? acc.tag.split(',').filter(Boolean) : [],
                    status: acc.status || 'active',
                    created_at: acc.created_at
                };

                const newAccountsList = [newFormattedAccount, ...accounts];
                const newSortedAccounts = newAccountsList.sort((a, b) => {
                    const aActive = a.status === 'active';
                    const bActive = b.status === 'active';
                    if (aActive === bActive) {
                        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
                    }
                    return aActive ? -1 : 1;
                });

                setAccounts(newSortedAccounts);
            }

            if (invalidateCache) invalidateCache();

            setIsModalOpen(false);
            setEditingAccountId(null);
            setNewAccount({
                login: '', password: '', withdrawPassword: '', deposit: '', withdraw: '', chest: '', pixKey: '', date: getGMT3Date()
            });
            setAccountType('daughter');

        } catch (err) {
            console.error("Erro ao salvar conta:", err);
            notify("Erro ao salvar a conta.", "error");
        }
    };

    const openEditModal = (acc) => {
        // Find the pix_key_id if possible
        const matchedPixKey = userPixKeys.find(pk => pk.value === acc.pixKey);

        setError(null);
        setNewAccount({
            login: acc.login,
            password: acc.password,
            withdrawPassword: acc.withdrawPassword,
            deposit: acc.deposit,
            withdraw: acc.withdraw,
            chest: acc.chest,
            pixKey: matchedPixKey ? matchedPixKey.id : '',
            date: acc.date || getGMT3Date()
        });
        setAccountType((acc.tag || []).includes('Mãe') ? 'mother' : 'daughter');
        setEditingAccountId(acc.id);
        setIsModalOpen(true);
    };

    const toggleAccountStatus = async (accId, currentStatus) => {
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
        try {
            const { error } = await supabase
                .from('accounts')
                .update({ status: newStatus })
                .eq('id', accId);

            if (error) {
                if (error.code === '42703' || error.code === 'PGRST204') {
                    console.warn("Coluna 'status' não existe. Execute o SQL de alter table.");
                } else {
                    throw error;
                }
            } else {
                const updatedAccounts = accounts.map(acc =>
                    acc.id === accId ? { ...acc, status: newStatus } : acc
                );

                const sortedAccounts = updatedAccounts.sort((a, b) => {
                    const aActive = a.status === 'active';
                    const bActive = b.status === 'active';
                    if (aActive === bActive) {
                        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
                    }
                    return aActive ? -1 : 1;
                });

                setAccounts(sortedAccounts);
                if (invalidateCache) invalidateCache();
            }
        } catch (err) {
            console.error("Erro ao alterar status:", err);
            notify("Erro ao alterar status da conta.", "error");
        }
    };

    const handleGenerateNameCpf = () => {
        const names = ['Gabriel', 'Lucas', 'Matheus', 'Pedro', 'Joao', 'Thiago', 'Felipe', 'Rafael', 'Bruno', 'Rodrigo', 'Fernando', 'Marcelo', 'Anderson', 'Guilherme', 'Carlos', 'Paulo', 'Ricardo', 'Eduardo', 'Vitor', 'Diego', 'Ana', 'Maria', 'Julia', 'Beatriz', 'Mariana', 'Camila', 'Leticia', 'Amanda', 'Bruna', 'Jessica'];
        const surnames = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira', 'Lima', 'Gomes', 'Costa', 'Ribeiro', 'Martins', 'Carvalho', 'Almeida', 'Lopes', 'Soares', 'Fernandes', 'Vieira', 'Barbosa'];

        const randomName = names[Math.floor(Math.random() * names.length)];
        const randomSurname = surnames[Math.floor(Math.random() * surnames.length)];

        // Generate random valid CPF
        const randomDigit = () => Math.floor(Math.random() * 10);
        const n = Array.from({ length: 9 }, randomDigit);

        let d1 = n.reduce((total, number, index) => total + (number * (10 - index)), 0);
        d1 = 11 - (d1 % 11);
        if (d1 >= 10) d1 = 0;

        let d2 = n.reduce((total, number, index) => total + (number * (11 - index)), 0) + (d1 * 2);
        d2 = 11 - (d2 % 11);
        if (d2 >= 10) d2 = 0;

        const cpf = `${n.join('')}${d1}${d2}`;
        const textToCopy = `${randomName} ${randomSurname} | ${cpf}`;

        navigator.clipboard.writeText(textToCopy);
        setCopiedId('generate-cpf');
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleGenerateNameCpfForAccount = async (accountId, currentTags) => {
        const names = ['Gabriel', 'Lucas', 'Matheus', 'Pedro', 'Joao', 'Thiago', 'Felipe', 'Rafael', 'Bruno', 'Rodrigo', 'Fernando', 'Marcelo', 'Anderson', 'Guilherme', 'Carlos', 'Paulo', 'Ricardo', 'Eduardo', 'Vitor', 'Diego', 'Ana', 'Maria', 'Julia', 'Beatriz', 'Mariana', 'Camila', 'Leticia', 'Amanda', 'Bruna', 'Jessica'];
        const surnames = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira', 'Lima', 'Gomes', 'Costa', 'Ribeiro', 'Martins', 'Carvalho', 'Almeida', 'Lopes', 'Soares', 'Fernandes', 'Vieira', 'Barbosa'];

        const randomName = names[Math.floor(Math.random() * names.length)];
        const randomSurname = surnames[Math.floor(Math.random() * surnames.length)];
        const fullName = `${randomName} ${randomSurname}`;

        // Generate random valid CPF
        const randomDigit = () => Math.floor(Math.random() * 10);
        const n = Array.from({ length: 9 }, randomDigit);

        let d1 = n.reduce((total, number, index) => total + (number * (10 - index)), 0);
        d1 = 11 - (d1 % 11);
        if (d1 >= 10) d1 = 0;

        let d2 = n.reduce((total, number, index) => total + (number * (11 - index)), 0) + (d1 * 2);
        d2 = 11 - (d2 % 11);
        if (d2 >= 10) d2 = 0;

        const cpfVal = `${n.join('')}${d1}${d2}`;

        const cleanTags = currentTags.filter(t => !t.startsWith('Nome: ') && !t.startsWith('CPF: '));
        const newTags = [...cleanTags, `Nome: ${fullName}`, `CPF: ${cpfVal}`];
        const tagsString = newTags.join(',');

        setAccounts(prevAccounts => prevAccounts.map(acc => {
            if (acc.id === accountId) {
                return { ...acc, tag: newTags };
            }
            return acc;
        }));

        try {
            const { error } = await supabase
                .from('accounts')
                .update({ tag: tagsString })
                .eq('id', accountId);

            if (error) throw error;
            notify("Nome e CPF gerados e salvos com sucesso!", "success");
        } catch (err) {
            console.error("Erro ao salvar Nome e CPF gerados:", err);
            notify("Erro ao salvar Nome e CPF gerados na conta.", "error");
            if (fetchAccounts) fetchAccounts();
        }
    };

    const handleRemoveTag = async (accountId, currentTags, tagToRemove) => {
        try {
            const newTags = currentTags.filter(t => t !== tagToRemove);
            const tagsString = newTags.length > 0 ? newTags.join(',') : null;

            // Optimistic update locally
            setAccounts(prevAccounts => prevAccounts.map(acc => {
                if (acc.id === accountId) {
                    return { ...acc, tag: newTags };
                }
                return acc;
            }));

            const { error } = await supabase
                .from('accounts')
                .update({ tag: tagsString })
                .eq('id', accountId);

            if (error) throw error;
            notify("Tag removida.", "success");
        } catch (err) {
            console.error("Erro ao remover tag:", err);
            notify("Erro ao remover tag da conta.", "error");
            // Re-fetch to undo optimistic update on error
            if (fetchAccounts) fetchAccounts();
        }
    };

    const handleAddInlineTag = async (accountId, currentTags, tagToAdd) => {
        try {
            if (currentTags.includes(tagToAdd)) return; // Already has it

            const newTags = [...currentTags, tagToAdd];
            const tagsString = newTags.join(',');

            // Optimistic update locally
            setAccounts(prevAccounts => prevAccounts.map(acc => {
                if (acc.id === accountId) {
                    return { ...acc, tag: newTags };
                }
                return acc;
            }));

            const { error } = await supabase
                .from('accounts')
                .update({ tag: tagsString })
                .eq('id', accountId);

            if (error) throw error;
            notify("Tag adicionada.", "success");
        } catch (err) {
            console.error("Erro ao adicionar tag in-line:", err);
            notify("Erro ao adicionar tag na conta.", "error");
            // Re-fetch to undo optimistic update on error
            if (fetchAccounts) fetchAccounts();
        }
    };

    const handleUpdateAccountTags = async (accountId, newTags) => {
        try {
            const accObj = accounts.find(a => a.id === accountId);
            const cycleTag = accObj ? accObj.tag.find(t => t.startsWith('Ciclo ')) : null;

            const finalTags = [...newTags];
            if (cycleTag) {
                finalTags.push(cycleTag);
            } else {
                finalTags.push(`Ciclo ${selectedCycle}`);
            }

            const tagsString = finalTags.length > 0 ? finalTags.join(',') : null;

            // Optimistic update locally
            setAccounts(prevAccounts => prevAccounts.map(acc => {
                if (acc.id === accountId) {
                    return { ...acc, tag: finalTags };
                }
                return acc;
            }));

            const { error } = await supabase
                .from('accounts')
                .update({ tag: tagsString })
                .eq('id', accountId);

            if (error) throw error;
            // notify("Tags atualizadas.", "success"); // Removed to avoid too many notifications while toggling
        } catch (err) {
            console.error("Erro ao atualizar tags:", err);
            notify("Erro ao atualizar tags da conta.", "error");
            if (fetchAccounts) fetchAccounts();
        }
    };

    const handleToggleMotherAccount = async (accountId, currentTags) => {
        try {
            const tagsList = Array.isArray(currentTags) ? currentTags : [];
            const hasMotherTag = tagsList.includes('Mãe');
            let newTags;
            if (hasMotherTag) {
                newTags = tagsList.filter(t => t !== 'Mãe');
            } else {
                newTags = [...tagsList, 'Mãe'];
            }
            
            const tagsString = newTags.length > 0 ? newTags.join(',') : null;

            // Optimistic update locally
            setAccounts(prevAccounts => prevAccounts.map(acc => {
                if (acc.id === accountId) {
                    return { ...acc, tag: newTags };
                }
                return acc;
            }));

            const { error } = await supabase
                .from('accounts')
                .update({ tag: tagsString })
                .eq('id', accountId);

            if (error) throw error;
            notify(hasMotherTag ? "Conta definida como Filha!" : "Conta definida como Mãe!", "success");
        } catch (err) {
            console.error("Erro ao alterar tipo de conta:", err);
            notify("Erro ao alterar tipo de conta.", "error");
            if (fetchAccounts) fetchAccounts();
        }
    };


    const handleQuickAddAccount = async (type = 'phone', forceMother = false) => {
        try {
            setIsQuickAdding(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                notify("Usuário não autenticado.", "error");
                return;
            }

            let generatedLogin = '';

            if (type === 'phone') {
                // Generate random phone number: Random DDD + 9 + 8 random digits
                const ddds = [
                    11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28,
                    31, 32, 33, 34, 35, 37, 38, 41, 42, 43, 44, 45, 46, 47, 48, 49,
                    51, 53, 54, 55, 61, 62, 63, 64, 65, 66, 67, 68, 69,
                    71, 73, 74, 75, 77, 79, 81, 82, 83, 84, 85, 86, 87, 88, 89,
                    91, 92, 93, 94, 95, 96, 97, 98, 99
                ];
                const randomDDD = ddds[Math.floor(Math.random() * ddds.length)];
                const randomPhoneDigits = Math.floor(10000000 + Math.random() * 90000000);
                generatedLogin = `${randomDDD}9${randomPhoneDigits}`;
            } else if (type === 'username') {
                const names = ['gabriel', 'lucas', 'matheus', 'pedro', 'joao', 'thiago', 'felipe', 'rafael', 'bruno', 'rodrigo', 'fernando', 'marcelo', 'anderson', 'guilherme', 'carlos', 'paulo', 'ricardo', 'eduardo', 'vitor', 'diego'];
                const surnames = ['silva', 'santos', 'oliveira', 'souza', 'rodrigues', 'ferreira', 'alves', 'pereira', 'lima', 'gomes', 'costa', 'ribeiro', 'martins', 'carvalho', 'almeida', 'lopes', 'soares', 'fernandes', 'vieira', 'barbosa'];

                const randomName = names[Math.floor(Math.random() * names.length)];
                const randomSurname = surnames[Math.floor(Math.random() * surnames.length)];

                // Generate 4 to 6 random numbers
                const numLen = Math.floor(Math.random() * 3) + 4; // 4, 5, or 6
                let randomNums = '';
                for (let i = 0; i < numLen; i++) randomNums += Math.floor(Math.random() * 10);

                const baseString = randomName + randomSurname;
                const maxBaseLength = 16 - numLen;
                const finalBase = baseString.substring(0, maxBaseLength);
                generatedLogin = finalBase + randomNums;
            }

            // Generate random password: 8 chars (1 upper, 1 lower, 1 number, 1 special)
            const uppers = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
            const lowers = 'abcdefghijklmnopqrstuvwxyz';
            const numbers = '0123456789';
            const specials = '@!#$%&';
            const allChars = uppers + lowers + numbers + specials;

            let generatedPassword = '';
            // Guarantee at least one of each required type
            generatedPassword += uppers.charAt(Math.floor(Math.random() * uppers.length));
            generatedPassword += lowers.charAt(Math.floor(Math.random() * lowers.length));
            generatedPassword += numbers.charAt(Math.floor(Math.random() * numbers.length));
            generatedPassword += specials.charAt(Math.floor(Math.random() * specials.length));

            // Fill the rest up to 8 chars
            for (let i = generatedPassword.length; i < 8; i++) {
                generatedPassword += allChars.charAt(Math.floor(Math.random() * allChars.length));
            }

            // Shuffle the password so the predictable characters aren't always at the beginning
            generatedPassword = generatedPassword.split('').sort(() => 0.5 - Math.random()).join('');

            // Generate random withdraw password: 6 digits
            const generatedWithdraw = String(Math.floor(100000 + Math.random() * 900000));

            let targetType = 'daughter';
            if (getCycleConfig(selectedCycle) === 'mother_daughter') {
                targetType = forceMother ? 'mother' : 'daughter';
            }
            const consumedPixKeyId = await consumePixKeyFromPool(targetType);

            let selectedPixKeyId = consumedPixKeyId;
            if (!selectedPixKeyId && platform.pix_types && platform.pix_types.length > 0) {
                const usedValues = accounts.filter(acc => acc.pixKey).map(acc => acc.pixKey);
                const availableKeys = userPixKeys.filter(pk =>
                    pk.active !== false && platform.pix_types.includes(pk.type) && !usedValues.includes(pk.value)
                );
                if (availableKeys.length > 0) {
                    selectedPixKeyId = availableKeys[0].id;
                }
            }

            const accountData = {
                user_id: user.id,
                platform_id: platform.id,
                login: generatedLogin,
                password: generatedPassword,
                withdraw_password: generatedWithdraw,
                deposit: '0',
                withdraw: '0',
                chest: '0',
                date: getGMT3Date(),
                pix_key_id: selectedPixKeyId,
                tag: forceMother ? `Ciclo ${selectedCycle},Mãe` : `Ciclo ${selectedCycle}`,
                status: 'active'
            };

            let { data, error } = await supabase
                .from('accounts')
                .insert([accountData])
                .select(`
                    id, login, password, withdraw_password, deposit, withdraw, chest, date, tag, created_at,
                    pix_keys (
                        value,
                        banks (
                            logo_url
                        )
                    )
                `);

            if (error && (error.code === '42703' || error.code === 'PGRST204')) {
                console.warn("Retentando quick add sem colunas extras...");
                // eslint-disable-next-line no-unused-vars
                const { date, tag, ...fallbackData } = accountData;
                const { data: retryData, error: retryError } = await supabase
                    .from('accounts')
                    .insert([fallbackData])
                    .select(`
                        id, login, password, withdraw_password, deposit, withdraw, chest, created_at, 
                        pix_keys (
                            value,
                            banks (
                                logo_url
                            )
                        )
                    `);
                data = retryData;
                error = retryError;
            }

            if (error) throw error;

            if (data && data.length > 0) {
                const insertedAccount = data[0];
                const newAccFormatted = {
                    id: insertedAccount.id,
                    login: insertedAccount.login,
                    password: insertedAccount.password,
                    withdrawPassword: insertedAccount.withdraw_password,
                    deposit: String(insertedAccount.deposit || '0'),
                    withdraw: String(insertedAccount.withdraw || '0'),
                    chest: String(insertedAccount.chest || '0'),
                    date: insertedAccount.date || getGMT3Date(),
                    pixKey: insertedAccount.pix_keys ? insertedAccount.pix_keys.value : '',
                    pixBankLogo: insertedAccount.pix_keys?.banks?.logo_url || null,
                    tag: insertedAccount.tag ? insertedAccount.tag.split(',').filter(Boolean) : [],
                    status: insertedAccount.status || 'active',
                    created_at: insertedAccount.created_at
                };

                const newQuickAddList = [newAccFormatted, ...accounts];
                const sortedAccounts = newQuickAddList.sort((a, b) => {
                    const aActive = a.status === 'active';
                    const bActive = b.status === 'active';
                    if (aActive === bActive) {
                        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
                    }
                    return aActive ? -1 : 1;
                });

                setAccounts(sortedAccounts);
            }
            if (invalidateCache) invalidateCache();
        } catch (err) {
            console.error("Erro ao adicionar conta rápida:", err);
            notify("Erro ao adicionar conta rápida: " + (err.message || "Erro desconhecido"), "error");
        } finally {
            setIsQuickAdding(false);
        }
    };

    // Obter lista dinâmica de ciclos baseada nas tags das contas e na sessão atual
    const getUniqueCycles = () => {
        const extractedCycles = accounts.map(acc => {
            const tags = Array.isArray(acc.tag) ? acc.tag : [];
            const cycleTag = tags.find(t => t.startsWith('Ciclo '));
            if (cycleTag) {
                const num = parseInt(cycleTag.replace('Ciclo ', ''));
                return isNaN(num) ? 1 : num;
            }
            return 1;
        });
        return Array.from(new Set([...sessionCycles, ...extractedCycles])).sort((a, b) => a - b);
    };

    const uniqueCycles = getUniqueCycles();

    // Filtrar contas que pertencem ao ciclo atualmente selecionado
    const filteredAccounts = accounts.filter(acc => {
        const tags = Array.isArray(acc.tag) ? acc.tag : [];
        const cycleTag = tags.find(t => t.startsWith('Ciclo '));
        const cycleNum = cycleTag ? parseInt(cycleTag.replace('Ciclo ', '')) : 1;
        return cycleNum === selectedCycle;
    });

    // Calculate dynamic stats based on accounts
    const parseCurrency = (val) => {
        if (!val) return 0;
        if (typeof val === 'number') return val;
        let str = String(val).replace(/[R$\s]/g, '');
        if (str.includes(',') && str.includes('.')) {
            str = str.replace(/\./g, '').replace(',', '.');
        } else if (str.includes(',')) {
            str = str.replace(',', '.');
        }
        return parseFloat(str) || 0;
    };

    // Totais e lucros: todas as contas, todos os ciclos da plataforma
    const totalDeposit = accounts.reduce((acc, curr) => acc + parseCurrency(curr.deposit), 0);
    const totalWithdraw = accounts.reduce((acc, curr) => acc + parseCurrency(curr.withdraw), 0);
    const totalChest = accounts.reduce((acc, curr) => acc + parseCurrency(curr.chest), 0);

    const getAccountProfit = (acc) =>
        parseCurrency(acc.withdraw) + parseCurrency(acc.chest) - parseCurrency(acc.deposit);

    const todayStr = getGMT3Date();
    const startOfDay = getGMT3StartOfDay();
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfWeek.getDate() - 6);

    const gmt3Now = getGMT3Now();
    const startOfMonth = new Date(gmt3Now.getFullYear(), gmt3Now.getMonth(), 1);
    const endOfMonth = new Date(gmt3Now.getFullYear(), gmt3Now.getMonth() + 1, 1);

    const isAccountDateToday = (acc) => {
        if (acc.date === todayStr) return true;
        const d = parseAccountDate(acc.date, acc.created_at);
        return d >= startOfDay && d < endOfDay;
    };

    const isAccountInRange = (acc, rangeStart, rangeEnd) => {
        const d = parseAccountDate(acc.date, acc.created_at);
        return d >= rangeStart && d < rangeEnd;
    };

    const isMotherAccount = (acc) => {
        const tags = Array.isArray(acc.tag) ? acc.tag : [];
        return tags.includes('Mãe');
    };

    // Ciclos com atividade hoje: inclui filhas do mesmo ciclo (mesmo sem data de hoje)
    const cyclesActiveToday = new Set();
    accounts.forEach((acc) => {
        if (isAccountDateToday(acc)) {
            cyclesActiveToday.add(getAccountCycleNum(acc));
        }
    });

    const cyclesActiveWeek = new Set();
    const cyclesActiveMonth = new Set();
    accounts.forEach((acc) => {
        if (isAccountInRange(acc, startOfWeek, endOfDay)) {
            cyclesActiveWeek.add(getAccountCycleNum(acc));
        }
        if (isAccountInRange(acc, startOfMonth, endOfMonth)) {
            cyclesActiveMonth.add(getAccountCycleNum(acc));
        }
    });

    let dailyProfit = 0;
    let weeklyProfit = 0;
    let monthlyProfit = 0;

    accounts.forEach((acc) => {
        const profit = getAccountProfit(acc);
        const cycleNum = getAccountCycleNum(acc);

        if (
            isAccountDateToday(acc) ||
            (cyclesActiveToday.has(cycleNum) && !isMotherAccount(acc))
        ) {
            dailyProfit += profit;
        }
        if (
            isAccountInRange(acc, startOfWeek, endOfDay) ||
            (cyclesActiveWeek.has(cycleNum) && !isMotherAccount(acc))
        ) {
            weeklyProfit += profit;
        }
        if (
            isAccountInRange(acc, startOfMonth, endOfMonth) ||
            (cyclesActiveMonth.has(cycleNum) && !isMotherAccount(acc))
        ) {
            monthlyProfit += profit;
        }
    });

    const totalProfit = totalWithdraw + totalChest - totalDeposit;

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    const profitColor = (value) =>
        value > 0 ? 'var(--primary)' : value < 0 ? 'var(--danger)' : 'var(--text-main)';

    const stats = [
        { label: 'Depósito Total', value: formatCurrency(totalDeposit), icon: <DollarSign size={16} /> },
        { label: 'Saque Total', value: formatCurrency(totalWithdraw), icon: <CreditCard size={16} /> },
        { label: 'Diário', value: formatCurrency(dailyProfit), icon: <TrendingUp size={16} />, color: profitColor(dailyProfit) },
        { label: 'Lucro Semanal', value: formatCurrency(weeklyProfit), icon: <Calendar size={16} />, color: profitColor(weeklyProfit) },
        { label: 'Lucro Mensal', value: formatCurrency(monthlyProfit), icon: <Calendar size={16} />, color: profitColor(monthlyProfit) },
        { label: 'Lucro Total', value: formatCurrency(totalProfit), icon: <TrendingUp size={16} />, color: profitColor(totalProfit) },
    ];

    const getCycleConfig = (cycleNum) => {
        if (cycleConfigs[cycleNum]) {
            return cycleConfigs[cycleNum];
        }
        // Fallback: check if any account in this cycle has the "Mãe" tag
        const cycleAccounts = accounts.filter(acc => {
            const tags = Array.isArray(acc.tag) ? acc.tag : [];
            return tags.includes(`Ciclo ${cycleNum}`);
        });
        const hasMotherAccount = cycleAccounts.some(acc => {
            const tags = Array.isArray(acc.tag) ? acc.tag : [];
            return tags.includes('Mãe');
        });
        return hasMotherAccount ? 'mother_daughter' : 'single';
    };

    const handleSaveCycleConfig = (type) => {
        const updated = {
            ...cycleConfigs,
            [selectedCycle]: type
        };
        setCycleConfigs(updated);
        try {
            localStorage.setItem(`platform_${platform.id}_cycle_configs`, JSON.stringify(updated));
        } catch (e) {
            console.error(e);
        }
        setIsCycleSettingsOpen(false);
        notify(`Ciclo ${selectedCycle} configurado como ${type === 'single' ? 'Conta Única' : 'Mãe e Filha'}!`, "success");
    };

    const usedPixKeyValues = accounts
        .filter(acc => acc.id !== (editingAccountId || editingCell?.id) && acc.pixKey)
        .map(acc => acc.pixKey);

    const daughterAccounts = filteredAccounts.filter(acc => {
        const tags = Array.isArray(acc.tag) ? acc.tag : [];
        return !tags.includes('Mãe');
    });

    const motherAccounts = filteredAccounts.filter(acc => {
        const tags = Array.isArray(acc.tag) ? acc.tag : [];
        return tags.includes('Mãe');
    });

    const renderAccountsTable = (accountsList, title, isMotherType = false) => {
        const cardKey = isMotherType ? 'mother' : 'daughter';
        const isPopped = popoutCards[cardKey];

        const focusPopoutWindow = () => {
            const winName = `cpa-popout-${platform.id}-${cardKey}`;
            const url = buildPopoutUrl({ cardKey, platformId: platform.id, cycle: selectedCycle });
            const w = window.open(url, winName);
            if (w) {
                w.focus();
                popoutWindowsRef.current[cardKey] = w;
            }
        };

        const openPopout = () => {
            if (!platform?.id) {
                notify('Aguarde o carregamento da plataforma.', 'warning');
                return;
            }

            const existing = popoutWindowsRef.current[cardKey];
            if (existing && !existing.closed) {
                existing.focus();
                return;
            }

            if (isPopped) {
                focusPopoutWindow();
                return;
            }

            const result = openAccountPopoutWindow({
                cardKey,
                platformId: platform.id,
                cycle: selectedCycle,
            });

            if (result.window && !result.window.closed) {
                popoutWindowsRef.current[cardKey] = result.window;
            } else {
                popoutWindowsRef.current[cardKey] = null;
            }

            setPopoutCards((prev) => ({ ...prev, [cardKey]: true }));

            if (result.usedAnchorFallback) {
                notify('Card aberto em nova janela.', 'success');
            }
        };

        const closePopout = () => {
            const win = popoutWindowsRef.current[cardKey];
            if (win && !win.closed) {
                win.close();
            } else {
                const winName = `cpa-popout-${platform.id}-${cardKey}`;
                const w = window.open('', winName);
                if (w && !w.closed) w.close();
            }
            popoutWindowsRef.current[cardKey] = null;
            setPopoutCards((prev) => ({ ...prev, [cardKey]: false }));
        };

        const isPopoutWindow = Boolean(popoutOnly);

        const cardContent = (
            <div className={`glass-card${(isPopped || isPopoutWindow) ? ' popout-card' : ''}`} style={{ 
                padding: '0', 
                overflow: 'hidden',
                border: (isPopped && !popoutOnly) ? 'none' : '1px solid var(--card-border)',
                position: 'relative',
                flex: (isPopped || isPopoutWindow) ? 'none' : 1,
                minWidth: (isPopped || isPopoutWindow) ? undefined : '320px',
                width: (isPopped || isPopoutWindow) ? 'max-content' : undefined
            }}>
                <div style={{ 
                    padding: '10px 16px', 
                    borderBottom: '1px solid var(--card-border)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    gap: '12px',
                    backgroundColor: 'rgba(255, 255, 255, 0.01)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {isMotherType ? <Crown size={16} color="var(--primary)" /> : <UserCircle2 size={16} color="var(--text-muted)" />}
                        <h2 style={{ fontSize: '0.95rem', fontWeight: 600, margin: 0, color: '#fff' }}>
                            {title}
                        </h2>
                        <span style={{
                            backgroundColor: 'rgba(255,255,255,0.05)',
                            border: '1px solid var(--card-border)',
                            borderRadius: '20px',
                            padding: '2px 8px',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            color: 'var(--text-muted)'
                        }}>
                            {accountsList.length}
                        </span>
                    </div>
                    {/* Compact Quick-Add buttons in the card header! */}
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        {!isPopped && !popoutOnly && (
                            <button
                                onClick={openPopout}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '6px',
                                    borderRadius: '6px',
                                    border: 'none',
                                    backgroundColor: 'rgba(var(--primary-rgb), 0.08)',
                                    color: 'var(--primary)',
                                    cursor: 'pointer',
                                    transition: 'var(--transition)'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = 'rgba(var(--primary-rgb), 0.16)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'rgba(var(--primary-rgb), 0.08)';
                                }}
                                title="Abrir em janela separada (mover, minimizar, fechar)"
                            >
                                <ChevronDown size={14} />
                            </button>
                        )}
                        <button
                            onClick={() => {
                                const type = isMotherType ? 'mother' : 'daughter';
                                setPixPoolModalType(type);
                                setPixPoolInput(getPixKeysPool(type).join('\n'));
                            }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '6px',
                                borderRadius: '6px',
                                border: 'none',
                                backgroundColor: 'rgba(var(--primary-rgb), 0.08)',
                                color: 'var(--primary)',
                                cursor: 'pointer',
                                transition: 'var(--transition)'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(var(--primary-rgb), 0.16)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(var(--primary-rgb), 0.08)';
                            }}
                            title={`Configurar Pool de Chaves Pix (${isMotherType ? 'Mãe' : 'Filha'})`}
                        >
                            <Key size={14} />
                        </button>
                        <button
                            onClick={() => handleQuickAddAccount('phone', isMotherType)}
                            disabled={isQuickAdding}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '6px',
                                borderRadius: '6px',
                                border: 'none',
                                backgroundColor: 'rgba(var(--primary-rgb), 0.08)',
                                color: 'var(--primary)',
                                cursor: isQuickAdding ? 'not-allowed' : 'pointer',
                                transition: 'var(--transition)',
                                opacity: isQuickAdding ? 0.7 : 1
                            }}
                            onMouseEnter={(e) => {
                                if (!isQuickAdding) e.currentTarget.style.backgroundColor = 'rgba(var(--primary-rgb), 0.16)';
                            }}
                            onMouseLeave={(e) => {
                                if (!isQuickAdding) e.currentTarget.style.backgroundColor = 'rgba(var(--primary-rgb), 0.08)';
                            }}
                            title="Adicionar com Telefone Aleatório"
                        >
                            <div style={{ position: 'relative', display: 'flex', width: '14px', height: '14px' }}>
                                <Smartphone size={14} />
                                <Plus size={8} strokeWidth={4} color="var(--primary)" style={{ position: 'absolute', bottom: '-2px', right: '-2px' }} />
                            </div>
                        </button>
                        <button
                            onClick={() => handleQuickAddAccount('username', isMotherType)}
                            disabled={isQuickAdding}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '6px',
                                borderRadius: '6px',
                                border: 'none',
                                backgroundColor: 'rgba(var(--primary-rgb), 0.08)',
                                color: 'var(--primary)',
                                cursor: isQuickAdding ? 'not-allowed' : 'pointer',
                                transition: 'var(--transition)',
                                opacity: isQuickAdding ? 0.7 : 1
                            }}
                            onMouseEnter={(e) => {
                                if (!isQuickAdding) e.currentTarget.style.backgroundColor = 'rgba(var(--primary-rgb), 0.16)';
                            }}
                            onMouseLeave={(e) => {
                                if (!isQuickAdding) e.currentTarget.style.backgroundColor = 'rgba(var(--primary-rgb), 0.08)';
                            }}
                            title="Adicionar com Usuário Aleatório"
                        >
                            <div style={{ position: 'relative', display: 'flex', width: '14px', height: '14px' }}>
                                <UserCircle2 size={14} />
                                <Plus size={8} strokeWidth={4} color="var(--primary)" style={{ position: 'absolute', bottom: '-2px', right: '-2px' }} />
                            </div>
                        </button>
                        {popoutOnly && (
                            <button
                                type="button"
                                onClick={onBack}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '6px',
                                    borderRadius: '6px',
                                    border: 'none',
                                    backgroundColor: 'rgba(239, 68, 68, 0.12)',
                                    color: '#ef4444',
                                    cursor: 'pointer',
                                    transition: 'var(--transition)',
                                    marginLeft: '4px',
                                }}
                                title="Fechar janela"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                </div>
                <div className={(isPopped || isPopoutWindow) ? undefined : 'table-scroll'} style={{ minHeight: (isPopped || isPopoutWindow) ? undefined : '260px' }}>
                    <table style={{ width: (isPopped || isPopoutWindow) ? 'max-content' : '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ backgroundColor: 'rgba(255, 255, 255, 0.01)', borderBottom: '1px solid var(--card-border)' }}>
                                <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.8rem' }}>Login</th>
                                <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.8rem', minWidth: '110px' }}>Senha</th>
                                <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.8rem', minWidth: '110px' }}>Senha Saque</th>
                                <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.8rem', minWidth: '140px' }}>Nome</th>
                                <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.8rem', minWidth: '110px' }}>CPF</th>
                                <th style={{ textAlign: 'center', padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.8rem' }}>Depósito</th>
                                <th style={{ textAlign: 'center', padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.8rem' }}>Saque</th>
                                <th style={{ textAlign: 'center', padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.8rem' }}>Lucro</th>
                                <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.8rem' }}>Chave PIX</th>
                                <th style={{ textAlign: 'right', padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.8rem' }}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {accountsList.map((acc) => (
                                <tr key={acc.id} style={{ borderBottom: '1px solid var(--card-border)' }} className="table-row">
                                    <td style={{ padding: '8px 12px', minWidth: '110px', fontSize: '0.825rem' }}>
                                        <div
                                            onClick={() => {
                                                if (!acc.login.startsWith('Conta ')) {
                                                    handleCopy(acc.login, acc.id + '-login');
                                                }
                                            }}
                                            style={{
                                                position: 'relative',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                fontWeight: 500,
                                                cursor: acc.login.startsWith('Conta ') ? 'default' : 'pointer',
                                                color: copiedId === acc.id + '-login' ? 'var(--primary)' : 'var(--text-main)',
                                                transition: 'all 0.2s',
                                                userSelect: 'none',
                                                padding: '2px 4px',
                                                marginLeft: '-4px',
                                                borderRadius: '4px'
                                            }}
                                            title={acc.login.startsWith('Conta ') ? '' : "Clique para copiar"}
                                            onMouseEnter={(e) => {
                                                if (!acc.login.startsWith('Conta ')) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = 'transparent';
                                            }}
                                        >
                                            <span style={{ opacity: copiedId === acc.id + '-login' ? 0 : 1 }}>
                                                {acc.login}
                                            </span>
                                            {copiedId === acc.id + '-login' && (
                                                <div style={{ position: 'absolute', display: 'flex', alignItems: 'center', gap: '8px', left: '4px' }}>
                                                    <CheckCircle2 size={12} />
                                                    <span>Copiado!</span>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td style={{ padding: '8px 12px', minWidth: '110px', fontSize: '0.825rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '6px' }}>
                                            {acc.password ? (
                                                <>
                                                    <div
                                                        onClick={() => handleCopy(acc.password, acc.id + '-pass')}
                                                        style={{
                                                            position: 'relative',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '8px',
                                                            fontWeight: 500,
                                                            cursor: 'pointer',
                                                            color: copiedId === acc.id + '-pass' ? 'var(--primary)' : 'var(--text-muted)',
                                                            transition: 'all 0.2s',
                                                            userSelect: 'none',
                                                            padding: '2px 4px',
                                                            marginLeft: '-4px',
                                                            borderRadius: '4px'
                                                        }}
                                                        title="Clique para copiar"
                                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                                    >
                                                        <span style={{ opacity: copiedId === acc.id + '-pass' ? 0 : 1 }}>
                                                            {visiblePasswords.has(acc.id) ? acc.password : '••••••••'}
                                                        </span>
                                                        {copiedId === acc.id + '-pass' && (
                                                            <div style={{ position: 'absolute', display: 'flex', alignItems: 'center', gap: '8px', left: '4px' }}>
                                                                <CheckCircle2 size={12} />
                                                                <span>Copiado!</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={(e) => togglePasswordVisibility(e, acc.id)}
                                                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px', display: 'flex' }}
                                                        title={visiblePasswords.has(acc.id) ? "Ocultar senha" : "Revelar senha"}
                                                    >
                                                        {visiblePasswords.has(acc.id) ? <EyeOff size={14} /> : <Eye size={14} />}
                                                    </button>
                                                </>
                                            ) : (
                                                <span>-</span>
                                            )}
                                        </div>
                                    </td>
                                    <td style={{ padding: '8px 12px', minWidth: '110px', fontSize: '0.825rem' }}>
                                        <div
                                            onClick={() => {
                                                if (acc.withdrawPassword) {
                                                    handleCopy(acc.withdrawPassword, acc.id + '-withdrawPass');
                                                }
                                            }}
                                            style={{
                                                position: 'relative',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                fontWeight: 500,
                                                cursor: acc.withdrawPassword ? 'pointer' : 'default',
                                                color: copiedId === acc.id + '-withdrawPass' ? 'var(--primary)' : 'var(--text-muted)',
                                                transition: 'all 0.2s',
                                                userSelect: 'none',
                                                padding: '2px 4px',
                                                marginLeft: '-4px',
                                                borderRadius: '4px'
                                            }}
                                            title={acc.withdrawPassword ? "Clique para copiar" : ""}
                                            onMouseEnter={(e) => {
                                                if (acc.withdrawPassword) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = 'transparent';
                                            }}
                                        >
                                            <span style={{ opacity: copiedId === acc.id + '-withdrawPass' ? 0 : 1 }}>
                                                {acc.withdrawPassword || '-'}
                                            </span>
                                            {copiedId === acc.id + '-withdrawPass' && (
                                                <div style={{ position: 'absolute', display: 'flex', alignItems: 'center', gap: '8px', left: '4px' }}>
                                                    <CheckCircle2 size={12} />
                                                    <span>Copiado!</span>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    {/* Nome Cell */}
                                    <td style={{ padding: '8px 12px', minWidth: '140px', fontSize: '0.825rem' }}>
                                        {getAccountName(acc) ? (
                                            <div
                                                onClick={() => handleCopy(getAccountName(acc), acc.id + '-name')}
                                                style={{
                                                    position: 'relative',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    fontWeight: 500,
                                                    cursor: 'pointer',
                                                    color: copiedId === acc.id + '-name' ? 'var(--primary)' : 'var(--text-main)',
                                                    transition: 'all 0.2s',
                                                    userSelect: 'none',
                                                    padding: '2px 4px',
                                                    marginLeft: '-4px',
                                                    borderRadius: '4px'
                                                }}
                                                title="Clique para copiar Nome"
                                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                            >
                                                <span style={{ opacity: copiedId === acc.id + '-name' ? 0 : 1 }}>
                                                    {getAccountName(acc)}
                                                </span>
                                                {copiedId === acc.id + '-name' && (
                                                    <div style={{ position: 'absolute', display: 'flex', alignItems: 'center', gap: '8px', left: '4px' }}>
                                                        <CheckCircle2 size={12} />
                                                        <span>Copiado!</span>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => handleGenerateNameCpfForAccount(acc.id, acc.tag)}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    padding: '4px 8px',
                                                    borderRadius: '6px',
                                                    border: 'none',
                                                    backgroundColor: 'rgba(var(--primary-rgb), 0.1)',
                                                    color: 'var(--primary)',
                                                    cursor: 'pointer',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 600,
                                                    transition: 'var(--transition)'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(var(--primary-rgb), 0.2)'}
                                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(var(--primary-rgb), 0.1)'}
                                            >
                                                <FileText size={12} /> Gerar
                                            </button>
                                        )}
                                    </td>

                                    {/* CPF Cell */}
                                    <td style={{ padding: '8px 12px', minWidth: '110px', fontSize: '0.825rem' }}>
                                        {getAccountCpf(acc) ? (
                                            <div
                                                onClick={() => handleCopy(getAccountCpf(acc), acc.id + '-cpf')}
                                                style={{
                                                    position: 'relative',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    fontWeight: 500,
                                                    cursor: 'pointer',
                                                    color: copiedId === acc.id + '-cpf' ? 'var(--primary)' : 'var(--text-muted)',
                                                    transition: 'all 0.2s',
                                                    userSelect: 'none',
                                                    padding: '2px 4px',
                                                    marginLeft: '-4px',
                                                    borderRadius: '4px'
                                                }}
                                                title="Clique para copiar CPF"
                                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                            >
                                                <span style={{ opacity: copiedId === acc.id + '-cpf' ? 0 : 1 }}>
                                                    {getAccountCpf(acc)}
                                                </span>
                                                {copiedId === acc.id + '-cpf' && (
                                                    <div style={{ position: 'absolute', display: 'flex', alignItems: 'center', gap: '8px', left: '4px' }}>
                                                        <CheckCircle2 size={12} />
                                                        <span>Copiado!</span>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => handleGenerateNameCpfForAccount(acc.id, acc.tag)}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    padding: '4px 8px',
                                                    borderRadius: '6px',
                                                    border: 'none',
                                                    backgroundColor: 'rgba(var(--primary-rgb), 0.1)',
                                                    color: 'var(--primary)',
                                                    cursor: 'pointer',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 600,
                                                    transition: 'var(--transition)'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(var(--primary-rgb), 0.2)'}
                                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(var(--primary-rgb), 0.1)'}
                                            >
                                                <FileText size={12} /> Gerar
                                            </button>
                                        )}
                                    </td>

                                    {/* Financial Cells */}
                                    {['deposit', 'withdraw'].map((field) => {
                                        const nextField = field === 'deposit' ? 'withdraw' : null;
                                        return (
                                            <td
                                                key={field}
                                                style={{ padding: '8px 12px', textAlign: 'center', cursor: 'text', minWidth: '85px', fontSize: '0.825rem' }}
                                                className="editable-cell"
                                                title="Clique para editar"
                                            >
                                                <span style={{ color: 'var(--text-muted)', marginRight: '2px' }}>R$</span>
                                                <span
                                                    className="editable-value"
                                                    contentEditable
                                                    suppressContentEditableWarning
                                                    onFocus={(e) => {
                                                        setEditingCell({ id: acc.id, field });
                                                    }}
                                                    onBlur={(e) => {
                                                        const raw = e.target.innerText.replace(/[^0-9.,]/g, '');
                                                        handleInlineEditSave(acc.id, field, raw);
                                                        e.target.innerText = acc[field];
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === '-') e.preventDefault();
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            e.target.blur();
                                                        }
                                                        if (e.key === 'Escape') {
                                                            e.target.innerText = acc[field];
                                                            e.target.blur();
                                                            setEditingCell(null);
                                                        }
                                                        if (e.key === 'Tab') {
                                                            e.preventDefault();
                                                            const raw = e.target.innerText.replace(/[^0-9.,]/g, '');
                                                            handleInlineEditSave(acc.id, field, raw);
                                                            if (nextField) {
                                                                setTimeout(() => {
                                                                    const row = e.target.closest('tr');
                                                                    const nextEl = row?.querySelector(`[data-field="${nextField}"]`);
                                                                    if (nextEl) nextEl.focus();
                                                                }, 50);
                                                            }
                                                        }
                                                    }}
                                                    data-field={field}
                                                    style={{
                                                        outline: 'none',
                                                        padding: '2px 4px',
                                                        borderRadius: '4px',
                                                        minWidth: '30px',
                                                        display: 'inline-block'
                                                    }}
                                                >
                                                    {acc[field]}
                                                </span>
                                            </td>
                                        );
                                    })}
                                    {/* Lucro Cell */}
                                    {(() => {
                                        const profitVal = parseCurrency(acc.withdraw) - parseCurrency(acc.deposit);
                                        const isNegative = profitVal < 0;
                                        return (
                                            <td style={{
                                                padding: '8px 12px',
                                                textAlign: 'center',
                                                minWidth: '85px',
                                                fontSize: '0.825rem',
                                                fontWeight: 600,
                                                color: isNegative ? '#ef4444' : 'var(--primary)'
                                            }}>
                                                {formatCurrency(profitVal)}
                                            </td>
                                        );
                                    })()}
                                    <td
                                        style={{ padding: '8px 12px', cursor: 'pointer', minWidth: '110px', fontSize: '0.825rem' }}
                                        onClick={() => {
                                            if (editingCell?.id !== acc.id || editingCell?.field !== 'pixKey') {
                                                setEditingCell({ id: acc.id, field: 'pixKey' });
                                            }
                                        }}
                                        title="Clique para editar"
                                    >
                                        {editingCell?.id === acc.id && editingCell?.field === 'pixKey' ? (
                                            <div className="inline-pix-dropdown" style={{ position: 'relative' }}>
                                                <div style={{
                                                    position: 'absolute',
                                                    top: '100%',
                                                    left: 0,
                                                    width: '240px',
                                                    backgroundColor: '#1a1a1e',
                                                    border: '1px solid var(--card-border)',
                                                    borderRadius: '12px',
                                                    zIndex: 1100,
                                                    boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                                                    overflow: 'hidden',
                                                    animation: 'fade-in 0.2s ease'
                                                }} onClick={(e) => e.stopPropagation()}>
                                                    <div style={{ padding: '8px', borderBottom: '1px solid var(--card-border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <Search size={14} style={{ color: 'var(--text-muted)' }} />
                                                        <input
                                                            type="text"
                                                            placeholder="Buscar chave..."
                                                            value={inlinePixSearch}
                                                            onChange={(e) => setInlinePixSearch(e.target.value)}
                                                            autoFocus
                                                            style={{ background: 'none', border: 'none', color: '#fff', outline: 'none', fontSize: '0.875rem', width: '100%' }}
                                                        />
                                                    </div>
                                                    <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                                        <div
                                                            onClick={() => {
                                                                handleInlinePixSave(acc.id, '');
                                                                setEditingCell(null);
                                                                setInlinePixSearch('');
                                                            }}
                                                            style={{ padding: '10px 16px', cursor: 'pointer', fontSize: '0.875rem', borderBottom: '1px solid rgba(255,255,255,0.02)', transition: 'var(--transition)' }}
                                                            className="dropdown-item"
                                                        >
                                                            Nenhuma
                                                        </div>
                                                        {userPixKeys
                                                            .filter(pk => pk.active !== false)
                                                            .filter(pk => !platform.pix_types || platform.pix_types.length === 0 || platform.pix_types.includes(pk.type))
                                                            .filter(pk => !usedPixKeyValues.includes(pk.value))
                                                            .filter(pk => {
                                                                const searchLow = inlinePixSearch.toLowerCase();
                                                                const valLow = pk.value.toLowerCase();
                                                                const typeLow = pk.type.toLowerCase();
                                                                if (valLow.includes(searchLow) || typeLow.includes(searchLow)) return true;
                                                                const cleanSearch = searchLow.replace(/\D/g, '');
                                                                const cleanVal = pk.value.replace(/\D/g, '');
                                                                return cleanSearch && cleanVal.includes(cleanSearch);
                                                            })
                                                            .map((pk) => (
                                                                <div
                                                                    key={pk.id}
                                                                    onClick={() => {
                                                                        handleInlinePixSave(acc.id, pk.id);
                                                                        setEditingCell(null);
                                                                        setInlinePixSearch('');
                                                                    }}
                                                                    style={{ padding: '12px 16px', cursor: 'pointer', fontSize: '0.875rem', borderBottom: '1px solid rgba(255,255,255,0.02)', transition: 'var(--transition)' }}
                                                                    className="dropdown-item"
                                                                >
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                        <div>
                                                                            <div style={{ fontWeight: 500, color: '#fff' }}>{pk.value}</div>
                                                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{pk.type}</div>
                                                                        </div>
                                                                        {pk.banks?.logo_url && (
                                                                            <img src={pk.banks.logo_url} alt="Logo" style={{ width: '24px', height: '24px', borderRadius: '6px', objectFit: 'contain' }} />
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div
                                                onClick={(e) => {
                                                    if (acc.pixKey) {
                                                        e.stopPropagation(); // Avoid triggering edit when trying to copy
                                                        handleCopy(acc.pixKey, acc.id + '-pixKey');
                                                    }
                                                }}
                                                style={{
                                                    position: 'relative',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    fontWeight: 500,
                                                    cursor: acc.pixKey ? 'pointer' : 'default',
                                                    color: copiedId === acc.id + '-pixKey' ? 'var(--primary)' : 'var(--text-muted)',
                                                    transition: 'all 0.2s',
                                                    userSelect: 'none',
                                                    padding: '2px 4px',
                                                    marginLeft: '-4px',
                                                    borderRadius: '4px'
                                                }}
                                                title={acc.pixKey ? "Clique para copiar" : ""}
                                                onMouseEnter={(e) => {
                                                    if (acc.pixKey) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.backgroundColor = 'transparent';
                                                }}
                                            >
                                                <span style={{ opacity: copiedId === acc.id + '-pixKey' ? 0 : 1, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    {acc.pixKey ? (
                                                        <>
                                                            {acc.pixKey.length > 12 ? acc.pixKey.substring(0, 12) + '...' : acc.pixKey}
                                                            {acc.pixBankLogo && (
                                                                <img src={acc.pixBankLogo} alt="Bank Logo" style={{ width: '16px', height: '16px', borderRadius: '4px', objectFit: 'contain' }} />
                                                            )}
                                                        </>
                                                    ) : (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setEditingCell({ id: acc.id, field: 'pixKey' });
                                                            }}
                                                            style={{
                                                                background: 'rgba(255, 255, 255, 0.05)',
                                                                border: '1px dashed var(--card-border)',
                                                                width: '20px',
                                                                height: '20px',
                                                                borderRadius: '50%',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                cursor: 'pointer',
                                                                color: 'var(--text-muted)',
                                                                transition: 'var(--transition)'
                                                            }}
                                                            title="Adicionar Chave PIX"
                                                        >
                                                            <Plus size={12} />
                                                        </button>
                                                    )}
                                                </span>
                                                {copiedId === acc.id + '-pixKey' && (
                                                    <div style={{ position: 'absolute', display: 'flex', alignItems: 'center', gap: '8px', left: '4px' }}>
                                                        <CheckCircle2 size={12} />
                                                        <span>Copiado!</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                    <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', alignItems: 'center' }}>
                                            <button
                                                onClick={() => handleToggleMotherAccount(acc.id, acc.tag)}
                                                style={{
                                                    padding: '6px',
                                                    borderRadius: '6px',
                                                    border: 'none',
                                                    backgroundColor: (acc.tag || []).includes('Mãe') ? 'rgba(234, 179, 8, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                                                    color: (acc.tag || []).includes('Mãe') ? '#eab308' : 'var(--text-muted)',
                                                    cursor: 'pointer',
                                                    transition: 'var(--transition)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                                title={(acc.tag || []).includes('Mãe') ? "Definir como Conta Filha" : "Definir como Conta Mãe"}
                                            >
                                                <Crown size={14} />
                                            </button>
                                            <button
                                                onClick={() => openEditModal(acc)}
                                                style={{
                                                    padding: '6px',
                                                    borderRadius: '6px',
                                                    border: 'none',
                                                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                                    color: 'var(--text-muted)',
                                                    cursor: 'pointer',
                                                    transition: 'var(--transition)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                                title="Editar Conta"
                                            >
                                                <Pencil size={14} />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setAccountToDelete(acc);
                                                    setIsDeleteModalOpen(true);
                                                }}
                                                style={{
                                                    padding: '6px',
                                                    borderRadius: '6px',
                                                    border: 'none',
                                                    backgroundColor: 'rgba(239, 68, 68, 0.05)',
                                                    color: '#ef4444',
                                                    cursor: 'pointer',
                                                    transition: 'var(--transition)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                                title="Excluir Conta"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {accountsList.length === 0 && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minHeight: '200px',
                            color: 'var(--text-muted)',
                            flexDirection: 'column',
                            gap: '12px'
                        }}>
                            {isMotherType ? <Crown size={28} style={{ opacity: 0.2 }} /> : <UserCircle2 size={28} style={{ opacity: 0.2 }} />}
                            <p style={{ margin: 0, fontSize: '0.8rem' }}>Nenhuma conta cadastrada.</p>
                        </div>
                    )}
                </div>
            </div>
        );

        if (isPopped && !popoutOnly) {
            return (
                <div key={cardKey} className="popout-placeholder">
                    {isMotherType ? <Crown size={28} style={{ opacity: 0.35, color: 'var(--primary)' }} /> : <UserCircle2 size={28} style={{ opacity: 0.35 }} />}
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                        <strong style={{ color: '#fff' }}>{title}</strong> está em janela separada do navegador
                    </p>
                    <button type="button" className="popout-placeholder__btn" onClick={focusPopoutWindow}>
                        <ChevronDown size={16} style={{ transform: 'rotate(180deg)' }} />
                        Focar janela
                    </button>
                    <button
                        type="button"
                        className="popout-placeholder__btn"
                        onClick={closePopout}
                        style={{ borderColor: 'rgba(239,68,68,0.35)', color: '#f87171', background: 'rgba(239,68,68,0.08)' }}
                    >
                        <X size={16} />
                        Fechar janela
                    </button>
                </div>
            );
        }

        return cardContent;
    };

    const isMotherPopout = popoutOnly === 'mother';
    const popoutList = isMotherPopout ? motherAccounts : daughterAccounts;
    const popoutTitle = isMotherPopout ? 'Conta mãe' : 'Conta filha';

    return (
        <>
            {popoutOnly ? (
                <div id="popout-root" className="popout-standalone-page">
                    {renderAccountsTable(popoutList, popoutTitle, isMotherPopout)}
                </div>
            ) : (
            <div className="page-content animate-fade-in">
                <header className="platform-page-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <button
                            onClick={onBack}
                            style={{
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid var(--card-border)',
                                borderRadius: '12px',
                                padding: '12px',
                                color: 'var(--text-main)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'var(--transition)'
                            }}
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 style={{ fontSize: '2rem', fontWeight: 700, margin: 0 }}>{platform.name}</h1>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '4px' }}>
                                Gerenciamento detalhado da plataforma
                            </p>
                        </div>
                    </div>
                    <div className="platform-page-header__actions">
                        <button
                            onClick={() => setIsDeletePlatformModalOpen(true)}
                            className="btn-delete-platform"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '12px 20px',
                                borderRadius: '12px',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                backgroundColor: 'rgba(239, 68, 68, 0.05)',
                                color: '#ef4444',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.3s ease'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#ef4444';
                                e.currentTarget.style.color = '#fff';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.05)';
                                e.currentTarget.style.color = '#ef4444';
                            }}
                        >
                            <Trash2 size={20} />
                            Excluir Plataforma
                        </button>

                        <button
                            onClick={() => {
                                setEditingAccountId(null);
                                setError(null);
                                setNewAccount({ login: '', password: '', withdrawPassword: '', deposit: '', withdraw: '', chest: '', pixKey: '', date: getGMT3Date() });
                                setAccountType('daughter');
                                setIsModalOpen(true);
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
                            <UserPlus size={20} />
                            Adicionar Conta
                        </button>
                    </div>
                </header>

                {/* Stats Grid */}
                <div className="dashboard-stats-secondary" style={{
                    marginBottom: '40px'
                }}>
                    {stats.map((stat, idx) => (
                        <div key={idx} className="glass-card" style={{ padding: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '8px' }}>
                                {stat.icon}
                                <span>{stat.label}</span>
                            </div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: stat.color || 'var(--text-main)' }}>
                                {stat.value}
                            </div>
                        </div>
                    ))}
                </div>

                <DailyGoalProgress dailyProfit={globalDailyProfit} dailyGoal={dailyGoal} />

                {/* Cycles and Actions Toolbar Header Card */}
                <div className="glass-card" style={{ 
                    padding: '20px 24px', 
                    marginBottom: '28px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    flexWrap: 'wrap', 
                    gap: '16px',
                    border: '1px solid var(--card-border)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', width: '100%', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                            <h2 style={{ fontSize: '1.15rem', fontWeight: 600, margin: 0 }}>Ciclos do Ciclo Ativo</h2>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                                padding: '4px',
                                borderRadius: '10px',
                                border: '1px solid var(--card-border)'
                            }}>
                                {uniqueCycles.map((cycleNum) => (
                                    <button
                                        key={cycleNum}
                                        onClick={() => setSelectedCycle(cycleNum)}
                                        style={{
                                            padding: '6px 14px',
                                            borderRadius: '8px',
                                            border: 'none',
                                            fontSize: '0.875rem',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                            backgroundColor: selectedCycle === cycleNum ? 'var(--primary)' : 'transparent',
                                            color: selectedCycle === cycleNum ? 'var(--primary-fg)' : 'var(--text-muted)'
                                        }}
                                    >
                                        Ciclo {cycleNum}
                                    </button>
                                ))}
                                <button
                                    onClick={() => setIsDeleteCycleModalOpen(true)}
                                    style={{
                                        padding: '8px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                        color: '#ef4444',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                    title="Excluir ciclo"
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
                                >
                                    <Trash2 size={16} />
                                </button>
                                <button
                                    onClick={() => {
                                        const nextCycle = Math.max(...uniqueCycles) + 1;
                                        setSessionCycles(prev => [...prev, nextCycle]);
                                        setSelectedCycle(nextCycle);
                                        notify(`Ciclo ${nextCycle} criado!`, "success");
                                    }}
                                    style={{
                                        padding: '8px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        backgroundColor: 'rgba(var(--primary-rgb), 0.1)',
                                        color: 'var(--primary)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                    title="Criar ciclo"
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(var(--primary-rgb), 0.2)'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(var(--primary-rgb), 0.1)'}
                                >
                                    <Plus size={16} />
                                </button>
                                <button
                                    onClick={() => setIsExportModalOpen(true)}
                                    style={{
                                        padding: '8px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        backgroundColor: 'rgba(var(--primary-rgb), 0.1)',
                                        color: 'var(--primary)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                    title="Exportar contas"
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(var(--primary-rgb), 0.2)'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(var(--primary-rgb), 0.1)'}
                                >
                                    <Download size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Cycle settings gear button */}
                        <button
                            onClick={() => setIsCycleSettingsOpen(true)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '8px',
                                borderRadius: '8px',
                                border: 'none',
                                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                                e.currentTarget.style.color = '#fff';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
                                e.currentTarget.style.color = 'var(--text-muted)';
                            }}
                            title="Configurar Ciclo"
                        >
                            <Settings size={18} />
                        </button>
                    </div>
                </div>

                {/* Conditional Rendering Grid (Daughter vs Mother Accounts vs Single Table) */}
                {getCycleConfig(selectedCycle) === 'mother_daughter' ? (
                    <div className="platform-accounts-row">
                        {renderAccountsTable(motherAccounts, "Conta mãe", true)}
                        {renderAccountsTable(daughterAccounts, "Conta filha", false)}
                    </div>
                ) : (
                    <div style={{ width: '100%' }}>
                        {renderAccountsTable(filteredAccounts, `Contas do Ciclo ${selectedCycle}`, false)}
                    </div>
                )}
            </div>
            )}

            {isModalOpen && (
                <div className="app-overlay">
                    <div className="glass-card app-overlay__panel app-overlay__panel--wide" style={{
                        position: 'relative',
                        backgroundColor: '#111114',
                    }}>
                        <button
                            onClick={() => {
                                setIsModalOpen(false);
                                setEditingAccountId(null);
                            }}
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

                        <h2 style={{ marginBottom: '8px' }}>{editingAccountId ? 'Editar Conta' : 'Nova Conta'}</h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>
                            {editingAccountId ? 'Edite os dados bancários e de login' : `Adicione uma nova conta para ${platform.name}`}
                        </p>

                        {error && (
                            <div className="animate-fade-in" style={{
                                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                color: '#ef4444',
                                padding: '12px 16px',
                                borderRadius: '12px',
                                marginBottom: '24px',
                                fontSize: '0.875rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}>
                                <X size={16} />
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleAddAccount}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>

                                {/* Row 1: Login | Senha */}
                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Login</label>
                                    <input
                                        type="text"
                                        value={newAccount.login}
                                        onChange={(e) => setNewAccount({ ...newAccount, login: e.target.value })}
                                        className="input-focus"
                                        style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--card-border)', backgroundColor: 'rgba(255, 255, 255, 0.02)', color: 'var(--text-main)', outline: 'none' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Senha</label>
                                    <input
                                        type="text"
                                        value={newAccount.password}
                                        onChange={(e) => setNewAccount({ ...newAccount, password: e.target.value })}
                                        className="input-focus"
                                        style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--card-border)', backgroundColor: 'rgba(255, 255, 255, 0.02)', color: 'var(--text-main)', outline: 'none' }}
                                    />
                                </div>

                                {/* Row 2: Senha de Saque | Chave Pix */}
                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Senha de Saque</label>
                                    <input
                                        type="text"
                                        value={newAccount.withdrawPassword}
                                        onChange={(e) => setNewAccount({ ...newAccount, withdrawPassword: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                                        className="input-focus"
                                        style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--card-border)', backgroundColor: 'rgba(255, 255, 255, 0.02)', color: 'var(--text-main)', outline: 'none' }}
                                    />
                                </div>

                                <div style={{ position: 'relative' }} ref={pixDropdownRef}>
                                    <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Chave PIX (Opcional)</label>
                                    <div
                                        onClick={() => setIsPixDropdownOpen(!isPixDropdownOpen)}
                                        className="input-focus"
                                        style={{
                                            width: '100%',
                                            padding: '12px 16px',
                                            borderRadius: '12px',
                                            border: '1px solid var(--card-border)',
                                            backgroundColor: 'rgba(255, 255, 255, 0.02)',
                                            color: newAccount.pixKey ? 'var(--text-main)' : 'var(--text-muted)',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            transition: 'var(--transition)'
                                        }}
                                    >
                                        <span>
                                            {newAccount.pixKey ?
                                                userPixKeys.find(pk => String(pk.id) === String(newAccount.pixKey)) ?
                                                    userPixKeys.find(pk => String(pk.id) === String(newAccount.pixKey)).value :
                                                    newAccount.pixKey
                                                : "Selecione uma chave..."
                                            }
                                        </span>
                                        <ChevronDown size={18} style={{ transform: isPixDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'var(--transition)' }} />
                                    </div>

                                    {isPixDropdownOpen && (
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
                                                    placeholder="Buscar chave..."
                                                    value={pixSearch}
                                                    onChange={(e) => setPixSearch(e.target.value)}
                                                    onClick={(e) => e.stopPropagation()}
                                                    style={{ background: 'none', border: 'none', color: '#fff', outline: 'none', fontSize: '0.875rem', width: '100%' }}
                                                />
                                            </div>
                                            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                                <div
                                                    onClick={() => {
                                                        setNewAccount({ ...newAccount, pixKey: '' });
                                                        setIsPixDropdownOpen(false);
                                                        setPixSearch('');
                                                    }}
                                                    style={{ padding: '10px 16px', cursor: 'pointer', fontSize: '0.875rem', borderBottom: '1px solid rgba(255,255,255,0.02)', transition: 'var(--transition)' }}
                                                    className="dropdown-item"
                                                >
                                                    Nenhuma
                                                </div>
                                                {userPixKeys
                                                    .filter(pk => pk.active !== false)
                                                    .filter(pk => !platform.pix_types || platform.pix_types.length === 0 || platform.pix_types.includes(pk.type))
                                                    .filter(pk => {
                                                        if (usedPixKeyValues.includes(pk.value) && String(newAccount.pixKey) !== String(pk.id)) {
                                                            return false;
                                                        }

                                                        const searchLow = pixSearch.toLowerCase();
                                                        const valLow = pk.value.toLowerCase();
                                                        const typeLow = pk.type.toLowerCase();

                                                        if (valLow.includes(searchLow) || typeLow.includes(searchLow)) return true;

                                                        const cleanSearch = searchLow.replace(/\D/g, '');
                                                        const cleanVal = valLow.replace(/\D/g, '');
                                                        if (cleanSearch !== '' && cleanVal.includes(cleanSearch)) return true;

                                                        return false;
                                                    })
                                                    .map((pk) => (
                                                        <div
                                                            key={pk.id}
                                                            onClick={() => {
                                                                setNewAccount({ ...newAccount, pixKey: pk.id });
                                                                setIsPixDropdownOpen(false);
                                                                setPixSearch('');
                                                            }}
                                                            style={{
                                                                padding: '10px 16px',
                                                                cursor: 'pointer',
                                                                fontSize: '0.875rem',
                                                                borderBottom: '1px solid rgba(255,255,255,0.02)',
                                                                backgroundColor: String(newAccount.pixKey) === String(pk.id) ? 'rgba(var(--primary-rgb), 0.1)' : 'transparent',
                                                                color: String(newAccount.pixKey) === String(pk.id) ? 'var(--primary)' : 'var(--text-main)',
                                                                transition: 'var(--transition)'
                                                            }}
                                                            className="dropdown-item"
                                                        >
                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                                    <div style={{ fontWeight: 600, fontSize: '0.75rem', color: 'var(--primary)' }}>{pk.type}</div>
                                                                    <div>{pk.value}</div>
                                                                </div>
                                                                {pk.banks?.logo_url && (
                                                                    <img src={pk.banks.logo_url} alt="Logo" style={{ width: '24px', height: '24px', borderRadius: '6px', objectFit: 'contain' }} />
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Row 3: Deposito | Saque */}
                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Depósito (R$)</label>
                                    <input
                                        type="number"
                                        value={newAccount.deposit}
                                        onChange={(e) => setNewAccount({ ...newAccount, deposit: e.target.value })}
                                        className="input-focus"
                                        style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--card-border)', backgroundColor: 'rgba(255, 255, 255, 0.02)', color: 'var(--text-main)', outline: 'none' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Saque (R$)</label>
                                    <input
                                        type="number"
                                        value={newAccount.withdraw}
                                        onChange={(e) => setNewAccount({ ...newAccount, withdraw: e.target.value })}
                                        className="input-focus"
                                        style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--card-border)', backgroundColor: 'rgba(255, 255, 255, 0.02)', color: 'var(--text-main)', outline: 'none' }}
                                    />
                                </div>

                                {getCycleConfig(selectedCycle) === 'mother_daughter' && (
                                    <div style={{ gridColumn: 'span 2' }}>
                                        <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                            Tipo de Conta
                                        </label>
                                        <div style={{ display: 'flex', gap: '8px', backgroundColor: 'rgba(255,255,255,0.02)', padding: '4px', borderRadius: '10px', border: '1px solid var(--card-border)', width: 'fit-content' }}>
                                            <button
                                                type="button"
                                                onClick={() => setAccountType('mother')}
                                                style={{
                                                    padding: '8px 16px',
                                                    borderRadius: '8px',
                                                    border: 'none',
                                                    fontSize: '0.875rem',
                                                    fontWeight: 600,
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s ease',
                                                    backgroundColor: accountType === 'mother' ? 'var(--primary)' : 'transparent',
                                                    color: accountType === 'mother' ? 'var(--primary-fg)' : 'var(--text-muted)'
                                                }}
                                            >
                                                Conta Mãe
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setAccountType('daughter')}
                                                style={{
                                                    padding: '8px 16px',
                                                    borderRadius: '8px',
                                                    border: 'none',
                                                    fontSize: '0.875rem',
                                                    fontWeight: 600,
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s ease',
                                                    backgroundColor: accountType === 'daughter' ? 'var(--primary)' : 'transparent',
                                                    color: accountType === 'daughter' ? 'var(--primary-fg)' : 'var(--text-muted)'
                                                }}
                                            >
                                                Conta Filha
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Data */}
                                <div style={{ gridColumn: 'span 2' }}>
                                    <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Data</label>
                                    <DatePicker
                                        value={newAccount.date}
                                        onChange={(val) => setNewAccount({ ...newAccount, date: val })}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsModalOpen(false);
                                        setEditingAccountId(null);
                                    }}
                                    style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '1px solid var(--card-border)', color: 'var(--text-main)', background: 'none', cursor: 'pointer', fontWeight: 600 }}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    style={{ flex: 2, padding: '14px', borderRadius: '12px', border: 'none', backgroundColor: 'var(--primary)', color: 'var(--primary-fg)', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(var(--primary-rgb), 0.2)' }}
                                >
                                    {editingAccountId ? 'Salvar Configurações' : 'Adicionar Conta'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )
            }

            {
                isDeleteModalOpen && (
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

                            <h3 style={{ marginBottom: '12px', fontSize: '1.25rem' }}>Excluir Conta</h3>
                            <p style={{ color: 'var(--text-muted)', marginBottom: '32px', lineHeight: 1.5 }}>
                                Tem certeza que deseja excluir a conta <strong>{accountToDelete?.login}</strong>? Esta ação não pode ser desfeita.
                            </p>

                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button
                                    onClick={() => {
                                        setIsDeleteModalOpen(false);
                                        setAccountToDelete(null);
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
                )
            }

            {
                isDeletePlatformModalOpen && (
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

                            <h3 style={{ marginBottom: '12px', fontSize: '1.25rem' }}>Excluir Plataforma</h3>
                            <p style={{ color: 'var(--text-muted)', marginBottom: '32px', lineHeight: 1.5 }}>
                                Tem certeza que deseja excluir a plataforma <strong>{platform.name}</strong>?
                                <br /><br />
                                <span style={{ color: '#ef4444' }}>Aviso: Todas as contas vinculadas a esta plataforma também serão excluídas permanetemente.</span>
                            </p>

                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button
                                    onClick={() => setIsDeletePlatformModalOpen(false)}
                                    style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid var(--card-border)', color: 'var(--text-main)', background: 'none', cursor: 'pointer', fontWeight: 600 }}
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleDeletePlatform}
                                    style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', backgroundColor: '#ef4444', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
                                >
                                    Excluir Tudo
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {isDeleteCycleModalOpen && (
                <div className="app-overlay">
                    <div className="glass-card app-overlay__panel" style={{
                        maxWidth: '420px',
                        textAlign: 'center',
                        backgroundColor: '#111114',
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

                        <h3 style={{ marginBottom: '12px', fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>
                            Excluir Ciclo {selectedCycle}
                        </h3>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '32px', lineHeight: 1.6, fontSize: '0.875rem' }}>
                            Tem certeza que deseja excluir o <strong style={{ color: '#fff' }}>Ciclo {selectedCycle}</strong>?
                            <br /><br />
                            {(() => {
                                const count = accounts.filter(acc => {
                                    const tags = Array.isArray(acc.tag) ? acc.tag : [];
                                    return tags.includes(`Ciclo ${selectedCycle}`);
                                }).length;
                                return count > 0 ? (
                                    <span style={{ color: '#ef4444' }}>
                                        Atenção: {count} conta{count > 1 ? 's' : ''} vinculada{count > 1 ? 's' : ''} a este ciclo será{count > 1 ? 'ão' : ''} excluída{count > 1 ? 's' : ''} permanentemente do banco de dados.
                                    </span>
                                ) : (
                                    <span style={{ color: 'var(--text-muted)' }}>Este ciclo não possui contas cadastradas.</span>
                                );
                            })()}
                        </p>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                onClick={() => setIsDeleteCycleModalOpen(false)}
                                style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid var(--card-border)', color: 'var(--text-main)', background: 'none', cursor: 'pointer', fontWeight: 600, transition: 'var(--transition)' }}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleDeleteCycle}
                                style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', backgroundColor: '#ef4444', color: '#fff', fontWeight: 600, cursor: 'pointer', transition: 'var(--transition)' }}
                            >
                                Excluir Ciclo
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isCycleSettingsOpen && (
                <div className="app-overlay">
                    <div className="glass-card app-overlay__panel" style={{
                        maxWidth: '450px',
                        border: '1px solid var(--card-border)',
                        position: 'relative',
                        backgroundColor: '#111114',
                    }}>
                        <button
                            onClick={() => setIsCycleSettingsOpen(false)}
                            style={{
                                position: 'absolute',
                                top: '16px',
                                right: '16px',
                                background: 'none',
                                border: 'none',
                                color: 'var(--text-muted)',
                                cursor: 'pointer'
                            }}
                        >
                            <X size={18} />
                        </button>
                        
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 8px 0', color: '#fff' }}>
                            Configurar Ciclo {selectedCycle}
                        </h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: '0 0 20px 0' }}>
                            Escolha o layout e o comportamento das contas para este ciclo.
                        </p>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div
                                onClick={() => handleSaveCycleConfig('single')}
                                style={{
                                    padding: '16px',
                                    borderRadius: '12px',
                                    border: `1px solid ${getCycleConfig(selectedCycle) === 'single' ? 'var(--primary)' : 'var(--card-border)'}`,
                                    backgroundColor: getCycleConfig(selectedCycle) === 'single' ? 'rgba(var(--primary-rgb), 0.05)' : 'rgba(255, 255, 255, 0.01)',
                                    cursor: 'pointer',
                                    transition: 'var(--transition)'
                                }}
                                onMouseEnter={(e) => {
                                    if (getCycleConfig(selectedCycle) !== 'single') e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                                }}
                                onMouseLeave={(e) => {
                                    if (getCycleConfig(selectedCycle) !== 'single') e.currentTarget.style.borderColor = 'var(--card-border)';
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                    <UserCircle2 size={18} color={getCycleConfig(selectedCycle) === 'single' ? 'var(--primary)' : 'var(--text-muted)'} />
                                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: getCycleConfig(selectedCycle) === 'single' ? 'var(--primary)' : '#fff' }}>
                                        Conta Única (Tradicional)
                                    </h3>
                                </div>
                                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                    Todas as contas deste ciclo serão exibidas em uma única lista integrada.
                                </p>
                            </div>
                            
                            <div
                                onClick={() => handleSaveCycleConfig('mother_daughter')}
                                style={{
                                    padding: '16px',
                                    borderRadius: '12px',
                                    border: `1px solid ${getCycleConfig(selectedCycle) === 'mother_daughter' ? 'var(--primary)' : 'var(--card-border)'}`,
                                    backgroundColor: getCycleConfig(selectedCycle) === 'mother_daughter' ? 'rgba(var(--primary-rgb), 0.05)' : 'rgba(255, 255, 255, 0.01)',
                                    cursor: 'pointer',
                                    transition: 'var(--transition)'
                                }}
                                onMouseEnter={(e) => {
                                    if (getCycleConfig(selectedCycle) !== 'mother_daughter') e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                                }}
                                onMouseLeave={(e) => {
                                    if (getCycleConfig(selectedCycle) !== 'mother_daughter') e.currentTarget.style.borderColor = 'var(--card-border)';
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                    <Crown size={18} color={getCycleConfig(selectedCycle) === 'mother_daughter' ? 'var(--primary)' : 'var(--text-muted)'} />
                                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: getCycleConfig(selectedCycle) === 'mother_daughter' ? 'var(--primary)' : '#fff' }}>
                                        Conta Mãe e Conta Filha (Separadas)
                                    </h3>
                                </div>
                                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                    As contas serão divididas em duas colunas paralelas: Contas Mãe na esquerda e Contas Filha na direita.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isExportModalOpen && (
                <div className="app-overlay">
                    <div className="glass-card app-overlay__panel" style={{
                        maxWidth: '420px',
                        textAlign: 'center',
                        backgroundColor: '#111114',
                    }}>
                        <div style={{
                            width: '64px',
                            height: '64px',
                            borderRadius: '50%',
                            backgroundColor: 'rgba(var(--primary-rgb), 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 24px',
                            color: 'var(--primary)'
                        }}>
                            <Download size={32} />
                        </div>

                        <h3 style={{ marginBottom: '12px', fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>Exportar Contas</h3>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '32px', lineHeight: 1.6, fontSize: '0.875rem' }}>
                            Exportar todas as contas de todos os ciclos da plataforma <strong style={{ color: '#fff' }}>{platform.name}</strong> para um arquivo de texto.
                            <br /><br />
                            <span style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.8rem', backgroundColor: 'rgba(255,255,255,0.03)', padding: '4px 8px', borderRadius: '4px' }}>login:senha:senhasaque</span>
                        </p>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                onClick={() => setIsExportModalOpen(false)}
                                style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid var(--card-border)', color: 'var(--text-main)', background: 'none', cursor: 'pointer', fontWeight: 600, transition: 'var(--transition)' }}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleExportAccounts}
                                style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', backgroundColor: 'var(--primary)', color: 'var(--primary-fg)', fontWeight: 600, cursor: 'pointer', transition: 'var(--transition)' }}
                            >
                                Exportar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {pixPoolModalType && (
                <div className="app-overlay">
                    <div className="glass-card app-overlay__panel" style={{
                        maxWidth: '480px',
                        backgroundColor: '#111114',
                        position: 'relative',
                    }}>
                        <button
                            onClick={() => setPixPoolModalType(null)}
                            style={{
                                position: 'absolute',
                                top: '16px',
                                right: '16px',
                                background: 'none',
                                border: 'none',
                                color: 'var(--text-muted)',
                                cursor: 'pointer'
                            }}
                        >
                            <X size={18} />
                        </button>

                        <div style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '50%',
                            backgroundColor: 'rgba(var(--primary-rgb), 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 20px',
                            color: 'var(--primary)'
                        }}>
                            <Key size={28} />
                        </div>

                        <h3 style={{ marginBottom: '8px', fontSize: '1.25rem', fontWeight: 700, color: '#fff', textAlign: 'center' }}>
                            Chaves Pix - {pixPoolModalType === 'mother' ? 'Conta Mãe' : 'Conta Filha'}
                        </h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '20px', lineHeight: 1.5, textAlign: 'center' }}>
                            Insira as chaves Pix (um telefone por linha). Ao criar uma conta, a primeira chave será consumida e atribuída automaticamente.
                        </p>

                        <textarea
                            value={pixPoolInput}
                            onChange={(e) => setPixPoolInput(e.target.value)}
                            placeholder={"27999154796\n27999154796\n27999154796"}
                            rows={7}
                            style={{
                                width: '100%',
                                padding: '14px',
                                borderRadius: '12px',
                                border: '1px solid var(--card-border)',
                                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                                color: '#fff',
                                fontFamily: 'monospace',
                                fontSize: '0.85rem',
                                resize: 'vertical',
                                marginBottom: '24px',
                                outline: 'none',
                                lineHeight: 1.6,
                                boxSizing: 'border-box'
                            }}
                            onFocus={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                            onBlur={(e) => e.currentTarget.style.borderColor = 'var(--card-border)'}
                        />

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                onClick={() => setPixPoolModalType(null)}
                                style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid var(--card-border)', color: 'var(--text-main)', background: 'none', cursor: 'pointer', fontWeight: 600, transition: 'var(--transition)' }}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => {
                                    const pool = pixPoolInput
                                        .split('\n')
                                        .map(s => s.trim())
                                        .filter(s => s.length > 0);
                                    savePixKeysPool(pixPoolModalType, pool);
                                    setPixPoolModalType(null);
                                    notify(`${pool.length} chaves Pix salvas com sucesso!`, "success");
                                }}
                                style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', backgroundColor: 'var(--primary)', color: 'var(--primary-fg)', fontWeight: 600, cursor: 'pointer', transition: 'var(--transition)' }}
                            >
                                Salvar Chaves
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .table-row:hover {
                    background-color: rgba(255, 255, 255, 0.01);
                }
                .editable-cell:hover {
                    background-color: rgba(var(--primary-rgb), 0.03);
                }
                .editable-cell:hover .editable-value {
                    text-decoration: underline;
                    text-decoration-style: dashed;
                    text-underline-offset: 3px;
                    text-decoration-color: rgba(var(--primary-rgb), 0.4);
                }
            `}</style>
        </>
    );
};

export default PlatformDetail;
